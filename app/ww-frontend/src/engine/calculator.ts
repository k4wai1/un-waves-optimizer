// ═══════════════════════════════════════════════════════════════════════════════
// calculator.ts — Motor de daño con soporte de enemigos
// ═══════════════════════════════════════════════════════════════════════════════
//
// El enemigo es una entidad de primera clase. Tiene nivel, DEF, resistencias
// elementales y un multiplicador de daño recibido (damageTaken).
//
// El motor NO simula rotaciones. El usuario activa manualmente los buffs
// y debuffs. El motor solo combina: Character + Weapon + Effects + Enemy = Damage.
//
// ═══════════════════════════════════════════════════════════════════════════════

/** Stats del enemigo */
export interface EnemyStats {
  level: number;
  hp: number;
  defense: number;
  elementalResistances: {
    glacio: number;
    fusion: number;
    electro: number;
    aero: number;
    havoc: number;
    spectro: number;
  };
  physicalResistance: number;
  /** Multiplicador de daño recibido. 1.0 = normal. 1.15 = +15%. 0.50 = -50%. */
  damageTaken: number;
}

export interface CombatContext {
  // Stats base del personaje
  hp: number;
  atk: number;
  def: number;

  // Stats especiales
  tuneBreakBoost: number;
  maxSTA: number;
  maxFlightSTA: number;

  // Stats de combate core
  critRate_: number;
  critDmg_: number;
  energyRegen_: number;

  // Bonus de daño
  allDmgBonus_: number;
  dmgAmplify_: number;
  offTuneBuildupRate_: number;
  resonanceSkillDmgBonus_: number;
  basicAttackDmgBonus_: number;
  heavyAttackDmgBonus_: number;
  resonanceLiberationDmgBonus_: number;
  echoSkillDmgBonus_: number;
  coordinatedDmgBonus_: number;
  outroSkillDmgBonus_: number;

  // Bonus de daño elemental
  physicalDmgBonus_: number;
  glacioDmgBonus_: number;
  fusionDmgBonus_: number;
  electroDmgBonus_: number;
  aeroDmgBonus_: number;
  spectroDmgBonus_: number;
  havocDmgBonus_: number;

  // Otros
  healingBonus_: number;

  // Datos del personaje para fórmula
  attackerLvl: number;

  // ─── Enemigo ──────────────────────────────────────────────────────────
  // El enemigo contra el que se calcula el daño.
  // Si no se selecciona uno, se usa EnemyBase (DEF 792, res 10%).
  enemy: EnemyStats;

  // Ignorar defensa (debuffs)
  defIgnore_: number;
}

// ─── Enemigo por defecto ────────────────────────────────────────────────

export const DEFAULT_ENEMY: EnemyStats = {
  level: 100,
  hp: 100000,
  defense: 792,
  elementalResistances: {
    glacio: 0.10, fusion: 0.10, electro: 0.10,
    aero: 0.10, havoc: 0.10, spectro: 0.10,
  },
  physicalResistance: 0.10,
  damageTaken: 1.0,
};

// ─── Cálculo de daño ────────────────────────────────────────────────────

export function calculateDamage(
  context: CombatContext,
  mv: number,
  scaler: string = 'atk',
  element?: string  // "glacio" | "fusion" | "electro" | "aero" | "spectro" | "havoc" | "physical"
) {
  // Seleccionar el scaler correcto
  let baseValue = context.atk;
  if (scaler === 'hp') baseValue = context.hp;
  else if (scaler === 'def') baseValue = context.def;

  // 1. Base Damage
  const baseDmg = baseValue * mv;

  // 2. Bonus & Amplify Multiplier
  let elementalBonus = 0;
  if (element) {
    const key = `${element}DmgBonus_` as keyof CombatContext;
    elementalBonus = (context[key] as number) || 0;
  }
  const totalDmgBonus = context.allDmgBonus_ + elementalBonus;
  const bonusMult = (1 + totalDmgBonus) * (1 + context.dmgAmplify_);

  // 3. Defense Multiplier (Fórmula oficial de WuWa)
  const enemy = context.enemy || DEFAULT_ENEMY;
  const defNum = 800 + (8 * context.attackerLvl);
  const defY = enemy.defense * (1 - context.defIgnore_);
  const defMultiplier = defMultiplierFn(defNum, defY);

  // 4. Resistance Multiplier
  const enemyRes = getEnemyResistance(enemy, element);
  const resMultiplier = resistanceMultiplierFn(enemyRes);

  // 5. Damage Taken Multiplier (vulnerabilidad, reducción de daño)
  const damageTakenMult = enemy.damageTaken || 1.0;

  // 6. Salida Final
  const preCrit = baseDmg * bonusMult * defMultiplier * resMultiplier * damageTakenMult;
  const nonCrit = Math.round(preCrit);
  const crit = Math.round(preCrit * context.critDmg_);
  const average = nonCrit + (nonCrit * context.critRate_ * (context.critDmg_ - 1));

  return { normal: nonCrit, average: Math.round(average), crit };
}

// ─── Funciones auxiliares ───────────────────────────────────────────────

/** Obtiene la resistencia del enemigo para un elemento dado */
export function getEnemyResistance(enemy: EnemyStats, element?: string): number {
  if (!enemy) return 0.10;
  if (!element || element === 'physical') return enemy.physicalResistance ?? 0.10;
  const res = enemy.elementalResistances[element as keyof typeof enemy.elementalResistances];
  return res ?? 0.10;
}

/** Fórmula de defensa de WuWa */
export function defMultiplierFn(atkStat: number, enemyDef: number): number {
  return atkStat / (atkStat + Math.max(0, enemyDef));
}

/** Fórmula de resistencia de WuWa */
export function resistanceMultiplierFn(resistance: number): number {
  if (resistance >= 0.8) return 1 / (1 + 5 * resistance);
  if (resistance >= 0) return 1 - resistance;
  return 1 - (0.5 * resistance); // resistencia negativa = más daño
}
