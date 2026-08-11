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

## Resultado de (Gemini)
<!-- Completar con la respuesta del usuario:
- Nombre/fuente en inglés confirmado:
- Fórmula del daño por stack (por nivel):
- Duración / stacks / intervalo:
- Efectos (¿reduce RES? / ¿amplify del DoT?):
- Aplicación y stacks por acción:
- Implementación propuesta:
- Fuente(s):
-->
