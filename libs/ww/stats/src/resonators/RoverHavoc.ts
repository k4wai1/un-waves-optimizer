import data from './RoverHavoc.json';

export interface ResonatorStats {
  name: string;
  baseStats: Record<string, Record<string, number>>;
  formula: any;
}

export const RoverHavocStats = data as ResonatorStats;

export function getStatAtLevel(stat: 'hp' | 'atk' | 'def', level: number): number {
  const levels = Object.keys(RoverHavocStats.baseStats[stat]).map(Number).sort((a, b) => a - b);
  const upper = levels.find(l => l >= level) || 90;
  const lower = levels.reverse().find(l => l <= level) || 1;
  
  const valUpper = RoverHavocStats.baseStats[stat][upper.toString()];
  const valLower = RoverHavocStats.baseStats[stat][lower.toString()];
  
  if (upper === lower) return valUpper;
  
  // Interpolación lineal simple
  return valLower + (valUpper - valLower) * ((level - lower) / (upper - lower));
}
