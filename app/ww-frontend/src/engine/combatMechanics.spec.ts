// ═══════════════════════════════════════════════════════════════════════════════
// combatMechanics.spec.ts — Tests de las mecánicas extendidas del motor (v2.1)
//
// Cubren: curación (flat + %), escudo (flat + %), daño con flat, separación
// heal/shield vs damage (que no se afecten entre sí), `kind`, `flat`, `formId`
// y la no-mutación del contexto.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  calculateDamage,
  calculateHealing,
  calculateShield,
  DEFAULT_ENEMY,
  damageReductionMultiplierFn,
  defMultiplierFn,
  type CombatContext,
} from './calculator';
import {
  type Action,
  type ActiveEffect,
  type Effect,
  calculateActionDamage,
  calculateActionHealing,
  calculateActionShield,
  indexEffects,
  resolveEffects,
} from './effectResolver';

function cloneEnemy() {
  return JSON.parse(JSON.stringify(DEFAULT_ENEMY));
}

const BASE_CONTEXT: CombatContext = {
  hp: 16712,
  atk: 1000,
  def: 500,
  tuneBreakBoost: 0,
  maxSTA: 100,
  maxFlightSTA: 100,
  critRate_: 0.05,
  critDmg_: 1.50,
  energyRegen_: 0,
  allDmgBonus_: 0,
  dmgAmplify_: 0,
  offTuneBuildupRate_: 0,
  resonanceSkillDmgBonus_: 0,
  basicAttackDmgBonus_: 0,
  heavyAttackDmgBonus_: 0,
  resonanceLiberationDmgBonus_: 0,
  echoSkillDmgBonus_: 0,
  coordinatedDmgBonus_: 0,
  outroSkillDmgBonus_: 0,
  physicalDmgBonus_: 0,
  glacioDmgBonus_: 0,
  fusionDmgBonus_: 0,
  electroDmgBonus_: 0,
  aeroDmgBonus_: 0,
  spectroDmgBonus_: 0,
  havocDmgBonus_: 0,
  healingBonus_: 0,
  attackerLvl: 90,
  defIgnore_: 0,
  enemy: cloneEnemy(),
};

const NO_EFFECTS: ActiveEffect[] = [];
const EMPTY_DB: Record<string, Effect> = {};

// ─── calculateDamage / calculateHealing / calculateShield (funciones puras) ──

describe('calculateHealing', () => {
  it('calcula curación como flat + stat*mv, escalada por healingBonus', () => {
    // Shorekeeper skill heal: 660 flat + 3.00% HP, sin healing bonus → 16712*0.03 + 660
    expect(calculateHealing(BASE_CONTEXT, 0.03, 'hp', 660)).toBe(Math.round(16712 * 0.03 + 660));
  });

  it('aplica healingBonus_ multiplicativamente', () => {
    const ctx = { ...BASE_CONTEXT, healingBonus_: 0.1 };
    const expected = Math.round((1000 * 0.5 + 200) * 1.1);
    expect(calculateHealing(ctx, 0.5, 'atk', 200)).toBe(expected);
  });

  it('NO depende de la defensa/resistencia/daño del enemigo', () => {
    const ctx = { ...BASE_CONTEXT };
    // Cambiar todas las propiedades defensivas del enemigo no altera la curación
    ctx.enemy = { ...cloneEnemy(), defense: 99999, damageTaken: 0.01, elementalResistances: { ...cloneEnemy().elementalResistances, spectro: 0.9 } };
    const result = calculateHealing(ctx, 0.03, 'hp', 660);
    expect(result).toBe(Math.round(16712 * 0.03 + 660));
  });
});

describe('calculateShield', () => {
  it('calcula escudo como flat + stat*mv', () => {
    // Taoqi timed counter stage 1 shield: 300 flat + 0.1125 ATK
    expect(calculateShield(BASE_CONTEXT, 0.1125, 'atk', 300)).toBe(Math.round(1000 * 0.1125 + 300));
  });

  it('aplica shieldBonus_ multiplicativamente si existe', () => {
    // Taoqi inherent: Power Shift Shield +40% → shieldBonus_ = 0.4
    const ctx = { ...BASE_CONTEXT, shieldBonus_: 0.4 };
    expect(calculateShield(ctx, 0.1125, 'atk', 300)).toBe(Math.round((1000 * 0.1125 + 300) * 1.4));
  });

  it('NO aplica healingBonus_ al escudo', () => {
    const ctx = { ...BASE_CONTEXT, healingBonus_: 1.0 }; // +100% heal
    expect(calculateShield(ctx, 0.1125, 'atk', 300)).toBe(Math.round(1000 * 0.1125 + 300));
  });
});

describe('calculateDamage con flat', () => {
  it('suma flat al daño base (X% ATK + Y)', () => {
    const base = calculateDamage(BASE_CONTEXT, 0.05, 'atk', 'spectro');
    const withFlat = calculateDamage(BASE_CONTEXT, 0.05, 'atk', 'spectro', 400);
    // El flat se suma a la base ANTES de defensa/resistencia del enemigo: la
    // contribución del flat llega atenuada por defMult*resMult (< 1).
    expect(withFlat.normal).toBeGreaterThan(base.normal);
    const delta = withFlat.normal - base.normal;
    // defMult(90 vs def 1600) = 1520/3120 ≈ 0.487; res spectro = 0.90
    // contribución ≈ 400 * 0.487 * 0.90 ≈ 175.4 (redondeos por ambos lados)
    expect(delta).toBeGreaterThanOrEqual(170);
    expect(delta).toBeLessThanOrEqual(185);
  });

  it('mantiene la firma con 4 argumentos (retrocompat)', () => {
    const result = calculateDamage(BASE_CONTEXT, 2.0, 'atk', 'spectro');
    expect(result).toHaveProperty('normal');
    expect(result).toHaveProperty('average');
    expect(result).toHaveProperty('crit');
  });
});

// ─── Dispatcher por `kind` (calculateActionDamage) ────────────────────────────

describe('calculateActionDamage según kind', () => {
  const dmgAction: Action = { id: 'a1', type: 'resonanceSkill', tags: [], kind: 'damage' };
  const healAction: Action = { id: 'h1', type: 'resonanceSkill', tags: [], kind: 'heal', flat: 660 };
  const shieldAction: Action = { id: 's1', type: 'forteCircuit', tags: [], kind: 'shield', flat: 300 };
  const coordAction: Action = { id: 'c1', type: 'resonanceLiberation', tags: [], kind: 'coordinated' };

  it('kind=damage usa calculateDamage normal (con crit)', () => {
    const r = calculateActionDamage(BASE_CONTEXT, dmgAction, 2.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    expect(r.crit).toBeGreaterThan(r.normal); // critDmg > 1
    expect(r.average).toBeGreaterThan(r.normal); // critRate > 0
  });

  it('kind=heal devuelve los tres valores iguales (no critica) y aplica healingBonus', () => {
    const ctx = { ...BASE_CONTEXT, healingBonus_: 0.1 };
    const r = calculateActionDamage(ctx, healAction, 0.03, 'hp', undefined, NO_EFFECTS, EMPTY_DB);
    expect(r.normal).toBe(r.average);
    expect(r.normal).toBe(r.crit);
    // flat=660 + 3% HP, ×1.1
    expect(r.normal).toBe(Math.round((16712 * 0.03 + 660) * 1.1));
  });

  it('kind=shield calcula escudo y NO se ve afectado por criticos ni healingBonus', () => {
    const ctx = { ...BASE_CONTEXT, healingBonus_: 0.5, critRate_: 1.0, critDmg_: 3.0 };
    const trueShield = Math.round(1000 * 0.1125 + 300);
    const r = calculateActionDamage(ctx, shieldAction, 0.1125, 'atk', undefined, NO_EFFECTS, EMPTY_DB);
    expect(r.normal).toBe(trueShield);
    expect(r.average).toBe(trueShield);
    expect(r.crit).toBe(trueShield); // los shields no critican
  });

  it('kind=coordinated usa calculateDamage (mismo daño que damage)', () => {
    const a = calculateActionDamage(BASE_CONTEXT, coordAction, 0.05, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const b = calculateActionDamage(BASE_CONTEXT, dmgAction, 0.05, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    expect(a).toEqual(b);
  });

  it('kind=undefined (default) se trata como damage', () => {
    const plain: Action = { id: 'p1', type: 'resonanceSkill', tags: [] };
    const expected = calculateActionDamage(BASE_CONTEXT, dmgAction, 1.2, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const got = calculateActionDamage(BASE_CONTEXT, plain, 1.2, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    expect(got).toEqual(expected);
  });
});

// ─── Helpers específicos calculateActionHealing / calculateActionShield ──────

describe('calculateActionHealing / calculateActionShield', () => {
  const healAction: Action = { id: 'h1', type: 'resonanceSkill', tags: [], kind: 'heal', flat: 660 };
  const shieldAction: Action = { id: 's1', type: 'forteCircuit', tags: [], kind: 'shield', flat: 300 };

  it('calculateActionHealing = flat + %HP, ×healingBonus', () => {
    const ctx = { ...BASE_CONTEXT, healingBonus_: 0.05 };
    const expected = Math.round((16712 * 0.03 + 660) * 1.05);
    expect(calculateActionHealing(ctx, healAction, 0.03, 'hp', NO_EFFECTS, EMPTY_DB)).toBe(expected);
  });

  it('calculateActionShield respeta shieldBonus pero no healingBonus', () => {
    const ctx = { ...BASE_CONTEXT, shieldBonus_: 0.4, healingBonus_: 0.9 };
    const expected = Math.round((1000 * 0.1125 + 300) * 1.4);
    expect(calculateActionShield(ctx, shieldAction, 0.1125, 'atk', NO_EFFECTS, EMPTY_DB)).toBe(expected);
  });

  it('soporta el formato legacy: stat FLAT con mv = valor plano', () => {
    // Las curas planas se modelan con stat "FLAT" y el valor en multiplier (mv).
    const flatHeal: Action = { id: 'f1', type: 'resonanceSkill', tags: [], kind: 'heal' };
    expect(calculateActionHealing(BASE_CONTEXT, flatHeal, 660, 'flat', NO_EFFECTS, EMPTY_DB)).toBe(660);
  });
});

// ─── Aislamiento heal/shield vs damage a través de effects ──────────────────

describe('segregación de buffs (heal/shield vs damage)', () => {
  const effects: Effect[] = [
    {
      id: 'heal_buff', name: 'Healing Bonus +10%',
      target: 'stat.healingBonus', modifiers: [{ operation: 'Add', valueType: 'Percent', value: [0.1] }],
      maxStacks: 1, exclusive: false,
    },
    {
      id: 'shield_buff', name: 'Shield +40%',
      target: 'stat.shieldBonus', modifiers: [{ operation: 'Add', valueType: 'Percent', value: [0.4] }],
      maxStacks: 1, exclusive: false,
    },
    {
      id: 'dmg_buff', name: 'Skill DMG +20%',
      target: 'actionType.resonanceSkill',
      modifiers: [{ operation: 'Add', valueType: 'Percent', value: [0.2] }],
      maxStacks: 1, exclusive: false,
    },
  ];
  const db = indexEffects(effects);
  const active: ActiveEffect[] = [
    { effectId: 'heal_buff', rank: 0, stacks: 1, enabled: true },
    { effectId: 'shield_buff', rank: 0, stacks: 1, enabled: true },
    { effectId: 'dmg_buff', rank: 0, stacks: 1, enabled: true },
  ];

  const healAction: Action = { id: 'h1', type: 'resonanceSkill', tags: [], kind: 'heal', flat: 500 };
  const shieldAction: Action = { id: 's1', type: 'forteCircuit', tags: [], kind: 'shield', flat: 300 };
  const dmgAction: Action = { id: 'a1', type: 'resonanceSkill', tags: [], kind: 'damage' };

  it('effect de skill DMG NO infla la curación ni el escudo', () => {
    const ctx = resolveEffects(BASE_CONTEXT, active, db);
    const heal = calculateActionHealing(ctx, healAction, 0.10, 'atk', active, db);
    const shield = calculateActionShield(ctx, shieldAction, 0.10, 'atk', active, db);
    // heal: (1000*0.1 + 500) * 1.1 (healingBonus), SIN el +20% de skill DMG
    expect(heal).toBe(Math.round((1000 * 0.1 + 500) * 1.1));
    // shield: (1000*0.1 + 300) * 1.4 (shieldBonus), SIN skill DMG
    expect(shield).toBe(Math.round((1000 * 0.1 + 300) * 1.4));
  });

  it('effect de skill DMG SÍ infla el daño de la acción damage/resonanceSkill', () => {
    const ctx = resolveEffects(BASE_CONTEXT, active, db);
    const base = calculateActionDamage(BASE_CONTEXT, dmgAction, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const buffed = calculateActionDamage(ctx, dmgAction, 1.0, 'atk', 'spectro', active, db);
    // +20% skill DMG → el daño buffed debe superar al base
    expect(buffed.normal).toBeGreaterThan(base.normal);
    expect(buffed.normal / base.normal).toBeCloseTo(1.2, 2);
  });

  it('healingBonus y shieldBonus se resuelven en context sin mutar el original', () => {
    const ctx = resolveEffects(BASE_CONTEXT, active, db);
    expect(ctx.healingBonus_).toBe(0.1);
    expect(ctx.shieldBonus_).toBe(0.4);
    // el contexto base no se tocó
    expect(BASE_CONTEXT.healingBonus_).toBe(0);
    expect(BASE_CONTEXT.shieldBonus_).toBeUndefined();
  });
});

// ─── formId: metadata declarativa ─────────────────────────────────────────────

describe('formId (formas / modos)', () => {
  it('es solo metadata: se conserva en la acción y no cambia el cálculo', () => {
    const incarn: Action = { id: 'j_incarn_1', type: 'forteCircuit', tags: [], kind: 'damage', formId: 'incarnation' };
    const plain: Action = { id: 'j_plain_1', type: 'forteCircuit', tags: [], kind: 'damage' };
    const withForm = calculateActionDamage(BASE_CONTEXT, incarn, 0.5, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const withoutForm = calculateActionDamage(BASE_CONTEXT, plain, 0.5, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    expect(incarn.formId).toBe('incarnation');
    expect(withForm).toEqual(withoutForm);
  });
});

// ─── Fixes de fidelidad a la fórmula oficial (docs/engine-accuracy.md) ────────

describe('Bug 1: DEF del enemigo por defecto (M_DEF = 0.5 a niveles iguales)', () => {
  it('DEFAULT_ENEMY.defense = 1600 (800 + 8·100)', () => {
    expect(DEFAULT_ENEMY.defense).toBe(1600);
  });

  it('a niveles iguales (Lc=Le=100) el multiplicador de DEF es exactamente 0.5', () => {
    const ctx = { ...BASE_CONTEXT, attackerLvl: 100 };
    ctx.enemy = { ...cloneEnemy(), defense: 1600 }; // mismo nivel 100
    // Fórmula oficial: defNum / (defNum + enemyDef) = 1600 / 3200 = 0.5
    const base = calculateDamage(ctx, 1.0, 'atk', 'spectro');
    // Sin bonus: baseDmg = 1000 * 1.0, res spectro = 0.90, damageTaken = 1
    // preCrit = 1000 * 0.5 * 0.90 = 450
    expect(base.normal).toBe(450);
  });
});

describe('Bug 2: bonus de daño por tipo de acción (B_i específico)', () => {
  it('stat.basicDmg aumenta el daño de basicAttack pero no de resonanceSkill', () => {
    const basic: Action = { id: 'b1', type: 'basicAttack', tags: [] };
    const skill: Action = { id: 's1', type: 'resonanceSkill', tags: [] };
    const ctx = { ...BASE_CONTEXT, basicAttackDmgBonus_: 0.2 };

    const baseBasic = calculateActionDamage(BASE_CONTEXT, basic, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const buffedBasic = calculateActionDamage(ctx, basic, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const buffedSkill = calculateActionDamage(ctx, skill, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);

    expect(buffedBasic.normal / baseBasic.normal).toBeCloseTo(1.2, 2);
    // el skill NO recibe el bonus de basic attack
    const baseSkill = calculateActionDamage(BASE_CONTEXT, skill, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    expect(buffedSkill.normal).toBe(baseSkill.normal);
  });

  it('resonanceSkillDmgBonus_ se aplica vía calculateDamage con actionType', () => {
    const ctx = { ...BASE_CONTEXT, resonanceSkillDmgBonus_: 0.15 };
    const base = calculateDamage(BASE_CONTEXT, 1.0, 'atk', 'spectro', 0, 'resonanceSkill');
    const buffed = calculateDamage(ctx, 1.0, 'atk', 'spectro', 0, 'resonanceSkill');
    expect(buffed.normal / base.normal).toBeCloseTo(1.15, 2);
  });
});

describe('Bug 3: categoría P_k (specialDmgMult_)', () => {
  it('specialDmgMult_ multiplica separado de los bonus aditivos', () => {
    const ctx = { ...BASE_CONTEXT, specialDmgMult_: 0.1 };
    const base = calculateDamage(BASE_CONTEXT, 1.0, 'atk', 'spectro');
    const buffed = calculateDamage(ctx, 1.0, 'atk', 'spectro');
    expect(buffed.normal / base.normal).toBeCloseTo(1.1, 2);
  });
});

describe('Bug 4: Deepen por tipo (A_j específico)', () => {
  it('skillAmplify_ aplica solo a resonanceSkill, no a basicAttack', () => {
    const ctx = { ...BASE_CONTEXT, skillAmplify_: 0.38 }; // ej. Mortefi Heavy Deepen sería heavyAmplify_
    const skill: Action = { id: 's1', type: 'resonanceSkill', tags: [] };
    const basic: Action = { id: 'b1', type: 'basicAttack', tags: [] };

    const baseSkill = calculateActionDamage(BASE_CONTEXT, skill, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const buffedSkill = calculateActionDamage(ctx, skill, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const buffedBasic = calculateActionDamage(ctx, basic, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);

    expect(buffedSkill.normal / baseSkill.normal).toBeCloseTo(1.38, 2);
    const baseBasic = calculateActionDamage(BASE_CONTEXT, basic, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    expect(buffedBasic.normal).toBe(baseBasic.normal);
  });

  it('dmgAmplify_ global sigue aplicando a todos los tipos', () => {
    const ctx = { ...BASE_CONTEXT, dmgAmplify_: 0.15 }; // ej. Verina Outro +15% All DMG Deepen
    const basic: Action = { id: 'b1', type: 'basicAttack', tags: [] };
    const skill: Action = { id: 's1', type: 'resonanceSkill', tags: [] };

    const baseBasic = calculateActionDamage(BASE_CONTEXT, basic, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const baseSkill = calculateActionDamage(BASE_CONTEXT, skill, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const buffedBasic = calculateActionDamage(ctx, basic, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);
    const buffedSkill = calculateActionDamage(ctx, skill, 1.0, 'atk', 'spectro', NO_EFFECTS, EMPTY_DB);

    expect(buffedBasic.normal / baseBasic.normal).toBeCloseTo(1.15, 2);
    expect(buffedSkill.normal / baseSkill.normal).toBeCloseTo(1.15, 2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════┐
// M_DR (Reducción de Daño absoluta) y M_ER (= M_RES) — investigación web        │
// Fuentes: wutheringwaves.fandom.com/wiki/DMG_RES,                              │
//          wutheringwaves.gg/damage-calculation-guide, game8 ToA, beatcopgame   │
// ═════════════════════════════════════════════════════════════════════════════┘

describe('M_DR: damageReductionMultiplierFn', () => {
  it('dr=0 → multiplicador 1 (sin reducción)', () => {
    expect(damageReductionMultiplierFn(0)).toBe(1);
  });

  it('dr=0.15 → multiplicador 0.85 (ToA Floors 3-4)', () => {
    expect(damageReductionMultiplierFn(0.15)).toBeCloseTo(0.85, 6);
  });

  it('dr=0.50 → multiplicador 0.50 (ej. Bell-Borne Geochelone)', () => {
    expect(damageReductionMultiplierFn(0.50)).toBeCloseTo(0.50, 6);
  });

  it('clampa en 0 para dr >= 1 (barrera total), nunca negativo', () => {
    expect(damageReductionMultiplierFn(1)).toBe(0);
    expect(damageReductionMultiplierFn(1.5)).toBe(0);
  });
});

describe('M_DR se integra en calculateDamage (multiplicativo y separado)', () => {
  it('con damageReduction=0.15 el daño es 0.85× el base', () => {
    const ctx = { ...BASE_CONTEXT };
    ctx.enemy = { ...cloneEnemy(), damageReduction: 0.15 };

    const base = calculateDamage(BASE_CONTEXT, 1.0, 'atk', 'spectro');
    const reduced = calculateDamage(ctx, 1.0, 'atk', 'spectro');
    expect(reduced.normal / base.normal).toBeCloseTo(0.85, 2);
  });

  it('es INDEPENDIENTE de damageTaken (no se agrupan)', () => {
    // Solo M_DR (sube 15% de reducción) no debe tocar el efecto de damageTaken
    const drCtx = { ...BASE_CONTEXT };
    drCtx.enemy = { ...cloneEnemy(), damageReduction: 0.15 };

    const dtCtx = { ...BASE_CONTEXT };
    dtCtx.enemy = { ...cloneEnemy(), damageTaken: 1.15 };

    const base = calculateDamage(BASE_CONTEXT, 1.0, 'atk', 'spectro');
    const drOnly = calculateDamage(drCtx, 1.0, 'atk', 'spectro');
    const dtOnly = calculateDamage(dtCtx, 1.0, 'atk', 'spectro');

    expect(drOnly.normal / base.normal).toBeCloseTo(0.85, 2);
    expect(dtOnly.normal / base.normal).toBeCloseTo(1.15, 2);
  });

  it('con ambas (DR 0.15 y damageTaken 1.15) se multiplican (0.85 * 1.15)', () => {
    const ctx = { ...BASE_CONTEXT };
    ctx.enemy = { ...cloneEnemy(), damageReduction: 0.15, damageTaken: 1.15 };
    const base = calculateDamage(BASE_CONTEXT, 1.0, 'atk', 'spectro');
    const combo = calculateDamage(ctx, 1.0, 'atk', 'spectro');
    expect(combo.normal / base.normal).toBeCloseTo(0.85 * 1.15, 2);
  });

  it('default (damageReduction=0) no cambia el cálculo (retrocompat)', () => {
    const defaultCtx = { ...BASE_CONTEXT, enemy: cloneEnemy() };
    defaultCtx.enemy.damageReduction = 0;
    expect(calculateDamage(defaultCtx, 1.0, 'atk', 'spectro').normal)
      .toBe(calculateDamage(BASE_CONTEXT, 1.0, 'atk', 'spectro').normal);
  });
});

describe('M_ER = M_RES (sin término separado)', () => {
  it('la resistencia elemental sigue la fórmula de 3 ramas (no hay campo nuevo)', () => {
    // M_ER no es un campo: la resistencia (M_RES) ya lo cubre.
    // Verificar que DEFAULT_ENEMY NO tiene un campo elementalReduction distinto de las resist.
    const e = cloneEnemy() as any;
    expect(e.damageReduction).toBe(0);          // M_DR existe
    expect(e.elementalReduction).toBeUndefined(); // M_ER NO existe como campo
    expect(e.elementalResistances.spectro).toBe(0.10);
  });

  it('res max alta (RES=0.9) usa la rama 1/(1+5R) = 1/5.5', () => {
    const ctx = { ...BASE_CONTEXT };
    ctx.enemy = { ...cloneEnemy() };
    ctx.enemy.elementalResistances = { ...ctx.enemy.elementalResistances, spectro: 0.9 };

    // Lc=90 → defNum = 800+8*90 = 1520; enemyDef 1600 → M_DEF = 1520/3120
    const defNum = 800 + 8 * ctx.attackerLvl;
    const defMult = defMultiplierFn(defNum, ctx.enemy.defense);
    const resMult = 1 / (1 + 5 * 0.9); // rama de alta resistencia
    // sin flat, sin bonus/amplify/special, sin DR, damageTaken=1, critDmg no afecta normal
    const expected = Math.round(ctx.atk * 1.0 * defMult * resMult * 1 * 1);

    expect(calculateDamage(ctx, 1.0, 'atk', 'spectro').normal).toBe(expected);
  });
});

describe('DEF Ignore > 100% (M_DEF puede superar 1.0, techo 2.0)', () => {
  it('defMultiplierFn con enemyDef negativo devuelve M_DEF > 1', () => {
    // atkStat = 1520, enemyDef = -400 → 1520/(1520-400) = 1520/1120 ≈ 1.357
    expect(defMultiplierFn(1520, -400)).toBeCloseTo(1520 / 1120, 5);
  });

  it('defMultiplierFn clampa al techo 2.0 si el denominador es ≤ 0', () => {
    // enemyDef = -2000 → den = -480 ≤ 0 → techo 2.0
    expect(defMultiplierFn(1520, -2000)).toBe(2.0);
    // enemyDef = -1520 exacto → den 0 → techo 2.0
    expect(defMultiplierFn(1520, -1520)).toBe(2.0);
  });

  it('defIgnore_ de 1.5 en calculateDamage produce M_DEF > 1 (armadura como amplificador)', () => {
    const ctx = { ...BASE_CONTEXT, defIgnore_: 1.5 };
    ctx.enemy = { ...cloneEnemy(), defense: 1000 };
    // defY = 1000 × (1 - 1.5) = -500; defNum = 1520
    // defMult = 1520/(1520-500) = 1520/1020 ≈ 1.4902
    const defNum = 800 + 8 * ctx.attackerLvl;
    const defMult = defMultiplierFn(defNum, 1000 * (1 - 1.5));
    const resMult = 0.9; // spectro default
    const expected = Math.round(ctx.atk * 1.0 * defMult * resMult);
    expect(defMult).toBeGreaterThan(1);
    expect(calculateDamage(ctx, 1.0, 'atk', 'spectro').normal).toBe(expected);
  });

  it('defIgnore_ de 20 + enemigo grande no rompe (techo 2.0 final)', () => {
    const ctx = { ...BASE_CONTEXT, defIgnore_: 20 };
    ctx.enemy = { ...cloneEnemy(), defense: 1600 };
    // defY = 1600 × (1-20) = -30400 → den muy negativo → techo 2.0
    const dmg = calculateDamage(ctx, 1.0, 'atk', 'spectro');
    // preCrit = 1000 × 2.0 × 0.9 = 1800
    expect(dmg.normal).toBe(Math.round(1000 * 2.0 * 0.9));
  });
});
