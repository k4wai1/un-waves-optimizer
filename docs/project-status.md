# Estado del proyecto: ~25/100

> Evaluacion honesta del estado actual. Actualizado: 2026-08-09.

## Lo que funciona (los 25 puntos)

| Componente | Estado | Detalle |
|---|---|---|
| Motor de dano/cura/escudo | Funciona | Declarativo, soporta kind: damage/heal/shield/coordinated. Bugs vs formula: ver `docs/engine-accuracy.md`. |
| 56 personajes en JSON5 | Completos | Stats 1-90, actions con multipliers 1-10, effects, statNodes de encore.moe. |
| Sistema de efectos | Funciona | Paths universales (stat.*, enemy.*, action.*, actionType.*), stacks, ranks, legacy compat. |
| UI de Resonator | Funciona | Seleccion, nivel, S-rank, skill levels, stat nodes toggleables, effects toggleables, tabla de combate. |
| UI de Armas | Parcial | 8 armas. Selector de arma, nivel, rank, stacks. Sin UI de effects de arma. |
| Tests | 36/36 verdes | Cubren motor y effectResolver. No cubren UI. |
| Generator md2json5 | Funciona | Genera specs desde .md de wuthering.gg. Deriva kind automaticamente. |
| Skill de datamine | Funciona | `.agents/skills/wuw-gg-datamine/` documentado y verificado en 56 personajes. |

## Lo que falta (los 75 puntos)

### Motor (5 puntos)

- DEF enemigo por defecto incorrecta (792 vs 1600)
- Bonus por tipo de accion no se aplica (basicAttackDmgBonus_, etc.)
- Falta categoria P_k
- Deepen por tipo (no global)

Ver `docs/engine-accuracy.md` para detalle y fixes.

### Armas (5 puntos)

- Solo 8 armas de 50+
- Sin UI para activar/desactivar effects de arma
- Los effects de arma ya se cargan en el context pero no se muestran en la UI de armas

### Ecos (15 puntos)

- 166 imagenes .webp pero cero datos de stats/sets/costs
- Sin schema JSON5 de echo (existe un README pero sin datos reales)
- Sin UI de inventario de ecos
- Sin sistema de equipar ecos (5 slots, cost cap 12)
- Sin set bonuses (2-pc, 5-pc)
- Sin main stats y substats
- Ver `libs/ww/stats/src/echoes/echoes-rover-notes.md` para referencia inicial

### Enemigo (5 puntos)

- Solo enemy por defecto
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

### Deploy e infra (10 puntos)

- Sin `base` path en Vite para GitHub Pages
- El workflow de deploy existente es del monorepo padre, no de este frontend
- Sin build estatica verificada

### Documentacion y pulido (5 puntos)

- READMEs parciales en libs/ pero sin schema formal
- Sin validador de specs automatizado
- UI solo en ingles (aceptable segun decision del usuario)
- Sin buscador de personajes con imagenes
- Sin compartir builds via URL
