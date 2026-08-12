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

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Ontología (lo que SÍ vs NO hace)
| Sistema | SÍ (determinista) | NO (excluido) |
|---|---|---|
| Naturaleza | **StatModifierDebuff** de reducción de DEF | NO invoca daño ni DoT |
| Escalado | **-2% DEF por acumulación** | NO reduce RES ni Vibration Strength |
| Límite | máx **3 acumulaciones** (-6% DEF) | NO da ATK/Crit inherente |
| Resolución | reducción **estática** (aplicada continua) | **NO procesa ticks de 2s** (ese ICD es de la habilidad de Chisa) |

### Integración en la fórmula (M_DEF)
- **DEF Base enemigo** = `8 × Lv_enemy + 792`.
- **DEF Ajustada** = `DEF_Base × (1 - DEF_Reduction_total)` donde `DEF_Reduction_total = stacks × 2%`.
  - Havoc Bane manipula esta fase (estado del enemigo, pre-daño).
- **DEF Multiplier** (por golpe) = `(800 + 8·Lc) / [(800 + 8·Lc) + DEF_Ajustada × (1 - DEF_Ignore)]`.
  - `DEF_Ignore` es metadato del ataque (post), NO del estado.
  - **Separación de fases**: reducción (Havoc Bane) antes del combate; ignore (ataque) en el daño.
  - Combinadas son **multiplicativas** en el denominador → rendimientos decrecientes menores que la suma aditiva; límite superior ~200%.
- La **fórmula de defensa en el motor actual** ya coincide (defMultiplierFn); Havoc Bane = reducir `enemy.defense` antes de calcular.

### Chisa (facilitadora / expansión)
- **"Unraveling"**: expande límite 3 → **6 acumulaciones** (→ -12% DEF) por 15s (variable dinámica).
- **Unseen Snare** (marca reactiva, 30s; por Skill "Eye of Unraveling", Dodge Counter "Retraction" o Lock-on):
  - Es un **EventListener** en el enemigo que reacciona a `OnReceiveDamage`.
  - Si el enemigo marcado recibe daño de un aliado → aplica **1 acumulación de Havoc Bane**.
  - **ICD estricto de 2s** (el "tick de 2s" que la comunidad confundió).
- **Thread of Bane**: NO es del estado; es **+18% DEF Ignore** en el contexto de daño cuando el atacante
  golpea a un enemigo con Unseen Snare (se inyecta 0.18 en DEF_Ignore, compatible con el -12% de Bane).

### Yangyang: Xuanling (Main Carry / consumidora)
- **Generación directa**: Basic Stage 4 (Azure & Feather Sword Stances) → +1 acumulación; Heavy → +2.
- **Consumo**: usar Skill Azure/Feather sobre un enemigo con ≥1 acumulación → **resta 1 acumulación** (no elimina salvo 0).
  - Consumo → **"Bated Breath"** (Azure) o **"Drifting Mist"** (Feather): +100~125% Crit DMG al próximo Heavy.
- **Frame Bug (orden de operaciones)**: un Heavy sobre enemigo "limpio" NO se beneficia de su propia aplicación
  (el daño se resuelve ANTES de registrar las 2 acumulaciones). Pipeline: 1) compilar contexto (snapshot estado);
  2) aplicar HP; 3) OnHitCallback → inyectar 2 acumulaciones.
- **Feathered Oath**: bus global; cada aliado que aplica Havoc Bane → +1 acc a Xuanling (ICD 1s), hasta 6;
  +Crit Rate pasiva. ⚠️ Las acumulaciones **NO refrescan la duración** (fallo del juego base: temporizadores anclados a la 1ª aplicación).

### Ecos (Sonata) — NO son del estado
| Set | Trigger | Payload | Duración |
|---|---|---|---|
| Thread of Severed Fate (3pc) | OnHavocBaneApplied | +20% ATK% + +30% Liberation DMG | 5s |
| Song of Feathered Trace (5pc) | OnHavocBaneApplied | +20% Crit Rate + +35% Heavy DMG | 15s |
- Si el personaje no lleva esos ecos, aplicar Havoc Bane NO cambia su ATK (falacia estructural).

### Suisui (sinergia posterior)
- **"Ceaseless Landscape"**: al detectar `OnHavocBaneConsumed`, otorga al atacante **+6% DEF Ignore Havoc**
  y **+12% Havoc RES pen** por 30s (modificado de 15s). DEF ignore se suma a Chisa; la RES pen va al RES_Mult.

### Arquitectura (data-driven / ECS)
- Clase abstracta para estados negativos → `HavocBane` deriva:
  - Props: `targetId`, `applierId`, `currentStacks`, `maxStacksDynamic` (base 3, override 6 con Chisa).
  - **Duración inyectada** por la habilidad invocadora (15-30s, no constante rígida).
- Método `onApply`: calcula Δstacks → suma `Δ×2%` a la reducción de DEF del objetivo; despacha `OnHavocBaneApplied`
  (global). Al llegar al límite deja de incrementar DEF pero sigue emitiendo el evento (refresca ecos/pasivas).
- Resolución de daño: leer DEF base → aplicar reducción de DEF (con **clamp** para evitar DEF negativa) →
  aplicar DEF_Ignore del ataque → DEF Multiplier.
- **No requiere DoT ni AoE**; solo mutación de stat + eventos reactivos.

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. Confirma/refina lo de DeepSeek
  (no hay ticks; el 2s es ICD de Unseen Snare; duración por origen 15-30s). A refrendar contra Game8
  `archives/558014` y fandom `wiki/Version/2.8`.
