# Extracción de armas (wuthering.gg)

> Cómo se extrajeron las 120 armas de Wuthering Waves desde wuthering.gg.
> Técnica documentada 2026-08-10. Scripts en `tools/weapons/`.

## Fuente

`https://wuthering.gg/weapons` (lista) + `https://wuthering.gg/weapons/<slug>` (detalle).

Cada página de arma tiene **2 sliders** (`[role="slider"]`):
- **Slider 0**: nivel de arma (1-90) — controla ATK base y second stat
- **Slider 1**: rango (R1-R5) — controla la pasiva

## Estructura DOM

```
.stats.head
  h1 > span          ← nombre del arma
  .item > .text      ← label ("ATK", "Crit. Rate", ...)
  .item > .value     ← valor (ej. "587.50", "24.30%")
```

## Datos extraídos

Para cada arma (120 en total):
- `stats[lvl].atk` — ATK base a cada nivel 1-90
- `stats[lvl].second` — second stat % a cada nivel 1-90 (qué stat es: de `weapons.json` mainStat.name)
- `passives[rank]` — texto de la pasiva a cada rango R1-R5

## Pipeline

```bash
# 1. Recuperar los slugs de la lista
# (con chrome-devtools MCP, guardar a /tmp/ww_weapon_links.json)

# 2. Extraer stats+passives (parallel workers via CDP)
bash tools/weapons/run_batch.sh   # o node tools/weapons/extract_weapons.cjs <slug>
# salida: /tmp/ww-weapons-data.json

# 3. Generar .json5 de las 120 armas
node tools/weapons/generate_weapons.cjs
# salida: libs/ww/stats/src/weapons/<Id>.json5

# 4. Generar las 3 armas con slug problemático (& / apóstrofe)
node tools/weapons/gen_missing.cjs

# 5. Completar stats de las 8 armas hechas a mano
node tools/weapons/backfill_hand_stats.cjs
```

## Técnica de sliders (CDP)

- En Node v22, `fetch` + WebSocket global permiten hablar por CDP.
- Lanzar Chrome headless con `--remote-debugging-port=<puerto>`.
- Crear tab: `PUT /json/new?<url>` (no GET — el CDP rechaza GET con "Using unsafe HTTP verb").
- Mover slider con `KeyboardEvent keydown ArrowLeft/Right` en el elemento `role="slider"`.
- Leer `.stats.head .item .value` tras cada movimiento.
- **Hydration de Vue**: esperar ~6-8s tras cargar la página antes de que aparezcan los sliders.
  Reintentar hasta 6 veces con sleep de 2.5s.

## Performance

- 1 arma ≈ 12-15s (6-8s de hydration + 90 niveles × 3ms + R1-R5 × 60ms).
- Paralelizar con 2-3 workers de Chrome (cada uno en puerto propio) para ~120 armas.
- 4+ workers saturan la CPU y hacen fallar la hydration → 2 es lo óptimo.

## Crawling de 3 armas con slugs especiales

| Nombre | slug wuthering.gg | Nota |
|---|---|---|
| Lux & Umbra | `lux-&-umbra` | weapons.json la llama "Lux & Umber" (typo) |
| Azure Oath | `azure-oath` | No está en weapons.json local; tipo provisional |
| Firstlight's Herald | `firstlights-herald` | No está en weapons.json local; tipo provisional |

Estas 3 requieren `gen_missing.cjs` (el slugify normal rompe con `&`/apóstrofe).

## Hallazgos (changelog)

- **v1 (2026-08-10)**: técnica de dedos documentada. Los 2 sliders de arma (nivel+rango).
  La pasiva se lee del texto del body (separador " Skill <name> <desc>").
- **Crawling parallel**: con `run_batch.sh` (2 workers por puerto propio).
  ímágenes renombradas a `<Id>.webp` (el `metadata.id` del `.json5`).
