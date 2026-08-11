# Estados Elementales / Negative Statuses en Wuthering Waves

> Documento de investigación (en curso) para extender el motor con los estados
> elementales y sus multiplicadores de daño. Fuente inicial: conversación web con
> DeepSeek (pestaña "Estados elementales WuWa", 2026-08-11) + el chat de M_DR.
>
> ⚠️ **Estado del documento:** mucha de la información es **AMBIGUA / SIN CONFIRMAR.**
> Los datos marcados como ✅ tienen fuente confiable contrastada. Los marcados como
> ⚠️ (ambiguo) o ❌ (sin confirmar) **NO deben implementarse** hasta contrastarlos con
> búsquedas profundas (IA de Google / fuentes primarias) y agregar la fuente real.
>
> Objetivo: reunir TODO en un solo lugar, separando lo confirmado de lo pendiente,
> y servir de guía para las búsquedas de confirmación.

---

## 0. Resumen rápido

| Estado | Elemento | Tipo de mecánica | Estado de la data |
|---|---|---|---|
| Glacio Chafe | Glacio | DoT + RES debuff | ❌ Ambiguo / pendiente confirmar |
| Spectro Frazzle | Spectro | DoT + Amplify | ❌ Ambiguo / pendiente confirmar |
| Fusion Burst | Fusion | DoT + burst | ❌ Ambiguo / pendiente confirmar |
| Aero Erosion | Aero | DoT + RES debuff | ❌ Ambiguo / pendiente confirmar |
| Havoc Bane | Havoc | Estado negativo (¿DEF debuff?) | ❌ Ambigüedad señalada por el usuario (cambió en v2.8) |
| Electro Flare (¿"Flayer"?) | Electro | Estado negativo reciente | ❌ Ambiguo / pendiente confirmar |
| Tune Strain - Shifting | Tonalidad (Spectro) | Marcador de transición | ✅ Confirmado (fandom + wuthering.gg) |
| Tune Strain - Interfered | Tonalidad (Spectro) | Debuff tras Tune Break | ✅ Confirmado (fandom) |
| Tune Rupture - Shifting | Tonalidad (Fusion) | Marcador de transición | ✅ Parcialmente (sobrescribe a Strain) |
| Tune Rupture - Interfered | Tonalidad (Fusion) | Ataque coordinado | ⚠️ Duración sin confirmar |
| Hack - Shifting / Interfered | Cyberpunk | Variante Tune Rupture | ✅ Confirmado (fandom, colab 3.4) |
| Hack Response (Lucy/Rebecca) | — | Daño condicional | ✅ Multiplicadores confirmados |

---

## 1. Sistema de Tonalidad (Tune) — ✅ confirmado

> Fuente: `wutheringwaves.fandom.com/wiki/Tune_Strain`, `wuthering.gg/es/guide/fighting/tunability`,
> `game8.co/games/Wuthering-Waves/archives/568979`. Introducido en **Versión 3.0**.

Todo enemigo tiene un **Nivel de Desentono (Off-Tune Level)** que se llena al
golpear con ciertas habilidades. Al llenarse, entra en **Desafinación (Mistune)**.
Cualquier Resonador puede ejecutar **Ruptura de Tonalidad (Tune Break, tecla F)** que:
- Inflige daño adicional
- Reduce la Fuerza de Vibración (Vibration Strength)
- Vacía el Nivel de Desentono
- Interrumpe al enemigo
- Convierte un marcador de **Transición (Shifting)** en **Interferencia (Interfered)**

**Regla clave:** solo puede haber **un efecto de Transición activo a la vez**. Si un
enemigo tiene Tune Strain - Interfered y se aplica Tune Rupture, **Tune Rupture
sobrescribe a Tune Strain.**

### Tune Strain - Shifting ✅
- Marca al enemigo; **no hace nada por sí solo**. Duración: **25 s**.
- Lo aplican: **Denia, Luuk Herssen, Lynae** (y Aemeath según modo).
- Bonus de equipo al aplicar: +8% daño de todos los Resonadores por 30s (3 stacks = 24%).

### Tune Strain - Interfered ✅
- Debuff que **solo** se aplica mediante Ruptura de Tonalidad a un enemigo con Tune Strain - Shifting. Duración: **30 s**.
- Stacks: por defecto 1; con 3 Resonadores de Tune Strain → hasta **4 stacks**.
- **Mecánica de daño:** los Resonadores con "Tune Strain Response" hacen más daño a
  objetivos Tune Strain - Interfered: **+0.12% por cada punto de Tune Break Boost,
  por stack de Interfered**. Con 4 stacks: 0.48% / punto.
- Lo responden: Denia, Luuk Herssen, Lynae, Mornye (Mornye solo responde, no aplica).

### Tune Rupture - Shifting / Interfered ⚠️ (parcialmente confirmado)
- Shifting: lo aplican ciertos Resonadores (Aemeath en modo Tune Rupture, Lynae según modo).
- Interfered: se activa tras Ruptura de Tonalidad sobre un objetivo con Tune Rupture - Shifting.
  Dispara un **ataque coordinado de alto daño** desde el equipo.
- Enemigos con Tune Rupture - Shifting reciben **+20% más daño total**.
- ⚠️ **Sin confirmar:** duración exacta de Tune Rupture - Interfered.
- Aemeath responde a Interfered infligiendo 10 stacks de "Rupturous Trail" (30s) — ❌ daño sin confirmar.

### Hack (variante Cyberpunk) ✅
- **Versión 3.4**, colaboración Cyberpunk Edgerunners. Exclusivo de **Lucy** y **Rebecca**.
- Funciona igual que Tune Rupture: Hack - Shifting → (Tune Break) → Hack - Interfered (8 s) + instancia masiva de daño. No se reaplica hasta que termina Interfered.
- Lo detallan las secciones 3 y 4 de este doc.

---

## 2. Estados elementales tipo "DoT de elemento clásico" — ❌ PENDIENTE DE CONFIRMAR

Estos son los conceptos que el usuario indicó como **ambiguos**: NO tenemos todavía
los multiplicadores de daño por tick reales con fuente confiable. Mientras tanto se
documentan las MENCIONES en pasivas de armas del repo (texto, sin efecto), pero **no
deben implementarse** con números inventados.

> Objetivo de las búsquedas profundas: obtener, para cada uno, el **daño por tick**
> (base + % de ATK), **duración**, **intervalo**, y si hace **debuff de RES / Amplify**.

### 2.1 Glacio Chafe — ❌ sin confirmar (usuarios: Hiyuki, Lucilla)
- Mención en armas: `Frostburn.json5` ("After the wielder applies Glacio Chafe, Glacio DMG is Amplified by 28%... y Glacio Chafe DMG Amplified 20%"), `FreezeFrame.json5`.
- **Pendiente confirmar:** daño/tick, duración, condición de aplicación, y si el
  Amplify aplica al DoT mismo.

### 2.2 Spectro Frazzle — ❌ sin confirmar (armas: BlazingJustice, LuminousHymn, OceansGift)
- Mención: `BlazingJustice.json5` ("Amplifies Spectro Frazzle DMG +50%"), `LuminousHymn.json5` (Outro amplifica Frazzle +30%).
- **Pendiente:** daño/tick de Spectro Frazzle.

### 2.3 Fusion Burst — ❌ sin confirmar (usuarios: Aemeath, Denia)
- Mención: `EverbrightPolestar.json5`, `ForgedDwarfStar.json5`.
- **Pendiente:** daño/tick, condición (¿se aplica al romper? ¿es burst único o DoT?).

### 2.4 Aero Erosion — ❌ sin confirmar (arma: WoodlandAria)
- Mención: `WoodlandAria.json5` ("Inflicting Aero Erosion gives 24% Aero DMG Bonus; hitting Aero Erosion targets reduces their Aero RES 10%").
- **Pendiente:** daño/tick de Aero Erosion.

### 2.5 Havoc Bane — ❌ AMBIGUO (el usuario advirtió)
- ⚠️ **El usuario indicó (2026-08-11):** la info anterior sobre Havoc Bane es **inútil**;
  "hasta dondes se es un estado negativo de reducción de defensa" y **se actualizó en v2.8**.
- Mención en armas: `AzureOath.json5` ("After inflicting Havoc Bane, +36% Heavy Attack DMG Amplification y 12% DEF ignore").
- **Pendiente:** re-investigar Havoc Bane desde la v2.8: ¿es estado de reducción de DEF? ¿DoT? ¿cómo cambió?

### 2.6 Electro Flare (¿"Flayer"?) — ❌ sin confirmar (usuarios: Buling, Rover Electro)
- Estado negativo reciente, poco usado.
- ⚠️ El usuario no está seguro ni del nombre exacto ("electro flarer" o similar → confirmar si es "Flare"/"Flayer").
- **Pendiente:** nombre real, efecto, daño, condiciones.

---

## 3. Tune Hack — Lucy y Rebecca (✅ multiplicadores, del chat DeepSeek)

> Fuente: `wutheringwaves.fandom.com/wiki/Hack`, `.../Hack_-_Interfered#Applicable_Skills`,
> `.../Hack_-_Shifting`, `game8.co/games/Wuthering-Waves/archives/603091` (set Shadow of Shattered Dreams).

### 3.1 Lucy (5★, Spectro, Pistolas) ✅
- **Hack Response "Data Crash"**: `1094.19% + 68.39% × 4 = 1367.75%` daño Tune AMP.
  Escala con su Forte Circuit **"Depths of Blackwall"**.
- Bonus al aplicar Hack - Shifting:
  - +25% Amplify de Heavy Attack DMG (14s)
  - Heavy Attacks ignoran 10% DEF (14s)
  - +35% Basic y Heavy Attack DMG (15s)
  - -5% ATK a todos los objetivos marcados (30s)

### 3.2 Rebecca (5★, Havoc, Pistolas) ✅
- **Hack Response "Meltdown"**: `2358.89%` daño Tune AMP. Escala con Forte **"Gloves Are Comin' Off!"**.
- Modos: Huntress (+30% Crit DMG) | Guts (ignora 15% DEF).
- Bonus al aplicar Hack - Shifting: +12% Basic Attack DMG (14s).
- Aplicación: Intro Skill, Heavy Attack o Resonance Liberation; misma habilidad una vez cada 3s.

### 3.3 Sinergia + Echo set ✅
- Rebecca **no puede activar ciertas mecánicas sin Lucy** (Tune Hack es exclusivo de Lucy).
- Set exclusivo **"Shadow of Shattered Dreams"** (1 pieza): al infligir Hack - Shifting,
  +35% Basic/Heavy DMG por 15s. Primer set de **1 pieza** del juego. Echo único:
  "Reminiscence - Nightmare: Adam Smasher" (solo Lucy/Rebecca). Main stat: Crit Rate/DMG.

---

## 4. Match con el repo (dónde se usa hoy)

Estos estados hoy están **solo como texto** (`description_raw`) en las armas y en las
acciones de algunos Resonadores. El motor **no los modela** todavía.

- Personajes con acciones condicionadas a estados: `Lynae.json5` (Tune Rupture Response
  - Spectral Analysis DMG), `Mornye.json5` (Tune Rupture Response - Particle Jet DMG).
- Armas que mencionan estados (solo texto): Frostburn, FreezeFrame, BlazingJustice,
  LuminousHymn, OceansGift, EverbrightPolestar, ForgedDwarfStar, WoodlandAria, AzureOath,
  DefiersThorn, Kumokiri, PulsationBracer, RadianceCleaver, SpectrumBlaster, etc.

---

## 5. Pendientes de confirmar (para las búsquedas profundas con IA de Google)

- [ ] **Glacio Chafe:** daño/tick (base + %ATK), duración, intervalo, condición, ¿Amplify al DoT? (Hiyuki, Lucilla)
- [ ] **Spectro Frazzle:** daño/tick, duración, intervalo, Amplify. (BlazingJustice, LuminousHymn)
- [ ] **Fusion Burst:** ¿DoT o burst único? daño/tick, condición (Aemeath, Denia)
- [ ] **Aero Erosion:** daño/tick, duración, RES debuff (WoodlandAria)
- [ ] **Havoc Bane:** re-investigar desde v2.8 — ¿es estado de reducción de DEF? ¿DoT? (AzureOath)
- [ ] **Electro Flare/Flayer:** confirmar nombre exacto, efecto, daño, condición (Buling, Rover Electro)
- [ ] **Tune Rupture - Interfered:** duración exacta
- [ ] **Rupturous Trail (Aemeath):** daño de las 10 stacks
- [ ] ¿Cómo se representan los "Tune responses" de Lynae/Mornye en la UI del motor
      (aparecer solo cuando el estado está activo)?

### Cómo confirmar (metodología)
1. Usar fuentes primarias/confiables: `wutheringwaves.fandom.com`, `wuthering.gg`,
   `game8.co`, `wuwatracker`, `wutheringlab`.
2. Contrastar **cada número** con al menos una fuente; si no hay, marcar ❌.
3. Buscar las páginas individuales de cada estado en la wiki (ej. `wiki/Glacio_Chafe`,
   `wiki/Spectro_Frazzle`, `wiki/Fusion_Burst`, `wiki/Aero_Erosion`, `wiki/Havoc_Bane`,
   `wiki/Electro_Flare`) para obtener la tabla de daño por nivel.
4. Actualizar este documento reemplazando ❌/⚠️ por ✅ solo cuando se confirme con fuente.
