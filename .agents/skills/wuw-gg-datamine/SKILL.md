---
name: wuw-gg-datamine
version: v2.4
description: Dataminea datos de combate de Wuthering Waves (multiplicadores de habilidades, stats base por nivel, buffs, tiempos, resonance chain, PASIVAS Y STATS DE ARMAS) desde wuthering.gg/characters y la Fandom Wiki, extendiendo los sliders y botones "Show Skill Details" vía scripting en el navegador (chrome-devtools MCP / evaluate_script / CDP directo por Node). Usa esto cuando necesites extraer los multiplicadores con decimales de los skills, las stats de ascensión 1-90, las pasivas R1-R5 y stats de armas, o construir un .md de referencia de combate de un personaje de WuWa, o cuando trabajar en carpetas como combate-personajes/, echoes/, weapons/ o test-combat.ts.
---

# Datamining de Wuthering Waves en wuthering.gg

Guía práctica y verificada para extraer los **datos de combate de personajes** de Wuthering Waves. Documenta el método exacto que funcionó para **Shorekeeper** (10/08/2026) usando el navegador Chrome vía el MCP `chrome-devtools` (`evaluate_script` / `take_snapshot`). El objetivo es que un agente repita el proceso **sin reinventar la técnica**, y que **actualice este mismo archivo** cuando encuentre algo nuevo.

## ⚠️ Auto-actualización DE ESTE SKILL (IMPORTANTE)

> **Regla obligatoria:** cada vez que ejecutes un datamine siguiendo esta guía, verifica al final si la estructura del sitio cambió. Si descubres algo nuevo que no estaba documentado aquí (cambio de framework, nueva URL, el slider ya no responde, selectores distintos, datos que antes no estaban, etc.), **edita este SKILL.md** para reflejarlo ANTES de terminar el trabajo.
> - Añade el hallazgo en la sección correspondiente.
> - Bump de la `version` en la cabecera del archivo (ej. `v3` → `v4`).
> - Añade una entrada en el bloque **"Changelog / Hallazgos que actualizaron esta guía"** al pie.
> No dejes el skill desactualizado; es tu fuente de verdad para el futuro.

---

## 1. Fuentes primarias

| Fuente | URL base | Qué aporta |
|--------|----------|------------|
| **wuthering.gg** | `https://wuthering.gg/characters/<slug>` | Multiplicadores de skills por nivel (slider), stats base por nivel de personaje, arma firma, echo set, build stats objetivo. **Mejor para multiplicadores y niveles 1-20.** |
| **Fandom Wiki** | `https://wutheringwaves.fandom.com/wiki/<Personaje>/Combat` | Tablas oficiales de multiplicadores **Lv1-Lv10** (los reales), stats de ascensión, resonance chain, materiales. **Fuente más autoritativa para el nivel real de skill (máx 10).** ⚠️ **Bloqueada por Cloudflare Turnstile** contra el navegador automatizado (09/08/2026): muestra "Just a moment..." y no resuelve el CAPTCHA con chrome-devtools MCP. NO fiable vía MCP automatizado. |
| **nanoka.cc** | `https://ww.nanoka.cc/character/<id>` | Stats base, stat bonuses de árbol, materiales, armas recomendadas. |
| **wutheringlab** | `https://wutheringlab.com/character/<slug>-build/` | Rotaciones, skill priority, equipos, guías. ⚠️ Datos de Resonance Chain **desactualizados**. |

**Aviso sobre niveles:** el **nivel de PERSONAJE va de 1 a 90** (afecta solo a stats base, no a multiplicadores). El **nivel de HABILIDAD/Forte va de 1 a 10** (real) — los multiplicadores se escalan con él. La Fandom lista Lv1-Lv10; wuthering.gg calcula además Lv11-Lv20 por su slider, que son **teóricos/no jugables** (inclúyelos como referencia pero márcalos).

---

## 2. Cómo scrapear wuthering.gg (técnica verificada)

### 2.1 Entender el sitio

- Es una **SPA de Nuxt/Vue** (lo detectas con `has.vue === true` y ausencia de `__NEXT_DATA__`/`__NUXT__`).
- **No hay** `input[type=range]` ni `__NEXT_DATA__`. Los controles son componentes Vue custom con `role="slider"`.
- Los multiplicadores NO se cargan vía un JSON amigable (el `_payload.json` de Nuxt devuelve una estructura minificada). **La forma fiable es leer el DOM y mover los sliders.**

### 2.2 Detectar los sliders

```javascript
// Lista sliders con su tipo
[...document.querySelectorAll('[role="slider"]')].map((s,i)=>({
  i, max: s.getAttribute('aria-valuemax'), val: s.getAttribute('aria-valuetext')
}));
```

Resultado típico en una página de personaje (verificado en 56 personajes, 09/08/2026): hay **9 sliders** en este orden:
- Slider **de personaje / panel de cabecera**: `aria-valuemax="90.0"` (nivel 1-90). Su `.container` (primer slider con `max=90`) contiene también **nombre, rareza (5★/4★), título, arma, cumpleaños, elemento, stats base (HP/ATK/DEF/Crit./ER/Energy) a Lv90 y materiales de ascensión**.
- Slider **de nivel de personaje (stats base)**: otro `max="90.0"` (controla HP/ATK/DEF). No cambia multiplicadores.
- Slider **de weapon level**: otro `max="90.0"` (Lv del arma firma).
- Slider **de weapon rank**: `aria-valuemax="5.0"` (R1-R5).
- 5 sliders **de habilidad**: `aria-valuemax` = **`"19.0"` o `"20.0"`**, uno por skill con `Show Skill Details` (Basic Attack, Resonance Skill, Liberation, Forte Circuit, Intro).

> ⚠️ `aria-valuemax` usa formato decimal (`"20.0"`, `"90.0"`). No compares con `"20"` — usaría `startsWith('20')` o castear.

### 2.2.1 ⚠️ Los sliders de habilidad NO siempre son `max="20.0"` (importante)

En **muchos personajes el slider de habilidad es `max="19.0"`** en lugar de `"20.0"` (ej. **Jinhsi**: las 5 skills son `19.0`; **Jianxin**: mezcla de `20.0` y `19.0`). **No filtres solo por `==='20.0'`** o te quedas sin habilidades. Regla segura: considera que es un slider de **habilidad** si su `aria-valuemax` **NO** es `"90.0"` ni `"5.0"` (o si `max` está entre 10 y 20).

**Niveles reales vs teóricos:** el slider de habilidad se recorre de 1 a `max`, y la cantidad de **niveles jugables reales es SIEMPRE 10** (Lv1-Lv10). La cola que va por encima es teórica/no jugable:
- `max=20` → la tabla "real" del .md es **Lv1-Lv10**; la cola teórica es **Lv11-Lv20**.
- `max=19` → la tabla "real" del .md es **Lv1-Lv9** y la **cola teórica es Lv10-Lv19**. ⚠️ **El Lv10 de esa cola es REAL** (todos los personajes llegan a Lv10); solo Lv11-Lv19 de la cola son teóricos. Al construir specs (p.ej. JSON5) hay que **completar con el primer valor de la cola** para tener SIEMPRE los 10 niveles reales.

> **Corrección (09/08/2026):** una versión anterior de este skill afirmaba que `max=19` → "Lv1-Lv9 reales". Eso es un error: **en el juego todo personaje llega a 10 niveles de habilidad**; el Lv10 cae al inicio de la cola cuando el slider es `max=19` (Jinhsi, Jianxin). Se guarda SIEMPRE la progresión completa (real + teórica); el **motor usa 10 de momento**.

### 2.3 Expandir los "Show Skill Details"

Para que aparezcan los multiplicadores hay que expandir cada skill:

```javascript
[...document.querySelectorAll('button')].forEach(b => {
  if (b.textContent.trim() === 'Show Skill Details') b.click();
});
```

### 2.3.1 ⚠️ PROBLEMA CONOCIDO: hydration de Vue (sliders "desaparecidos")

**Síntoma (reportado por un agente, 09/08/2026):** se navega a un personaje, se expanden los
"Show Skill Details", y al inspeccionar el DOM el `.container` de cada skill tiene un `<div>`
**vacío** donde se esperaba el slider, sin `role="slider"` ni `.slider-target`, y los multiplicadores
quedan fijos a **nivel 1**. Parece que el sitio "ya no tiene sliders".

**Diagnóstico real:** los sliders NO han desaparecido; **Vue no ha terminado de hidratarlos**
(mount client-side) cuando se consulta el DOM. El HTML servido sigue incluyendo `skill-details` y el
CSS de `.slider-target`, pero el control Vue se monta asíncronamente tras la carga.

**Soluciones (aplicar por este orden):**
1. **Esperar a que Vue hidrate** tras expandir: `await new Promise(r=>setTimeout(r,1000))` antes de
   volver a buscarlos. Si aún no aparecen, haz scroll a la sección de skills y espera 1-2 s más.
2. **Forzar un re-render** moviendo el slider de personaje (índice con `aria-valuemax="90"`) a 90 y
   de vuelta, con `sleep`, para que Vue recalcule la vista y monte los sliders de habilidad.
3. **Re-ejecutar la detección** (paso 2.2) tras cada espera: no asumas que una sola lectura es válida.
4. Si aun así no aparecen y el tiempo de espera es excesivo, **usa la Fandom Wiki** (sección 3) para
   los multiplicadores Lv1-Lv10 reales y cruza con wuthering.gg para build/stats.

> No edites esta guía afirmando que "wuthering.gg ya no tiene sliders" solo por este síntoma: primero
> aplica las esperas de la sección 2.3.1. En la sesión de verificación (10/08/2026) los sliders
> aparecieron y respondieron correctamente tras expandir y esperar la hydration.

### 2.4 Estructura DOM de los multiplicadores (la clave)

Una vez expandido, cada skill sigue esta estructura:

```
.ability                          ← contenedor del skill (closest('.ability'))
 └─ .skill-details
     └─ .container                ← contiene el slider y los multiplicadores. ⚠️ Antes de expandir/hidratar tiene `style="display:none"` y un `<div>` vacío donde se montará el slider.
         ├─ .levels
         │   ├─ <p>Level <span>N</span></p>
         │   └─ .slider-target .slider-ltr...   (role=slider dentro de .slider-handle-lower)
         └─ <ul>
             ├─ <li><div class="name">Stage 1 DMG</div><div class="value">15.99%</div></li>
             ├─ <li><div class="name">Healing</div><div class="value">660+3.00%</div></li>
             └─ ...
```

**Selectores que funcionan:**
- Slider del skill: `slider.closest('.slider-target')` contiene el `role="slider"`.
- Nombre del skill: `slider.closest('.ability')` → `querySelector('h1,h2,h3')`.
- Contenedor de filas: `slider.closest('.slider-target').closest('.container')`.
- Cada fila: `<li>` con `.name` (etiqueta) y `.value` (valor).

### 2.5 Leer los multiplicadores en un nivel dado

```javascript
function readRows(container) {
  const rows = {};
  [...container.querySelectorAll('li')].forEach(li => {
    const n = li.querySelector('.name');
    const v = li.querySelector('.value');
    if (n && v) rows[n.textContent.trim()] = v.textContent.trim();
  });
  return rows;
}
// Uso:
const target = slider.closest('.slider-target');
const container = target.closest('.container');
readRows(container); // { "Stage 1 DMG": "15.99%", "Healing": "660+3.00%", ... }
```

### 2.6 Mover el slider a otro nivel (Arrow keys)

El slider custom responde a `keydown` ArrowRight (subir) / ArrowLeft (bajar). Vue necesita tiempo de re-render → usa un pequeño delay entre pasos.

```javascript
const s = sliderHandle; // el elemento con role="slider"
// Bajar hasta nivel 1
let cur = parseFloat(s.getAttribute('aria-valuenow'));
while (cur > 1) { s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); cur--; await sleep(35); }
// Luego subir nivel a nivel para capturar
for (let lvl=1; lvl<=20; lvl++){
  result[lvl] = readRows(container);
  if (lvl<20) { s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); await sleep(60); }
}
```

### 2.7 Función completa de extracción (una sola llamada)

Dentro de `evaluate_script` de chrome-devtools, puedes procesar un skill completo en una llamada asíncrona:

```javascript
async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function readRows(container) {
    const rows = {};
    [...container.querySelectorAll('li')].forEach(li => {
      const n = li.querySelector('.name');
      const v = li.querySelector('.value');
      if (n && v) rows[n.textContent.trim()] = v.textContent.trim();
    });
    return rows;
  }
  const slider = [...document.querySelectorAll('[role="slider"]')][IDX_SKILL];
  const max = Math.round(parseFloat(slider.getAttribute('aria-valuemax'))||0); // 19 o 20
  const target = slider.closest('.slider-target');
  const container = target.closest('.container');
  let cur = parseFloat(slider.getAttribute('aria-valuenow'));
  while (cur > 1) { slider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); cur--; await sleep(25); }
  const result = {};
  for (let lvl=1; lvl<=max; lvl++){
    result[lvl] = readRows(container);
    if (lvl<max){ slider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); await sleep(40); }
  }
  return result;
}
```

Donde `IDX_SKILL` es el índice del slider de skill deseado. Con el layout de 9 sliders (ver 2.2), los **sliders de habilidad son los índices 4-8** (tras personaje, weapon-level, weapon-rank y stats-base). Recorre hasta `max` (19 o 20), no fijo a 20.

### 2.8 Capturar stats base de personaje por nivel (1-90)

Usa el slider de personaje (`aria-valuemax="90"`). Cada skill NO cambia con esto; solo HP/ATK/DEF. Los pares label-valor se leen buscando labels `HP`/`ATK`/`DEF`/`Crit. Rate`/`Crit. DMG`/`Energy Regen` y la hoja siguiente (número o %). Esto sirve para **verificar** que la tabla de ascensión de Fandom es correcta (coinciden).

**Stats base a Lv90 + metadatos en una llamada:** el **primer** slider `max="90.0"` (índice 0) apunta al **panel de cabecera**, cuyo `.container` (o `section`/`div` que contenga el texto "Ascension Materials") incluye en texto plano: nombre, rareza (`5★`/`4★`), título, arma, cumpleaños, elemento, y las **stats base a Lv90** (HP/ATK/DEF/Crit. Rate/Crit. DMG/Energy Regen/Max Resonance Energy) junto a los **materiales de ascensión**. Puedes fijar el slider a 90 y parsear esas etiquetas del `textContent`. Ej. patrón real: `Shorekeeper5★ShorekeeperRectifierFebruary 27SpectroLevel90Shorekeeper Ascension Materials- Max Level: 90Topological Confinement16...HP16712ATK287DEF1099...`.

**Tabla de ascensión completa (1-90) — método eficiente (verificado 09/08/2026):** en una sola `evaluate_script` asíncrona se recorre el slider de personaje de 1 a 90, leyendo en cada nivel el par HP/ATK/DEF (labels seguidos del número), y se devuelve `{nivel:{HP,ATK,DEF}}`. La función de lectura es la misma que en 2.5 pero con `id` de slider 0. Con `await sleep(3)` entre niveles y `sleep(40)` cada 5, son ~9 s por personaje. Los valores son **enteros** redondeados (p.ej. HP 16712); los decimales de Fandom (16712.50) no se obtienen aquí.

**Nota de coste (actualizada):** recorrer los 90 niveles SÍ es viable con el método de una sola llamada + `filePath` a `/tmp` (devuelve SOLO un resumen, guardando el objeto grande a disco). Así se completó la tabla de ascensión 1-90 en los 56 personajes. El valor `max` del slider de personaje es siempre `"90.0"`.

### 2.9 Método alternativo: CDP directo por Node (cuando el MCP chrome-devtools NO está disponible)

Si `mcp__chrome-devtools__*` no responde (p.ej. tras un reinicio del entorno, o si Fandom/red fallan), puedes conducir **Chrome headless por CDP** sin el MCP (verificado 09/08/2026):

1. Lanza Chrome con puerto de depuración:
   ```
   google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9222 \
     --user-data-dir=/tmp/ww-cdp-profile --noerrdialogs --no-first-run --ozone-platform=headless about:blank &
   ```
2. En Node (v22+ tiene `WebSocket` global y `fetch`), crea una tab (`PUT /json/new?<url>` — **no GET**, que el CDP rechaza con "Using unsafe HTTP verb"), conecta al `webSocketDebuggerUrl` y usa `Runtime.evaluate` con `awaitPromise`, `returnByValue:true` para ejecutar el MISMO JS de mover sliders (2.6/2.7/2.8).
3. Espera la **hydration de Vue** (~3.5 s) y re-busca el slider `max="90.0"` antes de recorrer.
4. Guarda el objeto grande con `fs.writeFileSync('/tmp/ww-asc/<slug>-asc.json', ...)`; imprime solo un resumen.
5. Se puede recorrer todos los slugs en un bucle de Node/bash, creando una tab por personaje.

> Ventajas: no depende del MCP, funciona en headless, y permite procesar 56 personajes en lotes. Es la técnica con la que se completaron las ascensiones de los 56 personajes.

### 2.10 Armas (sliders de nivel y rango)

Las páginas de armas (`wuthering.gg/weapons/<slug>`) tienen **2 sliders**:
- **Slider 0**: nivel de arma (1-90) — controla ATK base y second stat.
- **Slider 1**: rango (R1-R5) — controla la pasiva.

Estructura del header: `.stats.head > .item > (.text .value)`. Dos items: el 1º es ATK base, el 2º el second stat (`"Crit. Rate"`, `"Energy Regen"`, etc.). El nombre de la arma está en `.stats.head h1 span`.

Para extraer stats 1-90 y pasiva R1-R5 en una sola llamada `Runtime.evaluate`, mover el slider 0 con `ArrowLeft/Right` (sleep ~3ms por nivel) y leer `.stats.head .item .value`, luego mover el slider 1 (sleep ~60ms por rango) y leer el texto `Skill <name> <pasiva>` del `body`.

**Hydration de Vue**: esperar **6-8s** tras cargar la página; con 2+ workers en paralelo subir a 8s (la CPU compite). Reintentar la detección de sliders hasta 6 veces (sleep 2.5s). **No usar 4+ workers**: saturan la CPU y falla la hydration; 2 es óptimo.

Los datos se guardan a `/tmp/ww-weapons-data.json` (stats + passives) y se generan los `.json5` con `tools/weapons/generate_weapons.cjs`. Ver `docs/weapons-extraction.md` y `libs/ww/stats/src/weapons/README.md`.

**Cuidado con slugs especiales**: nombres con `&` (ej. "Lux & Umbra" → slug `lux-&-umbra`) o apóstrofes rompen el slugify. Ver `tools/weapons/gen_missing.cjs`.

---

## 3. Cómo scrapear la Fandom Wiki (multiplicadores Lv1-Lv10)

- La página `.../wiki/<Personaje>/Combat` tiene los multiplicadores ocultos tras botones **"▼Attribute Scaling▼"** (5 en Shorekeeper). **Deben expandirse** antes de leer.
- El clic por uid de chrome-devtools puede fallar si el botón no está en viewport; solución con JS:
  ```javascript
  [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Attribute Scaling')).forEach(b => b.click());
  ```
- Tras expandir, `take_snapshot` revela las tablas: columnas `1..10` (niveles de habilidad) y filas como `Stage 1 DMG`, `Healing`, `Cooldown`, `Concerto Regen`, etc.
- **Usa Fandom para los niveles reales (1-10) y como fuente de autoridad** para multiplicadores, resonance chain y costos. cross-check con wuthering.gg (nivel 10 debe coincidir).

---

## 4. Reglas de extracción y buenas prácticas

- **Muchos datos → archivarlos por partes.** Para escribir el .md, divide en Write (primer bloque) + Edit (append) para no romper JSON.
- **Verifica la coherencia:** el Lv10 de wuthering.gg debe ser igual al Lv10 de Fandom. Si difiere, hay una versión/parche distinto: anótalo.
- **Multiplicadores con decimales** son los precisos. Mantén los decimales tal cual (`15.99%`, `12.00%*2` → `*2` = daño por golpe × nº golpes).
- **Distancias DOM:** subir "N parents" para aislar un `.ability` es frágil (el primer `h2/h3` coincidente puede ser de otro skill). Usa `closest('.ability')`, no loops de parents.
- **Sesión/navegador:** chrome-devtools MCP requiere que el servidor responda; si `/mcp` falla, el MCP chrome-devtools lanza su propio Chrome (config `--channel stable`, sin `--browser-url` que apunte a un puerto vacío).
- **Sanitización:** al volcar texto en markdown evita emojis salvo que el usuario los pida; usa tablas markdown para los multiplicadores.

---

## 5. Plantilla de salida (.md de combate)

Sigue esta estructura para un `.md` de personaje en `combate-personajes/<slug>-combate.md`:

1. Cabecera (rol, elemento, arma, rareza) + fecha + fuentes + nota de fiabilidad (Lv1-10 reales vs Lv11-20 teóricos).
2. **Stats base y ascensión** (HP/ATK/DEF por fase y 1-90).
3. **Habilidades y multiplicadores** (tablas Lv1-Lv20 por skill) — sección 3 del ejemplo.
4. Resonance Chain (S1-S6) + versiones divergentes si las hubiera.
5. Skill priority.
6. Costo de subir Forte.
7. Build (echo set, arma, stats objetivo).
8. Rotación de burst.
9. Equipos recomendados.
10. Referencias de fuentes.

---

## 6. Changelog / Hallazgos que actualizaron esta guía

- **v1 (10/08/2026):** Método inicial documentado con Shorekeeper. Descubrimientos clave:
  - wuthering.gg es Nuxt/Vue; sin `__NEXT_DATA__`; los controles son `role="slider"`.
  - La estructura de multiplicadores es `.ability > .skill-details > .container > ul > li > (.name/.value)`.
  - El slider de habilidad responde a keydown `ArrowLeft`/`ArrowRight`; `aria-valuemax` usa `.0` decimal.
  - El slider de personaje (90) cambia stats base, NO multiplicadores.
  - Los niveles 11-20 de wuthering.gg son teóricos (máx real de skill = 10, confirmado por Fandom).
  - Fandom: multiplicadores tras botones "▼Attribute Scaling▼" que hay que expandir por JS.

- **v1.1 (09/08/2026):** Documentada la **sección 2.3.1 (problema de hydration de Vue)**. Un agente
  reportó que wuthering.gg "ya no renderizaba" `role="slider"` ni `.slider-target` y que los
  multiplicadores quedaban fijos a nivel 1. Se verificó que es un **problema de timing**: Vue monta
  los sliders client-side después de expandir; hay que **esperar la hydration** (o forzar re-render con
  el slider de personaje) antes de leerlos. Se añadieron las soluciones y la advertencia de no asumir
  que el sitio cambió sin probar las esperas.

- **v2 (09/08/2026):** Datamine masivo de **56 personajes** desde wuthering.gg. Hallazgos nuevos:
  - **Hay 9 sliders por personaje** (no solo 2 tipos): 3× `max=90.0` (panel cabecera / stats-base /
    weapon-level), 1× `max=5.0` (weapon rank) y **5 sliders de habilidad** en los índices 4-8.
  - **Los sliders de habilidad pueden ser `max="19.0"` o `"20.0"`** (no siempre 20). Jinhsi: todas 19;
    Jianxin: mezcla 20/19. **No filtrear por `==='20.0'`**: detectar por `max != 90.0 && max != 5.0`.
  - **En el juego todo personaje llega a 10 niveles reales de habilidad (Lv1-Lv10).** `max=20` → tabla real
    Lv1-10, cola Lv11-20; `max=19` → tabla real Lv1-9 + **Lv10 al inicio de la cola (real)**, cola teórica
    solo Lv11-19. Se guarda la progresión completa; el **motor usa 10** de momento.
  - El **primer slider `max=90` (índice 0)** expone en texto plano nombre+rareza+título+arma+cumpleaños+
    elemento+**stats base Lv90**+materiales de ascensión (fijar a 90 y parsear).
  - Los `.container` de los sliders de habilidad quedan `display:none` hasta expandir; el slider se monta
    al hidratar (~2-3 s). Reutiliza un único navegador (CDP `Target.createTarget`/`closeTarget`) entre
    personajes para ahorrar tiempo/tokens, recorriendo todos los sliders de habilidad de una vez por página.

- **v2.1 (09/08/2026):** **Fandom Wiki ahora está bloqueada por Cloudflare Turnstile** contra el
  navegador automatizado (chrome-devtools MCP). Muestra "Just a moment..." indefinidamente y el CAPTCHA
  no se resuelve automáticamente → **NO es fiable vía MCP**. Para stats/ascensión usa wuthering.gg
  (enteros por nivel 1-90) o nanoka.cc (enteros, redondeados). Los **decimales con 2 cifras** de la
  ascensión solo están en Fandom, que no es accesible por scraping automatizado; si los necesitas, hay
  que resolver el Turnstile manualmente en un navegador real.

- **v2.2 (09/08/2026):** Se completó la **tabla de ascensión completa (1-90)** de los 56 personajes.
  Hallazgos:
  - El MCP chrome-devtools puede NO estar disponible tras un reinicio del entorno (herramientas
    `mcp__chrome-devtools__*` devuelven "Unknown MCP tool"). Vía alternativa: **CDP directo por Node**
    (sección 2.9) — lanzar Chrome `--headless=new --remote-debugging-port=9222`, conectar por WebSocket
    y usar `Runtime.evaluate`.
  - El **slider de personaje es `max="90.0"`** (no varía), y en una sola llamada se recorren los 90
    niveles leyendo HP/ATK/DEF en enteros. Con `filePath` a `/tmp` se guarda el objeto grande sin llenar
    el contexto (solo se imprime resumen). ~9 s por personaje.
  - Se integró la tabla de 90 filas en los 56 `combate-personajes/*.md` de forma uniforme (enteros de
    wuthering.gg). Los `*.md` quedaron verificados: 90/90 filas y valores monotónicos en todos.

- **v2.3 (09/08/2026):** Corrección importante sobre niveles reales. **Todo personaje llega a 10 niveles
  reales de habilidad (Lv1-Lv10).** Una versión previa del skill afirmaba que `max=19` → "Lv1-Lv9 reales".
  Eso es un error: el Lv10 está al inicio de la cola teórica cuando el slider es `max=19` (Jinhsi, Jianxin).
  Se guarda la progresión completa (real + teórica); el **motor usa 10** de momento. Ver sección 2.2.1.

- **v2.4 (10/08/2026):** Añadida la **sección 2.10 (Armas)**. Documentado cómo extraer stats 1-90 y pasiva
  R1-R5 de `wuthering.gg/weapons/<slug>` con 2 sliders (nivel + rango). Corrección: la creación de tab CDP
  usa `PUT /json/new` (el GET da "Using unsafe HTTP verb"). Hallazgos de performance: esperar 6-8s de
  hydration Vue (8s con workers paralelos), **máx 2 workers** por CPU, slugs con `&`/apóstrofe requieren
  manejo especial (`tools/weapons/gen_missing.cjs`).

> **Cuando actualices:** describe aquí el cambio y bump de versión en la cabecera.
