import { cmpGE, sum, prod, sumfrac } from '../../../../pando/engine/src/node/construction';
import { reader } from './util/read';

const atk = reader.withTag({ q: 'atk' });
const mv = reader.withTag({ q: 'mv' });
const flatDmg = reader.withTag({ q: 'flatDmg' });
export const baseDmg = sum(prod(atk, mv), flatDmg);

const dmgBonus = reader.withTag({ q: 'allDmgBonus_' });
const dmgAmplify = reader.withTag({ q: 'dmgAmplify_' });
const bonusMult = prod(sum(1, dmgBonus), sum(1, dmgAmplify));

const attackerLvl = reader.withTag({ q: 'lvl', src: 'attacker' });
const defenderDef = reader.withTag({ q: 'def', src: 'defender' });
const defPen = reader.withTag({ q: 'defIgnore_' });

const defNum = sum(800, prod(8, attackerLvl));
const defY = prod(defenderDef, sum(1, prod(-1, defPen)));
export const defMultiplier = sumfrac(defNum, defY); 

const resTotal = reader.withTag({ q: 'resTotal' });
export const resMultiplier = cmpGE(resTotal, 0,
  cmpGE(resTotal, 0.8,
    sumfrac(1, prod(5, resTotal)),
    sum(1, prod(-1, resTotal))
  ),
  sum(1, prod(-0.5, resTotal))
);

// NUEVO: Nodos exportados separadamente para Crítico y No Crítico
export const nonCritDamage = prod(baseDmg, bonusMult, defMultiplier, resMultiplier);

const critDmg = reader.withTag({ q: 'critDmg_' });
export const critDamage = prod(nonCritDamage, critDmg);

// Daño Promedio (se usará luego para optimizar sets de Echoes)
const critRate = reader.withTag({ q: 'critRate_' });
export const expectedDamage = sum(nonCritDamage, prod(nonCritDamage, critRate, sum(critDmg, -1)));
