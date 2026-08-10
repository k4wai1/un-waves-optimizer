# UN-WAVES Optimizer

Un **calculador / optimizador de daño de *Wuthering Waves*** pensado como un sitio web
estático (sin backend) donde cualquiera puede calcular cuánto pega su personaje, o editar
un personaje solamente tocando un archivo `.json5`.

> ⚠️ **Estado: muy básico (≈37/100).** Esto es un proyecto personal de aprendizaje,
> hecho por curiosidad y por ganas de aportar algo a la comunidad de WuWa. Está lejos de
> ser completo, pero la base (motor + personajes + armas) ya funciona. Si te sirve, si
> encontrás un bug, o si querés ayudar a mejorarlo: sos bienvenido, se agradece el apoyo.
>
> Ver el estado completo y el plan en **[ROADMAP.md](./ROADMAP.md)**.

---

## ¿Qué es?

Inspirado en el concepto de *[Genshin Optimizer](https://github.com/frzyc/genshin-optimizer)*
(este repo empezó como un fork de él), **UN-WAVES** aplica la misma idea a **Wuthering Waves**:

1. **Los datos** (personajes, armas, enemigos) viven en archivos `.json5` dentro de
   `libs/ww/stats/src/`. Cualquiera puede editarlos sin programar.
2. **El motor** (`app/ww-frontend/src/engine/`) lee esos archivos y calcula **daño,
   curación y escudo** siguiendo la fórmula oficial del juego.
3. **La web** (`app/ww-frontend/`) es la interfaz para elegir personaje, arma, niveles y
   ver los números en tiempo real.

La meta a largo plazo es llegar a un **optimizador**: dado un inventario de ecos, encontrar
la mejor build para un personaje contra un enemigo objetivo.

---

## Lo que ya funciona

| Componente | Estado |
|---|---|
| Motor de daño/cura/escudo | Fiel a la fórmula oficial (def/res/crit/bonus por tipo / Deepen) |
| 56 personajes en JSON5 | Stats, acciones, efectos, stat nodes |
| Sistema de efectos declarativo | Paths, stacks, ranks |
| UI de Resonator | Selección, niveles, efectos, tabla de combate |
| UI de Armas | 120 armas (stats 1-90, imágenes, filtro por tipo del personaje) |
| Tests | Cubren motor y effectResolver (no la UI) |

## Lo que falta (resumen)

- **Ecos** (datos, inventario, equipar, set bonuses) — no existe
- **Enemigo** (selector de nivel/DEF/resistencias reales) — solo el enemigo por defecto
- **Equipos** (3 personajes, Outro Skills / Deepen entre ellos) — no existe
- **Optimizador** — no existe
- **Deploy a GitHub Pages** — pendiente

Detalle fase por fase en **[ROADMAP.md](./ROADMAP.md)**.

---

## Cómo correrlo (dev)

```bash
# desde la raíz del repo
cd app/ww-frontend
npm install
npm run dev        # sirve en http://localhost:4201
```

Build de producción:

```bash
cd app/ww-frontend
npm run build
```

---

## Dónde empezar a leer

- `Wuthering_Waves_Multiplicadores.md` (raíz) — la fórmula oficial del juego
- `docs/engine-accuracy.md` — bugs del motor ya corregidos
- `docs/engine-extensions.md` — cómo el motor soporta las armas
- `docs/weapons-extraction.md` — de dónde salieron las 120 armas
- `libs/ww/stats/src/weapons/README.md` — cómo crear una arma a mano
- `ROADMAP.md` — estado actual y plan

---

## Créditos y origen

Este repositorio **comenzó como un fork de [Genshin Optimizer](https://github.com/frzyc/genshin-optimizer)**
por [frzyc](https://github.com/frzyc).

Aunque a nivel de lógica del juego la app de WuWa es desarrollo propio, el repo **conserva
la estructura Nx y parte del código MIT del proyecto original** en:

- `libs/pando/*` → paquete `@genshin-optimizer/pando/engine`
- `libs/common/*` → bibliotecas comunes (ui, util, database, etc.)

Todo ese código heredado se mantiene con **su aviso de copyright original (MIT, © frzyc)**,
como corresponde. Gracias a frzyc y a quien mantiene Genshin Optimizer, cuya arquitectura
fue el punto de partida.

## Autor

Hola, soy **vibre coder**. Hice esto por curiosidad y por las ganas de aportar algo al
juego **Wuthering Waves**. No soy un equipo ni un proyecto organizado: es un pasatiempo
personal, y lo comparto por si a alguien le resulta útil o interesante.

Si decidís ayudar, apoyar o simplemente dejar una sugerencia: **¡gracias!** Toda
contribución (datos, código, docs, correcciones de bugs o ideas) es bienvenida.

---

## Licencia

- **El código propio de este proyecto** (la app de WuWa, `libs/ww`, scripts auxiliares) está
  bajo **GNU GPL v3**. Ver [`LICENSE`](./LICENSE).
- **El código heredado de Genshin Optimizer** (`libs/pando/*`, `libs/common/*`) conserva su
  **licencia MIT** con su aviso de copyright original (© frzyc, 2020-present).

La GPLv3 es una licencia *copyleft*: quien distribuya una versión derivada debe publicarla
bajo GPLv3 con su código fuente. La idea de este proyecto es que siga siendo **libre**.
