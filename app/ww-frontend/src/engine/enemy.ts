// ═══════════════════════════════════════════════════════════════════════════════
// enemy.ts — Helper para convertir un enemigo declarativo (JSON5) en EnemyStats
// ═══════════════════════════════════════════════════════════════════════════════
//
// Los enemigos se definen en `libs/ww/stats/src/enemies/*.json5` con `stats.level`,
// `stats.hp`, `stats.atk`, `stats.defense`, `stats.elementalResistances` (decimal),
// `stats.physicalResistance`, `stats.damageTaken`, `stats.damageReduction`.
//
// `resolveEnemyStats` escala las stats de combate (HP/ATK/DEF) desde el nivel base
// declarado en el JSON5 hasta el nivel objetivo elegido en la UI, y produce el
// `EnemyStats` que consume el motor (`calculateDamage`).
//
// Escalado de DEF (fórmula del juego): DEF_enemigo = 8×Lv + 792 (Lv1 → 800).
// Es lineal en el nivel con pendiente 8, por lo que:
//   DEF(nivel) = baseDef + 8 × (nivel - baseLevel)
//
// Escalado de HP/ATK: se usa el GrowthRate del juego (por ratio). Como la API de
// encore no expuso GrowthRates en el scrape actual, interpolamos de forma simple
// con el ratio base (HP/ATK son informativos; el daño NO depende del HP/ATK enemigo).
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
}

/**
 * Produce el `EnemyStats` del motor a partir de la definición del enemigo y el
 * nivel objetivo. Si el nivel objetivo difiere del nivel base declarado, escala
 * la DEF y el HP (alineando con la fórmula 8×Lv+792). Las resistencias, damageTaken
 * y damageReduction no cambian con el nivel (se conservan tal cual).
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
  const baseDef = s.defense ?? 800;
  const target = Math.max(1, targetLevel);

  // DEF escala lineal con el nivel: 8 por nivel desde el base.
  const defense = baseDef + 8 * (target - baseLevel);

  const enemy: EnemyStats = {
    level: target,
    hp: s.hp ?? DEFAULT_ENEMY.hp,
    defense,
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

/** Expone los campos extra del enemigo (ATK, Vibration, Rage) para la UI. */
export function enemyInfo(def: EnemyDefinition | null | undefined): {
  atk: number;
  maxVibration: number | null;
  rageLimit: number | null;
  icon: string | null;
} {
  const s = def?.stats;
  return {
    atk: s?.atk ?? 0,
    maxVibration: s?.maxVibration ?? null,
    rageLimit: s?.rageLimit ?? null,
    icon: def?.metadata?.icon ?? null,
  };
}
