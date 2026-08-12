// ═══════════════════════════════════════════════════════════════════════════════
// enemy.spec.ts — Tests del helper de enemigos (enemy.ts)
// ═══════════════════════════════════════════════════════════════════════════════
// Verifica que resolveEnemyStats produzca un EnemyStats compatible con el motor,
// escalando HP/ATK/DEF con los GrowthRates y conservando resistencias/damageTaken.
// Incluye la regresión del HP: a nivel alto el HP debe ser grande (~1M), NO el
// valor de nivel 1.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { resolveEnemyStats, enemyInfo } from './enemy';

// Enemigo de prueba equivalente a Bell-Borne Geochelone (con GrowthRates de
// muestra simplificados para 1, 50 y 100; los ratios son en base 10000).
// Se usa el valor REAL de la API: a Lv100 LifeMaxRatio=6487198, AtkRatio=335039,
// DefRatio=19900. Esto da HP@100 ≈ 1611 × 648.7198 ≈ 1,045,087 y DEF@100 = 1592.
const BELL = {
  metadata: { id: '340000020', name: 'Bell-Borne Geochelone', rarityClass: 'Calamity', icon: '340000020.webp', element: 'glacio' },
  stats: {
    level: 1, hp: 1611, atk: 120, defense: 800,
    elementalResistances: { glacio: 0.4, fusion: 0.1, electro: 0.1, aero: 0.1, havoc: 0.1, spectro: 0.1 },
    physicalResistance: 0.1, damageTaken: 1.0, damageReduction: 0,
    maxVibration: 200000, rageLimit: 161151,
  },
  growth: {
    '1': [10000, 5000, 10000],
    '50': [257408, 67808, 14900],
    '100': [6487198, 335039, 19900],
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

  it('a nivel 1 (base) conserva HP/DEF base al 100%', () => {
    const e = resolveEnemyStats(BELL, 1);
    expect(e.level).toBe(1);
    expect(e.hp).toBe(1611); // ratio 10000 → ×1.00
    expect(e.defense).toBe(800);
    expect(e.elementalResistances.glacio).toBeCloseTo(0.4, 5);
    expect(e.physicalResistance).toBe(0.1);
    expect(e.damageTaken).toBe(1.0);
  });

  it('REGRESIÓN: escala HP con el GrowthRate a nivel alto (~1M, no 1.6K)', () => {
    const e = resolveEnemyStats(BELL, 100);
    const expected = Math.round(1611 * 6487198 / 10000); // ≈ 1,045,087
    expect(e.hp).toBe(expected);
    expect(e.hp).toBeGreaterThan(100000); // el valor de Lv1 (1611) NO debe quedar
  });

  it('escala DEF con el GrowthRate (a Lv100 → 1592)', () => {
    const e = resolveEnemyStats(BELL, 100);
    expect(e.defense).toBe(Math.round(800 * 19900 / 10000)); // 1592
    expect(e.level).toBe(100);
  });

  it('clampa el nivel a ≥1 (usa base si nivel < 1)', () => {
    const e = resolveEnemyStats(BELL, 0);
    expect(e.level).toBe(1);
    expect(e.hp).toBe(1611);
    expect(e.defense).toBe(800);
  });

  it('produce un Object válido para el motor (todas las resistencias presentes)', () => {
    const e = resolveEnemyStats(BELL, 90);
    const keys = ['glacio', 'fusion', 'electro', 'aero', 'havoc', 'spectro'];
    for (const k of keys) expect(typeof (e.elementalResistances as any)[k]).toBe('number');
  });
});

describe('enemyInfo', () => {
  it('expone atk/escalado, maxVibration, rageLimit e icon', () => {
    const info = enemyInfo(BELL, 100);
    // ATK@100 = 120 × 335039/10000 ≈ 4020
    expect(info.atk).toBe(Math.round(120 * 335039 / 10000));
    expect(info.maxVibration).toBe(200000);
    expect(info.rageLimit).toBe(161151);
    expect(info.icon).toBe('340000020.webp');
  });
  it('a nivel 1 expone el atk escalado (ratio ATK Lv1 = 5000 → 120×0.5=60)', () => {
    const info = enemyInfo(BELL, 1);
    expect(info.atk).toBe(Math.round(120 * 5000 / 10000)); // 60
  });
  it('devuelve defaults si no hay definición', () => {
    const info = enemyInfo(null, 100);
    expect(info.atk).toBe(0);
    expect(info.icon).toBeNull();
  });
});
