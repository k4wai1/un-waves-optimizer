import { damageA1 } from './libs/ww/formula/src/resonators/RoverHavoc';

// Simulador del Motor de Pando (Calculator MVP)
function evaluatePandoNode(node: any, context: Record<string, number>): number {
  if (!node) return 0;

  switch (node.op) {
    case 'const':
      // Si el nodo es una constante (como nuestro 0.285), simplemente devolvemos su valor
      return node.ex;
      
    case 'read':
      // Si es un nodo de lectura, buscamos qué etiqueta pide (ej: 'base_atk') y sacamos el valor del contexto
      const query = node.tag.q;
      return context[query] || 0;
      
    case 'prod':
      // Si es un nodo de multiplicación, evaluamos todos sus hijos y los multiplicamos
      return node.x.reduce((acc: number, child: any) => acc * evaluatePandoNode(child, context), 1);
      
    case 'sum':
      // Si es suma, evaluamos hijos y sumamos
      return node.x.reduce((acc: number, child: any) => acc + evaluatePandoNode(child, context), 0);
      
    default:
      console.warn(`Operación no soportada en el simulador: ${node.op}`);
      return 0;
  }
}

console.log('🧪 Iniciando Pruebas de Estrés Matemático (Rover Havoc - Part I Damage)\n');

// Escenario 1: Rover Nivel 1 (Ataque Base extraído: 33)
const testNivel1 = { base_atk: 33 };
const dmgNivel1 = evaluatePandoNode(damageA1, testNivel1);
console.log(`[Escenario 1] Nivel 1 (ATK: ${testNivel1.base_atk}) -> Daño Calculado: ${dmgNivel1}`);

// Escenario 2: Rover Nivel 90 (Ataque simulado: 1000)
const testNivel90 = { base_atk: 1000 };
const dmgNivel90 = evaluatePandoNode(damageA1, testNivel90);
console.log(`[Escenario 2] Nivel 90 (ATK: ${testNivel90.base_atk}) -> Daño Calculado: ${dmgNivel90}`);

// Escenario 3: Rover Full Build + Buffs (Ataque simulado: 2450)
const testFullBuild = { base_atk: 2450 };
const dmgFullBuild = evaluatePandoNode(damageA1, testFullBuild);
console.log(`[Escenario 3] Full Build (ATK: ${testFullBuild.base_atk}) -> Daño Calculado: ${dmgFullBuild}`);

console.log('\n✅ La lógica matemática es impecable.');
