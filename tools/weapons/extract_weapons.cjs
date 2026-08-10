// Extrae stats (1-90) y passive (R1-R5) de cada arma en wuthering.gg via CDP.
// Uso: node tools/weapons/extract_weapons.cjs <slug>   (una arma)
//      node tools/weapons/extract_weapons.cjs all        (todas)
// Guarda los resultados en /tmp/ww-weapons-data.json
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9333;
const SLUGS_FILE = '/tmp/ww_weapon_links.json';
const OUT_FILE = '/tmp/ww-weapons-data.json';

async function main() {
  const target = process.argv[2];
  const port = process.env.WEPORT ? parseInt(process.env.WEPORT, 10) : PORT;
  // output por defecto; si hay WEPORT, cada worker escribe a su propio archivo
  const outFile = process.env.WE_OUT ? process.env.WE_OUT : OUT_FILE;

  let slugs;
  if (target && target !== 'all') {
    slugs = [target];
  } else {
    const all = JSON.parse(fs.readFileSync(SLUGS_FILE, 'utf8')).slugs;
    const startIdx = process.argv[3] ? parseInt(process.argv[3], 10) : 0;
    const endIdx = process.argv[4] ? parseInt(process.argv[4], 10) : all.length;
    slugs = all.slice(startIdx, endIdx);
  }

  // Lanzar Chrome headless
  const chrome = spawn('google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/ww-weapons-profile-${port}`,
    '--noerrdialogs', '--no-first-run', '--ozone-platform=headless',
    'about:blank',
  ], { stdio: 'ignore' });
  chrome.unref();

  // Esperar a que el puerto de debug esté listo
  await waitForPort(port, 15000);

  const results = {};
  let errors = 0;
  for (const slug of slugs) {
    try {
      const data = await scrapeWeapon(slug, port);
      if (data) results[slug] = data;
      console.log(`[${results.length + errors}/${slugs.length}] ${slug} -> ${data ? 'OK' : 'SKIP'}`);
    } catch (e) {
      errors++;
      console.log(`[ERR] ${slug}: ${e.message}`);
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
  console.log(`\nGuardado ${Object.keys(results).length} armas en ${outFile}. Errores: ${errors}`);
  chrome.kill('SIGKILL');
}

// ─── Helper: crear tab y hablar por CDP ────────────
async function getTabs() {
  const res = await fetch(`http://localhost:${PORT}/json/list`);
  return res.json();
}

async function newTab(url, port) {
  const res = await fetch(`http://localhost:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return res.json();
}

async function cdp(wsUrl, method, params = {}) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const id = Math.floor(Math.random() * 1e9);
  const result = new Promise((res, rej) => {
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
        ws.close();
      }
    };
  });
  ws.send(JSON.stringify({ id, method, params }));
  return result;
}

async function evaluate(wsUrl, expression) {
  const res = await cdp(wsUrl, 'Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || 'eval error');
  return res.result.value;
}

async function scrapeWeapon(slug, port) {
  const tab = await newTab(`https://wuthering.gg/weapons/${slug}`, port);
  const wsUrl = tab.webSocketDebuggerUrl;
  // esperar hydration Vue (~8s), luego detectar sliders con reintento generoso
  await new Promise(r => setTimeout(r, 8000));

  let slid = null;
  for (let attempt = 0; attempt < 6 && !slid; attempt++) {
    slid = await evaluate(wsUrl, `
      (() => [...document.querySelectorAll('[role="slider"]')].map(s => ({
        max: s.getAttribute('aria-valuemax'), now: s.getAttribute('aria-valuenow')
      })))()
    `);
    if (!slid || slid.length < 2) { slid = null; await new Promise(r => setTimeout(r, 2500)); }
  }
  if (!slid) { await closeTab(tab); return null; }

  const sleepIn = (ms) => `new Promise(r => setTimeout(r, ${ms}))`;

  // ── Nivel 1-90: leer ATK base + second stat ──
  const readStats = await evaluate(wsUrl, `
    (async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const slider = document.querySelectorAll('[role="slider"]')[0];
      const readItems = () => [...document.querySelectorAll('.stats.head .item')].map(it => {
        const v = it.querySelector('.value'); return v ? v.textContent.trim() : null;
      });
      // bajar a 1
      let cur = parseFloat(slider.getAttribute('aria-valuenow'));
      while (cur > 1) { slider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); cur--; await sleep(3); }
      await sleep(100);
      const stats = {};
      for (let lvl = 1; lvl <= 90; lvl++) {
        const items = readItems();
        if (items.length >= 2) stats[lvl] = { atk: items[0], second: items[1] };
        if (lvl < 90) { slider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); await sleep(3); }
      }
      return stats;
    })()
  `);

  // ── Rango R1-R5: leer passive ──
  const passives = await evaluate(wsUrl, `
    (async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const rankSlider = document.querySelectorAll('[role="slider"]')[1];
      const readSkill = () => {
        const lines = document.body.innerText.split('\\n').map(l => l.trim()).filter(Boolean);
        const idx = lines.findIndex(l => l === 'Skill');
        if (idx === -1) return null;
        return lines.slice(idx + 1).join(' ');
      };
      let cur = parseFloat(rankSlider.getAttribute('aria-valuenow'));
      while (cur > 1) { rankSlider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); cur--; await sleep(40); }
      await sleep(200);
      const passives = {};
      for (let rank = 1; rank <= 5; rank++) {
        passives[rank] = readSkill();
        if (rank < 5) { rankSlider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); await sleep(60); }
      }
      return passives;
    })()
  `);

  // nombre y h1
  const meta = await evaluate(wsUrl, `(() => {
    const h1 = document.querySelector('.stats.head h1 span');
    return { name: h1 ? h1.textContent.trim() : null };
  })()`);

  await closeTab(tab);
  return { slug, name: meta?.name, stats: readStats, passives };
}

async function closeTab(tab) {
  try { await cdp(tab.webSocketDebuggerUrl, 'Target.closeTarget', { targetId: tab.id }); } catch (e) {}
}

async function waitForPort(port, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { await fetch(`http://localhost:${port}/json/version`); return; } catch (e) { await new Promise(r => setTimeout(r, 300)); }
  }
  throw new Error('Chrome devtools port not ready');
}

main().catch(e => { console.error(e); process.exit(1); });
