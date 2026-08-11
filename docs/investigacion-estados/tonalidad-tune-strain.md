# Tonalidad — Tune Strain (Shifting / Interfered)

Estado de investigación. Nombres en inglés: **Tune Strain** (variantes **- Shifting** y
**- Interfered**).

> Sistema de **Tonalidad (Tune)** introducido en **v3.0**. Ver flujo en
> `docs/estados-elementales.md` sección 2. Desentono (Off-Tune) → Desafinación (Mistune)
> → **Ruptura de Tonalidad (Tune Break)** → convierte **Transición (Shifting)** en
> **Interferencia (Interfered)**.

## 🔍 Pregunta para pasar a Gemini
> Investigá el marcador de Tonalidad **Tune Strain** en *Wuthering Waves* (nombres en inglés):
> 1. **Tune Strain - Shifting**: confirmá que es un marcador (no daña solo), duración
>    **25s**, y que lo aplican **Denia, Luuk/Morningstar? Herssen, Lynae** (¿nombres en
>    inglés correctos?). ¿El bonus de equipo +8% daño 30s (3 stacks) al aplicar es correcto?
> 2. **Tune Strain - Interfered**: confirmá duración **30s**, stacks (1 base; hasta **4**
>    con 3 Resonadores Strain; ¿Lynae sube el límite en 1?). ¿Ocurre SOLO tras Tune Break
>    sobre un objetivo con Shifting?
> 3. **Mecánica de daño (Tune Strain Response)**: confirmá que los Resonadores con
>    "Response" hacen **+0.12% por punto de Tune Break Boost, por stack de Interfered**
>    (con 4 → 0.48%). ¿"Tune Break Boost" a qué stat del personaje corresponde
>    (`tuneBreakBoost` en el motor)?
> 4. **Regla de exclusión**: confirmá que **solo un efecto de Transición activo** y que
>    Tune Rupture sobrescribe a Tune Strain (¿y viceversa?).
> 5. **Implementación**: ¿modelarlo como un `condition.onAction` + amplificación por
>    `tuneBreakBoost * stacks`? Proponé el modelado (target stat, multiplicador).

## Estado de la data (desde DeepSeek)
- ✅ Shifting: marcador, 25s, aplican Denia/Luuk Herssen/Lynae (+Aemeath según modo).
- ✅ Bonus equipo al aplicar Shifting: +8% daño (30s, 3 stacks → 24%).
- ✅ Interfered: 30s; solo tras Tune Break sobre Shifting; 1 stack base, hasta 4 (Lynae +1).
- ✅ Response: +0.12% por punto de Tune Break Boost, por stack (4 → 0.48%).
- ✅ Regla: un solo Transición; Tune Rupture sobrescribe a Tune Strain.
- ✅ Responden: Denia, Luuk Herssen, Lynae, Mornye (Mornye no aplica).

## Resultado de (Gemini)
<!-- Completar con la respuesta del usuario:
- Nombres en inglés confirmados (aplicantes / responden):
- Confirmación duraciones / stacks / regla de exclusión:
- Mecánica Response (0.12% / Tune Break Boost) y cómo entra en la fórmula:
- Implementación propuesta:
- Fuente(s):
-->
