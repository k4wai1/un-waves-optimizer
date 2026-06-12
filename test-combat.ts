import { nonCritDamage, critDamage } from './libs/ww/formula/src/data/combat';
import { SanhuaStats, getStatAtLevel as getCharStat } from './libs/ww/stats/src/resonators/Sanhua';
import { getWeaponBaseStat, getWeaponSecondStat } from './libs/ww/stats/src/weapons/EmeraldOfGenesis';
import { getFreezingFrostBuffs } from './libs/ww/stats/src/sonatas/FreezingFrost';

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
      const val = evaluatePandoNode(node.x[0], context);
      const thres = node.br !== undefined ? evaluatePandoNode(node.br[0], context) : evaluatePandoNode(node.x[1], context);
      const pass = node.br !== undefined ? evaluatePandoNode(node.x[1], context) : evaluatePandoNode(node.x[2], context);
      const fail = node.br !== undefined ? evaluatePandoNode(node.x[2], context) : evaluatePandoNode(node.x[3], context);
      return val >= thres ? pass : fail;
    default: return 0;
  }
}

// 1. STATS BASE (Sanhua Nv 90 + Emerald Nv 90)
const charBaseAtk = getCharStat('atk', 90); 
const weaponBaseAtk = getWeaponBaseStat('atk', 90); 
const totalBaseAtk = charBaseAtk + weaponBaseAtk;

// Simulamos que los Echoes le dan un 40% de ATK adicional en sub-stats
const echoAtkBonus = 0.40; 
const finalAtk = totalBaseAtk * (1 + echoAtkBonus);

// 2. LECTURA DE SONATA (Freezing Frost)
// Condición: 5 piezas activas, 3 cargas al máximo (Tras usar básicos)
const glacioDmgBonus = getFreezingFrostBuffs(true, 3); 

// 3. STATS DE CRÍTICO
const weaponCrit = getWeaponSecondStat(90).value; // 24.3%
const finalCritRate = 0.05 + weaponCrit + 0.20; // 5% Base + Arma + 20% de Echoes
const finalCritDmg = 1.50 + 0.60; // 150% Base + 60% de Echoes

// Construcción del Contexto para Pando
const baseContext = {
  atk: finalAtk,
  flatDmg: 0,
  allDmgBonus_: glacioDmgBonus, // Inyectamos el Glacio DMG total de la Sonata
  dmgAmplify_: 0,
  lvl: 90,
  def: 1512, 
  defIgnore_: 0,
  resTotal: 0.10, 
  critDmg_: finalCritDmg,
  critRate_: finalCritRate
};

// 4. MULTIPLICADOR DE LA HABILIDAD (Nivel 10)
const skill_mv = SanhuaStats.formula.skill[9]; 

function simularGolpe(nombre: string, mv: number) {
  const ctx = { ...baseContext, mv: mv };
  const nonCrit = evaluatePandoNode(nonCritDamage, ctx);
  const crit = evaluatePandoNode(critDamage, ctx);
  
  console.log(`[${nombre}] (MV: ${(mv * 100).toFixed(2)}%)`);
  console.log(`  -> Normal:  ${Math.round(nonCrit)} DMG`);
  console.log(`  -> CRÍTICO: ${Math.round(crit)} DMG\n`);
}

console.log(`\n======================================================`);
console.log(`❄️  SANHUA - TEST DE INTEGRACIÓN: ARMA + SONATA`);
console.log(`======================================================`);
console.log(`ATK Total: ${finalAtk.toFixed(2)} | Glacio DMG: ${(glacioDmgBonus * 100).toFixed(1)}%`);
console.log(`Crit Rate: ${(finalCritRate * 100).toFixed(1)}% | Crit DMG: ${(finalCritDmg * 100).toFixed(1)}%`);
console.log(`------------------------------------------------------`);
simularGolpe('Resonance Skill (Nv. 10)', skill_mv);
console.log(`======================================================\n`);
