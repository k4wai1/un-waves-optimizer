import data from './EmeraldOfGenesis.json';

export const EmeraldOfGenesisStats = data;

export function getWeaponStat(stat: 'atk' | 'critRate_', level: number): number {
  const stats = EmeraldOfGenesisStats.baseStats[stat];
  const levels = Object.keys(stats).map(Number).sort((a, b) => a - b);
  
  const upper = levels.find(l => l >= level) || 90;
  const lower = levels.reverse().find(l => l <= level) || 1;
  
  const valUpper = stats[upper.toString()];
  const valLower = stats[lower.toString()];
  
  if (upper === lower) return valUpper;
  return valLower + (valUpper - valLower) * ((level - lower) / (upper - lower));
}

export function getPassiveValue(stat: 'energyRegen_' | 'atk_', refinement: number) {
  // Refinamiento 1-5, convertimos a índice 0-4
  return EmeraldOfGenesisStats.passive[stat][refinement - 1];
}
