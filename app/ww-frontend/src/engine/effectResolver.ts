// ═══════════════════════════════════════════════════════════════════════════════
// effectResolver.ts — Evaluador de Estados con Paths Universales
// ═══════════════════════════════════════════════════════════════════════════════
//
// Este módulo es un EVALUADOR DE ESTADOS, NO un simulador de combate.
// El usuario controla qué efectos están activos, con qué rango y cuántos stacks.
// El motor solo responde: "Si estos efectos están activos, ¿cuánto pega?"
//
// Sistema de paths:
//   "stat.atk"               → ATK del personaje
//   "enemy.defense"          → DEF del enemigo
//   "action.basic_3"         → Daño de Basic Attack 3
//   "actionType.resonanceSkill" → Todas las Resonance Skills
//
// Ver StatReference.json5 para el catálogo completo de paths válidos.
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { CombatContext } from './calculator';

// ═════════════════════════════════════════════════════════════════════════════
// TIPOS DEL CONTRATO
// ═════════════════════════════════════════════════════════════════════════════

export type ModOperation = 'Add' | 'Multiply' | 'Replace';
export type ValueType = 'Percent' | 'Flat' | 'Multiplier';

/**
 * Un modifier representa CÓMO se modifica el target.
 * - operation: Add (suma), Multiply (multiplica), Replace (reemplaza)
 * - valueType: Percent (0.12 = 12%), Flat (250), Multiplier (1.40)
 * - value: [R1, R2, R3, R4, R5] para efectos que escalan, [v] si fijo
 */
export interface Modifier {
  operation: ModOperation;
  valueType: ValueType;
  value: number[];  // [R1..R5] o [v] si fijo
}

/**
 * Un effect describe UNA modificación independiente.
 * - target: path que identifica QUÉ modifica (ver StatReference.json5)
 * - modifiers: cómo lo modifica (uno o más)
 */
export interface Effect {
  id: string;
  name: string;
  descriptionTemplate?: string;
  /** Path único. Ver StatReference.json5 para lista completa.
   *  Ejemplos: "stat.atk", "enemy.defense", "action.basic_3", "actionType.resonanceSkill" */
  target: string;
  modifiers: Modifier[];
  maxStacks: number;       // 1 = checkbox, >1 = slider
  exclusive: boolean;
  enabledByDefault?: boolean;
  // --- Backward compat (formato legacy) ---
  type?: string;
  operation?: ModOperation;
  stat?: string;
  value?: number[];
  howToActivate?: string;
  affects?: string;
  targets?: { type: string; id: string }[];
}

export interface ActiveEffect {
  effectId: string;
  rank: number;     // 0=R1 .. 4=R5
  stacks: number;   // 0 .. maxStacks
  enabled: boolean;
}

export interface Action {
  id: string;
  type: string;
  tags: string[];
}




/** Mapa de stats del enemigo: clave del effect → ruta en context.enemy */
const ENEMY_STAT_MAP: Record<string, (e: CombatContext['enemy'], v: number) => void> = {
  // Stats directas
  'enemy.defense':      (e, v) => { e.defense = clampMin(e.defense + v, 0); },
  'enemy.level':        (e, v) => { e.level = Math.max(1, e.level + v); },
  'enemy.hp':           (e, v) => { e.hp = Math.max(0, e.hp + v); },
  'enemy.damageTaken':  (e, v) => { e.damageTaken = Math.max(0, e.damageTaken * (1 + v)); },
  // Resistencias elementales
  'enemy.glacioRes':    (e, v) => { e.elementalResistances.glacio = clampMin(e.elementalResistances.glacio + v, 0); },
  'enemy.fusionRes':    (e, v) => { e.elementalResistances.fusion = clampMin(e.elementalResistances.fusion + v, 0); },
  'enemy.electroRes':   (e, v) => { e.elementalResistances.electro = clampMin(e.elementalResistances.electro + v, 0); },
  'enemy.aeroRes':      (e, v) => { e.elementalResistances.aero = clampMin(e.elementalResistances.aero + v, 0); },
  'enemy.havocRes':     (e, v) => { e.elementalResistances.havoc = clampMin(e.elementalResistances.havoc + v, 0); },
  'enemy.spectroRes':   (e, v) => { e.elementalResistances.spectro = clampMin(e.elementalResistances.spectro + v, 0); },
  'enemy.physicalRes':  (e, v) => { e.physicalResistance = clampMin(e.physicalResistance + v, 0); },
};

function clampMin(val: number, min: number): number { return Math.max(min, val); }

/** Mapea paths tipo "stat.*" a claves de CombatContext */
const PATH_TO_CTX: Record<string, string> = {
  critRate: 'critRate_',
  critDmg: 'critDmg_',
  energyRegen: 'energyRegen_',
  allDmgBonus: 'allDmgBonus_',
  dmgAmplify: 'dmgAmplify_',
  skillDmg: 'resonanceSkillDmgBonus_',
  basicDmg: 'basicAttackDmgBonus_',
  heavyDmg: 'heavyAttackDmgBonus_',
  liberationDmg: 'resonanceLiberationDmgBonus_',
  echoDmg: 'echoSkillDmgBonus_',
  coordinatedDmg: 'coordinatedDmgBonus_',
  outroDmg: 'outroSkillDmgBonus_',
  healingBonus: 'healingBonus_',
  defIgnore: 'defIgnore_',
  glacioDmg: 'glacioDmgBonus_',
  fusionDmg: 'fusionDmgBonus_',
  electroDmg: 'electroDmgBonus_',
  aeroDmg: 'aeroDmgBonus_',
  spectroDmg: 'spectroDmgBonus_',
  havocDmg: 'havocDmgBonus_',
};

function pathToContextKey(path: string): keyof CombatContext | null {
  return (PATH_TO_CTX[path] as keyof CombatContext) ?? null;
}

/** Puente legacy: convierte el formato antiguo { type, id } al nuevo target: string */
function legacyTargetToPath(effect: Effect): string | null {
  if (effect.targets?.length === 1) {
    const t = effect.targets[0];
    if (t.type === 'Stat') {
      // Mapear stat keys viejas (hp_) a paths nuevos (stat.hp)
      const legacyMap: Record<string, string> = {
        hp_: 'stat.hp', atk_: 'stat.atk', def_: 'stat.def',
        critRate_: 'stat.critRate', critDmg_: 'stat.critDmg',
        energyRegen_: 'stat.energyRegen', allDmgBonus_: 'stat.allDmgBonus',
        dmgAmplify_: 'stat.dmgAmplify',
        skillDmg_: 'stat.skillDmg', basicDmg_: 'stat.basicDmg',
        heavyDmg_: 'stat.heavyDmg', liberationDmg_: 'stat.liberationDmg',
        echoDmg_: 'stat.echoDmg', coordinated_dmg_: 'stat.coordinatedDmg',
        outroDmg_: 'stat.outroDmg', healing_bonus_: 'stat.healingBonus',
        defIgnore_: 'stat.defIgnore',
        glacio_dmg_: 'stat.glacioDmg', fusion_dmg_: 'stat.fusionDmg',
        electro_dmg_: 'stat.electroDmg', aero_dmg_: 'stat.aeroDmg',
        spectro_dmg_: 'stat.spectroDmg', havoc_dmg_: 'stat.havocDmg',
        havocRes_: 'enemy.havocRes', glacioRes_: 'enemy.glacioRes',
        fusionRes_: 'enemy.fusionRes', electroRes_: 'enemy.electroRes',
        aeroRes_: 'enemy.aeroRes', spectroRes_: 'enemy.spectroRes',
      };
      return legacyMap[t.id] ?? null;
    }
    if (t.type === 'Category') {
      return `actionType.${t.id}`;
    }
    if (t.type === 'Action') {
      return `action.${t.id}`;
    }
  }
  // Legacy sin targets[]
  if (effect.stat) {
    const lMap: Record<string, string> = {
      hp_: 'stat.hp', atk_: 'stat.atk', def_: 'stat.def',
      critRate_: 'stat.critRate', critDmg_: 'stat.critDmg',
      energyRegen_: 'stat.energyRegen',
      skillDmg_: 'stat.skillDmg', basicDmg_: 'stat.basicDmg',
      heavyDmg_: 'stat.heavyDmg', liberationDmg_: 'stat.liberationDmg',
      echoDmg_: 'stat.echoDmg',
      havoc_dmg_: 'stat.havocDmg', glacio_dmg_: 'stat.glacioDmg',
      spectro_dmg_: 'stat.spectroDmg',
      healing_bonus_: 'stat.healingBonus',
      allDmgBonus_: 'stat.allDmgBonus',
    };
    return lMap[effect.stat] ?? null;
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// RESOLVEDOR PRINCIPAL — Aplica efectos de tipo Stat al CombatContext
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Procesa efectos activos y modifica el CombatContext.
 * Solo procesa targets de tipo "Stat" (modificaciones globales).
 * Targets "Action" y "Category" se procesan en calculateActionDamage.
 */
export function resolveEffects(
  context: CombatContext,
  activeEffects: ActiveEffect[],
  effectsDb: Record<string, Effect>
): CombatContext {
  const result = { ...context };
  let bonusHpPct = 0, bonusAtkPct = 0, bonusDefPct = 0;

  for (const active of activeEffects) {
    if (!active.enabled) continue;
    const effect = effectsDb[active.effectId];
    if (!effect) continue;

    const rankIndex = Math.min(active.rank, 4);

    // Obtener todos los pares (target, totalValue, op) para este effect
    const entries = getEffectEntries(effect, rankIndex, active.stacks);
    
    for (const { target, totalValue, op } of entries) {
      // ─── stat.hp / stat.atk / stat.def — acumular porcentajes ─────
      if (target === 'stat.hp') { bonusHpPct += totalValue; continue; }
      if (target === 'stat.atk') { bonusAtkPct += totalValue; continue; }
      if (target === 'stat.def') { bonusDefPct += totalValue; continue; }

      // ─── Otros stat.* — aplicar directamente ──────────────────────
      if (target.startsWith('stat.')) {
        const ctxKey = pathToContextKey(target.slice(5));
        if (ctxKey) {
          switch (op) {
            case 'Add': (result as any)[ctxKey] += totalValue; break;
            case 'Multiply': (result as any)[ctxKey] *= 1 + totalValue; break;
            case 'Replace': (result as any)[ctxKey] = totalValue; break;
          }
        }
        continue;
      }

      // ─── enemy.* — Stats del enemigo ───────────────────────────────
      if (target.startsWith('enemy.')) {
        const enemyKey = target.slice(6);
        if (enemyKey === 'damageTaken') {
          result.enemy.damageTaken *= 1 + totalValue;
        } else {
          const handler = ENEMY_STAT_MAP[`enemy.${enemyKey}`];
          if (handler) handler(result.enemy, totalValue);
        }
        continue;
      }

      // action.* / actionType.* — se ignoran aquí (resuelto en calculateActionDamage)
    }
  }

  if (bonusHpPct) result.hp = context.hp * (1 + bonusHpPct);
  if (bonusAtkPct) result.atk = context.atk * (1 + bonusAtkPct);
  if (bonusDefPct) result.def = context.def * (1 + bonusDefPct);

  return result;
}

/**
 * Obtiene todos los pares (target, totalValue, operation) para un effect.
 * Soporta tanto el formato nuevo (target: string + modifiers[]) como el legacy.
 */
function getEffectEntries(
  effect: Effect,
  rankIndex: number,
  stacks: number
): { target: string; totalValue: number; op: ModOperation }[] {
  const entries: { target: string; totalValue: number; op: ModOperation }[] = [];

  // Determinar el target path
  const path = effect.target || legacyTargetToPath(effect);
  if (!path) return entries;

  const stackMult = Math.min(stacks, effect.maxStacks || 1);
  const mods = effect.modifiers || [];

  if (mods.length > 0) {
    // Formato nuevo: usar modifiers[]
    for (const mod of mods) {
      const baseValue = mod.value[Math.min(rankIndex, mod.value.length - 1)] ?? 0;
      entries.push({ target: path, totalValue: baseValue * stackMult, op: mod.operation });
    }
  } else if (effect.value && effect.type === 'stat') {
    // Formato legacy: usar value directamente
    const baseValue = effect.value[Math.min(rankIndex, effect.value.length - 1)] ?? 0;
    const opRaw = effect.operation ?? 'Add';
    const op = opRaw.charAt(0).toUpperCase() + opRaw.slice(1).toLowerCase() as ModOperation;
    entries.push({ target: path, totalValue: baseValue * stackMult, op });
  }

  return entries;
}

// ═════════════════════════════════════════════════════════════════════════════
// RESOLVEDOR DE MODIFICADORES POR ACCIÓN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Determina si un target aplica a una acción específica.
 */
/**
 * Determina si un effect con target path aplica a una acción específica.
 * Los paths válidos son:
 *   "action.<id>"         → aplica si action.id === <id>
 *   "actionType.<type>"   → aplica si action.type === <type>
 */
function effectAppliesToAction(effect: Effect, action: Action): boolean {
  const p = effect.target || legacyTargetToPath(effect);
  if (!p) return false;

  if (p.startsWith('action.')) {
    const actionId = p.slice(7); // quitar "action."
    return actionId === action.id;
  }
  if (p.startsWith('actionType.')) {
    const actionType = p.slice(11); // quitar "actionType."
    return actionType === action.type;
  }
  return false;
}

/**
 * Para una acción dada, recoge todos los modifiers activos que le aplican
 * y devuelve los valores calculados.
 */
export function resolveActionModifiers(
  action: Action,
  activeEffects: ActiveEffect[],
  effectsDb: Record<string, Effect>
): {
  damageMultiplier: number;
  replacedMultiplier: number | null;
} {
  let dmgMult = 0;
  let replacedMult: number | null = null;

  for (const active of activeEffects) {
    if (!active.enabled) continue;
    const effect = effectsDb[active.effectId];
    if (!effect) continue;
    const rankIndex = Math.min(active.rank, 4);

    if (!effectAppliesToAction(effect, action)) continue;

    // Procesar modifiers del effect
    for (const mod of effect.modifiers) {
      const baseValue = mod.value[Math.min(rankIndex, mod.value.length - 1)] ?? 0;
      const stackMult = Math.min(active.stacks, effect.maxStacks);
      const totalValue = baseValue * stackMult;

      if (mod.operation === 'Replace') {
        replacedMult = totalValue;
      } else {
        dmgMult += totalValue;
      }
    }
  }

  return { damageMultiplier: dmgMult, replacedMultiplier: replacedMult };
}

/**
 * Calcula el daño de una acción aplicando todos los modifiers activos.
 */
export function calculateActionDamage(
  context: CombatContext,
  action: Action,
  baseMultiplier: number,
  scalerStat: string,
  element: string | undefined,
  activeEffects: ActiveEffect[],
  effectsDb: Record<string, Effect>,
  calculateDamageFn: (ctx: CombatContext, mv: number, scaler: string, element?: string) => { normal: number; average: number; crit: number }
): { normal: number; average: number; crit: number } {
  const mods = resolveActionModifiers(action, activeEffects, effectsDb);

  // Reemplazo de multiplier (si aplica)
  let finalMv = mods.replacedMultiplier ?? baseMultiplier;

  // damageMultiplier: suma (ej: varios efectos dan +20% cada uno)
  finalMv *= 1 + mods.damageMultiplier;

  return calculateDamageFn(context, finalMv, scalerStat, element);
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITARIOS
// ═════════════════════════════════════════════════════════════════════════════

export function buildActiveEffects(
  effects: Effect[],
  rank: number,
  stacks: number,
  enabledOverrides?: Record<string, boolean>
): ActiveEffect[] {
  return effects.map((effect) => ({
    effectId: effect.id,
    rank,
    stacks: Math.min(stacks, effect.maxStacks),
    enabled: enabledOverrides?.[effect.id] ?? effect.enabledByDefault ?? false,
  }));
}

export function indexEffects(effects: Effect[]): Record<string, Effect> {
  const db: Record<string, Effect> = {};
  for (const effect of effects) {
    db[effect.id] = effect;
  }
  return db;
}

/**
 * Genera descripción desde plantilla. Reemplaza {value} y {valueN}.
 */
export function formatDescription(
  template: string | undefined,
  modifiers: Modifier[],
  rank: number
): string {
  if (!template) return '';

  const fmt = (v: number, vt: ValueType): string => {
    switch (vt) {
      case 'Percent': return (v * 100).toFixed(0);
      case 'Flat': return v.toFixed(0);
      case 'Multiplier': return v.toFixed(2);
    }
  };

  let result = template;
  for (let i = 0; i < modifiers.length; i++) {
    const v = modifiers[i].value[Math.min(rank, modifiers[i].value.length - 1)] ?? 0;
    const label = i === 0 ? 'value' : `value${i}`;
    result = result.replace(`{${label}}`, fmt(v, modifiers[i].valueType));
  }
  return result;
}
