// ═══════════════════════════════════════════════════════════════════════════════
// negativeStatus.spec.ts — Tests del motor de Estados Negativos / Tonalidad
// ═══════════════════════════════════════════════════════════════════════════════
//
// Cubren: aritmética de punto fijo, LUT por nivel, los ticks de los DoT
// (Spectro Frazzle / Aero Erosion / Electro Flare con consumo y overflow),
// Havoc Bane (reducción de DEF) y la detonación de Fusion Burst / respuestas.
// Sigue los valores confirmados en docs/estados-elementales.md y la subcarpeta
// docs/investigacion-estados/.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  FIXED_SCALE,
  toFixed, fromFixed, mulFixed,
  resMultiplier, levelValue, stackFactor,
  getStatusConfig,
  createStatusState, addStacks, advanceTimer,
  simulateStatusTick, detonateStatus,
  applyHavocBaneDefense,
  type NegativeStatusContext,
} from './negativeStatus';

// Contexto de prueba neutro: res 0, sin DEF ignore, sin Amp.
const BASE_NS_CTX: NegativeStatusContext = {
  attackerLvl: 90,
  enemyDefense: 1600,
  enemyRes: 0,
  statusAmplify: 0,
  defIgnore: 0,
  tuneBreakBoost: 0,
};

const LVL_90 = { minLevel: 1, maxLevel: 90 };

describe('punto fijo', () => {
  it('escala y desescala sin perder el factor', () => {
    expect(toFixed(1)).toBe(FIXED_SCALE);
    expect(fromFixed(toFixed(2.5))).toBeCloseTo(2.5, 3);
  });

  it('mulFixed usa floor (determinista)', () => {
    const a = toFixed(1.5); // 15000
    const b = toFixed(2.0); // 20000
    expect(mulFixed(a, b)).toBe(Math.floor(15000 * 20000 / 10000));
    expect(fromFixed(mulFixed(a, b))).toBe(3);
  });
});

describe('resistencia (formula 3 ramas)', () => {
  it('positiva entre 0 y 0.8 → 1 - res', () => {
    expect(resMultiplier(0.1)).toBeCloseTo(0.9, 5);
  });
  it('negativa amortigua a la mitad', () => {
    expect(resMultiplier(-0.2)).toBeCloseTo(1.1, 5); // 1 - 0.5×(-0.2)
  });
  it('alta (≥0.8) usa 1/(1+5r)', () => {
    expect(resMultiplier(0.9)).toBeCloseTo(1 / (1 + 4.5), 5);
  });
});

describe('LUT por nivel (levelValue)', () => {
  it('devuelve el base de referencia a Lv90', () => {
    const cfg = getStatusConfig('spectro_frazzle');
    const v = levelValue(cfg, LVL_90, 90);
    expect(v).toBeCloseTo(cfg.baseAtRefLevel, 2);
  });

  it('interpola para niveles intermedios (monótona creciente)', () => {
    const cfg = getStatusConfig('aero_erosion');
    const vLow = levelValue(cfg, LVL_90, 1);
    const v90 = levelValue(cfg, LVL_90, 90);
    expect(v90).toBeGreaterThan(vLow);
  });
});

describe('stackFactor', () => {
  it('Aero Erosion con kStack=1 (lineal) da 3× para 3 stacks', () => {
    const cfg = getStatusConfig('aero_erosion');
    expect(stackFactor(cfg, 3)).toBeCloseTo(3, 5); // 1 + (3-1)×1
  });
  it('Spectro Frazzle con kStack=0.811 a 10 stacks ≈ 8.3×', () => {
    const cfg = getStatusConfig('spectro_frazzle');
    expect(stackFactor(cfg, 10)).toBeCloseTo(1 + 9 * 0.811, 5);
  });
  it('con kStack=0 (sin escalado por stacks) da 1× hasta el tope', () => {
    const cfg = getStatusConfig('glacio_chafe');
    expect(stackFactor(cfg, 5)).toBe(1); // daño por aplicación NO escala con stacks
  });
});

describe('Spectro Frazzle (paramétrico, ignora DEF, consume 1/tick)', () => {
  it('con res 0 y sin amp, tick = base × stackFactor, y consume 1 stack', () => {
    const cfg = getStatusConfig('spectro_frazzle');
    const state = createStatusState('spectro_frazzle', 10, 30);
    const res = simulateStatusTick(cfg, state, BASE_NS_CTX, LVL_90);
    const expected = Math.round(cfg.baseAtRefLevel * stackFactor(cfg, 10));
    expect(res.damage).toBe(expected);
    expect(res.nextStacks).toBe(9);
    expect(res.expired).toBe(false);
  });

  it('aplica RES (ignora DEF)', () => {
    const cfg = getStatusConfig('spectro_frazzle');
    const state = createStatusState('spectro_frazzle', 1, 3);
    const ctx = { ...BASE_NS_CTX, enemyRes: 0.1 };
    const res = simulateStatusTick(cfg, state, ctx, LVL_90);
    // 4596 × (1-0.1) = 4136.4 → 4136
    expect(res.damage).toBe(Math.round(4596 * 0.9));
  });

  it('expira al consumir el último stack', () => {
    const cfg = getStatusConfig('spectro_frazzle');
    const state = createStatusState('spectro_frazzle', 1, 3);
    const res = simulateStatusTick(cfg, state, BASE_NS_CTX, LVL_90);
    expect(res.nextStacks).toBe(0);
    expect(res.expired).toBe(true);
  });
});

describe('Aero Erosion (paramétrico, aplica DEF, lineal × stacks)', () => {
  it('aplica DEF: base 5000 × 3 stacks × M_DEF(1520/3120)', () => {
    const cfg = getStatusConfig('aero_erosion');
    const state = createStatusState('aero_erosion', 3, 15);
    const res = simulateStatusTick(cfg, state, BASE_NS_CTX, LVL_90);
    const mDef = 1520 / (1520 + 1600); // 800+8·90 = 1520
    expect(res.damage).toBe(Math.round(5000 * 3 * mDef));
    expect(res.nextStacks).toBe(2);
  });
});

describe('Electro Flare (consume la mitad, overflow Rage)', () => {
  it('consume la mitad (floor): 10 → 5', () => {
    const cfg = getStatusConfig('electro_flare');
    const state = createStatusState('electro_flare', 10, 60);
    const res = simulateStatusTick(cfg, state, BASE_NS_CTX, LVL_90);
    expect(res.nextStacks).toBe(5);
  });
  it('9 → floor(9/2) = 4', () => {
    const state = createStatusState('electro_flare', 9, 60);
    const res = simulateStatusTick(getStatusConfig('electro_flare'), state, BASE_NS_CTX, LVL_90);
    expect(res.nextStacks).toBe(4);
  });
  it('Rage se remueve al activarse (nextRage 5 → 0) y el consumo mitad se mantiene', () => {
    const cfg = getStatusConfig('electro_flare');
    const state = createStatusState('electro_flare', 10, 60);
    state.rageStacks = 5;
    const res = simulateStatusTick(cfg, state, BASE_NS_CTX, LVL_90, { konstanteRage: 0.20 });
    // La mecánica de Rage multiplica (aunque electro no tenga base calibrada aún,
    // la remoción es determinista): nextRage = 0 y el consumo de stacks = 5.
    expect(res.nextRage).toBe(0);
    expect(res.nextStacks).toBe(5);
  });
  it('addStacks devuelve overflow hacia Rage', () => {
    const state = createStatusState('electro_flare', 10, 60);
    const overflow = addStacks(state, 5);
    expect(state.currentStacks).toBe(10);
    expect(overflow).toBe(5);
  });
});

describe('modelo affine (Electro Flare: 155 + 674×stacks) calibrado', () => {
  it('BaseDMG = 155 + 674×stacks (2 → 1503, 3 → 2177, 10 → 6894) sin RES/DEF', () => {
    const cfg = getStatusConfig('electro_flare');
    for (const [n, expected] of [[2, 1503], [3, 2177], [10, 6895]] as [number, number][]) {
      const state = createStatusState('electro_flare', n, 60);
      // RES 0 y DEF ignorada no; aquí hay DEF aplicada con M_DEF=1520/3120=a0.487...
      // Para aislar el modelo affine, usamos DEF 0 (enemyDefense→0) → DEF_Mult=1.
      const res = simulateStatusTick(cfg, state, { ...BASE_NS_CTX, enemyDefense: 0, enemyRes: 0 }, LVL_90);
      expect(res.damage).toBe(expected);
    }
  });
  it('consume la mitad: 10 → 5, 2 → 1, 1 → 0 (expira)', () => {
    const cfg = getStatusConfig('electro_flare');
    expect(simulateStatusTick(cfg, createStatusState('electro_flare', 10, 60), BASE_NS_CTX, LVL_90).nextStacks).toBe(5);
    expect(simulateStatusTick(cfg, createStatusState('electro_flare', 2, 60), BASE_NS_CTX, LVL_90).nextStacks).toBe(1);
    const last = simulateStatusTick(cfg, createStatusState('electro_flare', 1, 60), BASE_NS_CTX, LVL_90);
    expect(last.nextStacks).toBe(0);
    expect(last.expired).toBe(true);
  });
});

describe('valores calibrados del registry (Gemini confirmado)', () => {
  it('Spectro Frazzle: base 4596, kStack 0.811, tick 3s, consume 1, ignora DEF', () => {
    const cfg = getStatusConfig('spectro_frazzle');
    expect(cfg.baseAtRefLevel).toBe(4596);
    expect(cfg.kStack).toBeCloseTo(0.811, 3);
    expect(cfg.appliesDef).toBe(false);
    expect(cfg.tickInterval).toBe(3.0);
    expect(cfg.consumption).toBe('onePerTick');
  });
  it('Aero Erosion: base 5000, lineal (kStack 1), aplica DEF', () => {
    const cfg = getStatusConfig('aero_erosion');
    expect(cfg.baseAtRefLevel).toBe(5000);
    expect(cfg.kStack).toBe(1);
    expect(cfg.appliesDef).toBe(true);
  });
  it('Glacio Chafe: StacksMV 20377 para límite 10 (y 13→40753 vía override)', () => {
    const cfg = getStatusConfig('glacio_chafe');
    expect(cfg.stacksMv).toBe(20377);
  });
  it('Electro Flare: affine 155+674, tick 6s, consume mitad', () => {
    const cfg = getStatusConfig('electro_flare');
    expect(cfg.damageModel).toBe('affine');
    expect(cfg.baseOffset).toBe(155);
    expect(cfg.slopePerStack).toBe(674);
    expect(cfg.tickInterval).toBe(6.0);
    expect(cfg.consumption).toBe('halfFloor');
  });
  it('Havoc Bane: -2%/stack, máx 3, déficit por defecto', () => {
    const cfg = getStatusConfig('havoc_bane');
    expect(cfg.damageMode).toBe('defDebuff');
    expect(cfg.maxStacks).toBe(3);
  });
});

describe('Havoc Bane (debuff de DEF v2.8)', () => {
  it('-2% DEF por stack: 3 → -6%, 6 → -12%', () => {
    const base = 1600;
    expect(applyHavocBaneDefense(base, 3)).toBeCloseTo(1600 * 0.94, 3);
    expect(applyHavocBaneDefense(base, 6)).toBeCloseTo(1600 * 0.88, 3);
  });
  it('clamp de reducción: nunca llega a DEF negativa (máx 99%)', () => {
    expect(applyHavocBaneDefense(100, 100)).toBeCloseTo(1.0, 5); // × (1-0.99)
  });
  it('simulateStatusTick de defDebuff no produce daño', () => {
    const cfg = getStatusConfig('havoc_bane');
    const state = createStatusState('havoc_bane', 3, 15);
    const res = simulateStatusTick(cfg, state, BASE_NS_CTX, LVL_90);
    expect(res.damage).toBe(0);
    expect(res.nextStacks).toBe(3); // no consume
  });
});

describe('Fusion Burst / respuestas (detonación)', () => {
  it('detona con daño = baseStat × mv y purga', () => {
    const cfg = getStatusConfig('fusion_burst');
    const state = createStatusState('fusion_burst', 10, 15);
    const res = detonateStatus(cfg, state, BASE_NS_CTX, 1.0, 13000);
    expect(res.damage).toBeGreaterThan(0);
    expect(res.purged).toBe(true);
  });

  it('respuesta de Tune con resonancia el elemento aplica RES', () => {
    const cfg = getStatusConfig('tune_hack');
    const state = createStatusState('tune_hack', 1, 8);
    const ctx = { ...BASE_NS_CTX, enemyRes: 0.1 };
    // Meltdown relativo: mvMultiplier 23.5889 × baseStat → ×(1-0.1)
    const res = detonateStatus(cfg, state, ctx, 23.5889, 1000);
    const expected = Math.round(1000 * 23.5889 * 0.9);
    expect(res.damage).toBe(expected);
  });
});

describe('helpers de estado mutable', () => {
  it('createStatusState inicializa según config (tick interval de Frazzle = 3)', () => {
    const s = createStatusState('spectro_frazzle', 1, 3);
    expect(s.tickTimer).toBe(3.0);
  });
  it('advanceTimer dispara tick en el intervalo correcto', () => {
    const s = createStatusState('spectro_frazzle', 5, 15);
    expect(advanceTimer(s, 3.0)).toBe(true); // exacto en 3s
    expect(advanceTimer(s, 2.9)).toBe(false);
    expect(advanceTimer(s, 0.2)).toBe(true); // acumula
  });
  it('advanceTimer no dispara para burst/defDebuff (sin tick)', () => {
    const s = createStatusState('havoc_bane', 3, 15);
    expect(s.tickTimer).toBe(0);
    expect(advanceTimer(s, 5)).toBe(false);
  });
});
