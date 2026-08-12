# Roadmap: UN-WAVES Optimizer

> Objetivo: una web estatica en GitHub Pages donde cualquiera pueda calcular el dano de
> Wuthering Waves, o editar un personaje solamente editando un `.json5`.
> Inspirado en genshin-optimizer, pero amigable para no-programadores.

## Para quien lee esto por primera vez

Este proyecto es un **calculador de daño de Wuthering Waves**. Funciona así:

1. **Los datos** (personajes, armas, enemigos) están en archivos `.json5` dentro de
   `libs/ww/stats/src/`. Se editan sin programar.
2. **El motor** (`app/ww-frontend/src/engine/`) lee esos archivos y calcula daño,
   curación y escudo.
3. **La web** (`app/ww-frontend/`) es una interfaz para elegir personaje, arma, niveles
   y ver los números.

Dónde empezar a leer:
- `Wuthering_Waves_Multiplicadores.md` (raíz) — la fórmula oficial del juego
- `docs/engine-accuracy.md` — bugs del motor ya fixeados
- `docs/engine-extensions.md` — cómo el motor soporta las armas
- `docs/weapons-extraction.md` — de dónde salieron las 120 armas
- `docs/enemy-stats.md` — qué stats del enemigo afectan al daño (taxonomía A/B/C)
- `libs/ww/stats/src/weapons/README.md` — cómo crear una arma a mano
- `libs/ww/stats/src/enemies/EnemySchema.md` — cómo crear un enemigo

## Vision

El proyecto tiene un motor declarativo: personajes, armas, ecos y enemigos se definen en
JSON5 sin tocar codigo. El motor combina todo y calcula dano, curacion y escudo.

La meta es llegar a un optimizador que, dado un inventario de ecos, encuentre la mejor
build para un personaje contra un enemigo objetivo.

---

## Estado actual: ~40/100

> **Actualizado 2026-08-12:** el motor cumple la fórmula oficial (def/res/crit/bonus por
> tipo/Deepen) y cubre también estados negativos (9) y **20 enemigos Calamity** (con
> GrowthRates 1-120 para escalar HP/ATK/DEF por nivel). Se corrigió la fidelidad de la DEF
> (nominal `(800+8·(Lv-1))·DefRatio` y DEF Ignore >100% → M_DEF>1 con techo 2.0). Pendiente
> principal: ecos, equipos y el optimizador (Fases 2-4).

| Componente | Estado |
|---|---|
| Motor de dano/cura/escudo | Fiel a la fórmula oficial (def/res/crit/bonus por tipo/P_k/deepen). **M_DEF nominal `(800+8·(Lv-1))·DefRatio`; DEF Ignore >100% → M_DEF>1 (techo 2.0)** |
| Motor de Estados Negativos | **Nuevo (2026-08-12)**: `negativeStatus.ts` — punto fijo ×10000, LUT por nivel, ticks, registry de 9 estados, Havoc Bane DEF, Electro Rage, detonación. Datos por-personaje calibrados |
| 56 personajes en JSON5 | Completos (stats, actions, effects, statNodes, campo `negativeStatuses`) |
| Sistema de efectos declarativo | Funciona (paths, stacks, ranks) |
| UI de Resonator | Funciona (seleccion, niveles, effects, tabla de combate) |
| UI de Armas | Funciona (120 armas con stats 1-90, imagenes, filtro por tipo, buff base 45/45 5★; pasivas complejas como texto visible) |
| UI de Enemigos | **Nuevo (2026-08-12)**: 20 Calamity de encore.moe (imagen, hp/atk/def, resistencias, nivel 1-120, descripción). HP/ATK/DEF escalados por **GrowthRates 1-120** (HP@100 ≈ 1M). Enemigo seleccionado + nivel se aplica al daño (`enemy.ts`) |
| Docs de fidelidad | `docs/enemy-stats.md` (taxonomía A/B/C) + `Wuthering_Waves_Multiplicadores.md` (M_DEF nominal) |
| Skills | `character-creator`, `enemy-creator`, `engine-formula`, `spec-validator`, `wuw-gg-datamine` |
| UI de Echos | No existe |
| Sistema de equipos | No existe |
| Optimizador | No existe |
| Deploy a GitHub Pages | No configurado (dejado para mas adelante) |
| Documentacion del formato | Parcial (READMEs + engine-accuracy.md + engine-extensions.md + weapons-extraction.md + enemy-stats.md + EnemySchema.md) |

---

## Fases

### Fase 1 -- Motor fiel al juego (~32/100)

**Objetivo:** el dano calculado coincide con la formula oficial del juego.

- [x] Fix bug DEF enemigo por defecto (792 -> 1600) — commit `f97f33ac`
- [x] Fix bug bonus de dano por tipo no se aplica — commit `f97f33ac`
- [x] Anadir categoria P_k (bonos especiales multiplicativos) — commit `f97f33ac`
- [x] Fix Deepen por tipo (basicAmplify_, skillAmplify_, etc.) — commit `f97f33ac`

> Nota: el deploy a GitHub Pages se pospuso hasta que el proyecto este mas usable.
> Queda pendiente en la seccion "Pendientes de infraestructura" al final.

### Sub-fase 1b -- Armas del juego (100% stats, pasivas parciales)

> **Completado 2026-08-10:** las 120 armas con stats 1-90, second stat, rareza, tipo y
> imagenes. El buff base (siempre activo) de cada pasiva esta modelado como efecto real
> (**45/45 armas 5★**). Las pasivas complejas (condiciones de estado elemental,
> on/off-field, team buffs, DEF/RES ignore, Amplify) se guardan como `description_raw`
> (texto visible pero sin efecto en el calculo).
>
> Detalles: `docs/weapons-extraction.md` (de donde salen los datos) y
> `docs/engine-extensions.md` (que extensiones de motor se hicieron).

Pendiente (sub-nivel: pasivas complejas 5★):
- [ ] Modelar a mano los condicionales simples de las ~44 armas 5★ (buff tras Intro/Skill/
      Liberation/Basic/Heavy con `onAction`) — ver `tools/weapons/five_star_catalog.cjs`
      y `docs/engine-extensions.md` seccion 3.3 (`condition.onAction`)
- [x] Extension del motor para condiciones de estado elemental (Glacio Chafe, Spectro
      Frazzle, Tune Strain, Fusion Burst, Aero Erosion, Hack, Negative Statuses) — **2026-08-12**:
      nuevo `app/ww-frontend/src/engine/negativeStatus.ts` (punto fijo ×10000, LUT por nivel,
      ticks, registry de 9 estados, Havoc Bane DEF, Electro Rage, detonacion). Ver
      `docs/estados-elementales.md` (confirmado) y `docs/engine-extensions.md` seccion 3.5.
  - [x] Calibrar los **datos por-personaje** (campo `negativeStatuses` en JSON5): daño base
        por nivel (LUT), multiplicadores de respuesta (Meltdown, Spectral Analysis, Data Crash),
        K_stack, etc. — hecho 2026-08-12: `STATUS_REGISTRY` calibrado (Frazzle 4596/k0.811,
        Erosion 5000/k1, Electro 155+674×stacks, Havoc -2%/stack, Chafe stacksMv).
  - [ ] Mostrar los **DoT por tick** en `ResonatorSetup` (usar `advanceTimer`/`simulateStatusTick`
        para DPS por segundo de cada estado; hoy el calculador de personaje no integra `negativeStatus`).
- [ ] Extension del motor para buffs on/off-field y de equipo
- [ ] DEF/RES ignore condicional por tipo de accion
- [ ] Amplify (Deepen) elemental por condiciones
- [ ] Confirmar tipos provisionales de Azure Oath y Firstlight's Herald (no en weapons.json)
- [ ] Obtener imagenes de Azure Oath y Firstlight's Herald
- [ ] Escalar la descripcion de la pasiva con el rango R1-R5: soportar `{value}`/`{valueN}`
      dentro de `description_raw` (o migrar pasivas complejas a `descriptionTemplate` +
      `modifiers`) para que el texto muestre el multiplicador del rank seleccionado.
      Fix a futuro (no implementado).

### Sub-fase 1c -- Enemigos (20 Calamity + motor + menú)

> **Completado 2026-08-12:** se scrapearon 20 enemigos Calamity desde encore.moe (API
> `api-v2.encore.moe/api/en/monster/{Id}`), con imagen webp, HP/ATK/DEF base, resistencias
> elementales (decimal), Max Vibration, Rage Limit y descripción. Se añadió un menú **Enemies**
> en la UI y el motor `enemy.ts` (`resolveEnemyStats`) escala HP/ATK/DEF por nivel con
> **GrowthRates 1-120**. Se documentó la taxonomía A/B/C en `docs/enemy-stats.md`.

- [x] Scrapear 20 enemigos Calamity + 20 imágenes webp (encore.moe)
- [x] Generar 20 archivos JSON5 (id numérico, stats, resistencias, lore)
- [x] Helper `enemy.ts`: `resolveEnemyStats`/`enemyInfo` — escala HP/ATK/DEF por nivel con tabla `growth`
- [x] Menú **Enemies** en la UI (imagen, stats, resistencias, nivel 1-120, M_DR, lore)
- [x] Integrar enemigo seleccionado + nivel en `ResonatorSetup` (reemplaza DEFAULT_ENEMY)
- [x] Fix HP: el enemigo NO quedaba en valor de Lv1; se escala por GrowthRates (HP@100 ≈ 1M)
- [x] Docs: `docs/enemy-stats.md` (taxonomía A/B/C) + `EnemySchema.md` (formato + growth) + skill `enemy-creator`
- [x] **Fidelidad DEF**: nominal `(800+8·(Lv-1))·DefRatio`; DEF Ignore >100% → M_DEF>1 (techo 2.0)

---

### Fase 2 -- Ecos + enemigo (~60/100)

**Objetivo:** el usuario puede equipar ecos y ver como cambian las stats y el dano.

- [ ] Datos de echo sets en JSON5 (sets, costs, main stats, substats)
  - Ver `libs/ww/stats/src/echoes/echoes-rover-notes.md` para referencia inicial
- [ ] Datos de echoes individuales (166 imagenes ya existen, falta metadata)
- [ ] UI de inventario de ecos (crear/editar/importar)
- [x] Selector de enemigo (nivel, DEF, resistencias, dano recibido) — hecho en Sub-fase 1c (menú Enemies)
- [ ] Equipar ecos al personaje (5 slots, cost cap 12)
- [ ] Main stats y substats afectan CombatContext en tiempo real
- [ ] Set bonuses (2-pc, 5-pc) aplican como effects
- [ ] Formato WOOD de importacion
  - Ver `docs/wood-format.md`

### Fase 3 -- Equipos + pasivas (~75/100)

**Objetivo:** el usuario puede armar un equipo de 3 personajes y activar pasivas entre ellos.

- [ ] Sistema de equipo (3 personajes)
- [ ] Activar Outro Skills (Deepen entre personajes)
  - Ver `Wuthering_Waves_Multiplicadores.md` seccion 3 (Amplify/Deepen)
- [ ] Calcular dano del team completo (rotacion simplificada)
- [ ] Coordinated attacks (Verina, Yuanwu, etc.)
- [ ] Sincronizar buffs/debuffs del equipo al DPS activo

### Fase 4 -- Optimizador (~90/100)

**Objetivo:** dado un inventario de ecos, encontrar la mejor build.

- [ ] Funcion de scoring (dano esperado de una rotacion o un golpe)
- [ ] Optimizacion por pieza (heuristica, no brute-force global)
  - Enumerar combinaciones de substats viables por slot
  - Pruning por score parcial
- [ ] Importar echoes desde screenshot/API (formato WOOD)
- [ ] Comparar builds side-by-side
- [ ] Filtros: set bonus, cost cap, main stat restrictions
- [ ] Performance: < 5s para optimizar 1 personaje con 100 ecos

### Fase 5 -- Pulido (~100/100)

- [ ] Documentacion completa del formato JSON5 (schema formal)
- [ ] Validador de specs (ver skill `spec-validator`)
- [ ] i18n (espanol/ingles) -- la UI final puede quedar solo en ingles
- [ ] UI/UX amigable para no-programadores
- [ ] Buscador de personajes con imagenes
- [ ] Compartir builds via URL
- [ ] Modo oscuro/claro pulido

---

## Pendientes de infraestructura (pospuestos)

> Estas tareas se dejaron para cuando el proyecto este en un estado mas usable.
> No bloquean el desarrollo del motor, los datos ni la UI.

- [ ] Configurar `base` path en Vite para GitHub Pages
- [ ] Workflow de deploy automatico a GitHub Pages
- [ ] Build estatica funcional y accesible publicamente
- [ ] Migrar/quitar el workflow del monorepo padre (`.github/workflows/deploy-frontend.yml`)

---

## Principios de diseno

1. **Declarativo:** todo se define en JSON5. Cualquier persona puede editar un personaje sin tocar codigo.
2. **Motor fiel al juego:** el dano calculado debe coincidir con el juego. Ver `docs/engine-accuracy.md`.
3. **Web estatica:** sin backend. Todo corre en el navegador. Deploy en GitHub Pages.
4. **Simple sobre flexible:** no anadir abstracciones que no se necesiten hoy.
5. **Datos separados de logica:** los JSON5 en `libs/ww/stats/src/` son datos; el motor en `app/ww-frontend/src/engine/` es logica.

---

## Como contribuir

- **Primera vez leyendo:** empieza por "Para quien lee esto por primera vez" (arriba).
- Para crear un personaje: copiar `CharacterTemplate.json5`, seguir `libs/ww/stats/src/resonators/README.md`.
- Para crear/editar un arma: seguir `libs/ww/stats/src/weapons/README.md` y `docs/weapons-extraction.md`.
- Para validar specs: usar el skill `spec-validator` (ver `.agents/skills/spec-validator/SKILL.md`).
- Para entender el motor: leer `Wuthering_Waves_Multiplicadores.md`, `docs/engine-accuracy.md`,
  `docs/engine-extensions.md` y `.agents/skills/engine-formula/SKILL.md`.
