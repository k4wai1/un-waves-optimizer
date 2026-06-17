import data from './Shorekeeper.json';

export const ShorekeeperStats = data;

export function getStatAtLevel(stat: keyof typeof ShorekeeperStats.baseStats, level: number): number {
  const stats = ShorekeeperStats.baseStats[stat] as Record<string, number>;
  
  // Si la estadística es plana (como tuneBreakBoost: 10.0), la devolvemos directamente
  if (typeof stats === 'number') return stats;

  const levels = Object.keys(stats).map(Number).sort((a, b) => a - b);
  const upper = levels.find(l => l >= level) || 90;
  const lower = levels.reverse().find(l => l <= level) || 1;
  
  const valUpper = stats[upper.toString()];
  const valLower = stats[lower.toString()];
  
  if (upper === lower) return valUpper;
  return valLower + (valUpper - valLower) * ((level - lower) / (upper - lower));
}
