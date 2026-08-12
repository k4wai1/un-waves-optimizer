# Tonalidad — Tune Rupture (Shifting / Interfered)

Estado de investigación. Nombres en inglés: **Tune Rupture** (variantes **- Shifting**,
**- Interfered**, y **- Rupture**).

> Sistema de Tonalidad **v3.0** (ver flujo en `docs/estados-elementales.md` sección 2).
> Tune Rupture es la variante que **habilita ataques coordinados de alto daño** (a diferencia
> de Tune Strain que amplifica).

## 🔍 Pregunta para pasar a Gemini
> Investigá el marcador de Tonalidad **Tune Rupture** en *Wuthering Waves* (nombres en inglés):
> 1. **Tune Rupture - Shifting**: ¿lo aplican **Aemeath** (modo Tune Rupture) y **Lynae**
>    (según modo)? ¿Confirmá que los enemigos con Rupture - Shifting reciben **+20% de daño
>    total**?
> 2. **Tune Rupture - Interfered**: confirmá que dispara un **ataque coordinado** cuando un
>    compañero golpea al objetivo marcado. ¿**Duración exacta**? (no confirmada). ¿8s como Hack?
> 3. **Regla de exclusión**: confirmá que Tune Rupture sobrescribe a Tune Strain
>    (no coexisten).
> 4. **Personajes/Lynae y Mornye**:
>    - **Lynae**: su "Tune Rupture Response" (Spectral Analysis - Flux) hace **+1880%** de
>      daño ⚠️. ¿Confirmá? ¿S2 +25% All DMG Amp + +70% Rupture Response?
>    - **Mornye**: convierte "Observation Marker" en **Interfered Marker** (8s). ¿El equipo
>      hace hasta **+40%** contra Rupture/Strain - Interfered (0.25% por 1% ER sobre 100%)?
>      Contra Tune Rupture - Interfered dispara **"Particle Jet"** (daño Fusion plano, cooldown
>      8s/objetivo) ❓ valor sin confirmar.
>    - **Aemeath**: al responder a Interfered inflige 10 stacks de "Rupturous Trail" (30s) ❓
>      daño; +20% STBK por compañero (hasta 3).
> 5. **Implementación**: ¿cómo modelar la "Respuesta" (ataque coordinado) y las amplificaciones
>    de Mornye (por ER) / despliegue en la UI de Lyncae y Mornye? Proponé el modelado.

## Estado de la data (desde DeepSeek)
- ✅ Shifting: Aemeath (modo Tune Rupture), Lynae (según modo). Enemigos con Rupture - Shifting reciben +20% daño total.
- ⚠️ Interfered: dispara ataque coordinado; ❓ **duración no confirmada**.
- ✅ Tune Rupture sobrescribe a Tune Strain (no coexisten).
- ⚠️ Lynae: +1880% daño (respuesta), S2 +25% All DMG Amp + +70% Response — sin confirmar.
- ✅ Mornye: equipo +40% contra Interfered (0.25% por 1% ER >100%, cap 40%); Particle Jet (❓ daño).
- ⚠️ Aemeath: 10 stacks "Rupturous Trail" (30s) ❓ daño; +20% STBK (hasta 3).

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Delimitación funcional (lo que hace vs no)
| Dimensión | SÍ (incluido) | NO (excluido) |
|---|---|---|
| Generación daño | Ataques coordinados de ráfaga (Tune Rupture Response) al Tune Break | NO DoT pasivo |
| Estado latente | Shifting prepara durante **25 s** | Shifting solo NO aplica debuffs |
| Interacción | Sobrescribe y cancela a Tune Strain | NO coexiste con Strain |
| Cadencia | Respuestas off-field con **ICD 8s por objetivo** | No infinitas |
| Modif. habilidades | Acumulaciones secundarias (Rupturous Trail, Interfered Marker) | NO aumenta skills no clasificadas como Tune Rupture DMG |

### Transiciones de fase (3)
1. **Rupture - Shifting**: 25.0 s latente (p. ej. Lynae "Photochromic Flux" en modo Rupture). Inactivo hasta detonar.
2. **Mistune → Tune Break**: al llenar Off-Tune → Mistune; un golpe Tune Break DMG consume Shifting → **Interfered**.
3. **Rupture - Interfered**: dura exactamente **8 s**; personajes calificados disparan Tune Rupture Response (sujeto a ICD por objetivo).

### Reglas de exclusión / prioridad
- Tune Rupture (Shifting o Interfered) y Tune Strain **no coexisten**: aplicar uno purga el otro
  (las acumulaciones de Strain - Interfered van a 0 en el mismo frame).
- **Rupture - Shifting** y **Strain - Interfered** no operan simultáneos.
- ⚠️ **Hack - Shifting vs Rupture - Shifting**: NO pueden acumularse; prevalece el más reciente o la prioridad del modo activo.

### Matriz de personajes (roles + multiplicadores)
| Personaje | Rol | Clave | Valor | Duración/ICD |
|---|---|---|---|---|
| **Lynae** (Spectro/Pistolas) | Aplicador/Sub-DPS | Tune Rupture Response - Spectral Analysis | **946% → 1880.75%** (Tune AMP por nivel 1-10) | ICD 8s/objetivo |
| Lynae **S2** | Buffer | +25% All DMG Amp (propio) + +25% (Outro); Outro base +15% All + +25% RL DMG | **+40% All + +25% RL** (entrante) | Outro 14s |
| **Mornye** (Fusion/Broadblade) | Buffer ER/Sub-DPS | Interfered Marker + Particle Jet | **+0.25% DMG por 1% ER>100% (cap 40%)** + **298% Fusion DMG** | Marker 8s / Jet ICD 8s |
| **Aemeath** (Fusion/Sword) | Main DPS | Rupturous Trail + Seraphic Duet + Between the Stars | 10 stacks (+4%/stack) + **+60% Crit DMG** | Stacks 30s / Duet eff 1s |

- **Lynae** escala espectral por nivel de talento: N1 946.00, N2 1023.58, N3 1101.15, N4 1209.75,
  N5 1287.32, N6 1376.53, N7 1500.64, N8 1624.76, N9 1748.88, **N10 1880.75**.
  - Modo Rupture: Basic "Polychrome Leap"/"Iridescent Splash"/"Visual Impact" e Intro aplican
    **Photochromic Flux** (Rupture - Shifting, 25s).
  - S2: +25% All DMG Amp propio; Outro "Let's Hit the Road!" mejora → entrante recibe **+40% All**
    (base +15% + S2 +25%) + **+25% RL DMG** (14s).
  - "Visual Impact" otorga **+40 pts Tune Break Boost** a todo el equipo (30s).
- **Mornye**: no aplica Shifting en normales; convierte **Observation Marker → Interfered Marker** (8s).
  - `Amp(ER) = min(0.40, max(0, (ER - 1.00) × 0.25))`. Techo **40%** requiere **260% ER**.
  - Particle Jet: **298.00% Fusion DMG**, Tune Rupture DMG, ICD 8s/objetivo.
- **Aemeath**: al responder a Interfered (modo Rupture) aplica **10 stacks de Rupturous Trail** (30s).
  - "Seraphic Duet": remueve todos los stacks → cada stack consumido **+4.0%** a las instancias de
    Tune Rupture DMG del Duet (ventana 1s).
  - Bajo "Stardust Resonance" (tras Liberation "Heavenfall Edict - Overdrive"), el Duet ejecuta
    **10 instancias** de Tune Rupture DMG a objetivos aleatorios.
  - "Between the Stars": +20% Crit DMG por cada aliado que aplica Rupture - Shifting/DMG (máx 3 → **+60%**);
    a 3 → Liberation "Finale" +25% Amp.

### Fórmula matemática determinista
```
Daño_Rupture = ATK_baseTotal × Mult_Skill × Factor_CRIT × Factor_DMG_Bonus × Factor_Amp × Mitig_DEF × Mitig_RES × Escalar_TuneBoost
```
- **Mult_Skill**: 18.8075 (Lynae N10) o 2.98 (Mornye Jet).
- **Factor_CRIT**: directo `1 + (BaseCritDMG + BetweenTheStars)/100`; o esperado
  `1 + min(1, CritRate/100) × CritDMG/100`.
- **Factor_DMG_Bonus** = `1 + ElemDMG_Bonus + TuneRuptureDMG_Bonus`.
- **Factor_Amp** = `1 + Amp_Mornye(ER) + Amp_LynaeS2 + Amp_Outro`.
- **Mitig_DEF** = `(LvA + 800) / [(LvA + 800) + (LvE + 800) × (1 - DEF_Pen)]`.
- **Mitig_RES** = por RES residual tras RES Shred.
- **Escalar_TuneBoost** = `1 + (TuneBreakBoost/100) × Coeficiente_Escalado` (Lynae +40 pts por Visual Impact).

### Arquitectura (motor determinista)
- Estructura por enemigo: `estado_tonalidad_actual` (enum: NINGUNO/RUPTURE_SHIFTING/STRAIN_SHIFTING/
  RUPTURE_INTERFERED/STRAIN_INTERFERED), `temporizador_shifting` (25s), `temporizador_interfered` (8s),
  `acumulaciones_rupturous_trail` (0-10, 30s), `cooldowns_respuesta` (map ResonatorID → temps).
- Controladores:
  - **ON_APPLY_SHIFTING**: si hay Strain → purgar a 0; set RUPTURE_SHIFTING, timer 25s.
  - **ON_TUNE_BREAK**: si estado == RUPTURE_SHIFTING → transición a RUPTURE_INTERFERED (timer 8s) →
    evaluar respuestas coordinadas de toda la escuadra.
  - **Respuestas**: Lynae (Spectral Analysis, actualiza cooldown 8s), Mornye (Amp_ER + Interfered Marker +
    Particle Jet 298%, cooldown 8s), Aemeath (set Rupturous Trail = 10, 30s).

### Tests unitarios (validación determinista)
1. **Exclusión mutua**: aplicar Rupture - Shifting sobre un objetivo con 3 Strain - Interfered →
   elimina las 3 y deja Strain en 0 en el mismo frame.
2. **Expiración de Shifting**: tras 25.01s sin Tune Break → estado NINGUNO; un Tune Break posterior
   NO dispara Interfered.
3. **Cap de Mornye**: ER 200% → 25.0%; 260% → 40.0%; 300% → 40.0% (techo verificado).
4. **ICD de respuesta**: dos Tune Breaks separados 4s sobre el mismo objetivo → Spectral Analysis y
   Particle Jet solo corren en el primero (segundo en cooldown).

### Fuente
- Reporte técnico de **Gemini** (2026-08-11), pasado por el usuario. A refrendar contra Game8 y fandom
  `wiki/Tune_Rupture`: la curva de talento de Lynae (N1-N10), Particle Jet 298%, la fórmula del Duet de Aemeath.
