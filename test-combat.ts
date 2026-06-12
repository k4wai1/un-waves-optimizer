import { nonCritDamage, critDamage } from './libs/ww/formula/src/data/combat';
import { RoverHavocStats, getStatAtLevel as getCharStat } from './libs/ww/stats/src/resonators/RoverHavoc';
import { getWeaponStat } from './libs/ww/stats/src/weapons/EmeraldOfGenesis';

function evaluatePandoNode(node: any, context: Record<string, number>): number {
  if (!node) return 0;
  if (typeof node === 'number') return node;

  switch (node.op) {
    case 'const': return node.ex;
    case 'read':  return context[node.tag.q] || 0;
    case 'prod':  return node.x.reduce((acc: number, child: any) => acc * evaluatePandoNode(child, context), 1);
    case 'sum':   return node.x.reduce((acc: number, child: any) => acc + evaluatePandoNode(child, context), 0);
    case 'sumfrac': 
      const x = evaluatePandoNode(node.x[0], context);
      const y = evaluatePandoNode(node.x[1], context);
      return (x + y) === 0 ? 0 : x / (x + y);
    case 'thres': 
      // Evaluador dinámico e indestructible para el AST de Pando
      const val = evaluatePandoNode(node.x[0], context);
      const thres = node.br !== undefined ? evaluatePandoNode(node.br[0], context) : evaluatePandoNode(node.x[1], context);
      const pass = node.br !== undefined ? evaluatePandoNode(node.x[1], context) : evaluatePandoNode(node.x[2], context);
      const fail = node.br !== undefined ? evaluatePandoNode(node.x[2], context) : evaluatePandoNode(node.x[3], context);
      return val >= thres ? pass : fail;
    default: return 0;
  }
}

const charBaseAtk = getCharStat('atk', 90); 
const weaponBaseAtk = getWeaponStat('atk', 90); 
const totalBaseAtk = charBaseAtk + weaponBaseAtk;

const forteAtkBonus = 0.12; 
const forteHavocBonus = 0.12; 
const finalAtk = totalBaseAtk * (1 + forteAtkBonus);

const testCritRate = 0.293; 
const testCritDmg = 1.6937; 

const baseContext = {
  atk: finalAtk,
  flatDmg: 0,
  allDmgBonus_: forteHavocBonus, 
  dmgAmplify_: 0,
  lvl: 90,
  def: 1512, 
  defIgnore_: 0,
  resTotal: 0.10, 
  critDmg_: testCritDmg,
  critRate_: testCritRate
};

const a1_mv = RoverHavocStats.formula.basic.a1[9]; 
const skill_hit1_mv = RoverHavocStats.formula.skill.hit1[9];

const s1_skillBonus = 0.30; 

function simularGolpe(nombre: string, mv: number, extraBonus: number = 0) {
  const ctx = { ...baseContext, mv: mv, allDmgBonus_: baseContext.allDmgBonus_ + extraBonus };
  const nonCrit = evaluatePandoNode(nonCritDamage, ctx);
  const crit = evaluatePandoNode(critDamage, ctx);
  
  console.log(`[${nombre}] (MV: ${(mv * 100).toFixed(2)}%)`);
  console.log(`  -> Normal:  ${Math.round(nonCrit)} DMG`);
  console.log(`  -> CRÍTICO: ${Math.round(crit)} DMG\n`);
}

console.log(`\n===========================================`);
console.log(`🗡️  ROVER HAVOC (S6) - SIMULADOR FINAL`);
console.log(`===========================================`);
simularGolpe('Basic Attack 1', a1_mv);
simularGolpe('Resonance Skill (Golpe 1) + S1', skill_hit1_mv, s1_skillBonus);
console.log(`===========================================\n`);
