// Mejorado: extrae el BUFF BASE (primera cláusula incondicional) de cada arma.
// Devuelve { stat, value: [r1..r5], maxStacks } o null.
'use strict';

// mapeo de nombres de stat (con sinónimos) → path
const NAME_MAP = [
  [/resonance liberation dmg bonus|resonance liberation dmg|liberation dmg bonus|liberation dmg/i, 'stat.liberationDmg'],
  [/resonance skill dmg bonus|resonance skill dmg|skill dmg bonus|skill dmg/i, 'stat.skillDmg'],
  [/heavy attack dmg bonus|heavy attack dmg|heavy dmg bonus|heavy dmg/i, 'stat.heavyDmg'],
  [/basic attack dmg bonus|basic attack dmg|basic dmg bonus|basic dmg/i, 'stat.basicDmg'],
  [/all-attribute dmg bonus|attribute dmg bonus|all dmg bonus|all dmg/i, 'stat.allDmgBonus'],
  [/glacio dmg bonus|glacio dmg/i, 'stat.glacioDmg'], [/fusion dmg bonus|fusion dmg/i, 'stat.fusionDmg'],
  [/electro dmg bonus|electro dmg/i, 'stat.electroDmg'], [/aero dmg bonus|aero dmg/i, 'stat.aeroDmg'],
  [/spectro dmg bonus|spectro dmg/i, 'stat.spectroDmg'], [/havoc dmg bonus|havoc dmg/i, 'stat.havocDmg'],
  [/energy regen/i, 'stat.energyRegen'],
  [/crit(?:\.|) rate/i, 'stat.critRate'], [/crit(?:\.|) dmg/i, 'stat.critDmg'],
  [/healing bonus/i, 'stat.healingBonus'],
  [/\batk%/i, 'stat.atk_'], [/\batk\b/i, 'stat.atk_'],
  [/\bdef%/i, 'stat.def_'], [/\bdef\b/i, 'stat.def_'],
  [/max hp|hp%/i, 'stat.hp_'], [/\bhp\b/i, 'stat.hp_'],
];

// detecta si el texto (head) está "contaminado" por una condición inicial
const COND_START = /When |After |Upon |Casting |Every |Dealing |While |Within |Grants? \d stack|Providing |Obtaining |Inflicting |Performing |Hitting |Restore |If the |Equipped |Incoming |\[|using |gains \d stacks/i;

const clean = (s) => (s || '').split(' About')[0].trim();

// Quita el nombre de la habilidad (la descripción empieza en un verbo de buff).
// Quita el nombre de la habilidad (nombres tipo "Stormy Resolution", "Thread of Fate", etc.).
// Solo corta si hay un verbo de buff (Increases/Grants/Gain/Increase) cerca del inicio,
// NO en condiciones posteriores ("When/Upon/Dealing" que aparecen en medio de la pasiva).
function stripSkillName(s) {
  // Si ya empieza con un verbo de buff → es descripción, sin nombre que quitar.
  if (/^(Increases?|Grants?|Gain|Increase|Restore)\b/i.test(s)) return s;
  // Buscar "Increases/Grants/Gain/Increase" precedido por el nombre del skill.
  const m = s.match(/[\s.;](Increases?|Grants?|Gain|Increase|Restore)\b/i);
  if (m && m.index > 0) return s.slice(m.index + 1).trim();
  // Si no hay verbo de buff, devolver tal cual (el parser buscará "<Stat> is increased by").
  return s;
}

// Extrae { stat, value, maxStacks } del passive
function parseBaseBuff(passives) {
  const r1 = clean(passives['1'] || '');
  // NO aplicamos stripSkillName aquí: el buff base ("X is increased by P%" o
  // "Increases/Grants P% X") siempre aparece al inicio de la descripción, tras el
  // nombre de la pasiva. Buscamos directamente en el texto completo.
  const body = r1;
  const justHead = body.split(/[.;]\s/)[0];

  // A) "<Stat> is increased by P%" — el stat puede venir precedido del nombre del skill
  const byPct = justHead.match(/([A-Za-z][\w .%-]{1,26}) is (?:being )?increased by ([\d.]+)%/i);
  if (byPct) {
    const statPath = findBestStat(byPct[1]);
    if (statPath) return buildResult(statPath, passives, body);
  }
  // B) "Increases <Stat> by P%" o "Grants/Gain P% <Stat>" al inicio
  const inc = justHead.match(/^(Increases?|Grants?|Gain|Increase) ([A-Za-z][\w .%-]{1,24}?) by ([\d.]+)%/i)
    || justHead.match(/(?:Increases?|Grants?|Gain) ([\d.]+)% ([A-Za-z][\w .%-]{1,24}?)(?:[.,]|$)/i);
  if (inc) {
    const statRaw = inc[2] || inc[3];
    const statPath = findBestStat(statRaw);
    if (statPath) return buildResult(statPath, passives, body);
  }
  return null;
}

// encuentra el stat de NAME_MAP que mejor matchea dentro de un texto (que puede incluir nombre del skill)
function findBestStat(raw) {
  const t = String(raw || '').trim().replace(/[.,]/g, '');
  for (const [re, path] of NAME_MAP) {
    if (re.test(t)) return path;
  }
  return null;
}

function buildResult(stat, passives, body) {
  const vals = [];
  for (let r = 1; r <= 5; r++) {
    const pr = clean(passives[r] || '');
    // buscar el valor % del buff base en cada rango (el primero que aparezca tras el buff)
    const vm = pr.match(/(?:increased by|is increased by|Increases?|Gain|Grants?|by)\s?([\d.]+)%/i);
    vals.push(vm ? parseFloat(vm[1]) / 100 : null);
  }
  if (vals.some(v => v === null)) return null;
  const stM = (body || '').match(/stacking up to (\d+)/i);
  return { stat, value: vals, maxStacks: stM ? parseInt(stM[1], 10) : 1 };
}

module.exports = { parseBaseBuff, clean };
