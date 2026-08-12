# Enemy Schema — Cómo crear enemigos

Los enemigos son entidades de primera clase. Usan el mismo sistema de `effects[]` que personajes y armas.

## Campos de stats

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `level` | number | Nivel base de las stats declaradas (por convención 1). El motor escala con `resolveEnemyStats`. |
| `hp` | number | HP base a `level` (informativo, no se usa en daño). |
| `atk` | number | ATK base a `level` (informativo). |
| `defense` | number | DEF base a `level`. El motor computa `DEF = baseDef + 8×(nivel objetivo − level)`. |
| `elementalResistances` | object | `{ glacio, fusion, electro, aero, havoc, spectro }` con valores decimales (0.10 = 10%). |
| `physicalResistance` | number | Resistencia a daño físico (decimal). |
| `damageTaken` | number | Multiplicador de daño recibido (1.0 = normal, 1.15 = 15% más). |
| `damageReduction` | number | Reducción de daño M_DR del boss (decimal; 0.15 = barrera del 15%). Multiplicativa al final. |
| `maxVibration` | number | Max Vibration Strength (informativo). |
| `rageLimit` | number | Rage Limit (informativo). |

Las resistencias `elementalResistances` y `physicalResistance` NO cambian con el nivel del enemigo:
se conservan tal cual al escalar.

## Metadata adicional (desde encore.moe)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rarityClass` | string | `Calamity` / `Overlord` / `Elite` / `Standard`. |
| `element` | string\|null | Elemento del enemigo (ej. `glacio`, `havoc`). |
| `icon` | string | Nombre del archivo `.webp` del ícono en `img/{id}.webp`. La UI carga imágenes por este nombre. |

> **Escalado de nivel**: el motor usa `resolveEnemyStats(def, targetLevel)` (ver
> `app/ww-frontend/src/engine/enemy.ts`). Dado el enemigo y el nivel objetivo, produce el
> `EnemyStats` con HP/DEF escalados por la tabla `growth` (ver 3bis), conservando resistencias.
> En la UI (pestaña Enemies) se elige un enemigo y su nivel (1–120).

## 3bis. Tabla `growth` (GrowthRates por nivel 1-120)

Para escalar el HP/ATK/DEF con el nivel del enemigo se usa la tabla `growth` (ratios en base
10000 por nivel). Una entrada por nivel: `[hpRatio, atkRatio, defRatio]`.

```json5
"growth": {
  "1":   [10000, 5000, 10000],
  "50":  [257408, 67808, 14900],
  "100": [6487198, 335039, 19900]
}
```

- **Escalado** (`resolveEnemyStats`/`enemyInfo`): `valor@nv = valorBase × ratio[nv] ÷ 10000`.
- El HP a nivel alto NO debe truncarse: a Lv100 puede ser cientos de miles o millones
  (ej. Bell-Borne ≈ 1,045,088 @ Lv100).
- El `AtkRatio` a Lv1 puede ser ≠ 10000 (el `Properties.Atk` ya lo descuenta; ej. 5000 →
  ATK@1 = 120 × 0.5 = 60).
- Las claves numéricas van **entre comillas** (`"1"`) para que sea JSON5 válido.
- Si un enemigo no reporta `growth` (ej. Phantom: Sigillum), `resolveEnemyStats` cae a DEF
  lineal (`base + 8×delta`) y HP/ATK informativos.

> **Taxonomía A/B/C**: ver `docs/enemy-stats.md` — qué stats del enemigo afectan al daño recibido
> (DEF, RES, M_DR, DMG Amplify, DefRatio), cuáles son informativas (HP, ATK) y cuáles son mecánica
> separada (Max Vibration, Rage Limit).

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
