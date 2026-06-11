import { cmpGE, sum, prod, sumfrac } from '../../../../pando/engine/src/node/construction';
import { reader } from './util/read';

// 1. DAÑO BASE (Atk * Multiplicador + Daño Plano)
const atk = reader.withTag({ q: 'atk' });
const mv = reader.withTag({ q: 'mv' });
const flatDmg = reader.withTag({ q: 'flatDmg' });
export const baseDmg = sum(prod(atk, mv), flatDmg);

// 2. BONOS MULTIPLICATIVOS (Daño Elemental + Daño de Habilidad + Amplificadores)
const dmgBonus = reader.withTag({ q: 'allDmgBonus_' });
const dmgAmplify = reader.withTag({ q: 'dmgAmplify_' });
const bonusMult = prod(sum(1, dmgBonus), sum(1, dmgAmplify));

// 3. MITIGACIÓN DE DEFENSA usando sumfrac: x / (x + y)
const attackerLvl = reader.withTag({ q: 'lvl', src: 'attacker' });
const defenderDef = reader.withTag({ q: 'def', src: 'defender' });
const defPen = reader.withTag({ q: 'defIgnore_' });

const defNum = sum(800, prod(8, attackerLvl)); // x
const defY = prod(defenderDef, sum(1, prod(-1, defPen))); // y
export const defMultiplier = sumfrac(defNum, defY); 

// 4. MITIGACIÓN DE RESISTENCIA
const resTotal = reader.withTag({ q: 'resTotal' });
export const resMultiplier = cmpGE(resTotal, 0,
  cmpGE(resTotal, 0.8,
    // Si resTotal >= 0.8 -> 1 / (1 + 5*res) usando sumfrac(x, y) donde x=1, y=5*res
    sumfrac(1, prod(5, resTotal)),
    // Si 0 <= resTotal < 0.8 -> 1 - resTotal
    sum(1, prod(-1, resTotal))
  ),
  // Si resTotal < 0 -> 1 - (resTotal / 2)
  sum(1, prod(-0.5, resTotal))
);

// 5. DAÑO FINAL ESPERADO
export const finalDamage = prod(baseDmg, bonusMult, defMultiplier, resMultiplier);
