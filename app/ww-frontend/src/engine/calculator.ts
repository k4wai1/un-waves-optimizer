// Motor matemático que replica las variables del AST de Pando
export interface CombatContext {
  // Stats base
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
  
  // Bonus de daño elemental
  physicalDmgBonus_: number;
  glacioDmgBonus_: number;
  fusionDmgBonus_: number;
  electroDmgBonus_: number;
  aeroDmgBonus_: number;
  spectroDmgBonus_: number;
  havocDmgBonus_: number;
  
  // Resistencias
  physicalRes_: number;
  glacioRes_: number;
  fusionRes_: number;
  electroRes_: number;
  aeroRes_: number;
  spectroRes_: number;
  havocRes_: number;
  
  // Otros
  healingBonus_: number;
  
  // Para el cálculo de daño
  attackerLvl: number;
  enemyDef: number;
  defIgnore_: number;
  resTotal: number;
}

export function calculateDamage(context: CombatContext, mv: number, scaler: string = 'atk') {
  // Seleccionar el scaler correcto
  let baseValue = context.atk;
  if (scaler === 'hp') baseValue = context.hp;
  else if (scaler === 'def') baseValue = context.def;
  
  // 1. Base Damage
  const baseDmg = baseValue * mv;
  
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
