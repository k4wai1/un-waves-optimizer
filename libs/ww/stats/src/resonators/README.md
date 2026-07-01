# Cómo crear un resonador

## 1. Archivo

Copia `CharacterTemplate.json` a `resonators/TuPersonaje.json`.

## 2. metadata

```json5
"metadata": {
  "id": "NombreEnCamelCase",
  "name": "Nombre del personaje",
  "entityType": "resonator",
  "rarity": 5,
  "element": "Spectro",
  "weaponType": "Sword",
  "tags": ["mainDps", "spectro"]
}
```

Elementos: `Glacio`, `Fusion`, `Electro`, `Aero`, `Spectro`, `Havoc`.
Armas: `Sword`, `Broadblade`, `Rectifier`, `Pistols`, `Gauntlets`.

### tags disponibles

Rol: `mainDps`, `subDps`, `healer`, `support`, `shield`
Recurso: `energy`, `coordinated`, `burst`, `skill`, `basicAttack`, `heavyAttack`
Elemento: `glacio`, `fusion`, `electro`, `aero`, `spectro`, `havoc`
Mecánica: `freeze`, `empower`

## 3. stats

```json5
"stats": {
  "hp": { "1": 805, ..., "90": 10062.50 },
  "atk": { "1": 22, ..., "90": 275 },
  "def": { "1": 77, ..., "90": 941.09 },
  "secondaryAttribute": null,
  "statNodes": [ /* nodos de stat tree */ ],
  "tuneBreakBoost": 0.0,
  "offTuneBuildupRate": 1.0
}
```

## 4. actions (habilidades)

Cada acción representa UN golpe. IDs únicos para que los modifiers puedan referenciarlos.

```json5
{
  "id": "basic_1",
  "name": "Stage 1 DMG",
  "type": "basicAttack",
  "scaling": [
    { "stat": "ATK", "multiplier": [0.245, 0.265, 0.285, ...] }
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

### Convención de IDs

| Tipo | ID |
|------|-----|
| Básico 1 | `basic_1` |
| Básico 2 | `basic_2` |
| ... | ... |
| Heavy | `heavy_1` |
| Plunge | `plunge` |
| Dodge | `dodge` |
| Skill | `skill` |
| Liberación | `liberation` |
| Forte | `forte_1` |
| Intro | `intro` |
| Outro | `outro` |
| Eco | `echo` |

Para multi-hit: `basic_4_hit1`, `basic_4_hit2`, etc.

## 5. effects con modifiers

Cada pasiva, secuencia o inherente se modela como un effect con modifiers[].

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

### Buff a UNA acción específica (por ID)

```json5
{
  "id": "personaje_s2",
  "name": "S2: Basic 3 Empower",
  "descriptionTemplate": "Basic Attack Stage 3 deals {0}% more damage",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "action", "id": "basic_3" },
      "type": "damageMultiplier",
      "operation": "add",
      "value": [0.35],
      "maxStacks": 1,
      "durationSeconds": null
    }
  ],
  "condition": { "type": "always" }
}
```

### Buff a UN TIPO de acción

```json5
{
  "id": "personaje_condensation",
  "name": "Condensation",
  "descriptionTemplate": "Resonance Skill DMG +{0}% for {1}s after Intro",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "actionType", "id": "resonanceSkill" },
      "type": "damageMultiplier",
      "operation": "add",
      "value": [0.20],
      "maxStacks": 1,
      "durationSeconds": 8
    }
  ],
  "condition": { "type": "onAction", "actionIds": ["intro"] }
}
```

### Escalado extra (ej: "Basic 3 escala con HP")

```json5
{
  "id": "personaje_hp_scaling",
  "name": "HP Scaling",
  "descriptionTemplate": "Basic 3 gains {0}% of Max HP as extra damage",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "action", "id": "basic_3" },
      "type": "extraScaling",
      "sourceStat": "HP",
      "ratio": [0.20],
      "maxStacks": 1,
      "durationSeconds": null
    }
  ],
  "condition": { "type": "always" }
}
```

### Efecto con múltiples modifiers (misma habilidad)

```json5
{
  "id": "personaje_pasiva_compleja",
  "name": "Complex Passive",
  "descriptionTemplate": "ATK +{0}%, Skill DMG +{1}%",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "stat", "id": "atk_" },
      "type": "statBuff",
      "operation": "add",
      "value": [0.12],
      "maxStacks": 1,
      "durationSeconds": null
    },
    {
      "target": { "type": "actionType", "id": "resonanceSkill" },
      "type": "damageMultiplier",
      "operation": "add",
      "value": [0.20],
      "maxStacks": 1,
      "durationSeconds": null
    }
  ],
  "condition": { "type": "always" }
}
```

### Secuencias (S1..S6)

Mismos modifiers, pero con `enabledByDefault: false`.

## 6. conditions

| type | Cuándo se activa |
|------|------------------|
| `always` | Siempre |
| `onAction` | Al usar una acción específica (`actionIds`) |
| `onCondition` | Condición de estado (`subtype`) |

### subtypes de onCondition

| subtype | threshold | Significado |
|---------|-----------|-------------|
| `enemyHpBelow` | 0.50 | Enemigo con menos de 50% HP |
| `hpBelow` | 0.30 | Portador con menos de 30% HP |
| `comboCount` | 3 | Después de 3 golpes en combo |

## 7. descriptionTemplate

NO escribir descripciones a mano. Usar plantillas:

```
"descriptionTemplate": "Increase {0}% ATK for {1}s, max {2} stacks"
```

`{0}` se reemplaza con el primer valor del modifier.
`{1}` con el segundo, etc.

## 8. Stat keys disponibles

### Stats base (porcentajes)

`hp_`, `atk_`, `def_`

### Stats de combate

`critRate_`, `critDmg_`, `energyRegen_`, `allDmgBonus_`, `dmgAmplify_`,
`skillDmg_`, `basicDmg_`, `heavyDmg_`, `liberationDmg_`, `echoDmg_`,
`coordinated_dmg_`, `outroDmg_`, `healing_bonus_`, `defIgnore_`

### Daño elemental

`glacio_dmg_`, `fusion_dmg_`, `electro_dmg_`, `aero_dmg_`, `spectro_dmg_`, `havoc_dmg_`

### Resistencias

`glacioRes_`, `fusionRes_`, `electroRes_`, `aeroRes_`, `spectroRes_`, `havocRes_`
