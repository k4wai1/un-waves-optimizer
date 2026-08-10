# Cómo crear un arma

## 1. Archivo

Cada arma tiene dos archivos en esta carpeta:
- `<Id>.json5` — datos (stats, second stat, effects de pasiva)
- `<Id>.webp` — imagen (nombre = `metadata.id`)

El `metadata.id` es el nombre sin espacios ni símbolos (ej. `EmeraldOfGenesis`).

## 2. metadata

```json5
{
  "metadata": {
    "id": "EmeraldOfGenesis",
    "name": "Emerald of Genesis",
    "entityType": "weapon",
    "rarity": 5,
    "weaponType": "Sword",
    "tags": [],
    "aliases": []
  }
}
```

`weaponType`: `Sword`, `Broadblade`, `Rectifier`, `Pistols`, `Gauntlets`.
`rarity`: 1-5. A nivel 90, ATK base ≈ 412 (4★) o 587 (5★).

## 3. Stats base (1-90)

```json5
"stats": {
  "hp": null,
  "atk": { "1": 33, "2": 35.75, "...": "...", "90": 587.50 },
  "def": null,
  "secondaryAttribute": {
    "key": "critRate_",
    "values": { "1": 0.038, "...": "...", "90": 0.243 }
  },
  "statNodes": [],
  "tuneBreakBoost": null,
  "offTuneBuildupRate": null
}
```

- `atk` tiene la progresión completa de nivel 1 a 90.
- `secondaryAttribute`: `key` (estat secundario) + `values` por nivel.
  Keys: `critRate_`, `critDmg_`, `energyRegen_`, `atk_`, `def_`, `hp_`.

## 4. Effects (pasiva)

Las armas NO tienen `actions`. Su pasiva se modela con `effects[]`.

### Buff siempre activo (stat base)

```json5
{
  "id": "vermont_base",
  "name": "Verdant Summit",
  "descriptionTemplate": null,
  "target": "stat.allDmgBonus",
  "modifiers": [{ "operation": "Add", "valueType": "Percent", "value": [0.12, 0.15, 0.18, 0.21, 0.24] }],
  "maxStacks": 1,
  "exclusive": false,
  "enabledByDefault": true
}
```

`value` tiene 5 posiciones [R1..R5].

### Buff condicional a una acción (onAction)

```json5
{
  "id": "vermont_heavy_on_intro",
  "name": "Verdant Summit (condición)",
  "target": "stat.heavyDmg",
  "modifiers": [{ "operation": "Add", "valueType": "Percent", "value": [0.24, 0.30, 0.36, 0.42, 0.48] }],
  "maxStacks": 2,
  "exclusive": false,
  "enabledByDefault": false,
  "condition": { "type": "onAction", "actionIds": ["introSkill", "resonanceLiberation"] }
}
```

### Pasiva compleja (descripción textual)

Cuando la pasiva depende de estados elementales (ej. "After inflicting Glacio Chafe"),
de estar on/off-field, o de buffs de equipo que el motor aún no modela, se guarda
como `description_raw` (solo texto informativo, `enabledByDefault: false`):

```json5
{
  "id": "freezeframe_passive",
  "name": "Pasiva: Freeze Frame",
  "target": null,
  "modifiers": [],
  "maxStacks": 1,
  "enabledByDefault": false,
  "description_raw": "Increases ATK by 12%. After inflicting Glacio Chafe on the target, ..."
}
```

## 5. Extracción de datos

Las stats y pasivas se extrajeron de wuthering.gg con los scripts en `tools/weapons/`:

- `extract_weapons.cjs` — scrapea wuthering.gg vía CDP (sliders de nivel 1-90 y rango R1-R5)
- `generate_weapons.cjs` — convierte los datos extraídos a `.json5`
- `parse_base_buff.cjs` — extrae el buff base (siempre activo) de cada pasiva
- `five_star_catalog.cjs` — catálogo manual de effects para armas 5★

Ver `docs/weapons-extraction.md` para el detalle de la técnica.

## 6. validación

```bash
node -e 'const JSON5=require("./node_modules/.pnpm/json5@2.2.3/node_modules/json5");const fs=require("fs");const dir="libs/ww/stats/src/weapons";let ok=0,fail=0;for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".json5"))){try{const d=JSON5.parse(fs.readFileSync(dir+"/"+f,"utf8"));if(!d.metadata?.id||!d.stats?.atk?.["90"]){console.log("bad:",f);fail++;continue;}ok++;}catch(e){console.log("ERR:",f,e.message);fail++;}}console.log("OK:",ok,"FAIL:",fail);'
```

Y los tests del frontend (`cd app/ww-frontend && npx vitest run`).
