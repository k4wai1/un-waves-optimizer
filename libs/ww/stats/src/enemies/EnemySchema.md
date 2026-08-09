# Enemy Schema — Cómo crear enemigos

Los enemigos son entidades de primera clase. Usan el mismo sistema de `effects[]` que personajes y armas.

## Campos de stats

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `level` | number | Nivel del enemigo. Afecta la fórmula de defensa. |
| `hp` | number | HP total. Solo informativo (no se usa en daño). |
| `defense` | number | DEF. Se usa en la fórmula: `DEF_Mult = (800 + 8×ATK_LVL) / (800 + 8×ATK_LVL + DEF)` |
| `elementalResistances` | object | `{ glacio, fusion, electro, aero, havoc, spectro }` con valores 0.10 = 10% |
| `physicalResistance` | number | Resistencia a daño físico. |
| `damageTaken` | number | Multiplicador de daño recibido. 1.0 = normal, 1.15 = 15% más. |

## Modificadores de enemigo (desde effects[])

Los efectos pueden modificar stats del enemigo usando `target.type: "Stat"` con estos IDs:

| ID del target | Qué modifica | Ejemplo de uso |
|---------------|-------------|----------------|
| `enemy.level` | Nivel del enemigo | — |
| `enemy.defense` | DEF del enemigo | Debuff -20% DEF |
| `enemy.hp` | HP (informativo) | — |
| `enemy.glacioRes` | Resistencia Glacio | RES Shred -20% |
| `enemy.fusionRes` | Resistencia Fusion | RES Shred -20% |
| `enemy.electroRes` | Resistencia Electro | RES Shred -20% |
| `enemy.aeroRes` | Resistencia Aero | RES Shred -20% |
| `enemy.havocRes` | Resistencia Havoc | RES Shred -20% |
| `enemy.spectroRes` | Resistencia Spectro | RES Shred -20% |
| `enemy.physicalRes` | Resistencia física | RES Shred -20% |
| `enemy.damageTaken` | Daño recibido × | Vulnerabilidad +15% |

### Ejemplo: RES Shred (debuff)

```json5
{
  "id": "spectro_res_shred",
  "name": "Spectro RES -20%",
  "descriptionTemplate": "Reduce enemy Spectro RES by {value}%",
  "targets": [{ "type": "Stat", "id": "enemy.spectroRes" }],
  "modifiers": [{ "operation": "Add", "valueType": "Percent", "value": [-0.20] }],
  "maxStacks": 1,
  "exclusive": false
}
```

### Ejemplo: DEF Shred

```json5
{
  "id": "def_shred",
  "name": "DEF -20%",
  "descriptionTemplate": "Reduce enemy DEF by {value}%",
  "targets": [{ "type": "Stat", "id": "enemy.defense" }],
  "modifiers": [{ "operation": "Add", "valueType": "Percent", "value": [-0.20] }],
  "maxStacks": 1,
  "exclusive": false
}
```

### Ejemplo: Vulnerability (más daño recibido)

```json5
{
  "id": "vulnerability",
  "name": "Vulnerable",
  "descriptionTemplate": "Enemy takes {value}% more damage",
  "targets": [{ "type": "Stat", "id": "enemy.damageTaken" }],
  "modifiers": [{ "operation": "Multiply", "valueType": "Multiplier", "value": [1.15] }],
  "maxStacks": 1,
  "exclusive": false
}
```

## Diferencia entre RES Shred y DEF Shred

- **RES Shred**: reduce la resistencia elemental. Aplica como multiplicador separado.
- **DEF Shred**: reduce la defensa. Afecta el multiplicador de defensa.
- **Damage Taken**: multiplica el daño final después de todo.

## Enemigo por defecto

`EnemyBase.json5` es el dummy de práctica. Todas las resistencias al 10%, DEF 1600 (= 800 + 8×100, produce M_DEF = 0.5 a niveles iguales), nivel 100.
