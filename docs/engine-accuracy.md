# Motor: fidelidad a la formula del juego

> Referencia: `Wuthering_Waves_Multiplicadores.md` en la raiz del proyecto.
>
> Este documento lista los bugs encontrados al comparar el motor (`calculator.ts`)
> con la formula oficial, y como fixearlos.

---

## Estado: FIXEADO (2026-08-09)

Los 4 bugs documentados abajo fueron corregidos y verificados:
- **Bug 1** (DEF 1600): verificado en navegador — M_DEF = 0.5 a niveles iguales
- **Bug 2** (bonus por tipo): verificado — Basic DMG +16% sube Stage 1 de 40 a 46,
  sin afectar skill/forte/liberation/heal
- **Bug 3** (P_k): verificado — `specialDmgMult_` multiplica separado (ratio 1.10)
- **Bug 4** (Deepen por tipo): verificado — `skillAmplify_` da 1.38 solo a skills,
  1.0 a basic attacks

Tests: 43/43 verdes (`combatMechanics.spec.ts` 27 + `effectResolver.spec.ts` 16).

---

## Formula oficial (resumen)

```
D_final = (S * MV + D_flat + D_bonus) * M_RES * M_DEF * M_DR * M_ER
          * (1 + sum(B_i)) * (1 + sum(A_j)) * (1 + sum(P_k)) * M_crit
```

Donde:
- **S** = stat de escalado (ATK, HP, DEF)
- **MV** = multiplier de la habilidad
- **D_flat** = dano flat adicional
- **M_RES** = multiplicador de resistencia
- **M_DEF** = multiplicador de defensa
- **M_DR** = multiplicador de reduccion de dano
- **M_ER** = multiplicador de elemento
- **B_i** = bonus de dano aditivo (DMG Bonus %, elemental, por tipo)
- **A_j** = amplificacion / Deepen (multiplicativo separado)
- **P_k** = bonos especiales (multiplicativo, raro)
- **M_crit** = multiplicador critico (1 o CD)

---

## Bug 1: DEF del enemigo por defecto incorrecta

**Estado: FIXEADO** ✅

**Severidad: Alta** -- todos los numeros de dano estan mal.

### El problema

`Wuthering_Waves_Multiplicadores.md` dice:

> A niveles iguales (Lc = Le) y sin Ignorar Defensa, el multiplicador resultante es
> exactamente **0.5** (el enemigo reduce tu dano base a la mitad).

La formula: `M_DEF = (800 + 8*Lc) / [(800 + 8*Lc) + (800 + 8*Le)*(1-d)]`

A Lc=Le=100, sin def ignore: `M_DEF = 1600 / (1600 + 1600) = 0.5`

### En el motor

`calculator.ts` linea 87:
```typescript
export const DEFAULT_ENEMY: EnemyStats = {
  defense: 792,  // <-- INCORRECTO
  ...
};
```

El motor calcula: `defMultiplier = defNum / (defNum + enemy.defense)`
- `defNum = 800 + 8*100 = 1600`
- `enemy.defense = 792`
- `M_DEF = 1600 / (1600 + 792) = 0.669` (deberia ser 0.5)

### Fix

```typescript
export const DEFAULT_ENEMY: EnemyStats = {
  defense: 1600,  // 800 + 8 * 100 (enemigo nivel 100)
  ...
};
```

### Nota

El `EnemySchema.md` dice "DEF 792" en la seccion del enemigo por defecto. Tambien
hay que actualizarlo. El valor 792 podria ser la DEF real de un enemigo especifico
a nivel 100, pero no produce el M_DEF=0.5 que la formula oficial garantiza a
niveles iguales. Para el dummy estandar, usar 1600.

---

## Bug 2: Bonus de dano por tipo NO se aplica

**Estado: FIXEADO** ✅

**Severidad: Alta** -- efectos como "Basic Attack DMG +10%" no afectan el dano.

### El problema

`Wuthering_Waves_Multiplicadores.md` seccion 3 dice:

> En esta bolsa caen **todos** los bonos que tengan la coletilla "DMG Bonus %".
> Esto incluye Bono de Dano Elemental, Bono de Ataque Basico, Ataque Pesado,
> Habilidad de Resonancia, etc.

### En el motor

`CombatContext` tiene estos campos:
```typescript
basicAttackDmgBonus_: number;
heavyAttackDmgBonus_: number;
resonanceSkillDmgBonus_: number;
resonanceLiberationDmgBonus_: number;
echoSkillDmgBonus_: number;
coordinatedDmgBonus_: number;
outroSkillDmgBonus_: number;
```

Pero `calculateDamage()` solo usa:
```typescript
const totalDmgBonus = context.allDmgBonus_ + elementalBonus;
```

**Falta sumar el bonus por tipo de accion.** Si un echo da "Basic Attack DMG +10%",
se guarda en `basicAttackDmgBonus_` pero el motor nunca lo lee.

### Fix

`calculateDamage()` necesita recibir el `actionType` (o el action completo) para
saber que bonus por tipo aplicar:

```typescript
export function calculateDamage(
  context: CombatContext,
  mv: number,
  scaler: string = 'atk',
  element?: string,
  flat: number = 0,
  actionType?: string,  // <-- NUEVO
) {
  // ...
  let typeBonus = 0;
  if (actionType === 'basicAttack') typeBonus = context.basicAttackDmgBonus_;
  else if (actionType === 'heavyAttack') typeBonus = context.heavyAttackDmgBonus_;
  else if (actionType === 'resonanceSkill') typeBonus = context.resonanceSkillDmgBonus_;
  else if (actionType === 'resonanceLiberation') typeBonus = context.resonanceLiberationDmgBonus_;
  else if (actionType === 'echoSkill') typeBonus = context.echoSkillDmgBonus_;
  else if (actionType === 'introSkill') typeBonus = context.introSkillDmgBonus_; // si existe
  // ...

  const totalDmgBonus = context.allDmgBonus_ + elementalBonus + typeBonus;
  // ...
}
```

Tambien actualizar `calculateActionDamage()` en `effectResolver.ts` para pasar
`action.type` a `calculateDamageFn`.

### Mapeo actionType -> bonus

| actionType | Context key |
|---|---|
| `basicAttack` | `basicAttackDmgBonus_` |
| `heavyAttack` | `heavyAttackDmgBonus_` |
| `plungingAttack` | (no hay bonus especifico, usar 0) |
| `dodgeCounter` | (no hay bonus especifico, usar 0) |
| `resonanceSkill` | `resonanceSkillDmgBonus_` |
| `resonanceLiberation` | `resonanceLiberationDmgBonus_` |
| `forteCircuit` | (no hay bonus especifico, usar 0) |
| `introSkill` | (no hay bonus especifico, usar 0) |
| `outroSkill` | `outroSkillDmgBonus_` |
| `echoSkill` | `echoSkillDmgBonus_` |

---

## Bug 3: Falta la categoria P_k (bonos especiales)

**Estado: FIXEADO** ✅

**Severidad: Baja** -- pocos personajes usan esta categoria.

### El problema

La formula oficial tiene tres categorias multiplicativas:
```
(1 + sum(B_i)) * (1 + sum(A_j)) * (1 + sum(P_k))
```

El motor solo tiene dos:
```typescript
const bonusMult = (1 + totalDmgBonus) * (1 + context.dmgAmplify_);
//                                 ^^^ B_i                ^^^ A_j (Deepen)
```

Falta `P_k` (bonos especiales multiplicativos). Es "extremadamente raro" segun el
.md, pero deberia existir en el motor para futuros personajes.

### Fix

Anadir `specialDmgMult_` al `CombatContext`:

```typescript
specialDmgMult_: number;  // P_k: bonos especiales multiplicativos (raro)
```

Y en `calculateDamage()`:
```typescript
const bonusMult = (1 + totalDmgBonus) * (1 + context.dmgAmplify_) * (1 + context.specialDmgMult_);
```

---

## Bug 4: dmgAmplify_ vs Deepen

**Estado: FIXEADO** ✅ (ahora hay `basicAmplify_`, `heavyAmplify_`, `skillAmplify_`, `liberationAmplify_`, `coordinatedAmplify_`)

**Severidad: Informativo** -- verificar semantica.

El motor usa `dmgAmplify_` como la categoria A_j (Deepen). Esto parece correcto:
los Outro Skills de Verina (+15% All Type DMG Deepen), Mortefi (+38% Heavy DMG
Deepen), etc. deberian mapear a `dmgAmplify_`.

Pero hay que verificar:
- Deepen por tipo (ej. "Heavy Attack DMG Deepen") no deberia aplicar a todas las
  acciones, solo a las del tipo correcto.
- Actualmente `dmgAmplify_` es global. Si Mortefi da +38% Heavy Deepen, deberia
  aplicar solo a `heavyAttack`, no a `resonanceSkill`.

Esto requiere el mismo fix que Bug 2: pasar el actionType al calculo y usar un
Deepen por tipo en lugar de uno global.

---

## M_DR (Reducción de Daño) y M_ER (Elemento)

**Estado: PARCIALMENTE IMPLEMENTADO (2026-08-11).**
M_DR añadido al motor; M_ER aclarado como sinónimo de M_RES (sin campo nuevo).

**Investigación web completada** (vía chat.deepseek.com, 3 búsquedas). Fuentes:
- `wutheringwaves.fandom.com/wiki/DMG_RES`
- `wutheringwaves.gg/damage-calculation-guide`
- `game8.co/games/Wuthering-Waves/archives/453474` (ToA Guide)
- `beatcopgame.com/wuthering-waves-tier-list-wuwa/` (ToA modifiers)
- `primagames.com/gaming/wuthering-waves-elemental-weaknesses-and-resistances-explained`
- `west-games.com/wuthering-waves-damage-calculator/`

### Conclusiones

- **M_ER NO existe como término separado.** Es **sinónimo de M_RES** (resistencia
  elemental). La resistencia se calcula con la fórmula de 3 ramas ya implementada:
  `R<0 → 1-(R/2)`, `0≤R<0.8 → 1-R`, `R≥0.8 → 1/(1+5R)`. **No se añade campo nuevo.**
- **M_DR SÍ es real** y NO estaba implementado: es la barrera de reducción de daño
  absoluta de los bosses, **separada y multiplicativa** de M_RES, M_DEF y `damageTaken`.

```text
M_DR = max(0, 1 - damageReduction)
```

- `damageReduction` va en **decimal** (0.15 = 15%) en `EnemyStats`.
- Las fuentes de DR se **suman aditivamente** antes de aplicar el multiplicador
  (p. ej. 15% ToA floors 3-4 + 35% Taoqi + ... → DR_total = suma).
- **Sin cap documentado.** Clamp a ≥ 0 (floored en 0 para evitar multiplicador negativo).
- **No hay evidencia de la forma `1/(1+DR)`**; todos los ejemplos reales usan `(1 - DR)`.

### Casos reales confirmados

| Caso | Valor | Tipo |
|---|---|---|
| ToA Floors 3-4 | 15% DMG reduction → M_DR = 0.85 | M_DR |
| ToA All-Attribute RES +15% | sube M_RES, NO es M_DR | M_RES |
| Bell-Borne Geochelone | 50% DR | M_DR |
| Taoqi | 35% DR | M_DR |

### Implementación en el motor

- `calculator.ts`:
  - `EnemyStats.damageReduction: number` (decimal, default 0).
  - `damageReductionMultiplierFn(dr)` → `Math.max(0, 1 - dr)`.
  - `calculateDamage` inserta `M_DR` en el `preCrit`: `baseDmg * bonusMult * defMult * resMult * damageTakenMult * drMult`.
- `effectResolver.ts`: path `enemy.damageReduction` (aditivo, clamp ≥ 0).
- `DEFAULT_ENEMY.damageReduction = 0` → retrocompatible.

### Orden / agrupación

Todo multiplicativo → el orden no cambia el resultado numérico. Por convención
(comunidad): `Base × (1+ΣB) × (1+ΣA) × (1+ΣP) × M_crit × M_DEF × M_RES × M_DR × damageTaken`.

Tests nuevos en `combatMechanics.spec.ts` (M_DR y M_ER): 10 casos añadidos, 53/53 verdes.

---

## Bug 5: DEF Ignore > 100% clampeaba M_DEF a 1.0 (debía superar 1.0)

### El problema
Cuando la DEF Ignore es mayor al 100% (teórico hasta ~195.5%), el término `(1 − DEF Ignore)`
se vuelve negativo. Eso reduce el denominador de M_DEF por debajo del numerador, permitiendo
**M_DEF > 1.0** (la armadura del enemigo funciona como amplificador de daño) hasta un techo
algorítmico documentado de **2.0 (200%)**. El motor clampeaba `enemyDef` a 0 (`Math.max(0, ...)`),
forzando siempre M_DEF = 1.0.

### En el motor
- `calculator.ts::defMultiplierFn` (función pura usada por `calculateDamage`).
- `negativeStatus.ts::defMultiplier` (para los estados negativos que usan DEF: Electro Flare,
  Aero Erosion, Fusion Burst).

### Fix (commit `84868835`, 2026-08-12)
Ambas funciones ahora permiten `enemyDef` negativo y aplican techo máximo 2.0:

```ts
export function defMultiplierFn(atkStat: number, enemyDef: number): number {
  const den = atkStat + enemyDef;
  if (den <= 0) return 2.0;                 // techo algorítmico (200%)
  return Math.min(2.0, Math.max(0, atkStat / den));
}
```

### Verificación
- Tests nuevos en `combatMechanics.spec.ts` (`DEF Ignore > 100%`): 4 casos (enemyDef negativa,
  `den <= 0` → techo 2.0, `defIgnore_=1.5` en `calculateDamage`, caso extremo `defIgnore_=20`).
- Suite completa: **99 tests verdes** + `tsc` sin errores.

---

Despues de aplicar los fixes:

- [ ] A niveles iguales (Lc=Le=100), M_DEF = 0.5 exacto
- [ ] Un echo con "Basic Attack DMG +10%" aumenta el dano de basic attacks en ~10%
- [ ] Un echo con "Skill DMG +10%" NO aumenta el dano de basic attacks
- [ ] Deepen de Mortefi (+38% Heavy) solo aplica a heavy attacks
- [ ] Los numeros coinciden con calculadoras externas (ej. wutheringlab)
- [ ] Tests actualizados para cubrir los nuevos casos

---

## Fidelidad con la Wiki (fórmula general, CV/RV) — 2026-08-13

La fórmula de la Wiki (la misma del juego, sin Special Damage) es:

```
totalAttack × MV × totalAmplify × totalDamageBonus × crit × defMultiplier × resistMultiplier
```

| Componente | Wiki | Motor actual | Estado |
|---|---|---|---|
| **ATK** | `(charAtk + weaponAtk)·(1 + %ATK) + flat` | `ctx.atk` construido así + effects | ✅ |
| **MV** | `(mv + additionalMV)·(1 + MV mult)` | `mv` + `getAdditionalMV` (soporta `mv add` en el MV base) | ✅ (Modelado con `additionalMV` en `Action`) |
| **Amplify** | `(1 + totalAmplify)` | `(1 + totalAmplify)` | ✅ |
| **DMG Bonus** | `(1 + elem + attack + skillSpecific...)` | `(1 + totalDmgBonus)` aditivo | ✅ |
| **Crit (no-crit)** | 1 | `critDmg_` = 1+CD (no suma 1 extra) | ✅ |
| **DEF** | `800+8·Lc` / `(800+8·Lc + (8·Le+792)·(1-defIgnore)·(1-defReduction))` | `defNum/(defNum + DEF·(1-defIgnore)·(1-defReduction))` | ✅ (Corregido) |
| **RES** | `(1 - res + resReduction)`, si `<0` se mitiga a la mitad | 3 ramas (<0 → `1-(0.5·R)`) | ✅ |
| **Heal/Shield** | `(MV·atkDefHp + flat)·(1 + healBonus)` | `calculateHealing`/`calculateShield` | ✅ |

### CV y RV
- **CV (Crit Value)** = `Crit Rate × 2 + Crit DMG` — mostrado en Combat Statistics (calculado de `critRate_`/`critDmg_`).
- **RV (Roll Value)** — "suerte" de substat rolls; **no es una stat del motor**, es un ranking del artifact/echo. Se documenta como concepto (cada echo tiene su propio RV); no se calcula aún.

### Discrepancias corregidas (para NO repetir)
1. **DEF Ignore vs DEF Reduction eran UNA sola stat** (`defIgnore_` aplicaba `(1-defIgnore)` sobre toda la DEF). La Wiki las **multiplica por separado**: `(1-defIgnore)·(1-defReduction)`. Corregido:
   - `CombatContext` ahora tiene `defIgnore_` (del atacante) y `defReduction_` (debuff sobre el enemigo).
   - `calculateDamage` aplica ambos: `DEF·(1-defIgnore)·(1-defReduction)`.
   - `effectResolver` acepta `stat.defIgnore` y `stat.defReduction`.
   - Test: `defIgnore=0.5` + `defReduction=0.5` → `DEF·0.25` (no `DEF·0`).
2. **MV base no soportaba `additionalMV`** (la Wiki: `(mv + additionalMV)·(1+MV mult)`). Añadido `Action.additionalMV`, propagado desde los JSON5 y sumado en `calculateActionDamage`.
3. **CV no visible en UI** — añadido como fila calculada.
