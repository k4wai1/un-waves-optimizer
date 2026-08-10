// Genera las 3 armas cuyo slug no matcheó con weapons.json
// (Lux Umber/Lux & Umbra, Azure Oath, Firstlight's Herald)
'use strict';
const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync('/tmp/ww-weapons-data.json', 'utf8'));
const OUT = '/home/luis/deepcode/un-waves-optimizer/libs/ww/stats/src/weapons';
const WEAPONS_JSON = require('/home/luis/deepcode/un-waves-optimizer/weapons/weapons.json');
const WJ = Array.isArray(WEAPONS_JSON) ? WEAPONS_JSON : Object.values(WEAPONS_JSON);

// rareza/tipo. Tipos de Azure Oath/Firstlight provisionales (no en weapons.json local).
// second stat: Lux=Crit DMG, Azure=Crit Rate, Firstlight=Energy Regen (verificado en wuthering.gg)
const overrides = {
  'lux-&-umbra': { name: 'Lux & Umbra', rarity: 5, type: 'Pistols', secondKey: 'critDmg_', imgSrc: 'weapons/Lux & Umber.webp' },
  'azure-oath': { name: 'Azure Oath', rarity: 5, type: 'Broadblade', secondKey: 'critRate_', typeProvisional: true },
  'firstlights-herald': { name: "Firstlight's Herald", rarity: 4, type: 'Rectifier', secondKey: 'energyRegen_', typeProvisional: true },
};
const SECOND_KEY_MAP = { critDmg_: 'critDmg_', critRate_: 'critRate_', energyRegen_: 'energyRegen_', atk_: 'atk_', def_: 'def_', hp_: 'hp_' };

function cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }

for (const slug of ['lux-&-umbra', 'azure-oath', 'firstlights-herald']) {
  const w = DATA[slug];
  if (!w) { console.log('no data', slug); continue; }
  const ov = overrides[slug];
  const id = ov.name.replace(/[^a-zA-Z0-9]/g, '');
  const atk = {};
  for (const lvl of Object.keys(w.stats)) atk[lvl] = parseFloat(w.stats[lvl].atk);
  const secondVals = {};
  for (const lvl of Object.keys(w.stats)) {
    const v = w.stats[lvl].second;
    secondVals[lvl] = v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
  }
  const rawDesc = (w.passives['1'] || '').split(' About')[0].trim();
  const spec = {
    metadata: { schemaVersion: '2.0', id, name: ov.name, entityType: 'weapon', rarity: ov.rarity, version: '1.0', weaponType: cap(ov.type), tags: [], aliases: [] },
    stats: { hp: null, atk, def: null, secondaryAttribute: { key: ov.secondKey, values: secondVals }, statNodes: [], tuneBreakBoost: null, offTuneBuildupRate: null },
    actions: [],
    effects: [{ id: `${id.toLowerCase()}_passive`, name: `Pasiva: ${id.replace(/([A-Z])/g, ' $1').trim()}`, descriptionTemplate: null, target: null, modifiers: [], maxStacks: 1, exclusive: false, enabledByDefault: false, description_raw: rawDesc }],
    mechanics: [], lore: { about: null, quote: null },
  };
  fs.writeFileSync(`${OUT}/${id}.json5`, JSON.stringify(spec, null, 2) + '\n');
  // copiar imagen si está disponible
  if (ov.imgSrc && fs.existsSync('/home/luis/deepcode/un-waves-optimizer/' + ov.imgSrc)) {
    fs.copyFileSync('/home/luis/deepcode/un-waves-optimizer/' + ov.imgSrc, `${OUT}/${id}.webp`);
  }
  console.log('Generada:', id, '(img:', !!ov.imgSrc, ')');
}
