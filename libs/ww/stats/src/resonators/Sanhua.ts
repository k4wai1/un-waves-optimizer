import data from './Sanhua.json';

export const SanhuaStats = data;

export function getStatAtLevel(stat: keyof typeof SanhuaStats.baseStats, level: number): number {
  const stats = SanhuaStats.baseStats[stat] as Record<string, number>;
  const levels = Object.keys(stats).map(Number).sort((a, b) => a - b);
  const upper = levels.find(l => l >= level) || 90;
  const lower = levels.reverse().find(l => l <= level) || 1;
  
  const valUpper = stats[upper.toString()];
  const valLower = stats[lower.toString()];
  
  if (upper === lower) return valUpper;
  return valLower + (valUpper - valLower) * ((level - lower) / (upper - lower));
}
