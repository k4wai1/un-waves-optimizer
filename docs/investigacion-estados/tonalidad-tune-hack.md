# Tonalidad — Tune Hack (Shifting / Interfered) — Lucy & Rebecca

Estado de investigación. Nombres en inglés: **Tune Hack** (variantes **- Shifting**,
**- Interfered**) y las respuestas **Data Crash** (Lucy) / **Meltdown** (Rebecca).

> Sistema de Tonalidad **v3.4**, colaboración **Cyberpunk Edgerunners**. Exclusivo de
> **Lucy** y **Rebecca**. Funciona como Tune Rupture: Hack - Shifting → (Tune Break) →
> Hack - Interfered (**8s**) + **daño masivo de respuesta**.

## 🔍 Pregunta para pasar a Gemini
> Investigá la mecánica **Tune Hack** en *Wuthering Waves* (nombres en inglés):
> 1. Confirmá nombres y flujo: **Hack - Shifting** → (Tune Break) → **Hack - Interfered**
>    (8s) + daño masivo. ¿No se reaplica Shifting hasta terminar Interfered?
> 2. **Multiplicadores de respuesta** (confirmá que son los reales y en %, del Forte Circuit):
>    - **Lucy (Data Crash)**: `1094.19% + 68.39% × 4 = 1367.75%` Tune AMP? ¿escala Forte
>      "Depths of Blackwall"?
>    - **Rebecca (Meltdown)**: `2358.89%` Tune AMP? ¿escala Forte "Gloves Are Comin' Off!"?
> 3. **Bonus al aplicar Hack - Shifting** (confirmá duración/valores):
>    - Lucy: +25% Amplify Heavy (14s), Heavy ignora 10% DEF (14s), +35% Basic/Heavy DMG (15s), -5% ATK marcados (30s).
>    - Rebecca: +12% Basic DMG (14s); modos Huntress (+30% Crit DMG) / Guts (ignora 15% DEF).
> 4. **Aplicación**: Rebecca inflige Shifting con Intro/Heavy/Liberation, 1/3s. Lucy lo aplica
>    de qué forma?
> 5. **Sinergia y Echo set**: ¿Rebecca no activa mecánicas sin Lucy? Set "Shadow of Shattered
>    Dreams" (1 pieza, +35% Basic/Heavy 15s), Echo "Adam Smasher" (solo Lucy/Rebecca).
> 6. **Implementación**: cómo modelar el "Hack Response" (daño masivo condicional al estado)
>    y los bonus. ¿Como `condition.onInterfered` + amplificación, o como acción disparable en
>    la UI cuando el estado está activo? Proponé el modelado.

## Estado de la data (desde DeepSeek)
- ✅ Nombres y flujo confirmados (v3.4, colab Cyberpunk). Interfered 8s; Shifting no se reaplica hasta terminar Interfered.
- ✅ Lucy **Data Crash** = 1094.19% + 68.39%×4 = **1367.75%** Tune AMP (Forte "Depths of Blackwall").
- ✅ Rebecca **Meltdown** = **2358.89%** Tune AMP (Forte "Gloves Are Comin' Off!").
- ✅ Bonus al aplicar Hack - Shifting (ver pregunta 3).
- ✅ Rebecca aplica con Intro/Heavy/Liberation 1/3s.
- ✅ Rebecca no activa mecánicas sin Lucy. Set "Shadow of Shattered Dreams" (1 pieza) +35% Basic/Heavy 15s. Echo "Adam Smasher" (solo Lucy/Rebecca).
- ⚠️ Pendiente: cómo se modela en el motor + UI disparable.

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Flujo mecánico (2 fases)
1. **Hack - Shifting**: impacto de habilidad habilitada de Lucy/Rebecca → marca latente (sin DoT, sin respuesta propia).
2. **Tune Break** (Off-Tune Level 100% → habilidad de rotura): sobre un objetivo con Shifting → consume la marca → **Hack - Interfered (fijo 8.0 s)**.
3. **Hack Response**: en el MISMO frame de la transición, todos los resonadores con respuesta (Lucy, Rebecca) disparan su daño masivo simultáneamente.
- **Regla de re-aplicación**: mientras el enemigo esté en Interfered, **NO** se puede re-aplicar Shifting (los impactos se ignoran). Hay que esperar a que expiren los 8.0s.

### Delimitación funcional (lo que SÍ vs NO)
| Dimensión | SÍ (permite) | NO (excluido) |
|---|---|---|
| Estado | Transiciona a Interfered exactamente **8.0s** (inalterable) | No refresca/ extiende con nuevos impactos |
| Re-aplicación | Re-aplica Shifting solo al volver al estado base | Bloquea Shifting mientras Interfered esté activo |
| Daño | Emite la respuesta masiva al Tune Break con Shifting | No responde si se hace Tune Break sin Shifting previo |
| Control | **Data Crash** (Lucy): estanca (Stagnate) al enemigo **0.5s** la primera vez que ataca | No interrumpe permanentemente animaciones |
| Sinergia | Se integra con soportes de Off-Tune (Mornye, Shorekeeper) | No activa buffs de Strain/Rupture (necesita nodos de secuencia, ej. Mornye S1) |
| Cargas | Debuff binario (SÍ/NO) | No acumula stacks ni niveles |

### Fórmula determinista (Hack Response DMG)
```
DMG_HackResponse = ATK × Multiplicador_Forte × (1 + TuneAMP) × Mult_Crit × Mult_Element × Mult_DEF × Mult_RES
```
- Escala con **Tune AMP** del resonador que emite. Data Crash escala con "Depths of Blackwall"; Meltdown con "Gloves Are Comin' Off!".

### Multiplicadores de respuesta
| Resonador | Respuesta | Elemento | Fórmula | Final |
|---|---|---|---|---|
| **Lucy** | Data Crash | Spectro | `1094.19% + (68.39% × 4)` | **1367.75%** |
| **Rebecca** | Meltdown | Electro | `2358.89%` | **2358.89%** (ICD 8.0s/objetivo) |
- Data Crash además aplica el debuff que estanca 0.5s al primer ataque del objetivo (listener `OnEnemyAttack`).

### Bonificaciones al aplicar Hack - Shifting
- **Lucy** (sin ICD explícito, sujeto a cooldown de Skill; habilidades Protocol Breach / Payload / Pulse Interference / Deadlock):
  - +25% Heavy DMG Amplify (14s); Heavy ignora 10% DEF (14s); +35% Basic/Heavy DMG (15s); -5% ATK enemigo (30s).
- **Rebecca** (ICD de aplicación **3.0s por habilidad**; Intro / Heavy "Rat-tat-tat!: Huntress" / Heavy "Bang-bang-bang!: Guts" / Liberation "BOOM! Fireworks!"):
  - +12% Basic DMG (14s).

### Posturas de Rebecca (Forte "Gloves Are Comin' Off!")
- **Huntress**: +30% Crit DMG (constante). **Guts**: ignora 15% DEF (constante).
- Recurso **Hot Hand** (máx 120): al llegar a 120, Intro/Skill dispara **"A Girl Gets What She Wants!"** →
  otorga **ambos** modos (+30% Crit DMG y 15% DEF ignore) por **12.0s**, independiente de la postura actual.

### Echo set / sinergia
- **Shadow of Shattered Dreams** (1 pieza, Main Slot de Lucy/Rebecca): +5% Crit Rate y +20% Basic/Heavy DMG (14s)
  al aplicar Hack; CIERTAS configuraciones lo elevan a **+35%/15s**.
- **Adam Smasher** (Echo costo 4, exclusivo Lucy/Rebecca): +15% Crit Rate permanente (slot 1); habilidad activa que adapta su daño elemental al resonador.
- **Dependencia/sinergia**: Rebecca = aplicadora + generadora de ráfagas; Lucy = utilidad + respuesta masiva. Juntas maximizan la frecuencia de Data Crash/Meltdown por cada Tune Break de Off-Tune.

### Arquitectura (TypeScript)
```
type TuneHackStatus = 'NONE' | 'SHIFTING' | 'INTERFERED';
interface EnemyState {
  id; tuneHackStatus; interferedTimer; // max 8.0s
  shiftingAppliedBy: string|null; dataCrashDebuff: boolean;
}
```
- **Intento de Shifting**: si `tuneHackStatus === 'NONE'` → 'SHIFTING', guarda `shiftingAppliedBy`, aplica buffs.
  Si `=== 'INTERFERED'` → se IGNORA.
- **Tune Break**: si `tuneHackStatus === 'SHIFTING'` → 'INTERFERED', `interferedTimer = 8.0`, emite `ON_HACK_INTERFERED`.
- **Tick**: decrementa `interferedTimer`; al llegar a 0 → 'NONE', limpia `shiftingAppliedBy`.
- **ON_HACK_INTERFERED**: para cada resonador con respuesta → `calculateDamage({ attacker, target, baseMultiplier, tuneAmp, element, damageCategory:'HackDMG' })`.
  - Lucy: `baseMultiplier: 13.6775`, Spectro, set `dataCrashDebuff=true`.
  - Rebecca: `baseMultiplier: 23.5889`, Electro, si `isInternalCooldownReady('Meltdown')` → daño + `startInternalCooldown('Meltdown', 8.0)`.

### UI propuesta
- **Panel de inspección de estado** por color: gris (NONE), amarillo (SHIFTING), rojo con temporizador (INTERFERED);
  botón para forzar Tune Break; durante Interfered mostrar **"Aplicación de Shifting Bloqueada"**.
- **Línea de tiempo de rotaciones automáticas**: si una rotación intenta aplicar Shifting durante Interfered,
  registrar warning ("marcado rechazado por restricción temporizada") en el log.

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. A refrendar contra fandom
  `wiki/Hack` y `wiki/Hack_-_Interfered`: los % de Shadow of Shattered Dreams (+20 vs +35) y los
  valores de cooldown de Lucy.
