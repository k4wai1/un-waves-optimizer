// ═══════════════════════════════════════════════════════════════════════════════
// effectResolver.spec.ts — Tests unitarios del resolvedor de efectos
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  type Effect,
  type ActiveEffect,
  type CombatContext,
  resolveEffects,
  buildActiveEffects,
  indexEffects,
} from './effectResolver';
import { DEFAULT_ENEMY } from './calculator';

// ─── Contexto base de prueba ──────────────────────────────────────────────

const BASE_CONTEXT: CombatContext = {
  hp: 10000,
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
  physicalRes_: 0,
  glacioRes_: 0,
  fusionRes_: 0,
  electroRes_: 0,
  aeroRes_: 0,
  spectroRes_: 0,
  havocRes_: 0,
  healingBonus_: 0,
  attackerLvl: 90,
  defIgnore_: 0,
  enemy: JSON.parse(JSON.stringify(DEFAULT_ENEMY)),
};

// ─── Efectos de prueba ────────────────────────────────────────────────────

const TEST_EFFECTS: Effect[] = [
  {
    id: 'weapon_hp_buff',
    name: 'Increase HP',
    type: 'stat',
    operation: 'add',
    stat: 'hp_',
    value: [0.12, 0.15, 0.18, 0.21, 0.24],
    affects: 'self',
    howToActivate: 'Always active',
    maxStacks: 1,
    durationSeconds: null,
    cooldownSeconds: null,
    exclusive: false,
    enabledByDefault: true,
  },
  {
    id: 'weapon_atk_stack',
    name: 'ATK Stack on Skill',
    type: 'stat',
    operation: 'add',
    stat: 'atk_',
    value: [0.06, 0.075, 0.09, 0.105, 0.12],
    affects: 'self',
    howToActivate: 'Cast Skill',
    maxStacks: 2,
    durationSeconds: 10,
    cooldownSeconds: null,
    exclusive: false,
    enabledByDefault: false,
  },
  {
    id: 'weapon_energy_regen',
    name: 'Energy Regen',
    type: 'stat',
    operation: 'add',
    stat: 'energyRegen_',
    value: [0.128, 0.16, 0.192, 0.224, 0.256],
    affects: 'self',
    howToActivate: 'Always active',
    maxStacks: 1,
    durationSeconds: null,
    cooldownSeconds: null,
    exclusive: false,
    enabledByDefault: true,
  },
  {
    id: 'weapon_concerto_restore',
    name: 'Restore Concerto Energy',
    type: 'mechanic',
    stat: 'concertoEnergy',
    value: [8, 10, 12, 14, 16],
    affects: 'self',
    howToActivate: 'Cast Liberation (20s cooldown)',
    maxStacks: 1,
    durationSeconds: null,
    cooldownSeconds: 20,
    exclusive: false,
    enabledByDefault: false,
  },
  {
    id: 'sanhua_inherent_condensation',
    name: 'Condensation',
    type: 'stat',
    operation: 'add',
    stat: 'skillDmg_',
    value: [0.20],
    affects: 'self',
    howToActivate: 'Use Intro Skill',
    maxStacks: 1,
    durationSeconds: 8,
    cooldownSeconds: null,
    exclusive: false,
    enabledByDefault: false,
  },
  {
    id: 'sanhua_s1',
    name: "Solitude's Embrace",
    type: 'stat',
    operation: 'add',
    stat: 'critRate_',
    value: [0.15],
    affects: 'self',
    howToActivate: 'After Basic Attack 5',
    maxStacks: 1,
    durationSeconds: 10,
    cooldownSeconds: null,
    exclusive: false,
    enabledByDefault: false,
  },
];

const EFFECTS_DB = indexEffects(TEST_EFFECTS);

// ─── Tests ────────────────────────────────────────────────────────────────

describe('resolveEffects', () => {
  it('should return unchanged context when no active effects', () => {
    const result = resolveEffects(BASE_CONTEXT, [], EFFECTS_DB);
    expect(result).toEqual(BASE_CONTEXT);
  });

  it('should skip disabled effects', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_hp_buff', rank: 0, stacks: 1, enabled: false },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    expect(result.hp).toBe(BASE_CONTEXT.hp);
  });

  it('should apply a simple additive stat effect (HP+12% R1)', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_hp_buff', rank: 0, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    // HP base 10000 * 0.12 = 1200 adicional
    expect(result.hp).toBeCloseTo(10000 + 1200, 2);
  });

  it('should apply weapon HP buff at R5 (HP+24%)', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_hp_buff', rank: 4, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    // HP base 10000 * 0.24 = 2400 adicional
    expect(result.hp).toBeCloseTo(10000 + 2400, 2);
  });

  it('should apply Energy Regen passive', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_energy_regen', rank: 0, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    expect(result.energyRegen_).toBeCloseTo(0.128, 5);
  });

  it('should apply ATK stack with 2 stacks at R1', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_atk_stack', rank: 0, stacks: 2, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    // ATK base 1000 * (0.06 * 2) = 120 adicional
    expect(result.atk).toBeCloseTo(1000 + 120, 2);
  });

  it('should apply ATK stack with 1 stack at R5', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_atk_stack', rank: 4, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    // ATK base 1000 * 0.12 = 120 adicional
    expect(result.atk).toBeCloseTo(1000 + 120, 2);
  });

  it('should cap stacks at maxStacks', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_atk_stack', rank: 0, stacks: 99, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    // maxStacks=2, así que solo aplica 2 stacks
    expect(result.atk).toBeCloseTo(1000 + 120, 2);
  });

  it('should ignore mechanic-type effects (no stat modification)', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_concerto_restore', rank: 0, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    // El tipo 'mechanic' no modifica stats del CombatContext
    expect(result).toEqual(BASE_CONTEXT);
  });

  it('should apply multiple effects simultaneously', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_hp_buff', rank: 0, stacks: 1, enabled: true },
      { effectId: 'weapon_energy_regen', rank: 2, stacks: 1, enabled: true },
      { effectId: 'sanhua_inherent_condensation', rank: 0, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    expect(result.hp).toBeCloseTo(10000 + 1200, 2);
    expect(result.energyRegen_).toBeCloseTo(0.192, 5);
    expect(result.resonanceSkillDmgBonus_).toBe(0.20);
  });

  it('should apply weapon + sequence + inherent effects together', () => {
    const active: ActiveEffect[] = [
      { effectId: 'weapon_hp_buff', rank: 0, stacks: 1, enabled: true },
      { effectId: 'sanhua_inherent_condensation', rank: 0, stacks: 1, enabled: true },
      { effectId: 'sanhua_s1', rank: 0, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    expect(result.hp).toBeCloseTo(10000 + 1200, 2);
    expect(result.resonanceSkillDmgBonus_).toBe(0.20);
    expect(result.critRate_).toBe(0.05 + 0.15);
  });

  it('should not mutate the original context', () => {
    const originalHp = BASE_CONTEXT.hp;
    const active: ActiveEffect[] = [
      { effectId: 'weapon_hp_buff', rank: 0, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    expect(result.hp).not.toBe(BASE_CONTEXT.hp);
    expect(BASE_CONTEXT.hp).toBe(originalHp);
  });

  it('should handle unknown effect IDs gracefully', () => {
    const active: ActiveEffect[] = [
      { effectId: 'nonexistent_effect', rank: 0, stacks: 1, enabled: true },
    ];
    const result = resolveEffects(BASE_CONTEXT, active, EFFECTS_DB);
    expect(result).toEqual(BASE_CONTEXT);
  });
});

describe('buildActiveEffects', () => {
  it('should build ActiveEffects from Effect definitions', () => {
    const effects = [TEST_EFFECTS[0], TEST_EFFECTS[1]]; // weapon_hp_buff + weapon_atk_stack
    const result = buildActiveEffects(effects, 0, 2);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      effectId: 'weapon_hp_buff',
      rank: 0,
      stacks: 1, // capped at maxStacks=1
      enabled: true, // enabledByDefault=true
    });
    expect(result[1]).toEqual({
      effectId: 'weapon_atk_stack',
      rank: 0,
      stacks: 2, // capped at maxStacks=2
      enabled: false, // enabledByDefault=false
    });
  });

  it('should respect enabledOverrides', () => {
    const effects = [TEST_EFFECTS[0]];
    const result = buildActiveEffects(effects, 0, 1, { weapon_hp_buff: false });
    expect(result[0].enabled).toBe(false);
  });
});

describe('indexEffects', () => {
  it('should index effects by id', () => {
    const db = indexEffects(TEST_EFFECTS);
    expect(db['weapon_hp_buff']).toBeDefined();
    expect(db['weapon_hp_buff'].name).toBe('Increase HP');
    expect(db['sanhua_inherent_condensation']).toBeDefined();
    expect(db['nonexistent']).toBeUndefined();
  });
});
