import fs from 'fs';
import path from 'path';

// Lee el archivo bruto
const rawData = JSON.parse(fs.readFileSync('weapons.json', 'utf8'));

// Directorio destino
const outDir = path.join('..', 'libs', 'ww', 'stats', 'src', 'weapons');

// Diccionario de stats para el motor
const statMapping = {
  "Crit Rate": "critRate_",
  "Crit DMG": "critDmg_",
  "ATK": "atk_",
  "ATK%": "atk_",
  "DEF": "def_",
  "DEF%": "def_",
  "HP": "hp_",
  "HP%": "hp_",
  "Energy Regen": "energyRegen_"
};

const parseValue = (str) => {
  if (typeof str !== 'string') return str;
  if (str.includes('%')) return parseFloat(str) / 100;
  return parseFloat(str);
};

const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '');

rawData.forEach(w => {
  const cleanId = w.name.replace(/[^a-zA-Z0-9]/g, '');
  
  const weaponData = {
    id: cleanId,
    name: w.name,
    rarity: w.rarity,
    weaponType: w.type.toLowerCase(),
    baseStats: {
      atk: { "90": parseValue(w.attack) }
    },
    passives: {},
    mechanics: {
      description_raw: stripHtml(w.description || ""),
      maxStacks: 1,
      trigger: "todo",
      duration_sec: 0
    }
  };

  // ✅ CORRECCIÓN: Validación de seguridad. Solo procesa el stat si existe.
  if (w.mainStat && w.mainStat.name) {
    let statKey = statMapping[w.mainStat.name] || w.mainStat.name.toLowerCase();
    if (w.mainStat.name === 'ATK' && w.mainStat.value.includes('%')) statKey = 'atk_';

    weaponData.secondStat = {
      statKey: statKey,
      values: { "90": parseValue(w.mainStat.value) }
    };
  }

  const filename = path.join(outDir, `${cleanId}.json`);
  fs.writeFileSync(filename, JSON.stringify(weaponData, null, 2));
  console.log(`✅ Exportado: ${cleanId}.json`);
});

console.log("\n🚀 Migración completada. Armas enviadas a libs/ww/stats/src/weapons/");
