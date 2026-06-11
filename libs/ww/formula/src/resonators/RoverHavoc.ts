import { RoverHavocStats } from '../../../stats/src/resonators/RoverHavoc';
import { reader } from '../data/util/read';
import { Prod } from '../../../../../pando/engine/src/node/construction';

const baseAtk = reader.withTag({ sheet: 'char', q: 'base_atk' });
const a1Multiplier = RoverHavocStats.basicAttack.a1.hits[0].mult / 100;

export const damageA1 = Prod(baseAtk, a1Multiplier);
