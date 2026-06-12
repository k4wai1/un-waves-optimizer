import data from './FreezingFrost.json';

export const FreezingFrostStats = data;

export function getFreezingFrostBuffs(is5pcActive: boolean, stacks: number = 0): number {
  let glacioBonus = FreezingFrostStats['2pc'].buffs.glacio_dmg_;
  
  if (is5pcActive) {
    // Multiplicamos el buff por la cantidad de cargas activas
    const stackBonus = FreezingFrostStats['5pc'].conditional.buffs.glacio_dmg_ * Math.min(stacks, FreezingFrostStats['5pc'].conditional.maxStacks);
    glacioBonus += stackBonus;
  }
  
  return glacioBonus;
}
