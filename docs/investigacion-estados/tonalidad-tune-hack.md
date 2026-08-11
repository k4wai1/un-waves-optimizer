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

## Resultado de (Gemini)
<!-- Completar con la respuesta del usuario:
- Nombres/flujo confirmados:
- Multiplicadores Data Crash / Meltdown (si confirman %):
- Bonus al aplicar Hack - Shifting (valores exactos confirmados):
- Aplicación (Lucy/Rebecca):
- Echo set confirmado:
- Implementación propuesta (respuesta condicional + UI):
- Fuente(s):
-->
