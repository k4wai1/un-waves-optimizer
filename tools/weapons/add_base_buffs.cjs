// Añade el buff base (siempre activo) a las armas 5★ que quedaron solo en description_raw.
// El buff base de todas: "X y% -> 2X%" con escalado estándar 5★ [R1..R5].
// Kumokiri/Lethean: ATK 12→24 (su passive R1 tenía "ATK is increased by 12%")
'use strict';
const JSON5 = require('/home/luis/deepcode/un-waves-optimizer/node_modules/.pnpm/json5@2.2.3/node_modules/json5');
const fs = require('fs');
const dir = '/home/luis/deepcode/un-waves-optimizer/libs/ww/stats/src/weapons';

// stats base por arma (de los passives vistos en el reporte 5★)
const BASE = {
  // stat path, value [R1..R5]
  'AzureOath': { stat: 'stat.allDmgBonus', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
  'DefiersThorn': { stat: 'stat.hp_', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
  'EmeraldSentence': { stat: 'stat.atk_', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
  'Frostburn': { stat: 'stat.atk_', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
  'Kumokiri': { stat: 'stat.atk_', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
  'LetheanElegy': { stat: 'stat.atk_', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
  'LuxUmbra': { stat: 'stat.atk_', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
  'WoodlandAria': { stat: 'stat.atk_', vals: [0.12, 0.15, 0.18, 0.21, 0.24] },
};

for (const id of Object.keys(BASE)) {
  const fp = `${dir}/${id}.json5`;
  if (!fs.existsSync(fp)) { console.log('no existe', id); continue; }
  const d = JSON5.parse(fs.readFileSync(fp, 'utf8'));
  const b = BASE[id];
  // mantener el description_raw existente; añadir buff base al inicio de effects
  const kind = id.replace(/([A-Z])/g, ' $1').trim();
  const baseEff = {
    id: `${id.toLowerCase()}_base`, name: kind, descriptionTemplate: null,
    target: b.stat,
    modifiers: [{ operation: 'Add', valueType: 'Percent', value: b.vals }],
    maxStacks: 1, exclusive: false, enabledByDefault: true,
  };
  // no duplicar si ya existe _base
  if (!d.effects.some(e => e.id === baseEff.id)) {
    d.effects.unshift(baseEff);
    fs.writeFileSync(fp, JSON.stringify(d, null, 2) + '\n');
    console.log(`Añadido buff base ${b.stat} a ${id}`);
  } else {
    console.log(`${id} ya tenía base`);
  }
}
