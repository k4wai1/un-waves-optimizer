# Cómo se obtuvieron las armas del juego (extracción)

> Guía para entender de dónde salen las 120 armas del proyecto, sin experiencia previa
> en scraping. Si solo quieres **usar** una arma o editar sus datos, lee
> `libs/ww/stats/src/weapons/README.md` (más corto y práctico).
>
> Escrito: 2026-08-10

---

## 1. ¿Qué es este proyecto y dónde viven las armas?

Este es un calculador de daño de **Wuthering Waves** (un videojuego). Todo se define en
archivos **JSON5** (un formato de datos parecido a JSON pero con comentarios y comillas
opcionales). No hay que programar para añadir un personaje o un arma: solo editar un `.json5`.

Las armas están en:

```
libs/ww/stats/src/weapons/
├── AbyssSurges.json5      ← datos de la arma (stats, efectos)
├── AbyssSurges.webp       ← imagen de la arma
├── ...
└── README.md              ← cómo crear/editar una arma a mano
```

Cada arma tiene **2 archivos**:
- `<Nombre>.json5` — sus datos: nivel 1-90, stat secundario, rareza, tipo, pasiva
- `<Nombre>.webp` — su imagen (se muestra en la web)

Antes de este trabajo solo existían **8 armas** (escritas a mano). El juego tiene **120**.
Este documento explica cómo se consiguieron las 112 restantes sin escribirlas a mano.

---

## 2. ¿De dónde salen los datos? (la fuente)

Los datos oficiales del juego no están en un archivo accesible. Pero hay páginas web
(como **wuthering.gg**) que los muestran. El problema: no hay una API pública sencilla;
los números aparecen en la pantalla y cambian cuando mueves un deslizador (slider).

La idea es simple: **abrir la página de cada arma, mover el slider del nivel (1→90) y
anotar los números que aparecen, luego mover el slider del rango (R1→R5) y anotar la
pasiva**. Hacer eso a mano para 120 armas sería eterno; por eso se automatizó.

### La página de una arma (wuthering.gg)

```
https://wuthering.gg/weapons/abyss-surges
```

Muestra algo como:

```
Abyss Surges
ATK        587.50     ← el ATK base a ese nivel
ATK%       36.45%     ← el "stat secundario" (cambia con el nivel)
Level      90         ← slider del nivel (1-90)
Rank       5          ← slider del rango (R1-R5)
Skill
Stormy Resolution
Increases Energy Regen by 25.6%...   ← la pasiva (cambia con el rango)
```

Hay **2 sliders** por arma:
- **Slider del nivel** (1-90): controla ATK base y stat secundario
- **Slider del rango** (R1-R5): controla los números de la pasiva

### ¿Qué se guardó de cada arma?

| Dato | Ejemplo | Para qué sirve |
|---|---|---|
| `stats[lvl].atk` | nivel 90 → `587.50` | El ATK base que aporta el arma a cada nivel |
| `stats[lvl].second` | nivel 90 → `36.45%` | El stat secundario (Crit Rate, ATK%, Energy Regen...) |
| `passives[rank]` | R1 → `12.8%`, R5 → `25.6%` | La pasiva, con sus valores por rango |
| `rarity` / `type` | `5` / `Gauntlets` | Para filtrar en la UI (solo armas del mismo tipo) |

---

## 3. ¿Cómo se automatizó? (técnica, para curiosos)

> Si no te interesa el scraping, puedes saltarte esta sección. Es útil si quieres
> **actualizar** las armas cuando el juego cambie, o añadir un arma nueva desde wuthering.gg.

### 3.1 El navegador "conduce" los sliders

El proyecto usa un navegador Chrome **headless** (sin ventana) controlado por código
vía **CDP** (Chrome DevTools Protocol). Básicamente, un script le dice al navegador:
"abre esta URL, mueve el slider a la izquierda/derecha, y dime qué número ves".

Los scripts viven en `tools/weapons/`:

| Script | Qué hace |
|---|---|
| `extract_weapons.cjs` | Abre cada página de arma, mueve los sliders, guarda todo |
| `run_batch.sh` | Lanza 2 extractores en paralelo (para ir más rápido) |
| `generate_weapons.cjs` | Convierte los datos extraídos a `.json5` |
| `parse_base_buff.cjs` | Detecta el "buff base" (el +ATK siempre activo) de cada pasiva |
| `gen_missing.cjs` | Genera las 3 armas con nombres raros (Lux & Umbra, etc.) |
| `add_base_buffs.cjs` | Añade el buff base a las armas 5★ que no lo tenían |

### 3.2 El flujo completo

```
1. Obtener la lista de armas (120 slugs)
   https://wuthering.gg/weapons → extraer los enlaces

2. Extraer datos de cada arma (2 workers en paralelo, ~15s por arma)
   node tools/weapons/extract_weapons.cjs
   → guarda /tmp/ww-weapons-data.json

3. Generar los .json5
   node tools/weapons/generate_weapons.cjs
   → libs/ww/stats/src/weapons/<Nombre>.json5

4. Completar casos especiales
   node tools/weapons/gen_missing.cjs        (3 armas con & o apóstrofe)
   node tools/weapons/backfill_hand_stats.cjs (las 8 armas escritas a mano)
```

### 3.3 Trucos aprendidos (para no volver a descubrirlos)

- El slider responde a teclas `ArrowLeft`/`ArrowRight` (no a `click`).
- Hay que esperar **6-8 segundos** a que la página cargue (Vue "hidrata" los sliders
  tarde). Con 2 workers en paralelo, esperar 8s.
- **No usar más de 2 workers**: 4+ saturan la CPU y los sliders no aparecen.
- Para crear una pestaña en CDP hay que usar `PUT /json/new?<url>` (el GET falla).
- Algunos nombres de arma rompen el "slugify" (convertir "Lux & Umbra" en una URL):
  `&` y apóstrofes (`'`) necesitan manejo especial (`gen_missing.cjs`).

---

## 4. ¿Qué se logró?

- **120 armas** con stats de nivel 1→90 completas y su stat secundario.
- **120 imágenes** renombradas para que la web las muestre.
- El **buff base** de cada pasiva (el "+ATK/+Crit/etc. siempre activo") modelado como
  efecto real en el motor.
- Las **pasivas complejas** (que dependen de estados elementales como "Glacio Chafe",
  de estar dentro/fuera del campo, o de buffs de equipo) se guardan como **texto
  visible** (`description_raw`) porque el motor aún no las simula. Ver
  `docs/engine-extensions.md` y el `ROADMAP.md` (Sub-fase 1b).

### Armadura especial: las 3 armas con slugs raros

| Nombre | Por qué es especial | Estado |
|---|---|---|
| Lux & Umbra | El `&` rompe el slug; wuthering.gg la llama "Lux & Umbra" y weapons.json "Lux & Umber" | Datos OK, imagen OK |
| Azure Oath | No estaba en el inventario local; tipo provisional (Broadblade) | Datos OK, falta confirmar tipo + imagen |
| Firstlight's Herald | Idem; tipo provisional (Rectifier) | Datos OK, falta confirmar tipo + imagen |

---

## 5. Cómo se valida que todo está bien

```bash
# 1. Todos los .json5 parsean y tienen ATK a nivel 90
node -e 'const JSON5=require("./node_modules/.pnpm/json5@2.2.3/node_modules/json5");const fs=require("fs");const dir="libs/ww/stats/src/weapons";let ok=0,fail=0;for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".json5"))){try{const d=JSON5.parse(fs.readFileSync(dir+"/"+f,"utf8"));if(!d.metadata?.id||!d.stats?.atk?.["90"]){console.log("bad:",f);fail++;continue;}ok++;}catch(e){console.log("ERR:",f,e.message);fail++;}}console.log("OK:",ok,"FAIL:",fail);'

# 2. Los tests del motor
cd app/ww-frontend && npx vitest run
```

Resultado esperado: `OK: 120 FAIL: 0` y `43 tests` verdes.

---

## 6. Enlaces relacionados

- `libs/ww/stats/src/weapons/README.md` — cómo crear/editar una arma a mano
- `docs/engine-extensions.md` — las extensiones del motor para soportar armas
- `ROADMAP.md` — estado del proyecto y lo que falta (Sub-fase 1b: pasivas complejas)
- `.agents/skills/wuw-gg-datamine/SKILL.md` — la guía del agente de IA para extraer datos (sección 2.10: armas)
