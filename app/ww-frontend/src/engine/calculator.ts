// Motor matemático que replica las variables del AST de Pando
export interface CombatContext {
  atk: number;
  allDmgBonus_: number;
  dmgAmplify_: number;
  critRate_: number;
  critDmg_: number;
  attackerLvl: number;
  enemyDef: number;
  defIgnore_: number;
  resTotal: number;
}

export function calculateDamage(context: CombatContext, mv: number) {
  // 1. Base Damage
  const baseDmg = context.atk * mv;
  
  // 2. Bonus & Amplify Multiplier
  const bonusMult = (1 + context.allDmgBonus_) * (1 + context.dmgAmplify_);
  
  // 3. Defense Multiplier (Fórmula oficial de WuWa)
  const defNum = 800 + (8 * context.attackerLvl);
  const defY = context.enemyDef * (1 - context.defIgnore_);
  const defMultiplier = defNum / (defNum + defY);
  
  // 4. Resistance Multiplier
  let resMultiplier = 1;
  if (context.resTotal >= 0.8) {
    resMultiplier = 1 / (1 + 5 * context.resTotal);
  } else if (context.resTotal >= 0) {
    resMultiplier = 1 - context.resTotal;
  } else {
    resMultiplier = 1 - (0.5 * context.resTotal);
  }
  
  // 5. Salida Final
  const nonCrit = baseDmg * bonusMult * defMultiplier * resMultiplier;
  const crit = nonCrit * context.critDmg_;
  const average = nonCrit + (nonCrit * context.critRate_ * (context.critDmg_ - 1));
  
  return {
    normal: Math.round(nonCrit),
    average: Math.round(average),
    crit: Math.round(crit)
  };
}
