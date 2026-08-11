# Havoc Bane (estado negativo Havoc) — v2.8

Estado de investigación. Nombres en inglés: **Havoc Bane**.

> ⚠️ Desde la **v2.8** (20/11/2025) Havoc Bane **ya NO es un DoT de explosión**; ahora es
> un **debuff de reducción de DEF**. La info anterior a v2.8 es obsoleta.

## 🔍 Pregunta para pasar a Gemini
> Investigá el estado negativo **Havoc Bane** en *Wuthering Waves* (nombres en inglés),
> **post-v2.8**:
> 1. **Efecto**: confirmá que es **reducción de DEF** (no daño). ¿-2% DEF por stack?
>    ¿máx 3 stacks por defecto (= -6% DEF)? ¿hasta 6 con **Chisa** ("Unraveling" +3 stacks)
>    (= -12% DEF)?
> 2. **Duración**: ¿cuánto dura el estado? (no se especificó). ¿la reducción se aplica en
>    ticks de ~2s o es estática mientras dura?
> 3. **Aplicación**: ¿qué lo inflige? Detallá **Chisa** (marca con "Unseen Snare"; los
>    enemigos marcados reciben 1 stack por golpe recibido). ¿**Yangyang Xuanling** lo usa?
> 4. **Interacción con la fórmula**: en el motor, ¿debe reducir `M_DEF` del enemigo
>    (equivalente a DEF%, o a defIgnore_)? ¿Cómo entra exactamente en la fórmula de daño?
> 5. **Implementación**: debuff (no DOT), stack máx 3 (6 con Chisa), DEF -2%/stack,
>    duración configurable. Proponé el modelado.
>
> ⭐ Dato a confirmar: ¿el "Thread of Bane" de Chisa (ignora 18% DEF) y el set
> "Thread of Severed Fate" (+20% ATK, +30% Liberation DMG al infligir Bane) son efectos
> del kit, no del estado?

## Estado de la data (desde DeepSeek)
- ✅ **Reducción de DEF** (v2.8): -2% DEF por stack, máx 3 (→ -6%), hasta 6 con Chisa (→ -12%).
- ⚠️ La reducción se aplica en ticks de ~2s (¿estático vs por tick?).
- ❓ Duración exacta: sin confirmar.
- ✅ Aplican: Chisa (primera usuaria, v2.8); mención a Yangyang Xuanling (kit basado en Bane).
- ✅ Implementación: NO DoT; reduce `M_DEF`/`enemy.defense` del objetivo.

## Resultado de (Gemini)
<!-- Completar con la respuesta del usuario:
- Nombre/fuente en inglés confirmado:
- Confirmación: DEF -2%/stack, max stacks (3/6), total DEF:
- Duración exacta:
- ¿Estático o por tick?:
- Aplicación (Chisa / Yangyang Xuanling):
- Cómo entra en la fórmula (DEF%, defIgnore_?):
- Set/arma asociados:
- Implementación propuesta:
- Fuente(s):
-->
