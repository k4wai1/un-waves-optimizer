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

## Resultado de (Gemini)
<!-- Completar con la respuesta del usuario:
- Nombre/fuente en inglés confirmado:
- Daño por tick (valor o %ATK por nivel) y fórmula:
- Duración / stacks / intervalo:
- Efectos (¿reduce Aero RES? / ¿amplify?):
- Aplicación:
- Implementación propuesta:
- Fuente(s):
-->
