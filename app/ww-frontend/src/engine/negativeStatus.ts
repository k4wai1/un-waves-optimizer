// ═══════════════════════════════════════════════════════════════════════════════
// negativeStatus.ts — Motor determinista de Estados Negativos / Ticks / Tonalidad
// ═══════════════════════════════════════════════════════════════════════════════
//
// Núcleo + harness modular. Implementa la ARQUITECTURA confirmada en
// `docs/investigacion-estados/*` y consolidada en `docs/estados-elementales.md`:
//
//   - Los Estados Negativos (NS) NO escalan con ATK ni Crit del Resonador por
//     defecto. Escalan por NIVEL del personaje que aplica (LUT / CurveTable) +
//     amplificación específica de NS + DEF/RES enemigo (según el caso).
//   - Aritmética de PUNTO FIJO (×10000, Math.floor) para resultados deterministas.
//   - Núcleo genérico de DoT con `tickInterval`, consumo por tick (1 | mitad | 0),
//     stacks máx y detonación/overflow opcional por estado.
//   - Registry declarativo por estado (harness). Los valores por-personaje se
//     cargan desde JSON5; los valores de referencia de la investigación (Gemini)
//     se exponen como defaults de calibración, NO hardcodeados en la lógica.
//
// Este módulo NO es una simulación de combate en tiempo real: dado un estado
// aplicado sobre un objetivo, expone cómo calcular el daño de un tick (o la
// detonación) de forma determinista.
//
// ═══════════════════════════════════════════════════════════════════════════════

/** Estado de los 6 estados negativos elementales + tonalidad/hack. */
export type NegativeStatusKind =
  // Estados negativos elementales
  | 'glacio_chafe'   // daño al aplicar + slow + freeze (10 → 13 con Chisa)
  | 'spectro_frazzle'// DoT paramétrico por nivel, consume 1 stack/tick
  | 'fusion_burst'   // sumidero → explosión (NO DoT); detona al llegar al límite
  | 'aero_erosion'   // DoT paramétrico por nivel, consume 1 stack/tick
  | 'havoc_bane'     // debuff de reducción de DEF (v2.8), NO daño
  | 'electro_flare'  // DoT → consume la mitad/tick + overflow Electro Rage
  // Sistema de Tonalidad (marcadores Shifting/Interfered)
  | 'tune_strain'    // amplificación (0.12% × tuneBreakBoost × stacks)
  | 'tune_rupture'   // respuesta coordinada (burst)
  | 'tune_hack';     // respuesta coordinada (burst), Lucy/Rebecca

/** Tipo de comportamiento del daño de un estado. */
export type StatusDamageMode =
  /** Paramétrico: escala por LUT del nivel del aplicador (no ATK). */
  | 'parametric'
  /** De buff de defensa: NO produce daño, reduce enemy.defense directamente. */
  | 'defDebuff'
  /** Explosión por umbral: no hace DoT, detona al llegar al límite. */
  | 'burst';

/** Cómo se consume el stack de un DoT en cada tick. */
export type StatusConsumption =
  | 'none'          // no consume (p. ej. con Shimmer activo)
  | 'onePerTick'    // consume 1 stack por tick (Spectro Frazzle, Aero Erosion)
  | 'halfFloor';    // consume la mitad truncada por tick (Electro Flare)

/** Config declarativa por estado (harness). Se calibra desde JSON5 / investigación. */
export interface StatusConfig {
  kind: NegativeStatusKind;
  /** Nombre en inglés canónico. */
  name: string;
  /** Elemento del daño (para M_RES). Si 'none' no aplica resistencia elemental. */
  element: 'glacio' | 'fusion' | 'electro' | 'aero' | 'spectro' | 'havoc' | 'none';
  damageMode: StatusDamageMode;
  /**
   * Modelo de escalado del daño por stacks (DoT paramétrico):
   *   - 'uniform' → `base × [1+(n-1)×kStack]` (Spectro Frazzle, Aero Erosion).
   *   - 'affine'  → `baseOffset + slopePerStack × n` (Electro Flare: 155 + 674×n).
   */
  damageModel: 'uniform' | 'affine';
  /** Máximo de stacks por defecto (modificable con Chisa: +3). */
  maxStacks: number;
  /** Intervalo del tick en segundos para DoT (ignorado en 'burst'/'defDebuff'). */
  tickInterval: number;
  /** Consumo de stacks por tick. */
  consumption: StatusConsumption;
  /**
   * ¿Aplica la mitigación de DEF enemiga? (Spectro Frazzle IGNORA la DEF; Aero
   * Erosion, Glacio Chafe, Fusion Burst y Electro Flare SÍ la aplican).
   */
  appliesDef: boolean;
  /** ¿Puede recibir DEF ignore en su mitigación? (Fusión/Electro sí, paramétrico no). */
  usesDefIgnore: boolean;
  /** Nivel de referencia para el escalado de nivel (default 90). */
  refLevel: number;
  /**
   * Modelo 'uniform': daño base de 1 stack al `refLevel`, ANTES de mitigación.
   * (Spectro Frazzle ≈4596@Lv90; Aero Erosion ≈5000@Lv90.)
   */
  baseAtRefLevel: number;
  /**
   * Modelo 'uniform': constante K_stack = incremento del daño por cada stack
   * adicional sobre el 1º (usada en `[1 + (n-1) × K_stack]`).
   * Frazzle ≈0.811; Aero Erosion = 1 (lineal × stacks).
   */
  kStack: number;
  /**
   * Modelo 'affine': término constante del daño base por tick.
   * (Electro Flare: 155.)
   */
  baseOffset?: number;
  /**
   * Modelo 'affine': incremento del daño por cada stack del tick.
   * (Electro Flare: 674.)
   */
  slopePerStack?: number;
  /**
   * Glacio Chafe (daño instantáneo por aplicación, no DoT): valor del StacksMV
   * en enteros ×10000. Límite 10 → 20377 (2.0377); límite 13 (Chisa) → 40753 (4.0753).
   */
  stacksMv?: number;
  /** ¿El daño se beneficia de amplificación (NS DMG Amp) además de RES/DEF? Default true. */
  usesAmplify?: boolean;

  enabledByDefault?: boolean;
}

/**
 * Estado mutable de una instancia aplicada sobre un objetivo.
 * Es la unidad que gestiona stacks, temporizadores y consumo.
 */
export interface NegativeStatusState {
  kind: NegativeStatusKind;
  currentStacks: number;
  /** Límite dinámico (default de la config, modificable p. ej. +3 con Chisa). */
  maxStacksLimit: number;
  /** Tiempo restante del estado en segundos (se refresca al aplicar). */
  durationRemaining: number;
  /** Tiempo hasta el próximo tick en segundos (cuenta regresiva). */
  tickTimer: number;
  /** Sub-estado Electro Flare: cargas de Rage para amplificar el próximo tick. */
  rageStacks: number;
  /** Sub-estado: si el consumo de stacks está suspendido (p. ej. Shimmer). */
  freezeConsumption: boolean;
  /** Fase de Tonalidad vigente (marcadores). */
  tonePhase: 'none' | 'shifting' | 'interfered';
}

/** Contexto mínimo que necesita la fórmula NS. */
export interface NegativeStatusContext {
  /** Nivel del Resonador que aplicó el estado (dueño de la aplicación). */
  attackerLvl: number;
  /** DEF del enemigo (para estados que aplican M_DEF). */
  enemyDefense: number;
  /** Resistencia elemental del enemigo para `element` (aplicar siempre, incluso 'defDebuff' no). */
  enemyRes: number;
  /**
   * Suma de amplificadores ESPECÍFICOS del estado (NS DMG Amplification /
   * por-estado). El DMG Bonus elemental convencional NO aplica a NS.
   */
  statusAmplify: number;
  /** DEF ignore del atacante (solo si el estado lo usa). */
  defIgnore: number;
  /** tuneBreakBoost del personaje atacante (solo Tonalidad). */
  tuneBreakBoost: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// ARITMÉTICA DE PUNTO FIJO ×10000
// ═════════════════════════════════════════════════════════════════════════════

export const FIXED_SCALE = 10000;

/** Convierte un número de punto flotante a entero de punto fijo (×10000). */
export function toFixed(x: number): number {
  return Math.round(x * FIXED_SCALE);
}

/** Convierte un entero de punto fijo de vuelta a float (÷10000). */
export function fromFixed(x: number): number {
  return x / FIXED_SCALE;
}

/** Multiplicación determinista en punto fijo (floor). */
export function mulFixed(a: number, b: number): number {
  return Math.floor((a * b) / FIXED_SCALE);
}

/** División determinista en punto fijo (floor). */
export function divFixed(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.floor((a * FIXED_SCALE) / b);
}

/** Cofactor de mitigación por resistencia usando la fórmula 3 ramas del motor. */
export function resMultiplier(res: number): number {
  if (res >= 0.8) return 1 / (1 + 5 * res);
  if (res >= 0) return 1 - res;
  return 1 - 0.5 * res; // negativa = más daño (amortigua a la mitad)
}

/**
 * Cofactor de mitigación por defensa (misma fórmula que calculator.ts), como FLOAT.
 * @param atkStat numerador (800 + 8·Lc) en unidades reales.
 * @param enemyDef DEF efectiva del enemigo en unidades reales (ya con DEF Ignore aplicada).
 *   Si es negativa (DEF Ignore > 100%), el denominador baja → M_DEF > 1 (techo 2.0), igual
 *   que en `calculator.ts::defMultiplierFn`.
 */
export function defMultiplier(atkStat: number, enemyDef: number): number {
  const den = atkStat + enemyDef;
  if (den <= 0) return 2.0;
  return Math.min(2.0, Math.max(0, atkStat / den));
}

// ═════════════════════════════════════════════════════════════════════════════
// LUT / CURVE TABLE POR NIVEL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Interpola el daño base de una sola acumulación a un nivel dado entre los límites
 * de la curva (refLevel → baseAtRefLevel). Por defecto trata la curva como lineal
 * respecto al nivel (parámetro simplificado); un estado que quiera una curva
 * exacta (no lineal) puede inyectar su propia tabla vía el hook `levelTableOverride`.
 */
export interface LevelTableOptions {
  minLevel: number;
  maxLevel: number;
  /** Daño base de 1 stack a minLevel (solo para interpolar). */
  baseAtMinLevel?: number;
}

/**
 * Devuelve el "daño base" de 1 acumulación para el nivel del aplicador según la
 * config del estado + los bounds de la curva.
 * La investigación (Gemini) da un punto: Spectro Frazzle ≈ 4596 @ Lv90 (1 stack).
 * Para niveles intermedios se interpola; estados con curva exacta pueden usar
 * `levelTableOverride` en el registry de datos (cargado desde JSON5).
 */
export function levelValue(
  config: StatusConfig,
  levelOptions: LevelTableOptions,
  attackerLvl: number,
): number {
  const { minLevel, maxLevel } = levelOptions;
  const clamped = Math.min(maxLevel, Math.max(minLevel, attackerLvl));
  const ref = config.refLevel || 90;
  const baseAtRef = config.baseAtRefLevel || 0;
  // Simple interpolación lineal entre minLevel (≈ baseAtMinLevel) y refLevel (baseAtRef).
  const baseAtMin = levelOptions.baseAtMinLevel ?? baseAtRef - (baseAtRef * (ref - minLevel)) / Math.max(1, (ref - minLevel || 1));
  const span = Math.max(1, ref - minLevel);
  const t = (clamped - minLevel) / span;
  const value = baseAtMin + (baseAtRef - baseAtMin) * t;
  return value;
}

/**
 * Multiplicador de stacks: `[1 + (n-1) × kStack]`. Da un factor sobre el daño de
 * 1 stack. (Spectro Frazzle: kStack≈0.811 → a 10 stacks ≈ 8.3× el de 1.)
 */
export function stackFactor(config: StatusConfig, stacks: number): number {
  const n = Math.max(0, stacks);
  return 1 + (n - 1) * (config.kStack ?? 0);
}

// ═════════════════════════════════════════════════════════════════════════════
// REGISTRY DE ESTADOS (harness)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Harness declarativo de los 9 estados. Los campos 'baseAtRefLevel' y 'kStack'
 * son DEFAULTS de calibración de la investigación; cada personaje/estado puede
 * sobreescribirlos desde datos JSON5 (ver esquema en StatReference).
 */
export const STATUS_REGISTRY: Record<NegativeStatusKind, StatusConfig> = {
  glacio_chafe: {
    kind: 'glacio_chafe', name: 'Glacio Chafe', element: 'glacio',
    damageMode: 'parametric', damageModel: 'affine', maxStacks: 10, tickInterval: 0,
    consumption: 'none', appliesDef: true, usesDefIgnore: true,
    refLevel: 90, baseAtRefLevel: 0, kStack: 0,
    // Instantáneo por aplicación (NO DoT). StacksMV: Límite 10 → 20377 (2.0377);
    // límite 13 (Chisa/Suisui) → 40753 (4.0753). Daño ≈ LevelModifier×(1+0)×StacksMV. 
    stacksMv: 20377,
  },
  spectro_frazzle: {
    kind: 'spectro_frazzle', name: 'Spectro Frazzle', element: 'spectro',
    damageMode: 'parametric', damageModel: 'uniform', maxStacks: 10, tickInterval: 3.0,
    consumption: 'onePerTick', appliesDef: false, usesDefIgnore: false,
    refLevel: 90, baseAtRefLevel: 4596, kStack: 0.811,
  },
  fusion_burst: {
    kind: 'fusion_burst', name: 'Fusion Burst', element: 'fusion',
    damageMode: 'burst', damageModel: 'uniform', maxStacks: 10, tickInterval: 0,
    consumption: 'none', appliesDef: true, usesDefIgnore: true,
    refLevel: 90, baseAtRefLevel: 0, kStack: 0,
  },
  aero_erosion: {
    kind: 'aero_erosion', name: 'Aero Erosion', element: 'aero',
    damageMode: 'parametric', damageModel: 'uniform', maxStacks: 3, tickInterval: 3.0,
    consumption: 'onePerTick', appliesDef: true, usesDefIgnore: true,
    refLevel: 90, baseAtRefLevel: 5000, kStack: 1, // lineal × stacks
  },
  havoc_bane: {
    kind: 'havoc_bane', name: 'Havoc Bane', element: 'havoc',
    damageMode: 'defDebuff', damageModel: 'uniform', maxStacks: 3, tickInterval: 0,
    consumption: 'none', appliesDef: false, usesDefIgnore: false,
    refLevel: 90, baseAtRefLevel: 0, kStack: 0,
  },
  electro_flare: {
    kind: 'electro_flare', name: 'Electro Flare', element: 'electro',
    damageMode: 'parametric', damageModel: 'affine', maxStacks: 10, tickInterval: 6.0,
    consumption: 'halfFloor', appliesDef: true, usesDefIgnore: true,
    refLevel: 90, baseAtRefLevel: 0, kStack: 0,
    // Modelo afín (Level Scalar @ refLevel): BaseDMG = 155 + (674 × flare_stacks).
    // Diferencial por stack = +674. Consume la mitad (floor) del flare por tick.
    baseOffset: 155,
    slopePerStack: 674,
  },
  tune_strain: {
    kind: 'tune_strain', name: 'Tune Strain', element: 'none',
    damageMode: 'parametric', damageModel: 'uniform', maxStacks: 1, tickInterval: 0,
    consumption: 'none', appliesDef: false, usesDefIgnore: false,
    refLevel: 90, baseAtRefLevel: 0, kStack: 0,
  },
  tune_rupture: {
    kind: 'tune_rupture', name: 'Tune Rupture', element: 'none',
    damageMode: 'burst', damageModel: 'uniform', maxStacks: 1, tickInterval: 0,
    consumption: 'none', appliesDef: false, usesDefIgnore: false,
    refLevel: 90, baseAtRefLevel: 0, kStack: 0,
  },
  tune_hack: {
    kind: 'tune_hack', name: 'Tune Hack', element: 'none',
    damageMode: 'burst', damageModel: 'uniform', maxStacks: 1, tickInterval: 0,
    consumption: 'none', appliesDef: false, usesDefIgnore: false,
    refLevel: 90, baseAtRefLevel: 0, kStack: 0,
  },
};

/** Devuelve la config de un estado (con fallback seguro). */
export function getStatusConfig(kind: NegativeStatusKind): StatusConfig {
  return STATUS_REGISTRY[kind];
}

// ═════════════════════════════════════════════════════════════════════════════
// REDUCCIÓN DE DEF (Havoc Bane)
// ═════════════════════════════════════════════════════════════════════════════

/** Reducción de DEF de Havoc Bane: -2% por stack. */
export const HAVOC_BANE_DEF_PCT_PER_STACK = 0.02;

/**
 * Nueva defensa efectiva de un enemigo tras aplicar/refrescar Havoc Bane.
 * @param baseDefense DEF base enemigo (estado inmodificado).
 * @param havocStacks stacks de Havoc Bane activos.
 * @returns DEF ajustada (clamped ≥ 0).
 */
export function applyHavocBaneDefense(baseDefense: number, havocStacks: number): number {
  const reduction = Math.max(0, havocStacks) * HAVOC_BANE_DEF_PCT_PER_STACK;
  return Math.max(0, baseDefense * (1 - Math.min(reduction, 0.99)));
}

// ═════════════════════════════════════════════════════════════════════════════
// CÁLCULO DEL DAÑO DE UN TICK (ESQUELETO REUTILIZABLE)
// ═════════════════════════════════════════════════════════════════════════════

export interface TickDamageResult {
  /** Instancia de daño de este tick (ya con stack factor + mitigaciones). */
  damage: number;
  /** Stacks tras el consumo de este tick. */
  nextStacks: number;
  /** Cargas de Rage tras el consumo (Electro Flare: se remueve al detonar). */
  nextRage: number;
  /** true si este tick agotó el estado (stacks llegaron a 0). */
  expired: boolean;
}

/**
 * Calcula el daño de UN tick de un estado y el consumo posterior.
 *
 * Notas de modelado (seguir docs/investigacion-estados/*):
 *  - Paramétricos que IGNORAN DEF (Spectro Frazzle, y Aero Erosion según la rama
 *    confirmada) usan `appliesDef=false` → solo RES + Amplify.
 *  - Los que aplican DEF usan el multiplicador de defensa con DEF Ignore si
 *    `usesDefIgnore`.
 *  - El multiplicador de stacks usa `[1+(n-1)×kStack]`; por defecto (kStack=0) la
 *    suma es lineal (1 stack = 1×, 3 = 3×).
 *  - Electro Flare: suma `(1 + rage × konstanteRage)`. `konstanteRage` se parametriza.
 *  - El Amp solo recibe amplificación ESPECÍFICA del estado (`ctx.statusAmplify`);
 *    el DMG Bonus elemental NO entra (los NS no lo usan).
 */
export function simulateStatusTick(
  config: StatusConfig,
  state: NegativeStatusState,
  ctx: NegativeStatusContext,
  levelOptions: LevelTableOptions,
  opts: { konstanteRage?: number } = {},
): TickDamageResult {
  if (config.damageMode === 'defDebuff' || config.damageMode === 'burst') {
    // defDebuff no produce daño; burst se detona con `detonateStatus` (no por tick).
    return { damage: 0, nextStacks: state.currentStacks, nextRage: state.rageStacks, expired: false };
  }

  // 1-2. Daño base escalado por stacks según el modelo:
  //   'uniform' → base(refLevel, nivel aplicador) × [1+(n-1)×kStack]
  //             (Spectro Frazzle, Aero Erosion)
  //   'affine'  → baseOffset + slopePerStack × n
  //             (Electro Flare: 155 + 674×flare). SIN stack factor.
  const stacks = state.currentStacks;
  let baseDmg: number;
  if (config.damageModel === 'affine') {
    baseDmg = (config.baseOffset ?? 0) + (config.slopePerStack ?? 0) * stacks;
  } else {
    const base1 = levelValue(config, levelOptions, ctx.attackerLvl);
    const sf = stackFactor(config, stacks);
    baseDmg = base1 * sf;
  }

  // 3. Mitigaciones: RES siempre; DEF solo si el estado la aplica.
  let dmg = toFixed(baseDmg); // en punto fijo escalado
  const resM = resMultiplier(ctx.enemyRes);
  dmg = mulFixed(dmg, toFixed(resM));

  if (config.appliesDef) {
    const ignore = config.usesDefIgnore ? ctx.defIgnore : 0;
    const defY = ctx.enemyDefense * (1 - ignore);
    const defN = 800 + 8 * ctx.attackerLvl;
    const dm = defMultiplier(defN, defY);
    dmg = mulFixed(dmg, toFixed(dm));
  }

  // 4. Amplificación específica del estado (NS Amp).
  dmg = mulFixed(dmg, toFixed(1 + ctx.statusAmplify));

  // 5. Electro Rage (overflow amplificador) — multiplicador final.
  let nextRage = state.rageStacks;
  if (config.kind === 'electro_flare' && state.rageStacks > 0) {
    const konst = opts.konstanteRage ?? 0.20; // 15%-25%, default 20%
    dmg = mulFixed(dmg, toFixed(1 + state.rageStacks * konst));
    nextRage = 0; // se remueve al activarse
  }

  // 6. Consumo según config.
  let nextStacks = stacks;
  if (config.consumption === 'onePerTick' && !state.freezeConsumption) {
    nextStacks = Math.max(0, stacks - 1);
  } else if (config.consumption === 'halfFloor' && !state.freezeConsumption) {
    nextStacks = Math.floor(stacks / 2);
  }

  const finalDmg = Math.round(fromFixed(dmg));
  return {
    damage: finalDmg,
    nextStacks,
    nextRage,
    expired: nextStacks <= 0,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// DETONACIÓN (Fusion Burst / Tune Responses)
// ═════════════════════════════════════════════════════════════════════════════

export interface DetonationResult {
  damage: number;
  /** true si la detonación purga los stacks (Fusion Burst) o los deja (Rage). */
  purged: boolean;
}

/**
 * Detonación de un estado de tipo 'burst'. Para Fusion Burst, el daño se calcula
 * con el número de stacks presentes (MV paramétrico) y luego se purgan.
 * @param mvMultiplier multiplicador de la habilidad (p. ej. Multiplicador_Forte de
 *   una respuesta de Tune, o 1.0 para la explosión de Fusion Burst con 0 flat).
 * @param baseStat stat base (ATK o nivel) para el burst.
 */
export function detonateStatus(
  config: StatusConfig,
  state: NegativeStatusState,
  ctx: NegativeStatusContext,
  mvMultiplier: number,
  baseStat: number,
): DetonationResult {
  // Daño de respuesta/burst: baseStat × mv × (1 + statusAmplify) × RES × DEF (si aplica).
  let dmg = toFixed(baseStat * mvMultiplier);
  const resM = resMultiplier(ctx.enemyRes);
  dmg = mulFixed(dmg, toFixed(resM));
  if (config.appliesDef) {
    const defN = 800 + 8 * ctx.attackerLvl;
    const dm = defMultiplier(defN, ctx.enemyDefense * (1 - ctx.defIgnore));
    dmg = mulFixed(dmg, toFixed(dm));
  }
  dmg = mulFixed(dmg, toFixed(1 + ctx.statusAmplify));

  const finalDmg = Math.round(fromFixed(dmg));
  // Fusion Burst purga al detonar; las respuestas de Tune disparan pero no "consumen"
  // el estado Interfered completo (depende del llamado). Por defecto purga.
  return { damage: finalDmg, purged: true };
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS DE ESTADO MUTABLE
// ═════════════════════════════════════════════════════════════════════════════

/** Crea un estado inicial para un estado, con los stacks dados. */
export function createStatusState(
  kind: NegativeStatusKind,
  stacks: number,
  durationSeconds: number,
  maxStacksOverride?: number,
): NegativeStatusState {
  const cfg = getStatusConfig(kind);
  return {
    kind,
    currentStacks: stacks,
    maxStacksLimit: maxStacksOverride ?? cfg.maxStacks,
    durationRemaining: durationSeconds,
    tickTimer: cfg.tickInterval && cfg.tickInterval > 0 ? cfg.tickInterval : 0,
    rageStacks: 0,
    freezeConsumption: false,
    tonePhase: 'none',
  };
}

/** Añade stacks respetando el límite; devuelve el overflow (para Electro Rage). */
export function addStacks(state: NegativeStatusState, amount: number): number {
  const overflow = Math.max(0, state.currentStacks + amount - state.maxStacksLimit);
  state.currentStacks = Math.min(state.maxStacksLimit, state.currentStacks + amount);
  return overflow;
}

/** Actualiza el temporizador del tick y devuelve true si hay que disparar un tick. */
export function advanceTimer(state: NegativeStatusState, dt: number): boolean {
  if (state.durationRemaining > 0) state.durationRemaining = Math.max(0, state.durationRemaining - dt);
  const cfg = getStatusConfig(state.kind);
  if (!cfg.tickInterval || cfg.tickInterval <= 0) return false;
  state.tickTimer -= dt;
  if (state.tickTimer <= 0) {
    state.tickTimer += cfg.tickInterval;
    return true;
  }
  return false;
}
