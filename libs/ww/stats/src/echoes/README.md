# Cómo crear un eco

## 1. Archivo

Copia `_BaseEntity.json5` a `echoes/TuEco.json`.

## 2. metadata

```json5
"metadata": {
  "id": "NombreEco",
  "name": "Nombre del eco",
  "entityType": "echo",
  "rarity": 5,
  "element": "Havoc",
  "tags": ["echo", "havoc"]
}
```

## 3. stats

Los ecos tienen un stat secundario fijo (no escala por nivel):

```json5
"stats": {
  "secondaryAttribute": {
    "key": "atk_",
    "value": 0.18
  }
}
```

## 4. actions (echoSkill)

El eco tiene UNA habilidad: `echoSkill`.

```json5
{
  "id": "eco_golpes",
  "name": "Eco Slashes (5 hits)",
  "type": "echoSkill",
  "scaling": [
    { "stat": "ATK", "multiplier": [54.08, 54.08, 54.08, 54.08, 54.08] }
  ],
  "tags": ["havoc"],
  "cooldown": 20
}
```

## 5. effects

Los efectos del eco pueden ser:

- **Pasivos**: buffs que aplica mientras está equipado
- **Condicionales**: buffs que se activan al usar el echoSkill bajo ciertas condiciones

```json5
{
  "id": "eco_liberation_buff",
  "name": "Post-Liberation DMG Boost",
  "descriptionTemplate": "After Resonance Liberation, increase DMG by {0}% for {1}s",
  "affects": "self",
  "modifiers": [
    {
      "target": { "type": "stat", "id": "allDmgBonus_" },
      "type": "statBuff",
      "operation": "add",
      "value": [0.50],
      "maxStacks": 1,
      "durationSeconds": 5
    }
  ],
  "condition": { "type": "onAction", "actionIds": ["liberation"] }
}
```
