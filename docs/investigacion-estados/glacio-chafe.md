# Glacio Chafe (estado negativo Glacio)

Estado de investigación. Nombres en inglés: **Glacio Chafe**.

## 🔍 Pregunta para pasar a Gemini
> Investigá el estado negativo **Glacio Chafe** en *Wuthering Waves* (nombres en inglés):
> 1. **Daño**: ¿inflige daño al aplicar cada stack? ¿Hay daño por tick/DoT? ¿Cuál es el
>    **daño por stack** (valor o % de ATK) y cómo escala (ATK, nivel, DEF/RES enemigo)?
> 2. **Stacks/duración**: ¿máximo de stacks? ¿duración exacta? ¿se refresca al aplicar?
> 3. **Efectos**: ¿reduce Glacio RES? ¿reduce velocidad de movimiento? ¿congela a X stacks?
> 4. **Aplicación**: ¿qué acciones lo infligen? Detallá **Hiyuki** (5★, Sword) y
>    **Lucilla** (5★, Rectifier), y sus amplificaciones de daño de Chafe (Outros/armas/ecos).
> 5. **Implementación**: ¿cómo modelarlo en un motor de cálculo TS (tipo DOT/EXPLOSION/
>    instantáneo, stack máx, tick interval, scaling, formulazo del daño por stack)?
>
> ⭐ Dato a confirmar: el arma **Frostburn** amplifica "Glacio Chafe DMG" (¿el daño del
> estado en sí?) y los Outros de Hiyuki/Lucilla amplifican el daño de Chafe. Confirmá si
> ese "Chafe DMG" es el daño del estado y cómo entra en la fórmula.

## Estado de la data (desde DeepSeek)
- ❓ **Daño por stack**: sin confirmar. Se inflige al aplicar cada stack (daño instantáneo,
  no DoT periódico). No hay % público.
- ⚠️ Stacks: 10 por defecto. Al llegar a 10 → congela y elimina stacks.
- ⚠️ Duración: ~19 s (aprox.) — refresca al aplicar.
- ✅ No reduce Glacio RES (solo slow + freeze).
- ✅ Aplican: Hiyuki (v3.3) y Lucilla (v3.4).
- ✅ Hiyuki: 1 stack con varios ataques; convierte Chafe cercano en "Glacio Bite" (10+ → Frostbind).
- ✅ Lucilla: Outro +60% daño de Chafe (30s); aplicar Chafe → +30% Glacio DMG (14s).

## Resultado de (Gemini)
<!-- Completar cuando el usuario traiga la respuesta:
- Nombres/verificaciones en inglés confirmados con fuente:
- Daño por stack (valor/%ATK) y fórmula:
- Duración / stacks / efectos:
- Aplicación (Hiyuki/Lucilla) y amplif.:
- Implementación propuesta:
- Fuente(s):
-->
