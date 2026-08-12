# Fusion Burst (estado negativo Fusion)

Estado de investigación. Nombres en inglés: **Fusion Burst**.

## 🔍 Pregunta para pasar a Gemini
> Investigá el estado negativo **Fusion Burst** en *Wuthering Waves* (nombres en inglés):
> 1. **Daño**: ¿no hace DoT, sino una **explosión** al llegar a 10 stacks (Fusion DMG)?
>    ¿Cuál es el **daño de la explosión** (valor o % de ATK) y cómo escala? (¿por nivel,
>    por stacks presentes antes del máximo? — se actualizó en v2.8).
> 2. **Stacks/duración**: ¿máx 10 stacks? ¿duración exacta (~15s)? ¿se refresca al aplicar?
>    ¿se pierden al esquivar o al pasar el tiempo?
> 3. **Efectos**: ¿reduce Fusion RES? (el arma de Aemeath "Everbright Polestar" ignora
>    10% Fusion RES del objetivo: ¿eso es del arma, no del estado?).
> 4. **Aplicación**: ¿qué lo inflige? Detallá **Aemeath** (5★, Sword, v3.1, modo Fusion
>    Burst) y **Denia** (5★, Rectifier, v3.3). ¿Chisa sube el límite de stacks? ¿a cuánto?
> 5. **Implementación**: tipo EXPLOSION, stack máx 10 (¿modificable por Chisa?), duración 15s,
>    daño de explosión configurable. Proponé la fórmula.
>
> ⭐ Confirmado (para verificar): Denia aplica 2 stacks cada 2s; Aemeath "Finale" hace
> **1789.29% Fusion DMG**. El daño de la explosión NO está confirmado en % — es lo que quiero.

## Estado de la data (desde DeepSeek)
- ✅ No es DoT; **explosión** al llegar a 10 stacks (elimina y detona Fusion DMG).
- ✅ Stacks duran 15s; aplicar nuevo refresca todos. (v2.8): daño escala por stacks presentes.
- ❓ Daño de la explosión: **sin confirmar** (no hay % público).
- ❓ ¿Reduce Fusion RES? Sin confirmar (armas la ignoran, no es inherente).
- ✅ Aplican: Aemeath (v3.1, modo Fusion Burst=AoE), Denia (v3.3, "Reina de Fusion Burst").
- ✅ Aemeath: "Finale" = 1789.29% Fusion DMG.
- ✅ Denia: 2 stacks/2s; campo Erosion Field; +30% Fusion DMG equipo; +40% amplif. Fusion Burst (Outro).
- ⚠️ Chisa sube el límite de stacks de Fusion Burst — ❓ a cuánto.

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Ontología (lo que HACE vs NO HACE)
| Propiedad | HACE | NO HACE |
|---|---|---|
| Naturaleza | Recolector pasivo → **1 explosión AoE Fusion DMG** al llegar al límite | **NO DoT** paulatino durante la incubación |
| Límite | **10 cargas** por defecto (sobrescribible: Chisa +3 → 13) | No es inmutable |
| Temporizador | Vida útil **15 s**; aplicar carga refresca el global | No retiene cargas si expira (purga sin detonar) |
| Stats | Da vectores lógicos a armas/resonadores | **NO reduce Fusion RES ni DEF** inherente |
| Crítico | Detonación estándar **Crit = 1.0 (no critica)** | Solo critica si Override (Aemeath S6) |

### Pipeline matemático determinista
```
Base_DMG = (ATK_Total × Skill_MV) + Flat_Bonus
Explosion_MV = Base_Coefficient + Σ_{i=1..TriggerStacks}( Per_Stack_Coefficient )
Final_DMG = Base_DMG × (1 + ΣDMG_Bonus) × (1 + ΣAmplify) × DEF_Mult × RES_Mult × Crit_Mult
```
- **Base_MV** escalado paramétricamente (v2.8+): depende de las cargas **presentes justo antes**
  de la explosión (no de las actuales tras detonar; se inyecta el pre-purga).
- **Chisa** (límite 13): sigue sumando el coeficiente por carga >10 → umbrales asintóticos mayores.
- **DMG_Bonus vs Amplify (Deepen)**: grupos separados. Amplify va en `(1+ΣAmplify)`.
  - Denia Outro: **+60% Fusion Burst DMG Amplify** (30s) → factor 1.60 en Amplify (etiqueta DamageTags::FusionBurst).
- **RES_Mult** (piecewise, como la fórmula del juego):
  `1 - RES/2` si `RES≤0`; `1 - RES` si `0<RES<0.8`; `1/(1+5·RES)` si `RES≥0.8`. Nativa 10% (0.10); hi-res Fusion 40%.
  - **RES<0 → amortiguar /2** (Everbright -10% + Degenerate Voidmatter -10% → -20% → solo 1.10×).
- **DEF_Mult** (formula WuWa): `(800+8·Lc) / [(800+8·Lc) + (800+8·Le)·(1 - DEF_Ignore)]`.
  - Chisa Outro **Thread of Bane: +18% DEF Ignore** a objetivos afectados por NS; Aemeath S3.
- **Crit_Mult**: default 1.0 para el estado; **Aemeath S6** anula el bloqueo → puede criticar.

### Aemeath (5★, Sword, v3.1) — ejecutora principal
- Doble modo: **Tune Rupture** / **Fusion Burst** (hiper-carry en campo).
- **Forte >5 cargas**: ataques infligen Fusion Burst secundario al impactar.
- **Oyente de aplicación**: cada aliado que inflige Fusion Burst → **+30% Crit DMG** temporal a Aemeath,
  tope **2 cargas** (máx +60%).
- Al tope → sub-evento: **+25% Amplify** a su Liberation "Heavenfall Edict: Finale" (**1789.29% Fusion DMG**, dataminado).
- **S3**: "Ultimate DEF Ignore" en Finale bajo Fusion Burst (manipula el denominador).
- **S6**: Override global del booleano `CanCrit` de estados → Fusion Burst puede criticar.

### Denia (5★, Rectifier, v3.3) — "Reina de Fusion Burst" (off-field)
- Modos "Entropy Shift": **Stagecraft Form** (acumula Void Particles) / **Breakdown Form**
  (consume Conformal Charge, daño masivo).
- **Erosion Field** (de "Final Act"): dura 30s, atrae enemigos cada 4s; inflige **+2 cargas de Fusion Burst**
  por tick. **ICD 2s por objetivo** (throttle anti-bucle). Kill attribution → resonador activo más cercano.
- Solo transitar al modo Fusion Burst → **+30% Fusion DMG Bonus de equipo** (entra en `1+ΣDMG_Bonus`).
- **Outro "Unfinished Lies"**: **+60% Fusion Burst Amplify** (30s) al personaje entrante (confirmado; NO 40%).
- **S6 "May You Find Your Sun..."**: Erosion Field → **detonación forzada con el límite teórico máximo**
  al 200% extra (`Skill_MV × 3.0`) **SIN purgar cargas**. Las cargas siguen en el objetivo para un
  nuevo ciclo natural de Aemeath.

### Chisa (Factor de asíntotas / límites)
- Outro **"Unraveling - Law Zero"**: **+3 cargas** a todos los NS (Fusion Burst, Spectro Frazzle,
  Glacio Chafe, Aero Erosion) por 15s → **MAX_STACKS 10 → 13**.
- Cambio 10→13:
  - Time-to-Burst se dilata ~30% (Denia 2 cargas/2s: 10s → 13s, sin otras fuentes).
  - El **Skill_MV paramétrico** resuelve la explosión con 13 veces el per-stack → **daño > lineal** de 10.
- **Thread of Bane**: +18% DEF Ignore a objetivos con NS.
- **Límite dinámico**: `GetDynamicMaxLimit()` consulta si la Outro de Chisa está activa. Si expira y las
  cargas (ej. 12) superan el límite restaurado (10) → **detonación forzada** en el próximo Tick() con
  las 12 cargas y reset del ecosistema.
- **Evasión (iframes)**: la aplicación de cargas se bloquea si el objetivo evada (capa de hitbox).

### Ecos / Sonatas (Event Listeners)
| Sonata | Modificador estático | Reactivo (infligir Fusion Burst) |
|---|---|---|
| **Chromatic Foam** | +10% Fusion DMG | +10% Fusion DMG (15s); tras Outro transfiere **+25% Fusion DMG** a la entidad entrante (15s) |
| **Trailblazing Star** | +10% Fusion DMG | +20% Crit Rate + +20% Fusion DMG (8s) |
- Los listeners se anclan al evento `OnFusionBurstApplied()`.

### Arquitectura determinista (resumen)
- Estado = **sumidero paramétrico de umbral** (Event Listener de contador entero), no DoT.
- `MAX_STACKS` debe ser una **propiedad observadora dinámica**, no constante compilada.
- Detonación forzada (Denia S6) con sobreescritura de purga: se calcula el daño con el límite
  teórico máximo ×3.0 y **se omite `PurgeStacks()`**.
- Pipeline entero: Base (ATK×MV paramétrico) → 1+DMG_Bonus → 1+Amplify → DEF_Mult → RES_Mult → Crit_Mult.

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. A refrendar contra Game8
  `archives/558431` y fandom `wiki/Fusion_Burst`: el **% exacto de la explosión** (aún no
  cuantificado en número/valor absoluto, solo como MV paramétrico por cargas), el **Outro de Denia
  +60% (vs 40%)**, y el **per-stack coefficient** de la explosión.
