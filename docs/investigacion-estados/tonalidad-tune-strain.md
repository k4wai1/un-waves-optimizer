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

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Estructura de dos fases del sistema Tonalidad (v3.0)
- Contexto: Subir "Off-Tune Level" vía impactos → estado **Mistune (Desafinación)** → **Tune Break**
  (interacción contextual / golpe calificado) → convierte el marcador Shifting en **Interfered**.
- **Shifting** = marcador pasivo (no daña, no altera stats): booleano simple en el enemigo.
- **Interfered** = habilita "Tune Strain Response" (ataques con multiplicador amplificado).

### Parámetros
- **Shifting:** 25.0 s; re-aplicar resetea a 25.0 s. ⚠️ Al aplicarlo con arma **Spectrum Blaster**
  (pistolas) vía **Ataques Básicos**: +8% **All DMG Bonus** a todo el equipo por 30 s, hasta 3 stacks → **+24%**.
- **Interfered:** 30.0 s base desde el Tune Break; se puede **refrescar** con habilidades (p. ej. Denia golpeando).
  - Límite: 1 acumulación por Tune Break; `S_max = min(4, 1 + nº Resonadores_habilitadores_Strain)`.
  - Cada habilitador (Luuk Herssen, Denia, Lynae, Mornye) suma +1 → techo **4**.

### Matriz de personajes (roles)
| Resonador | Aplica Shifting | Responde a Interfered | +Max Stacks | Notas |
|---|---|---|---|---|
| Luuk Herssen | Sí (Skill Resonante e Intro) | Sí | +1 | DPS principal de Strain |
| Denia | Sí (modo Strain) | Sí | +1 | Refresca Interfered al golpear; +45~80 tuneBreakBoost |
| Lynae | Sí (solo modo Strain) | Sí | +1 | Híbrida Rupture/Strain; +40 tuneBreakBoost base |
| Qingxiao | Sí (Básicos e Intro) | Sí | 0 | DPS Aero (v3.6); pasiva Mindlock (hasta 15) cuando aliados infligen Interfered |
| Mornye | No | Sí | +1 | Soporte universal; amplifica tuneBreakBoost por su ER |
| Aemeath | No (solo Rupture) | No | 0 | Incompatible c/Strain |
| Hiyuki | No (solo Rupture) | No | 0 | Enfoque Rupture |
| Rebecca | No | No | 0 | Hack - Shifting (independiente) |

### Mecánica Response (Tune Strain Response) — fórmula
- Es **amplificación de daño TOTAL** (Total DMG Amplification), no daño secundario.
- `Multiplicador(%) = 0.12% × tuneBreakBoost × S_interfered`  (0.12% = 0.0012 por punto por stack).
- Máx 4 stacks → `0.48% × tuneBreakBoost`.
- **tuneBreakBoost** = stat escalar del personaje (base + pasivas + conversiones de ER/Off-Tune Buildup Rate).
- Se integra en el contenedor de DMG Amplification:
  `Daño_Final = Base × Multiplicador_Habilidad × (1 + DMG_Bonus_elementos) × (1 + 0.0012×tuneBreakBoost×S_interfered) × DEF_Mult × RES_Mult`

### Tabla de amplificación (tuneBreakBoost × stacks)
| tuneBreakBoost | 1 stack | 2 | 3 | 4 |
|---|---|---|---|---|
| 20 | +2.40% | +4.80% | +7.20% | +9.60% |
| 40 (Lynae base) | +4.80% | +9.60% | +14.40% | +19.20% |
| 50 (Luuk+Lynae) | +6.00% | +12.00% | +18.00% | +24.00% |
| 85 (Denia+Lynae buffs) | +10.20% | +20.40% | +30.60% | +40.80% |
| 100 | +12.00% | +24.00% | +36.00% | +48.00% |

### Reglas de exclusión / sobrescritura
- **Shifting Exclusion**: un objetivo solo puede tener **1 marcador de Transición** a la vez
  (no coexisten Rupture-Shifting y Strain-Shifting).
- **Jerarquía**: aplicar Rupture-Shifting reemplaza a Strain-Shifting, y viceversa. **En colisión
  en el mismo frame, prioridad para Tune Rupture.**
- **Rupture-Interfered vs Strain-Interfered**: Rupture-Interfered dura 8s y hace daño plano extra;
  Strain-Interfered dura 30s y solo amplifica el daño de las habilidades.
- **Hack - Shifting** (Rebecca) es independiente del sistema Tonalidad → **puede coexistir** con Strain-Shifting.

### Alcance del motor (In/Out of scope)
- In: aplicar `(1 + 0.0012×tuneBreakBoost×S_interfered)` a ataques de personajes
  `hasTuneStrainResponse == true`; convertir Shifting→Interfered en Tune Break; gestión de
  `S_max` (1-4). No genera DoT ni daño plano secundario.
- Out: NO activa Interfered si el Tune Break es sobre un enemigo sin Shifting; NO suma >1 por
  Tune Break; NO reduce/cancela duración al cambiar de personaje.

### Arquitectura (event handlers deterministas)
1. **ON_SKILL_HIT**: si golpea con Strain-Shifting → remover Rupture-Shifting si existe; set
   `TuneStrain_Shifting=true`, `timer_shifting=25.0`; si es Básico con **Spectrum Blaster** →
   contador de arma +1 (max 3) y timer global 30s +8% All DMG.
2. **ON_TUNE_BREAK**: si `TuneStrain_Shifting` → removerlo; `S_max = min(4, 1 + habilitadores)`;
   `S_interfered = min(S+1, S_max)`; `timer_interfered = 30.0`.
3. **CALCULATE_DAMAGE**: si `S_interfered>0 && timer>0 && hasTuneStrainResponse` → `Factor_Amp =
   1.0 + (0.0012 × tuneBreakBoost × S_interfered)` aplicado como multiplicador en amplificación global.

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. A refrendar contra Game8 y
  fandom `wiki/Tune_System`: valores exactos de tuneBreakBoost por personaje (Luuk, Denia +45~80,
  Lynae +40) y los tiempos de Spectrum Blaster.
