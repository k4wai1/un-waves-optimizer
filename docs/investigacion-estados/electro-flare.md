# Electro Flare (estado negativo Electro)

Estado de investigación. Nombres en inglés: **Electro Flare**.

> ⚠️ Confirmar el nombre exacto: el usuario dudaba entre "Electro Flare" y algo tipo
> "Electro Flayer". Confirmado en DeepSeek como **Electro Flare**.

## 🔍 Pregunta para pasar a Gemini
> Investigá el estado negativo **Electro Flare** en *Wuthering Waves* (nombres en inglés):
> 1. **Nombre exacto**: ¿es "Electro Flare"? ¿existe otro similar ("Electro Flayer",
>    "Electro Rage", "Magnetized")? aclarar.
> 2. **Daño tick**: confirmá la tabla por stack (muestra, Buling/Guidebook): 1→829,
>    5→TBA, 10→6894 (¿a qué nivel?), y el **intervalo** (~5-6s). ¿Es DoT que consume **la
>    mitad** de stacks por tick? ¿escala por nivel o ATK?
> 3. **Reducción ATK**: ¿reduce el ATK del enemigo? (1-4 → -5%, 5-9 → -7%, 10 → -10%).
> 4. **Magnetized / Electro Rage**:
>    - ¿Magnetized se aplica desde 5 o 7 stacks? (tutorial vs Game8). ¿qué hace?
>    - **Electro Rage**: ¿los stacks sobre el máximo (10) se convierten en Rage y amplifican
>      el próximo tick? ¿daño por stack de Rage?
> 5. **Aplicación**: **Buling** (v2.8, Electro, Rectifier) y **Rover Electro** (v3.5, Sword).
>    Detallá cuántos stacks aplica cada acción y si Buling puede alcanzar Electro Rage.
> 6. **Implementación**: DOT, stack máx 10, tick ~6s, consume mitad de stacks/tick,
>    reducción de ATK, Magnetized, Electro Rage. Proponé la fórmula.
>
> ⭐ A confirmar: el daño del estado, ¿escala por nivel del Resonador (no ATK), y se reduce
> con DEF/RES enemigo (como Frazzle/Erosion)? ¿El "Rage" amplifica el daño del tick cómo?

## Estado de la data (desde DeepSeek)
- ✅ Nombre confirmado: Electro Flare. Usuarios: Buling y Rover Electro.
- ⚠️ Daño por tick (muestra): 1→829, 2→1503, 3→2177, 4→2851, 5→TBA, 6→4319, 7→4872, 8→5546, 9→6220, 10→6894. Intervalo ~5-6s. Consume la mitad de stacks por tick.
- ✅ Reducción ATK enemigo: 1-4 → -5%, 5-9 → -7%, 10 → -10%.
- ⚠️ Magnetized: desde 5 (tutorial) o 7 (Game8) — sin resolver.
- ⚠️ Electro Rage: stacks >10 → Rage; amplifica el próximo tick; ❓ daño por stack de Rage.
- ✅ Buling: RL solo con barras llenas; campo 2 stacks/2s (24s); Intro 4; S5 +6. No alcanza Rage sola.
- ✅ Rover Electro: Skill Overshock → 10 stacks; RL → 5 (S2 +5); Electric Surge. Alcanza Rage.

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Nomenclatura / identidad
- Nombre canónico en inglés: **Electro Flare**. ❌ Descartar "Electro Flayer".
- "Magnetized" y "Electro Rage" **NO** son nombres del estado: son **sub-estados modulares** de Electro Flare.

### Delimitación (lo que SÍ vs NO)
| Función | SÍ (activa) | NO (fuera) |
|---|---|---|
| DoT periódico | Daño Electro en ticks estrictos, escalado por stacks | NO usa ATK/Crit/Electro DMG Bonus |
| Debuff | Reduce ATK del objetivo (5%/7%/10% por rango) | NO stagger/animación intrínseco (ese es Glacio Chafe) |
| Físico | "Magnetized" al cruzar umbral (5 stacks) | NO reacciones cruzadas entre NS |
| Overflow | Cargas >cap → **Electro Rage** (amplif. del próximo tick) | NO healing/lifesteal |
| Consumo | Tras cada tick reduce a la **mitad (floor)** las cargas | — |

### Tick y consumo
- Tick **exactamente cada 6.0 s** (360 frames a 60Hz).
- Consumo: `current_flare_stacks = floor(current_flare_stacks / 2)`. Matriz: 10→5, 9→4, 5→2, 2→1, 1→0 (estado removido).
- Para sostener daño hay que reinyectar constantemente.

### Reducción ATK + Magnetized
| Rango de stacks (Flare) | ATK enemigo | Estado |
|---|---|---|
| 1-4 | -5% | — |
| 5-9 (hasta <cap) | -7% | **Magnetized** |
| 10 (cap) | -10% | Magnetized |
- ⚠️ **Resuelto:** las fuentes decían 5 o 7; el **tutorial oficial confirma 5**.
- Magnetized = booleano `is_magnetized` (afecta físicas/triggers; no daño directo).
- El debuff de ATK se actualiza en tiempo real (si pasa 10→5 tras tick, cambia -10%→-7%).

### Electro Rage (overflow)
- Flare cap base **10**. Si `current_flare > max_flare_cap`: `overflow = current - cap`; `flare = cap`; `rage += overflow` (rage cap base **10**; el exceso se descarta).
- Función: **amplifica el siguiente tick de Electro Flare**; se **remueve tras activarse** (`rage = 0` incondicional).
- Pipeline del tick: leer flare → leer rage → `BaseDMG` escalado → `× (1 + rage×Constante_Rage)` → aplicar → `flare = floor(flare/2)` → `rage = 0`.

### Fórmulas deterministas
- **BaseDMG_Flare (afín lineal)**: `155 + (674 × flare_stacks)`.
  - Diferencial por stack: **+674** (confirmado por tabla: 2→1503, 3→2177, 4→2851, ..., 10→6894).
  - ⚠️ Anomalía en stack 6 (4319, debería ser 4199) = probable error de transcripción; la serie retoma +674.
  - ⚠️ 155 y 674 están calibrados para un nivel específico → tratar como **Level Scalar** (dependiente del nivel 1-90).
- **RES_Mult** = `1 - (BaseRES - RES_PEN)` (nativa 10% → 0.9). NOTA: esta es la forma lineal; el repo usa la de 3 ramas (más completa).
- **DEF_Mult** = `(800+8·Lc) / [(800+8·Lc) + DEF_enemigo×(1 - DEF_Ignore)]`, `DEF_enemigo = 8×Lv+792`.
  - **DEF Ignore sí afecta** a Electro Flare (a diferencia de ATK/DMG Bonus).
- **DMG_Final** = `[BaseDMG × RES_Mult × DEF_Mult] × (1 + (rage × Constante_Rage))`.
  - **Constante_Rage**: sin valor público exacto; calibrar **15%-25% por Rage**. Caso real: 13 Flare + 13 Rage + DEF Ignore (Chisa) → tick de **~18,000**.

### Aplicadores
- **Buling** (Soporte, Rectifier) — inyección sostenida (mantiene debuff/Magnetized, NO llega solo a Rage):
  - Intro "Summon and Smite" (pasiva "Earthly Immortal is Here!"): **+4 stacks** instantáneos, **CD 10s**.
  - Campo "Five Thunders Spell Array" (Liberation "Flashing Thunder Spell: Harmony"): 24s; **+2 stacks cada 2s** a enemigos en área.
  - **S5**: el Array aplica **+6 stacks** inmediatos al instanciar (Intro 4 + Array 6 → llena 10 en un frame).
- **Rover Electro** (Sub-DPS/DPS, Sword) — burst explosivo (fuerza Rage):
  - Forte "Myriad Omens' Mandate" / "Decipher": skill → "Overshock" → **+10 stacks** (0→10 inmediato: -10% ATK + Magnetized).
  - **S2 "Thousandfold Artifice"**: Liberation "Ultimate Tactics" → **+5 stacks** (Liberation 5 + Overshock 10 = 15 → 10 flare + **5 Rage**).

### Chisa (manipulación externa)
- Outro: **+3 cap** a todos los NS → Flare cap **10→13**, Rage cap **10→13**. Las cargas 11-13 siguen escalando +674 (no van a Rage); Rage empieza a saturar 13.
- DEF Ignore global dependiente de su arma/escalado: **12%-30%** (bajo este efecto + 13/13 Flare/Rage → el tick de 18,000).

### Arquitectura (máquina de estados / ECS)
```
int current_flare_stacks=0; int current_rage_stacks=0;
int max_flare_cap=10; int max_rage_cap=10;   // modificables (Chisa → 13)
float flare_tick_timer=0; boolean is_magnetized=false; float current_atk_penalty=0;
```
- `ReceiveElectroFlare(stacks)`: suma → si >max_flare: overflow→rage (rage cap, exceso descarta) → ReevaluateDebuffs().
- `ReevaluateDebuffs()`: rangos de ATK/Magnetized según stacks (tabla de arriba).
- `TickResolutionLoop(dt)`: `timer+=dt`; si `>=6.0` → calcular `155+674×flare`, `RES/DEF` (con DEF Ignore), `×(1+rage×C_Rage)`; aplicar; `flare=floor(flare/2)`; `rage=0`; `reevaluate`; `timer=0`.

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. A refrendar contra Game8
  `archives/558124` y fandom `wiki/Tutorial/Electro_Flare_Effect`: tick 6s (vs ~5-6 de DeepSeek),
  **Constante_Rage 15-25%** (rango de calibración, no valor fijo), Level Scalar 155/674 por nivel.
