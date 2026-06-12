import data from './EmeraldOfGenesis.json';

export const EmeraldOfGenesisStats = data;

// Función de interpolación matemática pura
function interpolate(stats: Record<string, number>, level: number): number {
  const levels = Object.keys(stats).map(Number).sort((a, b) => a - b);
  const upper = levels.find(l => l >= level) || 90;
  const lower = levels.reverse().find(l => l <= level) || 1;
  
  const valUpper = stats[upper.toString()];
  const valLower = stats[lower.toString()];
  
  if (upper === lower) return valUpper;
  return valLower + (valUpper - valLower) * ((level - lower) / (upper - lower));
}

// Obtiene el ataque base
export function getWeaponBaseStat(stat: 'atk', level: number): number {
  return interpolate(EmeraldOfGenesisStats.baseStats[stat], level);
}

// Obtiene la estadística secundaria dinámicamente según su statKey
export function getWeaponSecondStat(level: number): { key: string, value: number } {
  const key = EmeraldOfGenesisStats.secondStat.statKey;
  const value = interpolate(EmeraldOfGenesisStats.secondStat.values, level);
  return { key, value };
}

// Obtiene el valor de la pasiva según el refinamiento (1 a 5)
export function getPassiveValue(stat: keyof typeof EmeraldOfGenesisStats.passives, refinement: number): number {
  return EmeraldOfGenesisStats.passives[stat][refinement - 1];
}
