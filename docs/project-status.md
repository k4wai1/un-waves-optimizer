# Estado del proyecto: ~32/100

> Evaluacion honesta del estado actual. Actualizado: 2026-08-09.
> Actualizacion clave: los 4 bugs del motor (def/res/bonus por tipo/P_k/deepen)
> fueron fixeados y verificados en navegador (commit `f97f33ac`).

## Lo que funciona (los 32 puntos)

| Componente | Estado | Detalle |
|---|---|---|
| Motor de dano/cura/escudo | Fiel a la formula oficial | Declarativo, soporta kind: damage/heal/shield/coordinated. Cumple `(1+B)×(1+A)×(1+P)` con def/res/crit. Ver `docs/engine-accuracy.md`. |
| 56 personajes en JSON5 | Completos | Stats 1-90, actions con multipliers 1-10, effects, statNodes de encore.moe. |
| Sistema de efectos | Funciona | Paths universales (stat.*, enemy.*, action.*, actionType.*), stacks, ranks, legacy compat. |
| UI de Resonator | Funciona | Seleccion, nivel, S-rank, skill levels, stat nodes toggleables, effects toggleables, tabla de combate. |
| UI de Armas | Parcial | 8 armas. Selector de arma, nivel, rank, stacks. Sin UI de effects de arma. |
| Tests | 43/43 verdes | Cubren motor, effectResolver y los 4 bugs de fidelidad. No cubren UI. |
| Generator md2json5 | Funciona | Genera specs desde .md de wuthering.gg. Deriva kind automaticamente. |
| Skill de datamine | Funciona | `.agents/skills/wuw-gg-datamine/` documentado y verificado en 56 personajes. |
| Skills de agente | Nuevos | `spec-validator`, `character-creator`, `engine-formula` en `.agents/skills/`. |

## Lo que falta (los 68 puntos)

### Armas (6 puntos)

- Solo 8 armas de 50+
- Sin UI para activar/desactivar effects de arma
- Los effects de arma ya se cargan en el context y se aplican al dano, pero no se muestran en la UI de armas

### Ecos (15 puntos)

- 166 imagenes .webp pero cero datos de stats/sets/costs
- Sin schema JSON5 de echo (existe un README pero sin datos reales)
- Sin UI de inventario de ecos
- Sin sistema de equipar ecos (5 slots, cost cap 12)
- Sin set bonuses (2-pc, 5-pc)
- Sin main stats y substats
- Ver `libs/ww/stats/src/echoes/echoes-rover-notes.md` para referencia inicial

### Enemigo (5 puntos)

- Solo enemy por defecto (DEF 1600 a nivel 100)
- Sin UI de selector de enemigo
- Sin datos de enemigos reales (jefes de Tower of Adversity, etc.)

### Equipos (10 puntos)

- Sin sistema de team composition
- Las pasivas de Outro (Deepen) no se pueden aplicar entre personajes
- Sin coordinated attacks entre miembros del equipo
- Sin rotaciones

### Optimizador (20 puntos)

- No existe
- Necesita: funcion de scoring, optimizacion por pieza, import de inventario,
  comparacion de builds, filtros, performance
- Ver ROADMAP.md Fase 4

### Deploy e infra (8 puntos) — POSPUESTO

> Decidido 2026-08-09: dejarlo para cuando el proyecto este mas usable.

- Sin `base` path en Vite para GitHub Pages
- El workflow de deploy existente es del monorepo padre, no de este frontend
- Sin build estatica verificada

### Documentacion y pulido (4 puntos)

- READMEs parciales en libs/ pero sin schema formal
- Sin validador de specs automatizado (hay skill `spec-validator` pero sin script)
- UI solo en ingles (aceptable segun decision del usuario)
- Sin buscador de personajes con imagenes
- Sin compartir builds via URL
