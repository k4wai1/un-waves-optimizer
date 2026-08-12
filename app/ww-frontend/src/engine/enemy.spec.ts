// ═══════════════════════════════════════════════════════════════════════════════
// enemy.spec.ts — Tests del helper de enemigos (enemy.ts)
// ═══════════════════════════════════════════════════════════════════════════════
// Verifica que resolveEnemyStats produzca un EnemyStats compatible con el motor,
// escalando la DEF con el nivel objetivo y conservando resistencias/damageTaken.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { resolveEnemyStats, enemyInfo } from './enemy';

// Enemigo de prueba equivalente a un Calamity (Bell-Borne Geochelone simplificado).
const BELL = {
  metadata: { id: '340000020', name: 'Bell-Borne Geochelone', rarityClass: 'Calamity', icon: '340000020.webp', element: 'glacio' },
  stats: {
    level: 1, hp: 1611, atk: 120, defense: 800,
    elementalResistances: { glacio: 0.4, fusion: 0.1, electro: 0.1, aero: 0.1, havoc: 0.1, spectro: 0.1 },
    physicalResistance: 0.1, damageTaken: 1.0, damageReduction: 0,
    maxVibration: 200000, rageLimit: 161151,
  },
};

describe('resolveEnemyStats', () => {
  it('sin definición devuelve el DEFAULT_ENEMY (dummy)', () => {
    const e = resolveEnemyStats(null, 100);
    expect(e.level).toBe(100);
    expect(e.defense).toBe(1600); // dummy base
    expect(e.damageTaken).toBe(1.0);
    expect(e.damageReduction).toBe(0);
  });

  it('dict con stats: conserva resistencias y damageTaken', () => {
    const e = resolveEnemyStats(BELL, 1);
    expect(e.level).toBe(1);
    expect(e.elementalResistances.glacio).toBeCloseTo(0.4, 5);
    expect(e.elementalResistances.spectro).toBeCloseTo(0.1, 5);
    expect(e.physicalResistance).toBe(0.1);
    expect(e.damageTaken).toBe(1.0);
  });

  it('escala la DEF linealmente con el nivel (8 por nivel desde la base)', () => {
    // base 800 a nivel 1 → a nivel 100: 800 + 8×99 = 1592
    const e = resolveEnemyStats(BELL, 100);
    expect(e.defense).toBe(800 + 8 * 99);
    expect(e.level).toBe(100);
  });

  it('clampa el nivel a ≥1', () => {
    const e = resolveEnemyStats(BELL, 0);
    expect(e.level).toBe(1);
    expect(e.defense).toBe(800);
  });

  it('produce un Object válido para el motor (todas las resistencias presentes)', () => {
    const e = resolveEnemyStats(BELL, 90);
    const keys = ['glacio', 'fusion', 'electro', 'aero', 'havoc', 'spectro'];
    for (const k of keys) expect(typeof (e.elementalResistances as any)[k]).toBe('number');
  });
});

describe('enemyInfo', () => {
  it('expone atk, maxVibration, rageLimit e icon', () => {
    const info = enemyInfo(BELL);
    expect(info.atk).toBe(120);
    expect(info.maxVibration).toBe(200000);
    expect(info.rageLimit).toBe(161151);
    expect(info.icon).toBe('340000020.webp');
  });
  it('devuelve defaults si no hay definición', () => {
    const info = enemyInfo(null);
    expect(info.atk).toBe(0);
    expect(info.icon).toBeNull();
  });
});
