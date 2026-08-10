# Roadmap: UN-WAVES Optimizer

> Objetivo: una web estatica en GitHub Pages donde cualquiera pueda calcular el dano de
> Wuthering Waves, o editar un personaje solamente editando un `.json5`.
> Inspirado en genshin-optimizer, pero amigable para no-programadores.

## Vision

El proyecto tiene un motor declarativo: personajes, armas, ecos y enemigos se definen en
JSON5 sin tocar codigo. El motor combina todo y calcula dano, curacion y escudo.

La meta es llegar a un optimizador que, dado un inventario de ecos, encuentre la mejor
build para un personaje contra un enemigo objetivo.

---

## Estado actual: ~32/100

> **Actualizado 2026-08-09:** el motor ahora cumple la formula oficial
> (bugs 1-4 de `docs/engine-accuracy.md` fixeados y verificados en navegador).
> La Fase 1 queda solo con el deploy a GitHub Pages pendiente.

| Componente | Estado |
|---|---|
| Motor de dano/cura/escudo | Funciona, fiel a la formula oficial (def/res/crit/bonus por tipo/P_k/deepen) |
| 56 personajes en JSON5 | Completos (stats, actions, effects, statNodes) |
| Sistema de efectos declarativo | Funciona (paths, stacks, ranks) |
| UI de Resonator | Funciona (seleccion, niveles, effects, tabla de combate) |
| UI de Armas | Parcial (8 armas, sin selector de effects) |
| UI de Echos | No existe |
| Sistema de equipos | No existe |
| Optimizador | No existe |
| Deploy a GitHub Pages | No configurado (dejado para mas adelante) |
| Documentacion del formato | Parcial (READMEs + engine-accuracy.md) |

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

### Fase 2 -- Ecos + enemigo (~60/100)

**Objetivo:** el usuario puede equipar ecos y ver como cambian las stats y el dano.

- [ ] Datos de echo sets en JSON5 (sets, costs, main stats, substats)
  - Ver `libs/ww/stats/src/echoes/echoes-rover-notes.md` para referencia inicial
- [ ] Datos de echoes individuales (166 imagenes ya existen, falta metadata)
- [ ] UI de inventario de ecos (crear/editar/importar)
- [ ] Selector de enemigo (nivel, DEF, resistencias, dano recibido)
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

- Para crear un personaje: copiar `CharacterTemplate.json5`, seguir `libs/ww/stats/src/resonators/README.md`.
- Para validar specs: usar el skill `spec-validator` (ver `.agents/skills/spec-validator/SKILL.md`).
- Para entender el motor: leer `Wuthering_Waves_Multiplicadores.md` y `.agents/skills/engine-formula/SKILL.md`.
