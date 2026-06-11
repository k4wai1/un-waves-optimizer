import { BaseRead } from '../../../../../pando/engine/src/node/read';

export interface WuWaTag { sheet?: string; q?: string; src?: string; slot?: string; }
export class Read extends BaseRead<WuWaTag> {}
export const reader = new Read({}, {});
