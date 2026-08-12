# Estadísticas del Enemigo: qué afecta al daño y qué no (Taxonomía determinista)

> Fuente: informe de investigación de fidelidad del motor (datamining encore.moe). Determina
> qué stats del enemigo entran en la ecuación de daño recibido y cuáles son informativas o de
> mecánica separada. Es la base de `app/ww-frontend/src/engine/enemy.ts` y del menú **Enemies**.
>
> **Regla de oro:** solo las stats que figuran en la cadena multiplicativa
> `M_RES × M_DEF × M_DR × (1 + DMG Amplify)` impactan el daño que recibe el enemigo (HP).

---

## 1. La cadena de mitigación del objetivo

El daño recibido por el enemigo pasa por un filtro de 4 ejes multiplicativos:

```
Daño recibido = Base DMG × M_RES × M_DEF × M_DR × (1 + DMG Amplify)
```

- **M_RES** — resistencias (física + 6 elementales) por tramos.
- **M_DEF** — defensa asintótica (ver `Wuthering_Waves_Multiplicadores.md` §2).
- **M_DR** — barrera de reducción absoluta (15–50% en ToA / mapas).
- **DMG Amplify** — vulnerabilidad/amplificación de daño recibido (multiplicativo puro).

Cualquier stat del enemigo que no aparezca directa o indirectamente en esta cadena **no** altera
el número de daño que recibe.

---

## 2. Taxonomía A/B/C de atributos del enemigo

### A — Afecta al daño recibido (entra en la fórmula)

| Atributo | Cómo entra | Notas |
|---|---|---|
| **DEF** | Denominador de `M_DEF` | `DEF_target = (800 + 8×(Lv−1)) × DefRatio` |
| **Resistencias (física/elem.)** | `M_RES` (3 ramas) | Estáticas por perfil; dictan si se necesita RES PEN |
| **Damage Reduction (M_DR)** | Multiplicador final | Barrera global; se inyecta manualmente (ToA 15%, eco Bell-Borne 50%) |
| **Vulnerabilidad (DMG Amplify)** | `(1 + DMG Amplify_target)` | Multiplicativo puro; 20% de vuln = +20% DPS, sin dilución |
| **GrowthRates DefRatio** | Coeficiente escalar de DEF | Mueve la curva de M_DEF en jefes de élite |

### B — Informativa / entorno (NO cambia el daño por golpe)

| Atributo | Rol |
|---|---|
| **HP** | Sumidero volumétrico: se resta el daño. Útil para TTK (tiempo de eliminación) y DPS sostenido |
| **ATK** | Daño de salida (hacia el jugador); ortogonal al daño que recibe |
| **GrowthRates HP/ATK** | Escalan la "esponjosidad"/letalidad a nivel alto; no tocan M_DEF/M_RES |

### C — Mecánica separada (no es mitigación de HP)

| Atributo | Mecánica |
|---|---|
| **Max Vibration Strength** | Barra de postura (stagger); colapsa con daño de **dureza** (`Hardness DMG = (DMG×HardnessSkill + Tough) × Modifiers + Parry`), no con la fórmula de HP |
| **Rage Limit** | Contador de IA → transiciones de fase (hiperagresividad/AoE/buffs de ATK); no otorga escudos de vida |

---

## 3. Perfiles de Calamidad y picos de resistencia

Los jefes de élite concentran la resistencia en su afinidad temática en vez de distribuirla
uniformemente. Arquetipo estándar:

- **40% de RES base** contra el elemento temático del enemigo.
- **10% de RES base** contra físico y elementos no afines.

| Enemigo | Clase / Afinidad | Pico (40%) | Secundaria (10%) |
|---|---|---|---|
| Bell-Borne Geochelone | Calamity (Glacio) | Glacio | Todas las demás |
| Dreamless | Calamity (Whisperin) | Havoc | Todas las demás |
| Phantom: Gulpuff | Elite (Glacio) | Glacio | Todas las demás |
| Tremor Warrior | Common (Electro) | Electro | Todas las demás |
| Threnodian: Leviathan | Calamity (Anomalía) | **Aero y Havoc** | — (doble pico) |

Casos excepcionales como **Threnodian: Leviathan (Fleurdelys)** soportan múltiples picos de
resistencia simultáneos (Aero + Havoc), configurados contra composiciones específicas.

**En el motor:** se modela como la matriz de `elementalResistances` del JSON5
(ej. `{ glacio: 0.40, ..., havoc: 0.10 }` para Bell-Borne).

---

## 4. Barreras M_DR en entornos cerrados

La Torre de la Adversidad superpone barreras multiplicativas de Reducción de Daño sobre las
resistencias de especie:

- **ToA floors**: ~15% de M_DR (M_DR = 0.85).
- **Mecánica del eco Bell-Borne Geochelone** (aliado): 50% de M_DR.
- **Otros estados/animaciones**: 15–50%. Sin cap documentado; las fuentes se suman aditivamente
  antes del multiplicador `max(0, 1 − DR_total)`.

El calculador debe permitir **inyectar manualmente** un multiplicador M_DR (`damageReduction` en
el JSON5 del enemigo) para simular estos escenarios.

---

## 5. Recomendaciones de implementación (calculador)

1. **DEF y DefRatio reactivos**: deben alterar el `M_DEF` según el nivel del enemigo elegido
   (ya implementado en `resolveEnemyStats` con la tabla `growth`).
2. **Resistencias estáticas por perfil**: vector de picos (ej. `[40,10,10,10,10,10]`), con la
   función de 3 ramas de `M_RES`.
3. **Campo M_DR flotante** (default 0) para simular ToA/mapas — ya existe en `damageReduction`.
4. **ATK, Rage Limit y Max Vibration**: métricas informativas (tooltips en la UI), aisladas de
   la tubería de cálculo de daño.
5. **HP** con `GrowthRates HP`: proyectar TTK (barra de progreso entre el DPS estimado de la
   rotación y la vida del enemigo) en vez de alterar el daño por golpe.

---

## Ver también

- `Wuthering_Waves_Multiplicadores.md` — ecuación de daño y fórmulas de M_DEF / M_RES / M_DR
- `libs/ww/stats/src/enemies/EnemySchema.md` — esquema JSON5 del enemigo (stats + `growth`)
- `app/ww-frontend/src/engine/enemy.ts` — `resolveEnemyStats` / `enemyInfo`
- `.agents/skills/enemy-creator/SKILL.md` — cómo crear un enemigo
- `docs/estados-elementales.md` — estados negativos que afectan al enemigo
