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

## Resultado de (Gemini)
<!-- Completar con la respuesta del usuario:
- Nombres en inglés confirmados:
- Duración de Rupture - Interfered:
- Regla de exclusión confirmada:
- Lynae (respuesta +1880%, S2) y Mornye (+40%, Particle Jet daño) y Aemeath (Rupturous Trail daño):
- Implementación propuesta (respuesta coordinada, amplif. Mornye, UI):
- Fuente(s):
-->
