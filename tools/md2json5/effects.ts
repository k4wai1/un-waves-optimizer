/**
 * effects.ts — Conversor best-effort del texto narrativo de intro/outro/pasivas
 * y S1-S6 (secciones 3 y 4 de los .md) a effects[] del esquema JSON5 v2.0.
 *
 * Estrategia:
 *  - Cada bloque narrativo (pasiva, intro, outro, Sx) se convierte en un Effect.
 *  - Se reconocen patrones de buff sencillos ("X DMG +Y%", "ATK +Y%", "CRIT DMG +Y%",
 *    "All DMG +Y%", elem DMG +Y%, heal %, etc.) y se traducen a targets[]/modifiers[].
 *  - SIEMPRE se conserva el texto original en `descriptionTemplate` y `sourceText`.
 *  - Si no se reconoce / es una mecánica que el motor no puede representar, se emite
 *    con `unparsed: true` (requiere revisar) y/o `unsupported: "<motivo>"`.
 *
 * Esto garantiza que NO se pierde información aunque la conversión sea parcial: cada
 * effect lleva su cita fiel del .md.
 */
import type { Effect, EffectTarget, Modifier } from './generator';

// ---------------------------------------------------------------
// Tablas de mapeo palabra -> stat id / categoría
// ---------------------------------------------------------------
const ELEM_DMG: Record<string, string> = {
  glacio: 'glacio_dmg_', fusion: 'fusion_dmg_', electro: 'electro_dmg_',
  aero: 'aero_dmg_', spectro: 'spectro_dmg_', havoc: 'havoc_dmg_',
};

/** mapea un sustantivo de movimiento/tipo -> target Category id */
const MOVE_CATEGORY: Array<[RegExp, string]> = [
  [/basic attack/i, 'basicAttack'],
  [/resonance skill|skill/i, 'resonanceSkill'],
  [/heavy attack/i, 'heavyAttack'],
  [/resonance liberation|liberation/i, 'resonanceLiberation'],
  [/forte circuit/i, 'forteCircuit'],
  [/echo/i, 'echoSkill'],
  [/intro skill|intro/i, 'introSkill'],
  [/outro skill|outro/i, 'outroSkill'],
];

function moveCategory(text: string): string | null {
  for (const [re, id] of MOVE_CATEGORY) if (re.test(text)) return id;
  return null;
}

// ---------------------------------------------------------------
// Detección de un número en % (0..999) en el texto
// ---------------------------------------------------------------
function pctValue(text: string): number | null {
  let m = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  // evita capturar un % que sea parte de otra frase; tomamos el primer número con %
  return parseFloat(m[1]) / 100;
}

function addMod(operation: string, pct: number): Modifier[] {
  if (pct === null) return [];
  return [{
    operation, valueType: 'Percent', value: [Math.round(pct * 10000) / 10000],
  }];
}

// ---------------------------------------------------------------
// Intenta convertir un texto de buff a una estructura Effect.
// Devuelve {effect} completo o null si no aplica.
// ---------------------------------------------------------------
function tryParse(name: string, text: string, idPrefix: string): Effect | null {
  const sourceText = text.trim();
  const pct = pctValue(text);
  let targets: EffectTarget[] | null = null;
  let operation: Effect['operation'] = 'add';
  let modifiers: Modifier[] = [];

  const addDmgBuff = (targetId: string, type: EffectTarget['type'] = 'Category') => {
    if (pct === null) return false;
    targets = [{ type, id: targetId }];
    modifiers = addMod('Add', pct);
    return true;
  };

  // --- elemental DMG primero (para capturar "Spectro DMG Bonus" -> spectro_dmg_) ---
  for (const [el, id] of Object.entries(ELEM_DMG)) {
    if (new RegExp(`${el}\\s*DMG`, 'i').test(text) && /DMG/.test(text) && pct !== null) {
      targets = [{ type: 'Stat', id }];
      modifiers = addMod('Add', pct);
      return mk(name, sourceText, targets!, modifiers, operation, idPrefix);
    }
  }

  // --- DMG bonuses ---
  if (/all(?:dmg|attribut|elemental)? DMG|DMG (?:Bonus|Amplif)|all .* DMG/i.test(text)) {
    if (addDmgBuff('allDmgBonus_', 'Stat')) return mk(name, sourceText, targets!, modifiers, operation, idPrefix);
  }
  const moveCat = moveCategory(text);
  if (moveCat && /(?:skill|attack|blast|DMG)/i.test(text)) {
    if (addDmgBuff(moveCat)) return mk(name, sourceText, targets!, modifiers, operation, idPrefix);
  }

  // --- stat buffs ---
  const statMap: Array<[RegExp, string]> = [
    [/crit(ical)? (rate|rate )/i, 'critRate_'],
    [/crit (dmg|damage)|critical dmg/i, 'critDmg_'],
    [/atk/i, 'atk_'],
    [/attack %/i, 'atk_'],
    [/healing(?: bonus)?/i, 'healing_bonus_'],
    [/energy regen/i, 'energyRegen_'],
    [/def(?: (?:ignore|penetration))?/i, 'defIgnore_'],
    [/max hp|hp\b/i, 'hp_'],
  ];
  for (const [re, id] of statMap) {
    if (re.test(text) && pct !== null) {
      targets = [{ type: 'Stat', id }];
      modifiers = addMod('Add', pct);
      return mk(name, sourceText, targets!, modifiers, operation, idPrefix);
    }
  }

  return null;
}

function mk(
  name: string, sourceText: string, targets: EffectTarget[], modifiers: Modifier[],
  operation: Effect['operation'], idPrefix: string,
): Effect {
  return {
    id: `${idPrefix}_${name.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 30)}`,
    name,
    operation,
    value: modifiers.length ? modifiers[0].value : [],
    maxStacks: 1,
    exclusive: false,
    enabledByDefault: true,
    targets,
    modifiers,
    descriptionTemplate: sourceText,
    sourceText,
  };
}

// ---------------------------------------------------------------
// API pública: convierte arrays de textos narrativos en Effects
// ---------------------------------------------------------------
export function buildEffects(
  idPrefix: string,
  introOutroText: string,
  passivesText: string,
  sequences: string[],
  baseId: string,
): Effect[] {
  const out: Effect[] = [];

  // Juntamos los bloques de texto (intro/outro sin nombre y pasivas por párrafo)
  const narrative: Array<{ name: string; text: string; kind: string }> = [];

  // intro/outro: dos fragmentos, uno para "Intro Skill" y otro para "Outro Skill"
  const introM = introOutroText.match(/— Intro Skill.+?(?=— |$)/i);
  const outroM = introOutroText.match(/— Outro Skill.+?(?=— |$)/i);
  if (introM) narrative.push({ name: 'Intro', text: introM[0], kind: 'intro' });
  if (outroM) narrative.push({ name: 'Outro', text: outroM[0], kind: 'outro' });

  // pasivas: bloques por parrafo (suele ser "Nombre descripcion. Nombre2 desc2.")
  const passiveBlocks = passivesText.split(/(?<=[.。!?])\s+/);
  passiveBlocks.filter((s) => s.trim().length > 3).forEach((b, i) => {
    // Primer token alfanumérico es el nombre de la pasiva
    const nm = b.match(/^([A-Za-z][\w'' .-]*?)(?=\s|$)/);
    narrative.push({ name: nm ? nm[1] : `Passive ${i + 1}`, text: b, kind: 'passive' });
  });

  for (const n of narrative) {
    // Intro/outro: su % de daño ya está en actions[]; NO se convierten a modifier
    // porque el texto mezcla el multiplicador propio con buffs a aliados (no fiable).
    const noAuto = n.kind === 'intro' || n.kind === 'outro';
    const e = noAuto ? null : tryParseStrict(n.name, n.text, idPrefix);
    if (e) out.push(e);
    else {
      out.push({
        id: `${idPrefix}_${n.kind}_${out.length}`,
        name: n.name,
        operation: 'add',
        value: [],
        maxStacks: 1,
        exclusive: false,
        enabledByDefault: n.kind === 'intro' || n.kind === 'outro',
        targets: [],
        modifiers: [],
        descriptionTemplate: n.text.trim(),
        unparsed: true,
        unsupported: noAuto
          ? 'Intro/Outro: el % de daño propio ya está en actions[]; buffs a aliados requieren modelado manual.'
          : undefined,
        sourceText: n.text.trim(),
      });
    }
  }

  // secuencias S1-S6
  for (const s of sequences) {
    const m = s.match(/^(S[1-6]):\s*(.+?)\s*[—-]\s*(.+)$/);
    if (!m) continue;
    const seqName = m[1]; const title = m[2]; const body = m[3];
    // NOTA: S1-S6 son condicionales multi-cláusula y la conversión automática tiende a
    // elegir el target equivocado. Solo se auto-parsea si tryParseStrict reconoce UN buff
    // simple e inequívoco; si no, se conserva el texto fuente marcado como unparsed.
    const e = tryParseStrict(`${seqName}: ${title}`, body, idPrefix);
    if (e) { e.enabledByDefault = false; out.push(e); }
    else {
      out.push({
        id: `${idPrefix}_${seqName.toLowerCase()}`,
        name: `${seqName}: ${title}`,
        operation: 'add',
        value: [],
        maxStacks: 1,
        exclusive: false,
        enabledByDefault: false,
        targets: [],
        modifiers: [],
        descriptionTemplate: body.trim(),
        unparsed: true,
        unsupported: 'Mecánica/secuencia condicional: requiere modelado manual.',
        sourceText: s,
      });
    }
  }

  return out;
}

/**
 * Variante estricta de tryParse: solo devuelve un Effect si el buff es una frase simple e
 * inequívoca (un único % y un único target), sin cláusulas condicionales/multi-buff.
 */
function tryParseStrict(name: string, text: string, idPrefix: string): Effect | null {
  const lowered = text.toLowerCase();
  if (/(?:when|each|stack|trigger|after|,|;|chain|multi\b)/.test(lowered)) return null;
  // solo un número con % (buff simple)
  const pctCount = (text.match(/%/g) ?? []).length;
  if (pctCount !== 1) return null;
  return tryParse(name, text, idPrefix);
}

export {};
