// Generador de .json5 de armas desde los datos extraídos de wuthering.gg
// Fuente de datos: /tmp/ww-weapons-data.json (stats 1-90 + passive R1-R5)
//                  /home/luis/deepcode/un-waves-optimizer/weapons/weapons.json (rareza, tipo, mainStat, imagen)
// Salida: libs/ww/stats/src/weapons/<Id>.json5
'use strict';
const fs = require('fs');
const path = require('path');
const { parseBaseBuff } = require('./parse_base_buff.cjs');
const catalog = require('./five_star_catalog.cjs');

const DATA = JSON.parse(fs.readFileSync('/tmp/ww-weapons-data.json', 'utf8'));
const WEAPONS_JSON = require('/home/luis/deepcode/un-waves-optimizer/weapons/weapons.json');
const WJ = Array.isArray(WEAPONS_JSON) ? WEAPONS_JSON : Object.values(WEAPONS_JSON);

const OUT_DIR = '/home/luis/deepcode/un-waves-optimizer/libs/ww/stats/src/weapons';

// ── mapeo stat name -> path/motorkey ─────────────────────────
const STAT_PATH = {
  'Energy Regen': 'stat.energyRegen',
  'ATK': 'stat.atk_', 'ATK%': 'stat.atk_',
  'DEF': 'stat.def_', 'DEF%': 'stat.def_',
  'HP': 'stat.hp_', 'HP%': 'stat.hp_',
  'Crit. Rate': 'stat.critRate', 'Crit Rate': 'stat.critRate',
  'Crit. DMG': 'stat.critDmg', 'Crit DMG': 'stat.critDmg',
  'Healing Bonus': 'stat.healingBonus',
  'Basic Attack DMG Bonus': 'stat.basicDmg', 'Basic Attack DMG': 'stat.basicDmg', 'Basic DMG': 'stat.basicDmg',
  'Heavy Attack DMG Bonus': 'stat.heavyDmg', 'Heavy Attack DMG': 'stat.heavyDmg', 'Heavy DMG': 'stat.heavyDmg',
  'Resonance Skill DMG Bonus': 'stat.skillDmg', 'Resonance Skill DMG': 'stat.skillDmg', 'Skill DMG': 'stat.skillDmg',
  'Resonance Liberation DMG Bonus': 'stat.liberationDmg', 'Resonance Liberation DMG': 'stat.liberationDmg', 'Liberation DMG': 'stat.liberationDmg',
  'Attribute DMG Bonus': 'stat.allDmgBonus', 'All-Attribute DMG Bonus': 'stat.allDmgBonus', 'All DMG': 'stat.allDmgBonus',
  'Glacio DMG Bonus': 'stat.glacioDmg', 'Glacio DMG': 'stat.glacioDmg',
  'Fusion DMG Bonus': 'stat.fusionDmg', 'Fusion DMG': 'stat.fusionDmg',
  'Electro DMG Bonus': 'stat.electroDmg', 'Electro DMG': 'stat.electroDmg',
  'Aero DMG Bonus': 'stat.aeroDmg', 'Aero DMG': 'stat.aeroDmg',
  'Spectro DMG Bonus': 'stat.spectroDmg', 'Spectro DMG': 'stat.spectroDmg',
  'Havoc DMG Bonus': 'stat.havocDmg', 'Havoc DMG': 'stat.havocDmg',
};

// orden de búsqueda: más específicos primero
const STAT_ORDER = [
  'Resonance Liberation DMG Bonus', 'Resonance Liberation DMG', 'Liberation DMG',
  'Resonance Skill DMG Bonus', 'Resonance Skill DMG', 'Skill DMG',
  'Heavy Attack DMG Bonus', 'Heavy Attack DMG', 'Heavy DMG',
  'Basic Attack DMG Bonus', 'Basic Attack DMG', 'Basic DMG',
  'All-Attribute DMG Bonus', 'Attribute DMG Bonus', 'All DMG',
  'Glacio DMG Bonus', 'Fusion DMG Bonus', 'Electro DMG Bonus', 'Aero DMG Bonus', 'Spectro DMG Bonus', 'Havoc DMG Bonus',
  'Glacio DMG', 'Fusion DMG', 'Electro DMG', 'Aero DMG', 'Spectro DMG', 'Havoc DMG',
  'Energy Regen', 'Crit. Rate', 'Crit Rate', 'Crit. DMG', 'Crit DMG', 'Healing Bonus',
  'ATK%', 'DEF%', 'HP%', 'ATK', 'DEF', 'HP',
];

// palabras/patrones que hacen que una cláusula sea compleja (no modelable simple)
const COMPLEX_RE = /Chafe|Frazzle|Tune Strain|Tune Repture|Fusion Burst|Negative Status|on the field|off the field|nearby|team|party|Concerto|Echo Skill|Amplif|ignores|\bDEF\b|RES|heals|healing|same name|switch|shade|stagger|Outro|Deepen|Forte|dashes|dodges|HP is above|HP drops below|HP is below|Intro Skill|Resonance Skill is cast|Resonance Liberation is cast|Intro Skill is cast|Basic Attack or Intro|enemy|Aero DMG dealt|restores|stack\(s\)|Oath|Iron Armor|Searing Feather|Ageless|Ethereal|Gentle Dream|Hiss|Negative Statuses/;

// limpia el passive (quitar nombre del skill y 'About...')
function cleanPassive(raw) {
  let s = (raw || '').split(' About')[0].trim();
  // quitar el nombre de la habilidad: la descripción suele empezar en la 2ª palabra capitalizada.
  // Heurística: encontrar la primera frase que encaje con un verbo de buff ('Increases|Grants|Increase by|Gain|Restore|Casting|When|Dealing|Provide|While|Under')
  const m = s.match(/(Increases?|Increas|Grants?|Gain|Restore|Casting|When |Dealing |Provide|While |Every |Increase |Within |Equipped )/);
  if (m && m.index > 0) s = s.slice(m.index).trim();
  return s;
}

// extrae el valor % de una cláusula
const VAL_RE = /(\d+(?:\.\d+)?)%/;

// dada una descripción, intenta parsear pares (statPath, valueArray[R1..R5]) para el buff simple
// Devuelve { stat: path, valueByRank: [v1..v5], maxStacks } si encuentra UN single-stat con stacks idéntico,
// o null si no se puede determinar de forma segura.
function parseSimpleStat(passives) {
  // solo hacemos parseo si el texto (R1) NO es complejo
  const r1 = cleanPassive(passives['1'] || '');
  if (COMPLEX_RE.test(r1)) return null;

  // buscar el patrón "X by Y%" o "X increased by Y%" o "Grants Y% X"
  // patrón: <Stat> by <pct>%  (el stat está antes de ' by ' o ' is increased by ')
  // o: "Grants 12% Attribute DMG Bonus", "Increases ATK by 12%"
  let m = r1.match(/^([A-Za-z %]+?) (is )?increased by (\d+(?:\.\d+)?)%/i)
        || r1.match(/^Increases? ([A-Za-z %]+?) by (\d+(?:\.\d+)?)%/i);
  if (!m) {
    // "Grants 12% X" o "Gain 12% X"
    m = r1.match(/(?:Grants?|Gains?|Gain|Increase) (\d+(?:\.\d+)?)% ([\w .-]+?)(?:[.,]|$)/i);
  }
  if (!m) return null;
  const statName = (m[2] || m[1]).trim().replace(/[.,]/g,'');
  const pathKey = STAT_ORDER.find(name => statName.includes(name) || statName === name);
  if (!pathKey) return null;
  const stat = STAT_PATH[pathKey];
  if (!stat) return null;

  // valor a cada rango
  const valueByRank = [];
  for (let r = 1; r <= 5; r++) {
    const pr = cleanPassive(passives[r] || '');
    const vr = pr.match(/(?:increased by|Grants?|Gain|Increase|by)\s?(\d+(?:\.\d+)?)%/i);
    valueByRank.push(vr ? parseFloat(vr[1]) / 100 : null);
  }
  if (valueByRank.some(v => v === null)) return null;

  // stacks
  const stackM = r1.match(/stacking up to (\d+)/i);
  return { stat, value: valueByRank, maxStacks: stackM ? parseInt(stackM[1], 10) : 1 };
}

// ── slug helper ──────────────────────────────
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[\u2018\u2019\u201C\u201D]/g, '').replace(/[&]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const WJ_BY_NAME = {}; for (const w of WJ) if (!WJ_BY_NAME[w.name]) WJ_BY_NAME[w.name] = w;
// build slug->json lookup from weapon name via slugify
const WJ_BY_SLUG = {}; for (const w of WJ) { const s = slugify(w.name); if (!WJ_BY_SLUG[s]) WJ_BY_SLUG[s] = w; }

// mainStat -> second stat key
const SECOND_KEY = {
  'Crit Rate': 'critRate_', 'Crit. Rate': 'critRate_',
  'Crit DMG': 'critDmg_', 'Crit. DMG': 'critDmg_',
  'Energy Regen': 'energyRegen_',
  'ATK%': 'atk_', 'ATK': 'atk_',
  'DEF': 'def_', 'DEF%': 'def_', 'HP': 'hp_', 'HP%': 'hp_',
};

function build() {
  const results = { simple: 0, complex: 0, noSecond: 0 };
  for (const slug of Object.keys(DATA)) {
    const w = DATA[slug];
    const j = WJ_BY_SLUG[slug] || WJ_BY_NAME[w.name];
    if (!j) { console.log('SIN JSON', slug, w.name); continue; }
    const id = w.name.replace(/[^a-zA-Z0-9]/g, '');
    const weaponType = (j.type || '').toLowerCase();
    const rarity = j.rarity || 5;

    // stats 1-90
    const hp = null, def = null;
    const atk = {};
    for (const lvl of Object.keys(w.stats || {})) {
      atk[lvl] = parseFloat(w.stats[lvl].atk);
    }

    // second stat
    let secondKey = null, secondVals = null;
    const msName = j.mainStat && j.mainStat.name;
    if (msName && SECOND_KEY[msName]) {
      secondKey = SECOND_KEY[msName];
      secondVals = {};
      for (const lvl of Object.keys(w.stats || {})) {
        const v = w.stats[lvl].second;
        // si termina en % es fracción; si no, es el valor
        secondVals[lvl] = v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
      }
    } else if (msName) {
      console.log(`  second stat no mapeado [${w.name}]: ${msName}`);
    }

    // effects (passive): buffer base siempre + description_raw del passive completo
    const effects = [];
    const rawDesc = cleanPassive(w.passives['1'] || '');
    const baseBuff = parseBaseBuff(w.passives);
    results.numBase = (results.numBase || 0) + (baseBuff ? 1 : 0);

    // aplica el buff base (si es modelable) como effect siempre-activo
    if (baseBuff) {
      effects.push({
        id: `${id.toLowerCase()}_base`,
        name: id.replace(/([A-Z])/g, ' $1').trim(),
        descriptionTemplate: null,
        target: baseBuff.stat,
        modifiers: [{ operation: 'Add', valueType: 'Percent', value: baseBuff.value }],
        maxStacks: baseBuff.maxStacks,
        exclusive: false,
        enabledByDefault: true,
      });
    }

    // condicionales simples de 5★ (catálogo manual) — onAction
    const cw = catalog.weapons[id];
    if (cw && cw.extra) {
      for (let i = 0; i < cw.extra.length; i++) {
        const ex = cw.extra[i];
        if (!ex.onAction || ex.onAction.length === 0) continue; // no modelable → solo raw
        effects.push({
          id: `${id.toLowerCase()}_extra${i + 1}`,
          name: `${id.replace(/([A-Z])/g, ' $1').trim()} (condición)`,
          descriptionTemplate: null,
          target: ex.stat,
          modifiers: [{ operation: 'Add', valueType: 'Percent', value: ex.value }],
          maxStacks: ex.stacks || 1,
          exclusive: false,
          enabledByDefault: false,
          condition: { type: 'onAction', actionIds: ex.onAction },
        });
      }
    }

    // description_raw del passive completo (si hay algo no modelado)
    const rawEffect = {
      id: `${id.toLowerCase()}_passive`,
      name: `Pasiva: ${id.replace(/([A-Z])/g, ' $1').trim()}`,
      descriptionTemplate: null,
      target: null,
      modifiers: [],
      maxStacks: 1,
      exclusive: false,
      enabledByDefault: false,
      description_raw: rawDesc,
    };
    if (effects.length === 0) {
      effects.push(rawEffect);
    } else {
      effects.push(rawEffect); // siempre mostrar la descripción completa
    }

    const spec = {
      metadata: {
        schemaVersion: '2.0', id, name: w.name, entityType: 'weapon',
        rarity, version: '1.0', weaponType: cap(weaponType),
        tags: [], aliases: [],
      },
      stats: {
        hp: null, atk, def: null,
        secondaryAttribute: secondKey ? { key: secondKey, values: secondVals } : null,
        statNodes: [], tuneBreakBoost: null, offTuneBuildupRate: null,
      },
      actions: [],
      effects,
      mechanics: [],
      lore: { about: null, quote: null },
    };

    const outPath = path.join(OUT_DIR, `${id}.json5`);
    // No sobrescribir armas existentes hechas a mano con effects bien modelados
    if (fs.existsSync(outPath)) {
      const existing = fs.readFileSync(outPath, 'utf8');
      // conservar si ya tiene effects con target real (no description_raw)
      if (existing.includes('"target"') && !existing.includes('description_raw')) {
        console.log(`  ↻ conservando arma a mano: ${id}`);
        continue;
      }
    }
    fs.writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n');
  }
  console.log(`\nArmas con buff base modelado: ${results.numBase || 0}`);
}
function cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
build();
