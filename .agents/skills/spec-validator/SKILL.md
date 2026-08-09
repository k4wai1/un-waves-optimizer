---
name: spec-validator
description: Valida los archivos .json5 de specs de Wuthering Waves (resonators, weapons, echoes, enemies) antes de commitear. Verifica campos requeridos, IDs únicos, multipliers de 10 niveles, statNodes de 8 nodos, kinds válidos y sintaxis JSON5. Usar cuando se edite, cree o genere cualquier spec en libs/ww/stats/src/, o cuando el usuario pida validar specs, revisar JSON5 o verificar que los datos cumplen el esquema.
---

# Spec Validator

Valida que los `.json5` de `libs/ww/stats/src/` cumplan el esquema del proyecto antes de commitear.

## Cuándo usar

- Después de editar o crear un `.json5` de resonator, weapon, echo o enemy
- Después de ejecutar `tools/md2json5/generator.ts`
- Cuando el usuario pida "valida los specs", "revisa el json5", "verifica que no rompa nada"
- Antes de cada commit que toque `libs/ww/stats/src/`

## Cómo validar

### 1. Parsear todos los specs

El proyecto usa pnpm y JSON5. Ejecuta desde la raíz del proyecto:

```bash
node -e '
const JSON5 = require("./node_modules/.pnpm/json5@2.2.3/node_modules/json5");
const fs = require("fs");
const dir = "libs/ww/stats/src/resonators";
let ok = 0, fail = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json5"))) {
  try {
    const d = JSON5.parse(fs.readFileSync(dir + "/" + f, "utf8"));
    if (!d.metadata?.id) { console.log("  FALTA metadata.id:", f); fail++; continue; }
    ok++;
  } catch (e) { console.log("  PARSE ERR:", f, e.message); fail++; }
}
console.log("OK:", ok, "FAIL:", fail);
'
```

Si el path de JSON5 no existe, búscalo:

```bash
find node_modules/.pnpm -maxdepth 1 -name "json5@*" -type d
```

### 2. Verificar invariantes por spec

Para cada spec, verifica:

| Invariante | Regla |
|---|---|
| `metadata.id` | Existente, camelCase, único en el directorio |
| `metadata.name` | Existente |
| `stats.hp / atk / def` | Objetos nivel→valor, con clave `"90"` presente |
| `actions[].id` | Único dentro del spec |
| `actions[].scaling[].multiplier` | Longitud 10 (niveles 1-10) O 1 (fixed) |
| `actions[].kind` | `damage`, `heal`, `shield`, `coordinated`, o ausente (=damage) |
| `statNodes` | 8 nodos (2 stats × 4 nodos) |
| `effects[].id` | Único dentro del spec |
| `effects[].modifiers[].target` | Tiene `type` e `id` válidos |

### 3. Verificar referencias cruzadas

- Los `target: { type: "action", id: "..." }` deben referenciar IDs de acciones existentes en el mismo spec
- Los `target: { type: "stat", id: "..." }` deben usar keys conocidas del CombatContext (ver `docs/engine-accuracy.md` y `libs/ww/stats/src/resonators/README.md` sección 8)
- Los `target: { type: "actionType", id: "..." }` deben usar types válidos: `basicAttack`, `heavyAttack`, `plungingAttack`, `dodgeCounter`, `resonanceSkill`, `resonanceLiberation`, `forteCircuit`, `introSkill`, `outroSkill`, `echoSkill`

### 4. Ejecutar los tests del proyecto

Después de validar los specs, ejecuta los tests para asegurar que el motor sigue funcionando:

```bash
cd app/ww-frontend && npx vitest run 2>&1 | tail -20
```

## Errores comunes y fixes

| Problema | Fix |
|---|---|
| Multiplier con 9 o 11 niveles | Los multipliers van de Lv1-Lv10. Si el slider de wuthering.gg era `max=19`, el Lv10 es el primer valor de la cola teórica. Ver `.agents/skills/wuw-gg-datamine/SKILL.md` sección 2.2.1 |
| `kind` faltante en acciones de curación | Añadir `kind: "heal"`. La UI detecta el kind para mostrar columna única en vez de Normal/Average/Crit |
| statNodes con menos de 8 nodos | Cada personaje tiene 8: 2 stats × 4 nodos (2× valor bajo + 2× valor alto). Extraer de encore.moe (ver `tools/extract_statnodes.cjs`) |
| IDs duplicados | Cada action/effect necesita un ID único. Convención: `basic_1`, `skill`, `liberation`, `forte_1`, `intro`, `outro`, `echo`, `personaje_pasiva_N` |

## Regla de oro

Si un spec falla la validación, NO se commitea. Arregla el spec antes de commitear.

## Ver también

- `libs/ww/stats/src/resonators/README.md` — esquema de resonators
- `libs/ww/stats/src/echoes/README.md` — esquema de echoes
- `libs/ww/stats/src/enemies/EnemySchema.md` — esquema de enemigos
- `libs/ww/stats/src/weapons/README.md` — esquema de armas
- `docs/engine-accuracy.md` — bugs conocidos del motor
