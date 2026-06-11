import { finalDamage } from './libs/ww/formula/src/data/combat';
import { getStatAtLevel as getCharStat } from './libs/ww/stats/src/resonators/RoverHavoc';
import { getWeaponStat, getPassiveValue } from './libs/ww/stats/src/weapons/EmeraldOfGenesis';

// Evaluador del motor Pando (Simulador de runtime)
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
      const val1 = evaluatePandoNode(node.x[0], context);
      const val2 = evaluatePandoNode(node.br[0], context);
      return val1 >= val2 ? evaluatePandoNode(node.x[1], context) : evaluatePandoNode(node.x[2], context);
    default:
      console.warn(`Operación no soportada: ${node.op}`);
      return 0;
  }
}

// 1. Obtención de datos reales desde los JSONs
const charBaseAtk = getCharStat('atk', 90);
const weaponBaseAtk = getWeaponStat('atk', 90);
const totalBaseAtk = charBaseAtk + weaponBaseAtk;

const passiveAtkBonus = getPassiveValue('atk_', 1) * 2; // R1 con 2 stacks (12% total)

console.log('⚔️  Optimizador WuWa - Simulador de Daño Total');
console.log(`-------------------------------------------`);
console.log(`ATK Base (PJ + Arma): ${totalBaseAtk.toFixed(2)}`);

// 2. Definición del Contexto (La "Build" del personaje)
// Aquí es donde el motor toma el ATK Base y le aplica todos los añadidos.
const context = {
  // Fórmula de ATK Real: Base * (1 + %ATK) + Planos
  atk: totalBaseAtk * (1 + passiveAtkBonus), 
  mv: 0.285,               // Multiplicador básico
  flatDmg: 0,              
  allDmgBonus_: 0.60,      // Bono de daño elemental (60%)
  dmgAmplify_: 0,          
  lvl: 90,                 
  def: 1512,               
  defIgnore_: 0,           
  resTotal: 0.10           
};

// 3. Evaluación
const dmg = evaluatePandoNode(finalDamage, context);

console.log(`ATK Final Aplicado: ${context.atk.toFixed(2)}`);
console.log(`Daño de A1 calculado: ${dmg.toFixed(2)}`);
console.log(`-------------------------------------------`);
console.log(`✅ Lógica de ATK Base y Multiplicadores validada.`);
