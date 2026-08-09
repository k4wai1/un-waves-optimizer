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
  /** Amplificación global (Deepen All-Type, Outro de Verina, etc.). Categoría A_j. */
  dmgAmplify_: number;
  /** Bonos especiales multiplicativos (categoría P_k, extremadamente raros). */
  specialDmgMult_?: number;
  offTuneBuildupRate_: number;
  resonanceSkillDmgBonus_: number;
  basicAttackDmgBonus_: number;
  heavyAttackDmgBonus_: number;
  resonanceLiberationDmgBonus_: number;
  echoSkillDmgBonus_: number;
  coordinatedDmgBonus_: number;
  outroSkillDmgBonus_: number;

  // Deepen/Amplify por tipo de acción (A_j específico, ej. Mortefi Heavy DMG Deepen)
  basicAmplify_?: number;
  heavyAmplify_?: number;
  skillAmplify_?: number;
  liberationAmplify_?: number;
  coordinatedAmplify_?: number;

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
  /** Escudo +% (declarativo, v2.1). Opcional; escala el escudo. */
  shieldBonus_?: number;

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
  // Fórmula oficial: M_DEF = (800+8·Lc) / [(800+8·Lc) + (800+8·Le)·(1-δ)]
  // A niveles iguales (Lc=Le=100): 1600/(1600+1600) = 0.5 exacto.
  // defense = 800 + 8·level = 1600 (no 792, que daba M_DEF ≈ 0.669).
  defense: 1600,
  elementalResistances: {
    glacio: 0.10, fusion: 0.10, electro: 0.10,
    aero: 0.10, havoc: 0.10, spectro: 0.10,
  },
  physicalResistance: 0.10,
  damageTaken: 1.0,
};

// ─── Selección de `scaler` ──────────────────────────────────────────────

/** Devuelve el stat base del personaje que corresponde a un scaler. */
export function resolveScalerBase(context: CombatContext, scaler: string): number {
  switch (scaler) {
    case 'hp': return context.hp;
    case 'def': return context.def;
    case 'flat': return 0; // "flat": sin componente de stat; el valor va en `mv`
    case 'atk':
    default: return context.atk;
  }
}

/**
 * Suma el flat al componente escalado. Si `scaler === 'flat'`, el `mv` ES el
 * valor plano (formato legacy de las curas/shields, ej. stat:FLAT con mv:660);
 * en cualquier otro caso se suma como incremento al daño/cura/escudo escalado.
 */
function computeBaseAmount(context: CombatContext, mv: number, scaler: string, flat: number): number {
  if (scaler === 'flat') return mv + flat;
  return resolveScalerBase(context, scaler) * mv + flat;
}

// ─── Cálculo de daño ────────────────────────────────────────────────────

// Mapeo actionType → key del bonus aditivo (categoría B_i por tipo de acción)
const TYPE_BONUS_KEYS: Record<string, keyof CombatContext> = {
  basicAttack: 'basicAttackDmgBonus_',
  heavyAttack: 'heavyAttackDmgBonus_',
  resonanceSkill: 'resonanceSkillDmgBonus_',
  resonanceLiberation: 'resonanceLiberationDmgBonus_',
  echoSkill: 'echoSkillDmgBonus_',
  outroSkill: 'outroSkillDmgBonus_',
  coordinated: 'coordinatedDmgBonus_',
};

// Mapeo actionType → key del Deepen por tipo (categoría A_j específica)
const TYPE_AMPLIFY_KEYS: Record<string, keyof CombatContext> = {
  basicAttack: 'basicAmplify_',
  heavyAttack: 'heavyAmplify_',
  resonanceSkill: 'skillAmplify_',
  resonanceLiberation: 'liberationAmplify_',
  coordinated: 'coordinatedAmplify_',
};

/** Bonus aditivo por tipo de acción (B_i específico, ej. "Basic Attack DMG +10%"). */
function actionTypeBonus(context: CombatContext, actionType?: string): number {
  if (!actionType) return 0;
  const key = TYPE_BONUS_KEYS[actionType];
  if (!key) return 0;
  return (context[key] as number) || 0;
}

/** Deepen/Amplify por tipo de acción (A_j específico, ej. "Heavy DMG Deepen +38%"). */
function actionTypeAmplify(context: CombatContext, actionType?: string): number {
  if (!actionType) return 0;
  const key = TYPE_AMPLIFY_KEYS[actionType];
  if (!key) return 0;
  return (context[key] as number) || 0;
}

export function calculateDamage(
  context: CombatContext,
  mv: number,
  scaler: string = 'atk',
  element?: string, // "glacio" | "fusion" | "electro" | "aero" | "spectro" | "havoc" | "physical"
  flat: number = 0,
  actionType?: string, // "basicAttack" | "resonanceSkill" | ... | "coordinated"
) {
  // 1. Base Damage (incremento flat, ej. "X% ATK + Y"; para scaler 'flat', mv es el valor plano)
  const baseDmg = computeBaseAmount(context, mv, scaler, flat);

  // 2. Bonus & Amplify Multiplier (fórmula oficial: (1+ΣB_i) × (1+ΣA_j) × (1+ΣP_k))
  let elementalBonus = 0;
  if (element) {
    const key = `${element}DmgBonus_` as keyof CombatContext;
    elementalBonus = (context[key] as number) || 0;
  }
  // B_i = allDmgBonus + elemental + bonus por tipo de acción
  const totalDmgBonus = (context.allDmgBonus_ || 0) + elementalBonus + actionTypeBonus(context, actionType);
  // A_j = dmgAmplify global + Deepen por tipo de acción
  const totalAmplify = (context.dmgAmplify_ || 0) + actionTypeAmplify(context, actionType);
  // P_k = bonos especiales (raro, multiplicativo)
  const specialMult = (context.specialDmgMult_ || 0);
  const bonusMult = (1 + totalDmgBonus) * (1 + totalAmplify) * (1 + specialMult);

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

// ─── Cálculo de curación ─────────────────────────────────────────────────
//
// Fórmula de curado de WuWa:
//   amount = flat + stat * mv
//   healed = amount * (1 + healingBonus_)
// La curación NO se ve afectada por DEF/resistencia/daño recibido del enemigo
// ni por el multiplicador de crítico. Solo la incrementa healingBonus_.
export function calculateHealing(
  context: CombatContext,
  mv: number,
  scaler: string = 'atk',
  flat: number = 0,
): number {
  const amount = computeBaseAmount(context, mv, scaler, flat);
  const healing = amount * (1 + (context.healingBonus_ || 0));
  return Math.round(healing);
}

// ─── Cálculo de escudo ───────────────────────────────────────────────────
//
// Escudo de WuWa:
//   shield = flat + stat * mv
// Se escala por shieldBonus_ si existiera (declarativo, v2.1).
// No depende de DEF/resistencia/crítico ni de healingBonus_.
export function calculateShield(
  context: CombatContext,
  mv: number,
  scaler: string = 'atk',
  flat: number = 0,
): number {
  const shield = computeBaseAmount(context, mv, scaler, flat);
  return Math.round(shield * (1 + (context.shieldBonus_ || 0)));
}
