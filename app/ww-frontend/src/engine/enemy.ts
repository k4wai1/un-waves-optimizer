// ═══════════════════════════════════════════════════════════════════════════════
// enemy.ts — Helper para convertir un enemigo declarativo (JSON5) en EnemyStats
// ═══════════════════════════════════════════════════════════════════════════════
//
// Los enemigos se definen en `libs/ww/stats/src/enemies/*.json5` con `stats.level`,
// `stats.hp`, `stats.atk`, `stats.defense`, `stats.elementalResistances` (decimal),
// `stats.physicalResistance`, `stats.damageTaken`, `stats.damageReduction`,
// y una tabla opcional `growth` con los GrowthRates (LifeMax/Atk/Def ratios en base
// 10000) por nivel 1-120 scrapeados de encore.moe.
//
// `resolveEnemyStats` escala las stats (HP/ATK/DEF) desde el nivel base hasta el
// nivel objetivo usando los GrowthRates, y produce el `EnemyStats` (HP + DEF + RES)
// que consume el motor (`calculateDamage`).
//
// Escalado con GrowthRates (fórmula del juego):
//   valor@nv = baseValor × growth[nv].ratio / 10000
//   (el ratio a nivel base `level` es 10000 → coincide con baseValor).
// Si no hay tabla `growth`, se usa una interpolación lineal de DEF (8×Lv) y HP/ATK
// quedan como informativos a su valor base (solo para entidades sin datos de encore).
// ═══════════════════════════════════════════════════════════════════════════════

import { DEFAULT_ENEMY, type EnemyStats } from './calculator';

/** Forma declarativa de un enemigo en JSON5. */
export interface EnemyDefinition {
  metadata?: {
    id?: string;
    name?: string;
    rarityClass?: string;
    element?: string | null;
    icon?: string;
    tags?: string[];
  };
  stats?: {
    level?: number;           // nivel base de las stats declaradas
    hp?: number;
    atk?: number;
    defense?: number;         // DEF base a `level`
    elementalResistances?: Partial<EnemyStats['elementalResistances']>;
    physicalResistance?: number;
    damageTaken?: number;
    damageReduction?: number;
    maxVibration?: number;
    rageLimit?: number;
  };
  /**
   * Tabla de GrowthRates por nivel 1-120: `{ "1": [hp, atk, def], ... }` donde cada
   * valor es el ratio en base 10000 (10000 = ×1.00). hp/atk/def según el orden.
   * Scrapeada de encore.moe (`GrowthRates` → `LifeMaxRatio/AtkRatio/DefRatio`).
   */
  growth?: Record<string, [number, number, number]>;
}

/** Obtiene los ratios de crecimiento (hp, atk, def) en base 10000 para un nivel. */
function growthAt(
  def: EnemyDefinition | null | undefined,
  level: number,
  baseLevel: number,
): { hp: number; atk: number; def: number } {
  const key = String(Math.max(1, level));
  const g = def?.growth?.[key];
  if (g) return { hp: g[0], atk: g[1], def: g[2] };
  // Sin tabla: DEF lineal (base + 8×delta), HP/ATK al valor base (informativos).
  const stats = def?.stats;
  const delta = Math.max(0, level - baseLevel);
  const baseDef = stats?.defense ?? 800;
  return {
    hp: 10000,
    atk: 10000,
    // ratio equivalente para DEF lineal: base + 8×delta
    def: Math.round((baseDef + 8 * delta) / Math.max(1, baseDef) * 10000),
  };
}

/**
 * Produce el `EnemyStats` del motor a partir de la definición del enemigo y el
 * nivel objetivo, escalando HP y DEF con los GrowthRates. Las resistencias,
 * damageTaken y damageReduction no cambian con el nivel (se conservan tal cual).
 * El HP a nivel alto (ej. ~1M a Lv100) se preserva sin truncar.
 *
 * Si no se pasa definición, devuelve el DEFAULT_ENEMY (training dummy).
 */
export function resolveEnemyStats(
  def: EnemyDefinition | null | undefined,
  targetLevel: number,
): EnemyStats {
  if (!def?.stats) return { ...DEFAULT_ENEMY };

  const s = def.stats;
  const baseLevel = s.level ?? 1;
  const target = Math.max(1, targetLevel);
  const g = growthAt(def, target, baseLevel);

  const baseHp = s.hp ?? DEFAULT_ENEMY.hp;
  const baseDef = s.defense ?? DEFAULT_ENEMY.defense;

  const enemy: EnemyStats = {
    level: target,
    hp: Math.round(baseHp * g.hp / 10000),
    defense: Math.round(baseDef * g.def / 10000),
    elementalResistances: Object.assign(
      { glacio: 0.10, fusion: 0.10, electro: 0.10, aero: 0.10, havoc: 0.10, spectro: 0.10 },
      s.elementalResistances || {},
    ),
    physicalResistance: s.physicalResistance ?? DEFAULT_ENEMY.physicalResistance,
    damageTaken: s.damageTaken ?? 1.0,
    damageReduction: s.damageReduction ?? 0,
  };

  return enemy;
}

/** Expone los campos extra del enemigo (ATK escalado, Vibration, Rage) para la UI. */
export function enemyInfo(
  def: EnemyDefinition | null | undefined,
  targetLevel: number,
): {
  atk: number;
  maxVibration: number | null;
  rageLimit: number | null;
  icon: string | null;
} {
  const s = def?.stats;
  let atk = s?.atk ?? 0;
  if (s?.atk && def) {
    const baseLevel = s.level ?? 1;
    const g = growthAt(def, Math.max(1, targetLevel), baseLevel);
    atk = Math.round(s.atk * g.atk / 10000);
  }
  return {
    atk,
    maxVibration: s?.maxVibration ?? null,
    rageLimit: s?.rageLimit ?? null,
    icon: def?.metadata?.icon ?? null,
  };
}
