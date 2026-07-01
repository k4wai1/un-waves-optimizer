# Cómo crear un arma

## 1. Crear el archivo

Copia `_BaseEntity.json5` a `weapons/TuArma.json` y completa.

## 2. Campos obligatorios en metadata

```json5
{
  "metadata": {
    "id": "NombreEnCamelCase",
    "name": "Nombre real del arma",
    "entityType": "weapon",
    "rarity": 5,
    "weaponType": "Sword"
  }
}
```

`weaponType` posible: `Sword`, `Broadblade`, `Rectifier`, `Pistols`, `Gauntlets`.

## 3. Stats base

```json5
"stats": {
  "atk": { "1": 33, "20": 85.84, ..., "90": 412.50 },
  "secondaryAttribute": {
    "key": "critRate_",
    "values": { "1": 0.054, ..., "90": 0.243 }
  }
}
```

Las armas solo tienen ATK y un stat secundario. HP y DEF son `null`.

## 4. Efectos (modifiers)

Las armas NO tienen `actions`. Sus efectos se modelan con `modifiers[]`.

### Buff de stat siempre activo

```json5
{
  "id": "arma_hp_buff",
  "name": "Increase HP",
  "descriptionTemplate": "Increase HP by {0}%",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "stat", "id": "hp_" },
      "type": "statBuff",
      "operation": "add",
      "value": [0.12, 0.15, 0.18, 0.21, 0.24],
      "maxStacks": 1,
      "durationSeconds": null
    }
  ],
  "condition": { "type": "always" }
}
```

### Efecto con stacks

```json5
{
  "id": "arma_atk_stack",
  "name": "ATK Stack on Skill",
  "descriptionTemplate": "ATK +{0}% per stack, max {1} stacks",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "stat", "id": "atk_" },
      "type": "statBuff",
      "operation": "add",
      "value": [0.06, 0.075, 0.09, 0.105, 0.12],
      "maxStacks": 2,
      "durationSeconds": 10
    }
  ],
  "condition": { "type": "onAction", "actionIds": ["skill"] }
}
```

## 5. value: escalado por rango

`value` tiene 5 posiciones [R1, R2, R3, R4, R5].
Si no escala, usar array de 1 elemento: `[0.20]`.

## Referencia rápida de modifier types

| type | target.type válidos | Qué hace |
|------|---------------------|----------|
| `statBuff` | `stat` | Modifica una stat global del portador |
| `statDebuff` | `stat` | Modifica una stat del enemigo (resistencia) |
| `damageMultiplier` | `action`, `actionType`, `tag` | Multiplica el daño de las acciones objetivo |
| `finalMultiplier` | `action`, `actionType`, `tag` | Multiplica el daño final (después de todo) |
| `replaceMultiplier` | `action` | Reemplaza el multiplier base de una acción |
| `extraScaling` | `action` | Añade escalado de otra stat (HP, DEF) |
| `extraHit` | `action` | Añade un golpe adicional |
| `energyRestore` | `mechanic` | Restaura energía de concierto/liberación |
