# Estados Elementales / Negative Statuses en Wuthering Waves

> Documento de investigación (en curso) para extender el motor con los estados
> elementales y sus multiplicadores de daño. Fuente inicial: conversación web con
> **DeepSeek** (pestaña "Estados elementales WuWa", 2026-08-11, URL
> `chat.deepseek.com/a/chat/s/8af1053b-...`) + el chat de M_DR.
>
> ⚠️ **Estado del documento:** parte de la información es **AMBIGUA / SIN CONFIRMAR.**
> Los datos con ✅ tienen fuente confiable contrastada. Los de ⚠️ (parcial/ambiguo) o
> ❌ (sin confirmar) **NO deben implementarse** hasta contrastarlos con búsquedas
> profundas (IA de Google / fuentes primarias) y agregar la fuente real en el repo.
>
> **Metodología del usuario (2026-08-11):** primero DeepSeek investigó; luego se harán
> **búsquedas profundas con IA de Google** para confirmar cada dato ambiguo. Ningún
> número ❌/⚠️ se modela en el motor hasta estar verificado.

---

## 0. Resumen rápido

| Estado | Elemento | Tipo | Stack máx | Data |
|---|---|---|---|---|
| Glacio Chafe | Glacio | Daño al aplicar + slow + freeze | 10 (13 c/Chisa·Suisui) | ✅ CONFIRMADO (Gemini) |
| Spectro Frazzle | Spectro | DoT (escala por stack) | 10 | ✅ CONFIRMADO (Gemini) |
| Fusion Burst | Fusion | Explosión al llegar al límite (10/13) | 13 (Chisa) | ✅ CONFIRMADO (Gemini) |
| Aero Erosion | Aero | DoT (escala por stack) | 3 (6/9 con externos) | ✅ CONFIRMADO (Gemini) |
| Havoc Bane | Havoc | **Reducción de DEF** (v2.8) | 3 (6 c/Chisa) | ✅ DEF -2%/stack |
| Electro Flare (¿Flayer?) | Electro | DoT + reducción ATK | 10 | ⚠️ daño por tick: muestra |
| Tune Strain - Shifting | Tonalidad (Spectro) | Marcador | — | ✅ confirmado |
| Tune Strain - Interfered | Tonalidad (Spectro) | Amplify | hasta 4 | ✅ confirmado |
| Tune Rupture - Shifting/Interfered | Tonalidad (Fusion) | Marcador + respuestas | variable | ⚠️ duración sin confirmar |
| Hack - Shifting/Interfered | Cyberpunk | Variante Tune Rupture | 1 | ✅ confirmado |
| Hack Response (Lucy/Rebecca) | — | Daño condicional | 1 | ✅ multiplicadores confirmados |

---

## 1. Estados clásicos (DoT / explosión)

> Todos **NO escalan con ATK/Crit/DMG Bonus del personaje: escalan con el nivel del
> Resonador, DEF y RES del enemigo** (✅ Frazzle y Erosion; ❌ por verificar en los otros).
> El daño se basa en el último personaje que aplicó un stack.

### 1.1 Glacio Chafe (Glacio) — ✅ CONFIRMADO (Gemini 2026-08-11)
- **Daño:** se inflige **instantáneo en el momento de aplicar cada stack** (NO DoT; sin ticks).
  NO escala con ATK ni Crit: escala con **nivel del que aplica** + DEF/RES enemigo + **Amp**.
- **Fórmula NS determinista** (punto fijo ×10000, `Math.floor`):
  `DMG = LevelModifier × (1+MvModifier%) × (StacksMV/10000) × DefModifier% × ResistModifier% × (1+Amp%)`
- **Amp** = solo "NS/Glacio Chafe DMG Amplification" (Frostburn, Outros). El **DMG Bonus**
  convencional NO aplica al NS.
- **StacksMV** depende del **límite máximo**, no de stacks activos (1ª = 9ª aplicación):
  - Límite 10 → **MV = 2.0377** (20377). Límite 13 (Chisa/Suisui) → **MV = 4.0753** (40753).
- **Stacks:** 10 por defecto. Cada stack ralentiza. Al llegar al límite → **congela**, purga a 0.
- **Duración:** ~19 s, refresca al aplicar. ✅ No reduce Glacio RES (solo slow + freeze).
- **Personajes:**
  - **Hiyuki** (v3.3, Sword): al entrar, reclasifica Chafe → **Glacio Bite** (hereda "Chafe DMG").
    Con 2 "Snow Rust", cada aplicación dispara **2 instancias**: Max-Stacks Proc (MV dinámico)
    + Fixed 102% MV. Inward Vision → 4 stacks; Iai → 3. A ≥10 Bites, Inward Vision/Iai detonan
    **Frostbind** (consume 10, daño masivo, sin freeze default). Su arma **Frostburn**: +28%
    Chafe Amp; si es activa, +20% Chafe Amp global.
  - **Lucilla** (v3.4, Rectifier): Outro "Montage" **+60% Chafe Amp** (30s). Pasiva **Film Roll**:
    si un aliado aplica Chafe, gasta 1 → aplica **2 stacks extra** off-field (crea bucles densos). Arma **Freeze Frame**: +30% Glacio DMG, +24% ATK equipo.
  - **Chisa** ("Unraveling - Law Zero"): **+3 stack NS** (10→13, MV 2.0377→4.0753) por 15s;
    **Thread of Bane** DEF Shred -18%. Freeze default se posterga a 13, pero Frostbind sigue consumiendo 10 (margen de 3).
  - **Suisui** (v3.5, Rectifier): "Ceaseless Landscape" +3 stack NS; Outro **+25% All DMG Amp**
    (30s) + ATK% por ER. Aplica Chafe con "Awakening Spring" y básico "Cleansing Rain" Stage 4.
- **Implementación:** `StatusManager` evento-dirigido; pipeline `emit APPLY_STATUS` → interceptor
  (Chafe→Bite, maxStacksLimit) → triggers reactivos (Film Roll) → cálculo NS entero → reconciliation
  (`if stacks>=maxStacksLimit → FREEZE + reset`). Edge: overflow se procesa stack por stack;
  orden DEF Shred antes de DEF Ignore; GC de Bite si Hiyuki+Lucilla salen.
  Ver detalle completo en `docs/investigacion-estados/glacio-chafe.md`.
- **Fuentes:** Gemini 2026-08-11 (respuesta arquitectónica/matemática); refrendar números exactos
  (2.0377, 4.0753, 102%, 19s) contra Game8 `archives/558103` y fandom `wiki/Glacio_Chafe` antes de implementar.

### 1.2 Spectro Frazzle (Spectro) — ✅ CONFIRMADO (Gemini 2026-08-11)
- **DoT paramétrico:** no usa ATK, no usa bonus elemental, **NO critica**. Escala por **nivel
  del Resonador** (LUT/CurveTable: Lv60≈476 → Lv90≈4596) + Amplify específico + RES. **DEF
  enemiga IGNORADA**.
- **Fórmula:** `floor( MV(N_res) × [1+(n-1)·K_stack] × (1+ΣAmplify_SF) × M_RES × M_nivel )`, `K_stack≈0.811`.
- **Muestra** (Lv90 vs Lv90): 1→498, 2→902, 3→1306, 4→1711, 5→2115, 6→2519, 7→2924,
  8→3328, 9→3732, 10→4137 (Δ~404-405 = lineal).
- **Tick:** ~3 s; consume 1 stack/tick; muere al consumir la última (1 stack = 3.0 s). Máx 10.
- **Cadencia:** **Shimmer** (Rover) impide consumo → persiste indefinido; **Phoebe Outro**
  "Silent Prayer" -50% frecuencia (3→4.5 s) + 100% Amplify + -10% Spectro RES.
- **RES:** ❌ no reduce Spectro RES ni amplifica de forma nativa; los RES-shred vienen de estado paralelos (Rover -10%, Phoebe -10%).
- **Resolver RES:** nativa ~10%; RES Shred resta lineal; RES<0 → ganancia a la mitad (-20%→1.10×).
- **Applicators:** Rover Spectro (Resonating Spin → 2+gob.+Shimmer; Liberation → 6); Phoebe
  (Absolution → 1 en buff, flag; Confession → 5/heavy, Liberation → 8); Ciaccona (QTE Yellow
  Tonic → 1); **Zani** consume destructivamente → **Heliacal Ember** (nutre su Forte).
- **Armas/Ecos:** Eternal Radiance (+20% Crit al aplicar Frazzle; +15% Spectro DMG a 10 stacks);
  **Luminous Hymn** (Phoebe, "Homebuilder's Anthem": básicos/pesados escalan con el tick de
  Frazzle; Outro +30~60% Amplify).
- **Implementación:** ECS + FixedUpdate (20-60 Hz); componente `{stacks:uint8, nextTick, tickInterval,
  freqModifier, amplifyRate(×100/×10000), shimmer:bool}`; LUTs por versión de balance (nerf 2.2).
  Ver detalle en `docs/investigacion-estados/spectro-frazzle.md`.
- **Fuentes:** Gemini 2026-08-11; refrendar (K_stack, 476/4596, 3s/4.5s) contra Game8 `archives/549799` y fandom `wiki/Spectro_Frazzle`.

### 1.3 Fusion Burst (Fusion) — ✅ CONFIRMADO (Gemini 2026-08-11)
- **Naturaleza:** sumidero paramétrico de umbral: **NO DoT**, **1 explosión AoE Fusion DMG**
  al llegar al límite (**10 cargas** default; Chisa +3 → **13**). Crit default 1.0 (no critica).
- **Explosion_MV paramétrico (v2.8+):** `Base_Coefficient + Σ(Per_Stack_Coefficient)` por cada
  carga presente **justo antes** de detonar (pre-purga). Daño a 13 cargas > lineal de 10.
- **Pipeline:** `Final = Base_DMG × (1+ΣDMG_Bonus) × (1+ΣAmplify) × DEF_Mult × RES_Mult × Crit_Mult`
  - `Base_DMG = (ATK×Skill_MV)+Flat`; DMG_Bonus y Amplify en grupos separados.
  - RES_Mult piecewise (RES≤0→1-RES/2; 0<RES<0.8→1-RES; RES≥0.8→1/(1+5R)); RES<0 amortigua /2.
  - DEF_Mult WuWa `(800+8Lc)/[(800+8Lc)+(800+8Le)(1-DEF_Ignore)]`; Chisa Thread of Bane +18% DEF Ignore.
- **Duración:** cargas viven 15 s; aplicar refresca todas. (v2.8) daño escala por cargas presentes.
- **RES:** ❌ NO reduce Fusion RES inherente (armas la ignoran: Everbright Polestar -10%, Degenerate Voidmatter -10%).
- **Aemeath** (v3.1, Sword): Forte >5 cargas → ataques aplican Fusion Burst; oyente: +30% Crit DMG por
  aliado que aplica (tope 2); Ultimate "Heavenfall Edict: Finale" = **1789.29% Fusion DMG** (+25% Amplify a tope);
  S3 DEF Ignore en Finale; **S6 anula CanCrit** (puede criticar).
- **Denia** (v3.3, Rectifier, off-field): Erosion Field 30s (+2 cargas/tick, ICD 2s/objetivo); modo
  Fusion Burst → **+30% Fusion DMG equipo**; **Outro "Unfinished Lies" +60% Fusion Burst Amplify** (30s,
  confirmado, NO 40%); **S6**: Erosion Field = detonación forzada con límite teórico ×3.0 **SIN purgar**.
- **Chisa:** Outro +3 cargas NS (10→13) por 15s (dilata Time-to-Burst ~30% pero MV paramétrico > lineal);
  límite dinámico `GetDynamicMaxLimit()`; si expira con exceso → detonación forzada; evasión (iframe) bloquea aplicación.
- **Ecos:** Chromatic Foam (+10% Fusion DMG; +10% al aplicar, +25% tras Outro) y Trailblazing Star
  (+10% Fusion DMG; +20% Crit Rate + +20% Fusion DMG 8s).
- **Fuentes:** Gemini 2026-08-11; refrendar **% exacto de la explosión** (aún sin número absoluto),
  Outro Denia +60%, per-stack coefficient contra Game8 `archives/558431` y fandom `wiki/Fusion_Burst`.

### 1.4 Aero Erosion (Aero) — ✅ CONFIRMADO (Gemini 2026-08-11)
- **DoT:** escala **por nivel del Resonador** (no ATK, no crit). **Base ~5000/tick @Lv90** (LUT/LUT),
  daño **lineal × acumulaciones**. Hard cap **3** default (6 con Aeolian Realm, 9 con Carthethia S2).
- **Fórmula:** `finalDamage = (BaseDamagePerTick × CurrentStacks) × DEF_Mult × RES_Mult × Bonus_Mult`
  - DEF_Mult = `num/(num + enemyDef_eff×(1-DEF_Ignore))`, num=800+8·Lc; DEF nominal enemigo=`8·Lv+792`.
  - RES_Mult piecewise (RES<0→1-RES/2; 0<RES<0.8→1-RES; RES≥0.8→1/(1+5R)). Woodland Aria -16% Aero RES.
  - Bonus = `1 + AeroDMGBonus + ErosionAmplify + Vuln` (sin crit). Ciaccona Outro **+100% Erosion Amplify**.
- **Duración:** 15 s global (refresca en cada aplicación); si expira, TODAS las acumulaciones caen. Tick **~3 s**
  (⚠️ DeepSeek decía 2s; Gemini confirma 3s). No acelera solo (1.5s con aura Fleurdelys).
- **RES:** ❌ NO reduce Aero RES inherente (Woodland Aria / Ciaccona Outro lo hacen, no el estado).
- **Carthethia/Fleurdelys:** genera +2/atque (Basic4, Heavy, Skill); vuln 1-3st→+30% / +10% extra por stack
  >3 (→60% a 6); Manifest aura tick 1.5s +50%; "Power of Discord" consume 1 stack al detonar; "Blade of
  Howling Squall" purga hasta 5 stacks → +20% vuln c/u (→+100%). S2: límite 6→9; S6: detona sin purgar al máx.
- **Aero Rover:** Outro "Storm's Echo" → Aeolian Realm: +3 max_stacks Aero Erosion por 10s; **Skyfall
  Severance** convierte stacks de otros NS (Frazzle/Bane/Burst/Chafe/Flare) en Aero Erosion (suma→purga→reinyecta).
- **Ciaccona:** la mayoría de impactos +1 acumulación; Outro **Windcalling Tune +100% Erosion Amplify**.
- **Ecos:** Gusts of Welkin (+10% Aero DMG 2pc; +15% al infligir Erosion — no activo en Aero Rover sin conversión).
- **Arquitectura:** ECS struct `AeroErosionStatus {CurrentStacks, MaxStacksAllowed, DurationRemaining,
  TickTimer, BaseDamagePerTick, SourceResonator}`; update loop con colapso atómico si expira; eventos atómicos
  HowlingSquall y SkyfallSeverance.
- **Fuentes:** Gemini 2026-08-11; refrendar tick 3s, base ~5000@Lv90, DEF `8·Lv+792` contra Game8 `archives/557617` y fandom `wiki/Aero_Erosion`.

### 1.5 Havoc Bane (Havoc) — ✅ CONFIRMADO (v2.8)
- ⚠️ **El usuario advirtió:** la info anterior a la **v2.8** (daño de explosión) es **OBSOLETA**. Desde la **v2.8** (20/11/2025) Havoc Bane es un **debuff de reducción de DEF**, NO de daño.
- **Efecto:** reduce DEF del objetivo. **-2% DEF por stack**, máx 3 stacks (→ -6% DEF). Con **Chisa** (Outro "Unraveling – Law Zero", +3 stacks de estados negativos por 15s) → hasta **6 stacks = -12% DEF**.
- **Intervalo:** la reducción se aplica en ticks de ~2 s (⚠️).
- **Aplicación:** ataques Havoc stackeables. **Chisa** (v2.8, Havoc, Sword) primero marca con "Unseen Snare"; los enemigos marcados reciben 1 stack de Bane por cada golpe recibido.
- **Implementación motor:** NO es DoT; debe reducir `M_DEF` del objetivo (vía `enemy.defense` o similar), no infligir daño.
- **Set/arma:** Thread of Severed Fate (3p: al infligir Havoc Bane +20% ATK y +30% Liberation DMG 5s); Kumokiri (Chisa). Arma AzureOath (repo) dice "+36% Heavy Amplify + 12% DEF ignore".
- **Fuentes:** Game8 `archives/558014`, fandom `wiki/Version/2.8` (oficial), Gematsu v2.8, Icy Veins Chisa.

### 1.6 Electro Flare (Electro) — ⚠️ muestra, sin fórmula
> El usuario no estaba seguro del nombre ("electro flarer" o similar). Confirmado: **Electro Flare**.
> Usuarios: **Buling** y **Rover Electro**.

- **Daño periódico (DoT):** cada tick consume **la mitad** de los stacks. Escala por stacks.
- **Muestra** (Buling, Guidebook; varía): 1→829, 2→1503, 3→2177, 4→2851, 5→TBA, 6→4319,
  7→4872, 8→5546, 9→6220, 10→6894.
- **Intervalo:** ~5-6 s. Máx 10 stacks.
- **Reducción ATK:** 1-4 stacks -5% ATK; 5-9 -7% ATK; 10 -10% ATK (al enemigo, no al daño recibido).
- **Magnetized:** desde 5 (tutorial) o 7 (Game8) stacks ⚠️; control de movimiento.
- **Electro Rage:** al llegar a 10 stacks, los stacks extra → Electro Rage (amplifica el
  próximo tick). ❌ valor por stack sin confirmar.
- **Aplicación:**
  - **Buling** (v2.8, Electro, Rectifier, 4★/5★ disputado): RL potenciada solo con barras
    Yin+Yang llenas; campo Five Thunders Spell Array (2 stacks cada 2s, 24s); Intro 4 stacks; S5 +6 stacks. No alcanza Electro Rage sola.
  - **Rover Electro** (v3.5, Sword): Skill Overshock → 10 stacks; RL Ultimate Tactics → 5 stacks (S2 +5); acumula Electric Surge (120) para transformar la skill. Único que alcanza Electro Rage.
- **Fuentes:** Game8 `archives/558124`, fandom `wiki/Tutorial/Electro_Flare_Effect`, fandom `wiki/Version/2.8`, Wutheringlab Buling, GuRu/Lootbar/wwplus (⚠️ tercio).

---

## 2. Sistema de Tonalidad (Tune) — ✅ confirmado

> Introducido en **v3.0**. Todo enemigo tiene **Off-Tune Level** que se llena al golpear.
> Al llenarse → **Desafinación (Mistune)**. Cualquier Resonador ejecuta **Ruptura de
> Tonalidad (Tune Break, tecla F)**: daño extra, reduce Vibración, vacía medidor,
> interrumpe, y convierte **Transición (Shifting) → Interferencia (Interfered)**.
> Fuente: fandom `wiki/Tune_Strain`, `wuthering.gg/es/guide/fighting/tunability`, Game8 `archives/568979`.

**Regla:** solo un efecto de Transición activo a la vez; **Tune Rupture sobrescribe a Tune Strain**.

### Tune Strain - Shifting ✅
- Marca al enemigo (no daña solo). Duración **25 s**. Aplican: Denia, Luuk Herssen, Lynae (y Aemeath según modo).
- Bonus equipo: +8% daño todos, 30s, 3 stacks (→24%).

### Tune Strain - Interfered ✅
- Debuff tras Tune Break en un objetivo con Strain - Shifting. Duración **30 s**.
- Stacks: 1 base; con 3 Resonadores Strain → hasta **4 stacks**. Lynae aumenta el límite en 1.
- **Mecánica de daño:** Resonadores con "Tune Strain Response" hacen +**0.12%** por cada
  punto de **Tune Break Boost**, **por stack** de Interfered (con 4 stacks: 0.48%). Nameless Explorer: +4% daño recibido por stack.
- Responden: Denia, Luuk Herssen, Lynae, Mornye (Mornye no aplica, solo responde).

### Tune Rupture - Shifting / Interfered ⚠️
- Shifting: Aemeath (modo Tune Rupture), Lynae (según modo).
- Interfered: dispara **ataque coordinado de alto daño** desde el equipo. Enemigos con Rupture - Shifting reciben +20% más daño total.
- **❌ Duración no confirmada.**
- Mornye: si el enemigo tiene Rupture/Strain - Interfered, el **equipo** hace hasta **+40%** más daño (0.25% amplif. por 1% ER sobre 100%, cap 40%).
- Aemeath responde a Interfered infligiendo 10 stacks de "Rupturous Trail" (30s) ❌ daño sin confirmar.

### Hack (Cyberpunk) ✅
- **v3.4**, colab Cyberpunk Edgerunners. Exclusivo de **Lucy** y **Rebecca**. Idéntico a Tune Rupture: Hack - Shifting → (Tune Break) → Hack - Interfered (**8 s**) + daño masivo. No se reaplica hasta terminar Interfered.
- **Hack Response:**
  - **Lucy** (5★, Spectro, Pistolas): **Data Crash = 1094.19% + 68.39%×4 = 1367.75%** Tune AMP (Forte "Depths of Blackwall"). Bonus al aplicar Hack - Shifting: +25% Amplify Heavy (14s), Heavy ignora 10% DEF (14s), +35% Basic/Heavy DMG (15s), -5% ATK marcados (30s).
  - **Rebecca** (5★, Havoc, Pistolas): **Meltdown = 2358.89%** Tune AMP (Forte "Gloves Are Comin' Off!"). Modos Huntress (+30% Crit DMG) / Guts (ignora 15% DEF). +12% Basic DMG (14s). Aplica Shifting con Intro/Heavy/Liberation, 1/3s.
- **Sinergia:** Rebecca no activa ciertas mecánicas sin Lucy. Set "Shadow of Shattered Dreams" (1 pieza, primero del juego): al infligir Hack - Shifting +35% Basic/Heavy DMG 15s. Echo único "Adam Smasher" (solo Lucy/Rebecca). Main stat: Crit Rate/DMG.
- **Fuentes:** fandom `wiki/Hack`, `wiki/Hack/Hack_-_Interfered`, `wiki/Hack_-_Shifting`, Game8 `archives/603091`.

---

## 3. Marcadores de Tonalidad: Lynae / Mornye / Aemeath

- **Lynae (Lyncae):** alterna entre Tune Rupture y Tune Strain según modo ("Spectral Analysis: Flux"), habilitando respuestas de ruptura con **+1880%** de daño ⚠️. S2: +25% All DMG Amp + +70% Rupture Response.
- **Mornye:** convierte "Observation Marker" en **Interfered Marker** por 8 s. Si el enemigo tiene Rupture/Strain - Interfered, el **equipo hace hasta +40%** más daño. Contra Tune Rupture - Interfered dispara **"Particle Jet"** (daño Fusion plano, cooldown 8s/objetivo) ❌ valor sin confirmar.
- **Aemeath:** en modo Tune Rupture aplica el debuff; cuando el equipo responde a Interfered inflige 10 stacks de "Rupturous Trail" (30s); +20% STBK por compañero que inflige Rupture (hasta 3).
- **Match repo:** `Lynae.json5` (Tune Rupture Response - Spectral Analysis DMG), `Mornye.json5` (Tune Rupture Response - Particle Jet DMG). Estas acciones **solo deberían mostrarse/activarse cuando el estado está activo** en la UI (pendiente).

---

## 4. Match con el repo (dónde se usa hoy)

Estos estados hoy están **solo como texto** (`description_raw`) en las armas y en las
acciones de algunos Resonadores. El motor **no los modela** todavía.

- Personajes con acciones condicionadas a estados: `Lynae.json5`, `Mornye.json5`.
- Armas que mencionan estados (solo texto): Frostburn, FreezeFrame, BlazingJustice,
  LuminousHymn, OceansGift, EverbrightPolestar, ForgedDwarfStar, WoodlandAria, AzureOath,
  DefiersThorn, Kumokiri, PulsationBracer, RadianceCleaver, SpectrumBlaster, etc.

---

## 5. Pendientes de confirmar (búsquedas profundas con IA de Google)

- [ ] **Havoc Bane (v2.8):** duración exacta del estado (no se especifica oficial), confirmar que la reducción de DEF aplica a `M_DEF` (y no "por tick de daño").
- [ ] **Electro Flare:** nombre exacto ("Electro Flare" vs "Electro Flayer"), daño de Electro Rage por stack, duración total, ¿escala con nivel o ATK?, umbral real de Magnetized (5 vs 7).
- [ ] **Tune Rupture - Interfered:** duración exacta.
- [ ] **Rupturous Trail (Aemeath)** y **Particle Jet (Mornye)**: daño real.
- [ ] **Cómo representar los "Tune responses"** (Lynae/Mornye) en la UI: mostrar la acción solo cuando el estado esté activo.
- [ ] Modelar los **intervalos/ticks** de los DoT en el motor (cada N segundos no es un solo `calculateDamage`).

### Metodología de confirmación
1. Fuentes primarias/confiables: `wutheringwaves.fandom.com`, `wuthering.gg`, `game8.co`, `wutheringlab`, `wuwatracker`.
2. Cada número con ≥1 fuente; si no → ❌.
3. Buscar las páginas individuales de cada estado (`wiki/Glacio_Chafe`, `wiki/Spectro_Frazzle`, `wiki/Fusion_Burst`, `wiki/Aero_Erosion`, `wiki/Havoc_Bane`, `wiki/Tutorial/Electro_Flare_Effect`) para la tabla de daño.
4. Actualizar reemplazando ❌/⚠️ → ✅ solo con fuente real agregada.
