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

// Quita el nombre de la habilidad (la descripción empieza en un verbo de buff o "<stat> is increased")
function stripSkillName(s) {
  const m = s.match(/(Increases?|Grants?|Gain|Increase|is increased by|Restore|Casting |When |Dealing |Provide|While |Every |Within |Equipped )/i);
  if (m && m.index > 0) return s.slice(m.index).trim();
  return s;
}

// Extrae { stat, value, maxStacks } del passive
function parseBaseBuff(passives) {
  const r1 = clean(passives['1'] || '');
  const body = stripSkillName(r1);
  const head = body.split(/\.\s/)[0]; // primera oración

  // ¿la primera oración es un buff incondicional? (empieza con verbo o "<stat> is increased", no con condición)
  if (COND_START.test(head) && !/^(increases?|grants?|gain|increase|[a-z]+dmg)/i.test(head)) {
    return null;
  }

  // patrón: "<Stat> is increased by P%" o "Increases <Stat> by P%" (m[1]=stat, m[2]=pct)
  //         o "Grants/Gain P% <Stat>" (m2[1]=pct, m2[2]=stat)
  const byPct = head.match(/^(.+?) is (?:being )?increased by ([\d.]+)%/i)
    || head.match(/^Increases? (.+?) by ([\d.]+)%/i);
  const grantsPct = head.match(/(?:Grants?|Gain|Increase) ([\d.]+)% (.+?)(?:[.,]|$)/i);

  let statName = null, pct = null;
  if (byPct) { statName = byPct[1]; pct = parseFloat(byPct[2]); }
  else if (grantsPct) { statName = grantsPct[2]; pct = parseFloat(grantsPct[1]); }
  else return null;

  // normalizar nombre del stat (quitar sufijos raros del nombre de skill)
  statName = String(statName).trim().replace(/[.,]/g, '');
  const matched = NAME_MAP.find(([re]) => re.test(statName));
  if (!matched) return null;
  const stat = matched[1];

  // valor por rango
  const vals = [];
  for (let r = 1; r <= 5; r++) {
    const pr = clean(passives[r] || '');
    const b2 = stripSkillName(pr);
    const vm = b2.match(/(?:increased by|Increases?|Gain|Grants?|by) (\d+(?:\.\d+)?)%/i);
    vals.push(vm ? parseFloat(vm[1]) / 100 : null);
  }
  if (vals.some(v => v === null)) return null;

  // stacks: si el buff base dice "stacking up to N" en la primera oración
  const stM = r1.match(/stacking up to (\d+)/i);
  return { stat, value: vals, maxStacks: stM ? parseInt(stM[1], 10) : 1 };
}

module.exports = { parseBaseBuff, clean };
