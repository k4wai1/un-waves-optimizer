import { TypedRead } from '../../../../../pando/engine/src/node/read';

// 1. Definición estricta de componentes del Grafo de WuWa
export type WuWaSheet = 'char' | 'weapon' | 'echo' | 'enemy' | 'dyn';

export type WuWaElement = 'havoc' | 'spectro' | 'aero' | 'fusion' | 'electro' | 'glacio' | 'none';

export type WuWaMove = 'basic' | 'heavy' | 'skill' | 'liberation' | 'intro' | 'outro' | 'none';

export type WuWaQuery =
  // Atributos Base e Incrementos
  | 'lvl' | 'atk' | 'atk_' | 'def' | 'def_' | 'hp' | 'hp_'
  // Estadísticas Avanzadas de Combate
  | 'critRate_' | 'critDmg_' | 'energyRegen_'
  // Multiplicadores de Daño y Mitigación
  | 'mv' | 'flatDmg' | 'flatBonus_' | 'allDmgBonus_' | 'dmgAmplify_' | 'specialDmg_'
  // Capa de Defensa y Resistencias
  | 'defIgnore_' | 'defReduction_' | 'resBase' | 'resPen_' | 'resTotal'
  // Postura (Vibración)
  | 'hardnessSkill' | 'tough' | 'hardnessDmg'
  // Nodos de Salida de Daño
  | 'baseDmg' | 'finalDmg';

// 2. Interfaz estructural para el motor Pando
export interface WuWaTag extends Record<string, string | undefined> {
  sheet?: WuWaSheet;
  q?: WuWaQuery;
  element?: WuWaElement;
  move?: WuWaMove;
  src?: string;
  dst?: string;
  slot?: string;
}

export class Read extends TypedRead<WuWaTag> {}

export const reader = new Read({}, {});
