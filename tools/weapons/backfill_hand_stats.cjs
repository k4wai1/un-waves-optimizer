// Completa stats.atk (1-90) y secondaryAttribute de las armas que ya tenían effects a mano
// (solo actualiza stats, conserva effects/metadata existentes)
'use strict';
const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync('/tmp/ww-weapons-data.json', 'utf8'));
const OUT = '/home/luis/deepcode/un-waves-optimizer/libs/ww/stats/src/weapons';

const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[\u2018\u2019\u201C\u201D]/g, '').replace(/[&]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DATA_BY_NAME = {};
for (const k of Object.keys(DATA)) DATA_BY_NAME[DATA[k].name] = DATA[k];

const handWeapons = ['AbyssSurges', 'CosmicRipples', 'LustrousRazor', 'EmeraldOfGenesis', 'StaticMist', 'BlazingBrilliance', 'LaserShearer', 'StellarSymphony'];

for (const id of handWeapons) {
  const fp = `${OUT}/${id}.json5`;
  if (!fs.existsSync(fp)) { console.log('no existe', id); continue; }
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const data = DATA_BY_NAME[d.metadata?.name || d.name];
  if (!data) { console.log('sin datos extraídos para', id, '(', d.metadata?.name, ')'); continue; }
  // reconstruir atk 1-90
  const atk = {};
  for (const lvl of Object.keys(data.stats)) atk[lvl] = parseFloat(data.stats[lvl].atk);
  d.stats.atk = atk;
  // second stat values 1-90 (mantener key existente)
  if (d.stats.secondaryAttribute && d.stats.secondaryAttribute.key && d.stats.secondaryAttribute.values) {
    const key = d.stats.secondaryAttribute.key;
    for (const lvl of Object.keys(data.stats)) {
      const v = data.stats[lvl].second;
      d.stats.secondaryAttribute.values[lvl] = v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
    }
  }
  fs.writeFileSync(fp, JSON.stringify(d, null, 2) + '\n');
  console.log('Completada stat de', id, '— atk keys:', Object.keys(atk).length);
}
