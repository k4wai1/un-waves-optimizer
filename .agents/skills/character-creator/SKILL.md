---
name: character-creator
description: Guía paso a paso para crear un personaje (resonator) de Wuthering Waves desde cero en formato JSON5, o para editar uno existente. Cubre metadata, stats por nivel 1-90, actions con multipliers Lv1-Lv10, effects (pasivas, S1-S6, inherent skills) y statNodes de 8 nodos. Usar cuando el usuario pida añadir un personaje nuevo, crear un personaje, editar un resonator, o convertir datos de wuthering.gg/Fandom a formato JSON5.
---

# Character Creator

Guía para crear o editar un resonator en formato JSON5 sin tocar el código del motor.

## Flujo completo

1. Copiar plantilla
2. Metadata
3. Stats (nivel 1-90)
4. Actions (habilidades y multiplicadores)
5. Effects (pasivas, secuencias, inherentes)
6. StatNodes (8 nodos)
7. Validar

---

## 1. Copiar plantilla

```bash
cp libs/ww/stats/src/resonators/CharacterTemplate.json5 libs/ww/stats/src/resonators/TuPersonaje.json5
```

## 2. Metadata

```json5
"metadata": {
  "id": "TuPersonaje",
  "name": "Nombre del personaje",
  "entityType": "resonator",
  "rarity": 5,
  "element": "Spectro",
  "weaponType": "Sword",
  "tags": ["mainDps", "spectro"]
}
```

- `id`: camelCase, único (ej. `RoverHavoc`)
- Elementos: `Glacio`, `Fusion`, `Electro`, `Aero`, `Spectro`, `Havoc`
- Armas: `Sword`, `Broadblade`, `Rectifier`, `Pistols`, `Gauntlets`
- tags de rol: `mainDps`, `subDps`, `healer`, `support`, `shield`

## 3. Stats (nivel 1-90)

```json5
"stats": {
  "hp": { "1": 805, "20": 2093, "40": 3986.76, ..., "90": 10062.50 },
  "atk": { "1": 22, "20": 57.2, ..., "90": 275 },
  "def": { "1": 77, "20": 197.12, ..., "90": 941.09 },
  "secondaryAttribute": null,
  "statNodes": [],
  "tuneBreakBoost": 0.0,
  "offTuneBuildupRate": 1.0
}
```

Los valores 1-90 se extraen de wuthering.gg con el skill `wuw-gg-datamine` (sección 2.8/2.9 del skill) o de encore.moe.

## 4. Actions (habilidades y multiplicadores)

Cada acción representa UNA fila de la tabla de multiplicadores.

```json5
{
  "id": "basic_1",
  "name": "Stage 1 DMG",
  "type": "basicAttack",
  "scaling": [
    { "stat": "ATK", "multiplier": [24.50, 26.51, 28.52, ..., 48.71] }
  ],
  "tags": ["melee", "glacio"]
}
```

### type (enumerado)

`basicAttack`, `heavyAttack`, `plungingAttack`, `dodgeCounter`,
`resonanceSkill`, `resonanceLiberation`, `forteCircuit`,
`introSkill`, `outroSkill`, `echoSkill`

### stat en scaling

`ATK`, `HP`, `DEF`, `FLAT`

- `ATK/HP/DEF`: porcentaje que escala con el stat (`multiplier` en % del stat)
- `FLAT`: formato legacy donde `multiplier` ES el valor flat (ej. 660)

### kind (opcional)

`damage` (default), `heal`, `shield`, `coordinated`

```json5
{ "id": "skill_heal", "name": "Healing", "type": "resonanceSkill", "kind": "heal", "scaling": [{ "stat": "ATK", "multiplier": [660, 712, ...] }] }
```

- **heal**: `(flat + stat×mv) × (1 + healingBonus_)` — NO usa def/res/crit
- **shield**: `(flat + stat×mv) × (1 + shieldBonus_)` — NO usa def/res/crit
- **damage**: fórmula completa con def/res/crit/bonuses

### flat (opcional)

Para daño/cura/escudo flat extra: `"flat": 400` significa "+400" al resultado base.

### formId (opcional)

Agrupa acciones por forma/modo del personaje (ej. `"formId": "incarnation"` para Jinhsi, `"moonbow"` para Iuno). Se muestra como tag en la UI.

### Multipliers: SIEMPRE 10 niveles

Los multipliers van de Lv1-Lv10 (los niveles reales de habilidad). Si la fuente solo muestra Lv1-Lv9 + cola teórica, el Lv10 es el primer valor de la cola. Ver skill `wuw-gg-datamine` sección 2.2.1.

Para multi-hit: `10.85%*4` → usar el valor por golpe `10.85` (el motor no multiplica por golpes).

## 5. Effects (pasivas, secuencias, inherentes)

### Buff a stat global

```json5
{
  "id": "personaje_inherente_1",
  "name": "Inherent Passive",
  "descriptionTemplate": "Increase Elemental DMG by {0}%",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "stat", "id": "allDmgBonus_" },
      "type": "statBuff",
      "operation": "add",
      "value": [0.20],
      "maxStacks": 1,
      "durationSeconds": null
    }
  ],
  "condition": { "type": "always" }
}
```

### Buff a UNA acción específica

```json5
{
  "target": { "type": "action", "id": "basic_3" },
  "type": "damageMultiplier",
  "operation": "add",
  "value": [0.35]
}
```

### Buff a UN TIPO de acción

```json5
{
  "target": { "type": "actionType", "id": "resonanceSkill" },
  "type": "damageMultiplier",
  "operation": "add",
  "value": [0.20],
  "condition": { "type": "onAction", "actionIds": ["intro"] }
}
```

### Secuencias (S1..S6)

Mismos modifiers pero con `enabledByDefault: false`. La UI las activa según el Resonance Chain seleccionado.

### Deepen (amplificación)

Los Outro Skills y amplificaciones usan `dmgAmplify_` (categoría multiplicativa separada del DMG Bonus):

```json5
{
  "target": { "type": "stat", "id": "dmgAmplify_" },
  "type": "statBuff",
  "operation": "add",
  "value": [0.38]
}
```

**Deepen por tipo (fixeado en `f97f33ac`):** si el Deepen aplica solo a un tipo de
acción (ej. "Heavy Attack DMG Deepen"), usa el path específico en vez de `dmgAmplify_`:

| Path | Aplica a |
|---|---|
| `stat.basicAmplify` | Basic Attacks |
| `stat.heavyAmplify` | Heavy Attacks |
| `stat.skillAmplify` | Resonance Skills |
| `stat.liberationAmplify` | Resonance Liberations |
| `stat.coordinatedAmplify` | Coordinated Attacks |

```json5
{ "target": { "type": "stat", "id": "heavyAmplify_" }, "value": [0.38] }
```

⚠️ Ojo: los paths declarativos son en forma corta sin suscriptor (`stat.basicAmplify`)
pero el legacy usa la key del context (`basicAmplify_`). El motor mapea ambos.

## 6. StatNodes (8 nodos)

Cada personaje tiene 8 nodos de ascensión: 2 stats × 4 nodos (2× valor bajo + 2× valor alto).

```json5
"statNodes": [
  { "id": "node_atk_l1", "name": "ATK +1.8%", "buffs": { "atk_": 0.018 } },
  { "id": "node_atk_l2", "name": "ATK +1.8%", "buffs": { "atk_": 0.018 } },
  { "id": "node_atk_h1", "name": "ATK +4.2%", "buffs": { "atk_": 0.042 } },
  { "id": "node_atk_h2", "name": "ATK +4.2%", "buffs": { "atk_": 0.042 } },
  { "id": "node_hp_l1", "name": "HP +1.8%", "buffs": { "hp_": 0.018 } },
  { "id": "node_hp_l2", "name": "HP +1.8%", "buffs": { "hp_": 0.018 } },
  { "id": "node_hp_h1", "name": "HP +4.2%", "buffs": { "hp_": 0.042 } },
  { "id": "node_hp_h2", "name": "HP +4.2%", "buffs": { "hp_": 0.042 } }
]
```

Valores por stat:
- ATK/HP/DEF/Healing/Elemental DMG: 1.80% / 4.20%
- DEF: 2.28% / 5.32% (nota: DEF difiere del resto)
- Crit. Rate: 1.20% / 2.80%
- Crit. DMG: 2.40% / 5.60%

Keys de buffs: `atk_`, `hp_`, `def_`, `critRate_`, `critDmg_`, `energyRegen_`,
`glacio_dmg_`, `fusion_dmg_`, `electro_dmg_`, `aero_dmg_`, `spectro_dmg_`, `havoc_dmg_`, `healing_bonus_`

Extraer los statNodes reales con `tools/extract_statnodes.cjs` (usa la API de encore.moe).

## 7. Validar

Después de crear el personaje:

1. Ejecutar el skill `spec-validator` (parsing JSON5 + invariantes)
2. Ejecutar los tests del frontend (`cd app/ww-frontend && npx vitest run`)
3. Abrir la UI y verificar que el personaje aparece y calcula daño

## Ver también

- `libs/ww/stats/src/resonators/README.md` — esquema completo
- `libs/ww/stats/src/resonators/CharacterTemplate.json5` — plantilla
- `.agents/skills/wuw-gg-datamine/SKILL.md` — cómo extraer multiplicadores y stats
- `.agents/skills/spec-validator/SKILL.md` — validación
- `Wuthering_Waves_Multiplicadores.md` — fórmula de daño
