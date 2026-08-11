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

## Resultado de (Gemini)
<!-- Completar con la respuesta del usuario:
- Nombre/fuente en inglés confirmado:
- Daño por tick (valor/%ATK por nivel) y fórmula:
- Intervalo / consumo de stacks:
- Reducción ATK / Magnetized / Electro Rage (con valores):
- Aplicación (Buling / Rover Electro):
- Implementación propuesta:
- Fuente(s):
-->
