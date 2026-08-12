# Aero Erosion (estado negativo Aero)

Estado de investigación. Nombres en inglés: **Aero Erosion**.

## 🔍 Pregunta para pasar a Gemini
> Investigá el estado negativo **Aero Erosion** en *Wuthering Waves* (nombres en inglés):
> 1. **Daño tick**: confirmá el daño periódico por stack (¿%, valor, o por nivel?). ¿Es
>    **por nivel del Resonador** (no ATK)? ¿intervalo entre ticks (~2s)? ¿duración base (~15s)?
> 2. **Stacks**: ¿máx 3 por defecto? ¿hasta 6 con Aero Rover? ¿cómo escala el daño con stacks?
> 3. **Efectos**: ¿reduce Aero RES del enemigo como efecto inherente? (el arma WoodlandAria
>    dice "-10% Aero RES"; y **Ciaccona** reduce 12% Aero RES al aplicar Erosion — ¿es de
>    Ciaccona o del estado?). ¿amplifica Aero DMG?
> 4. **Aplicación**: ¿qué lo inflige? (Ciaccona al golpear; **Aero Rover** convierte otros
>    estados en Aero Erosion).
> 5. **Implementación**: DOT, stack máx 3 (6 con Aero Rover), tick ~2s, duración 15s,
>    scaling por nivel. Proponé la fórmula.
>
> ⭐ A confirmar: confirmá si el daño NO usa ATK/Crit (escala por nivel de Resonador +
> DEF/RES enemigo), similar a Spectro Frazzle.

## Estado de la data (desde DeepSeek)
- ✅ DoT periódico, escala por stacks; **NO usa ATK (por nivel)**.
- ✅ Stacks: 3 por defecto (6 con Aero Rover). Duración 15s. Intervalo ~2s.
- ⚠️ Ciaccona: al aplicar Erosion +20% Aero DMG (10s) y -12% Aero RES enemigo (20s) — ¿del personaje o del estado?
- ✅ Aplican: Ciaccona (al golpear), Aero Rover (convierte otros estados).
- ❓ Daño por tick: sin fórmula pública.

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Ontología (intrínseco vs falso)
| Característica | SÍ (intrínseco) | NO (falsamente atribuido) |
|---|---|---|
| Escala daño | **por nivel del Resonador** que aplicó | NO usa ATK%, NO critica |
| Límite | Hard cap **3** default; daño **lineal × acumulaciones** | NO sube solo (6/9 = forzado por externos) |
| Duración | **15 s** global, reflejada en cada aplicación | Sin temporizadores por stack |
| Cadencia | tick base **~3 s** (no 2s) | NO acelera solo (1.5s = aura externa) |
| Defensas | sujeta a DEF y RES enemigo | NO reduce Aero RES inherente |
| Amplify | dispara evento único a 10 stacks (torbellino) | NO tiene amplif. propia (+100% = externo) |

### Fórmula determinista
```
finalDamage = (BaseDamagePerTick × CurrentStacks) × DEF_Mult × RES_Mult × Bonus_Mult
```
- **BaseDamagePerTick** ~5000 (Lv90, 1 stack) desde tabla/LUT por nivel del atacante (constante,
  no ATK). Escala **lineal** con stacks.
- **DEF_Mult** = `num / (num + enemyDef_eff × (1 - DEF_Ignore))`, `num = 800 + 8·Lc`.
  - DEF nominal enemigo = `8·Lv + 792` (p. ej. Lv100 → 1592).
  - Ej.: atacante Lv90 (num 1520) vs enem Lv100 (1592): 0.4884 sin ignore; +12% ignore → 0.5203 (+6.54%); +30% → 0.5769 (+18.14%). Carthethia **Defier's Thorn**: -16% DEF.
- **RES_Mult** piecewise (RES<0 → 1-RES/2; 0≤RES<0.8 → 1-RES; RES≥0.8 → 1/(1+5·RES)).
  - **Woodland Aria** (Ciaccona) rest -16% Aero RES al impactar afligidos.
- **Bonus_Mult** = `1 + AeroDMGBonus + ErosionAmplify + Vulnerability` (sin crit).
  - Gusts of Welkin 2pc: +10% Aero DMG. **Ciaccona Outro "Windcalling Tune": +100% Erosion Amplify**
    (multiplicativo en el final, aditivo en su segmento). **Carthethia**: vuln hasta +100%.

### Carthethia / Fleurdelys (consumo paramétrico)
- **Generación (modo Carthethia):** Basic Stage 4, Heavy, Skill cada uno → **+2 acumulaciones**.
  - Áreas tipadas como "Aero Erosion" para heredar Amplify, pero **sí critican** (son ataques del kit).
- **Vulnerabilidad por stacks:** 1-3 stacks → +30% vuln; por cada stack >3 → +10% extra (≤3 extra) → **60% a 6 stacks**.
- **Manifest (Fleurdelys):** aura "Will of Divinity" → tick 3s → **1.5s** y +50% potencia en su radio.
  - "Power of Discord": ciertos ataques **consumen 1 acumulación** al detonar Erosion (reduce vuln; se evita omitiendo Heavy/Intro → conflictos de rotación).
- **Blade of Howling Squall:** lee máx 5 stacks, **purga**; por stack purgado → **+20% vuln** (hasta +100%).
- **Secuencias:**
  - S1: al eliminar una entidad, clona acumulaciones a la más cercana.
  - S2: expande límite 6 → **9** bajo aura de Aero Rover.
  - S3: genera acumulaciones desde la forma Manifest (autonomía).
  - S6: listener global 30s → al aplicar sobre un objetivo al máximo, **detona daño instantáneo sin purgar**.

### Aero Rover (manipulación global / conversión)
- **Outro "Storm's Echo"** → aura **Aeolian Realm** (30s): dentro de ella, un aliado que golpea
  eleva `max_stacks` de Aero Erosion en **+3 por 10s** (dependencia crítica para Carthethia llegar a 6).
- **Skyfall Severance:** escanea estados convertibles (Spectro Frazzle, Havoc Bane, Fusion Burst,
  Glacio Chafe, Electro Flare), **suma sus stacks y los purga**, e inyecta ese total como Aero Erosion
  (respeta max_stacks). Permite usar Phoebe (Frazzle) como "generador indirecto".
- No tiene aplicación directa en su kit base → Gusts of Welkin en Aero Rover no se activa salvo conversión.

### Ciaccona (habilitador / multiplicador)
- Musical Essence / Solo Concert: la mayoría de sus impactos aplican **+1 acumulación** (Basic Stage 4,
  Intro, Heavy condicional); además inyecta **fragmentos de Spectro Frazzle** (Aero Rover los convierte → bucle).
- **Outro "Windcalling Tune": +100% Aero Erosion Amplify** (multiplicador casi irremplazable).

### Equipamiento / edge cases
- **Gusts of Welkin**: infligir Aero Erosion → +15% Aero DMG a todos los Resonadores; en Aero Rover
  solo se activa por Skyfall Severance (no aplicación nativa).
- **Woodland Aria** (Ciaccona): -16% Aero RES. **Defier's Thorn** (Carthethia): DEF ignore condicional.

### Arquitectura (ECS / data-driven)
```
struct AeroErosionStatus {
  int CurrentStacks; int MaxStacksAllowed;      // base 3, Aeolian Realm = 6
  float DurationRemaining;                      // reset 15s en cada aplicación
  float TickTimer; float BaseDamagePerTick;     // por nivel del atacante (~5000@Lv90)
  Entity SourceResonator;                       // hereda DEF ignore
}
```
- Update loop: si `DurationRemaining<=0` → stacks=0 (colapso atómico); `TickInterval` dinámico
  (3s / 1.5s con Fleurdelys).
- `ExecuteDamageTick`: `base*stacks × DEF × RES × Bonus` (sin ATK/crit).
- Eventos atómicos: `ExecuteHowlingSquall` (consume hasta 5, +20% vuln c/u, daño inmediato) y
  `ExecuteSkyfallSeverance` (escanea→suma→purga→re-inyecta como Erosion).

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. A refrendar: el tick base **3s**
  (vs ~2s de DeepSeek), **BaseDamagePerTick ~5000@Lv90**, DEF nominal `8·Lv+792`, y valores exactos
  de las secuencias/sets contra Game8 `archives/557617` y fandom `wiki/Aero_Erosion`.
