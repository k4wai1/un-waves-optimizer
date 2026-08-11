# Spectro Frazzle (estado negativo Spectro)

Estado de investigación. Nombres en inglés: **Spectro Frazzle**.

## 🔍 Pregunta para pasar a Gemini
> Investigá el estado negativo **Spectro Frazzle** en *Wuthering Waves* (nombres en inglés):
> 1. **Daño tick**: confirmá el daño por tick por stack (¿es igual a la tabla de muestra?):
>    stacks 1→498, 5→2115, 10→4137 (¿a qué nivel de Resonador/enemigo?). ¿Es una fórmula
>    fija por nivel, o % de ATK? ¿escala con ATK, nivel, DEF/RES enemigo?
> 2. **Stacks/duración**: ¿máximo de stacks? ¿duración total? ¿intervalo entre ticks (~3s)?
> 3. **Efectos**: ¿reduce Spectro RES? ¿amplifica daño Spectro? (las armas BlazingJustice
>    "+50% Frazzle DMG", LuminousHymn Outro "+30%" parecen amplificar el daño del DoT en sí).
> 4. **Aplicación**: ¿qué lo inflige y cuántos stacks por acción? (Spectro Rover "Resonating
>    Spin" → 2 stacks; Phoebe).
> 5. **Implementación**: DOT, stack máx 10, tick interval ~3s, consume 1 stack/tick,
>    scaling por nivel (no ATK). Proponé la fórmula del daño por stack.
>
> ⭐ Dato clave a confirmar: Spectro Frazzle **NO usa ATK ni Crit**; escala por **nivel del
> Resonador + DEF/RES enemigo**. Verificá si el "Frazzle DMG" amplificado por armas es el
> daño del estado (DoT) y cómo se combina.

## Estado de la data (desde DeepSeek)
- ⚠️ Daño por tick (muestra, Spectro Rover/Guidebook): 1→498, 2→902, 3→1306, 4→1711,
  5→2115, 6→2519, 7→2924, 8→3328, 9→3732, 10→4137. **Es escala por nivel, no %ATK** ✅.
- ✅ Intervalo ~3s/tick; consume 1 stack por tick; termina al consumir el último.
- ✅ Máx 10 stacks.
- ❓ ¿Reduce Spectro RES? Sin confirmar.
- ✅ Aplican: Spectro Rover (2 stacks), Phoebe.

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Confirmaciones clave
- **DoT paramétrico**: no usa ATK, no usa bonus elemental convencional, **NO critica**.
  Escala por **nivel del Resonador** (el que aplicó) + **Amplify específico de Frazzle** +
  RES enemigo. La **DEF del enemigo es ignorada** (viaja directo a la capa de RES). ✅
- **NO reduce Spectro RES** ni amplifica daño Spectro de forma nativa: las reducciones/bonos
  coloquialmente atribuidos al Frazzle vienen de **estados paralelos** de los Resonadores. ✅
- Tick base: **cada 3.0 s**, consume **1 acumulación** por tick; el estado muere al consumir
  la última (una sola acumulación vive exactamente 3.0 s). Máx **10 acumulaciones**. ✅
- Curva: un Resonador Lv60 vs enemigo Lv90 → ~476 de daño; **Lv90 → 4596** (~10× en 30 niveles)
  → **curva no lineal (CurveTable / LUT)**. ✅

### Fórmula determinista (punto fijo recomendada)
```
Daño = floor( ( MV(N_res) × [1 + (n-1)·K_stack] ) × (1 + Σ Amplify_SF) × M_RES × M_nivel )
```
- `MV(N_res)`: valor base desde **LUT por nivel** del Resonador.
- `n`: acumulaciones en el tick. `K_stack` ≈ **0.811** (incremento ~81.1% del daño base por
  acumulación adicional por encima de la primera).
- `Σ Amplify_SF`: amplificadores específicos de Frazzle (armas/Outros), aditivos entre sí.
- `M_RES`: mitigación por resistencia (nativa ~10%; **RES Shred resta lineal**; si RES < 0 se
  **divide la ganancia a la mitad**: -20% RES → 1.10×). `M_nivel` = delta leve de niveles
  (p. ej. Lv90 vs enem Lv70 = 4598 vs Lv90 = 4596, ~mínima).
- **DEF ignorada** (no aparece en la fórmula de Frazzle). Operación `floor` final.

### Tabla de muestra (Lv90 vs Lv90) — verificación de linealidad
Stacks: 1→498, 2→902 (Δ404), 3→1306 (Δ404), 4→1711 (Δ405), 5→2115 (Δ404), 6→2519 (Δ404),
7→2924 (Δ405), 8→3328 (Δ404), 9→3732 (Δ404), 10→4137 (Δ405). Diferencia ~404-405 = truncado
de un incremental constante → **relación estrictamente lineal** en stacks.

### Modificadores de cadencia temporal
- **Shimmer** (Rover Spectro): mientras coexiste en el objetivo, **NO consume acumulaciones**
  en el tick → el Frazzle persiste indefinidamente. (Compuerta booleana en el bucle.)
- **Phoebe Outro "Silent Prayer"**: reduce la frecuencia del tick en **50%** (3.0 → **4.5 s**)
  a cambio de **+100% Amplify** y **-10% Spectro RES** enemiga.

### Applicators (inyección de acumulaciones) ✅
- **Rover (Spectro)**: Forte "Diminutive Sound" (≥50 puntos) reemplaza su Skill por
  "Resonating Spin" → aplica **2 acumulaciones + Shimmer**; Liberation "Echoing Orchestra"
  (AoE) → **6 acumulaciones** por objetivo. Es el gestor principal.
- **Phoebe** (5★, primera DoT-specialist): dos modos excluyentes por su Forte "Prayer"
  (5/s, ciclo 24s):
  - **Absolution** (básico, daño puro): primer golpe del heavy aplica **1 acumulación** (flag
    para activar pasivas de ecos).
  - **Confession** (Skill, aplicación profunda): heavies "Starlight Brilliance" → **5 acumulaciones**
    por impacto; Liberation bajo Confession → **8 acumulaciones** en el área.
- **Ciaccona** (Aero, puente inter-elemental): Liberation "Singer's Triple Cadenza - Recital"
  + QTE "Yellow Tonic" → daño Aero que aplica **1 acumulación** de Spectro Frazzle (sinergias cruzadas).

### Interceptores / conversión
- **Zani** (pasiva estructural): escucha global cualquier aplicación de Frazzle; al validar su
  presencia en el equipo (aunque no la opere el jugador), **consume destructivamente** el Frazzle
  y lo transforma en **Heliacal Ember** (nutre su Forte "Blaze" + su multiplicador de daño).
  Requiere `OnStateDestroyed` con callbacks.
- **Mutación inter-elemental**: futuras adaptaciones (p. ej. Rover Aero convirtiendo Frazzle →
  Aero Erosion). Las acumulaciones deben ser **acceso público/leíbles/sustraíbles**.

### Armas y Ecos (Observer)
- **Eternal Radiance** (Sonata): (1) infligir Frazzle → **+20% Crit Rate mejorado por 15s**;
  (2) golpear un objetivo a **10 acumulaciones** → **+15% Spectro DMG Bonus por 15s**.
- **Luminous Hymn** (Rectificador de Phoebe, "Homebuilder's Anthem"): básicos/pesados ganan
  multiplicadores al detonar Frazzle; Outro añade **+30% ~ +60%** a Σ Amplify_SF según refinamiento.

### Arquitectura propuesta (ECS + FixedUpdate)
- Usar **ECS**: enemigo = entidad; Spectro Frazzle = **componente de datos puros**:
  - `stacks: uint8`, `nextTickTimestamp: ms`, `tickIntervalMs`, `frequencyModifier` (Phoebe -50%),
    `amplifyRate` (base 100/10000), `shimmerActive: bool`.
- Procesar en **FixedUpdate** (20-60 Hz), no en `Update()` de frames, para determinismo binario.
- Cada tick: si `now >= nextTick` → daño paramétrico (LUT por nivel del agresor original +
  stacks + amplify + M_RES + M_nivel); si `!shimmerActive` → decrementar 1 acumulación; si
  `stacks == 0` → destruir componente y notificar observadores.
- **Balance/versión**: LUTs segmentadas con parámetro global de versión (p. ej. nerf global de
  MV en parche **2.2**) para interpolar histórico sin tocar el código.

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. Valores clave (K_stack≈0.811,
  476@Lv60 / 4596@Lv90, tick 3s/4.5s) a refrendar contra Game8 `archives/549799` y
  fandom `wiki/Spectro_Frazzle` antes de implementar con esos números exactos.
