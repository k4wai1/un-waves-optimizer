---
name: engine-formula
description: Explica la fórmula de daño de Wuthering Waves y cómo el motor la implementa en el código (calculator.ts, effectResolver.ts). Úsalo para depurar discrepancias entre el daño calculado y el juego, para extender el motor con nuevas mecánicas, para entender por qué un número sale distinto de lo esperado, o cuando se trabaje en app/ww-frontend/src/engine/ o en docs/engine-accuracy.md.
---

# Engine Formula

Cómo el motor calcula daño, curación y escudo, y cómo se mapea la fórmula oficial del juego a código.

## Fuente de verdad

`Wuthering_Waves_Multiplicadores.md` en la raíz del proyecto. Si el motor y el .md difieren, el .md gana (es la fórmula oficial).

## Fórmula oficial

```
D_final = (S * MV + D_flat + D_bonus)
          * M_RES * M_DEF * M_DR * M_ER
          * (1 + sum(B_i)) * (1 + sum(A_j)) * (1 + sum(P_k))
          * M_crit
```

| Símbolo | Significado | Dónde en el código |
|---|---|---|
| `S` | Stat base (ATK/HP/DEF) | `combatContext.atk/hp/def` |
| `MV` | Multiplier de habilidad | `action.scaling[].multiplier[lvl-1]` |
| `D_flat` | Daño flat | parámetro `flat` de `calculateDamage()` |
| `M_RES` | Resistencia | `resistanceMultiplierFn()` en calculator.ts |
| `M_DEF` | Defensa | `defMultiplierFn()` en calculator.ts |
| `M_DR` | Reducción de daño | `context.enemy.damageTaken` |
| `M_ER` | Reducción elemental | no separado; va en `damageTaken` |
| `B_i` | DMG Bonus % aditivo | `context.allDmgBonus_ + elementalBonus + typeBonus` |
| `A_j` | Deepen/Amplify | `context.dmgAmplify_` |
| `P_k` | Bonos especiales | NO implementado aún (ver Bug 3) |
| `M_crit` | Crítico | `critDmg_` (crit), 1 (no crit), promedio con `critRate_` |

## Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `app/ww-frontend/src/engine/calculator.ts` | Fórmulas puras: `calculateDamage`, `calculateHealing`, `calculateShield`, `defMultiplierFn`, `resistanceMultiplierFn` |
| `app/ww-frontend/src/engine/effectResolver.ts` | Sistema de efectos: `resolveEffects`, `calculateActionDamage` (dispatcher por kind), `resolveActionModifiers` |
| `app/ww-frontend/src/pages/ResonatorSetup.tsx` | UI: construye el CombatContext, llama a `calculateActionDamage` |

## Flujo del cálculo

```
1. ResonatorSetup construye CombatContext (stats base + weapon + statNodes + effects)
2. resolveEffects aplica los effects al context (stat.*, enemy.*)
3. generateCombatTable recorre actions y scaling
4. Para cada acción:
   calculateActionDamage(context, action, mv, scaler, element, activeEffects, effectsDb)
     ├── kind === 'heal'   → calculateActionHealing (replaceOnly: true)
     ├── kind === 'shield' → calculateActionShield (replaceOnly: true)
     └── kind === 'damage' → resolveActionModifiers → calculateDamage
```

## Curación y escudo (sin def/res/crit)

```
Healing = (flat + stat*MV) * (1 + healingBonus_)
Shield  = (flat + stat*MV) * (1 + shieldBonus_)
```

- NO usan def/res/crit/dmgBonus — los buffs de daño NO deben afectarlas
- Usan `replaceOnly: true` para ignorar Add/Multiply de actionType y solo honrar `Replace`
- Verificado en tests: `combatMechanics.spec.ts`

## Bugs conocidos (ver docs/engine-accuracy.md)

| Bug | Estado |
|---|---|
| 1. DEF enemigo por defecto 792 → debe ser 1600 (M_DEF=0.5 a niveles iguales) | NO FIXEADO |
| 2. `basicAttackDmgBonus_` etc. no se aplican en `calculateDamage()` | NO FIXEADO |
| 3. Falta categoría P_k (`specialDmgMult_`) | NO FIXEADO |
| 4. `dmgAmplify_` global vs Deepen por tipo | NO FIXEADO (ver Bug 2) |

Antes de tocar el motor, lee `docs/engine-accuracy.md` — documenta los fixes propuestos.

## Cómo depurar una discrepancia

1. **Aísla el caso**: desactiva effects hasta que el daño sea simple (sin buffs, crit fijo)
2. **Calcula a mano** con la fórmula del .md
3. **Compara** con la salida del motor
4. **Revisa el orden**: el motor redondea `Math.round()` al final del preCrit
5. **Revisa el scaler**: `FLAT` trata `mv` como flat (legacy); `HP`/`DEF`/`ATK` usan `stat×mv`
6. **Revisa el level del skill**: `idx = Math.min(lvl - 1, 9)` — el motor usa máximo Lv10

## Tests

Los tests de motor están en:
- `app/ww-frontend/src/engine/combatMechanics.spec.ts` (20 tests: heal/shield/flat/kind/isolation)
- `app/ww-frontend/src/engine/effectResolver.spec.ts` (16 tests)

Ejecutar:
```bash
cd app/ww-frontend && npx vitest run
```

## Ver también

- `docs/engine-accuracy.md` — bugs y fixes propuestos
- `Wuthering_Waves_Multiplicadores.md` — fórmula oficial del juego
- `libs/ww/stats/src/resonators/README.md` — esquema de data
- `.agents/skills/spec-validator/SKILL.md` — validación de specs
