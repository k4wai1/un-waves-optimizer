/**
 * md2json5 — Conversor de combate-personajes/*.md a specs JSON5 de resonators.
 *
 * Esquema objetivo: libs/ww/stats/src/resonators/<Id>.json5 (schemaVersion 2.0).
 *
 * Automático y fiel a los .md:
 *   - metadata (elemento, tipo de arma, rareza).
 *   - stats base por nivel (tabla de ascensión 1-90) en breakpoints 1/20/40/50/60/70/80/90.
 *   - actions[]: un action por hit (multi-hit descompuesto por término), con
 *     multiplier[] por cada nivel REAL de skill (Lv1..LvN, N=9 o 10 según slider del .md).
 *
 * effectos (intro/outro/pasivas/S1-S6) se generan aparte (ver effects.ts), conservando
 * el texto fuente. En esta primera versión de validación se emite un array vacío con aviso.
 *
 * Uso:
 *   ts-node tools/md2json5/generator.ts <md> [md...]      # escribe .json5 por defecto
 *   ts-node tools/md2json5/generator.ts --all             # todos los .md
 *   ts-node tools/md2json5/generator.ts --validate <md>   # imprime JSON sin escribir
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildEffects } from './effects';

// ---------------------------------------------------------------
// Tipos (esquema JSON5 v2.0)
// ---------------------------------------------------------------
export type StatKey = 'ATK' | 'HP' | 'DEF' | 'FLAT';
export interface Scaling { stat: StatKey; multiplier: number[]; hits: number }
export interface Action { id: string; name: string; type: string; scaling: Scaling[]; tags: string[]; cooldown?: number; kind?: 'damage' | 'heal' | 'shield' | 'coordinated' }
export interface EffectTarget { type: 'Stat' | 'Category' | 'Action'; id: string }
export interface Modifier { operation: string; valueType: string; value: number[] }
export interface Effect {
  id: string; name: string; operation: 'add' | 'multiply' | 'enable';
  value: number[]; maxStacks: number; exclusive: boolean; enabledByDefault: boolean;
  targets: EffectTarget[]; modifiers: Modifier[]; descriptionTemplate: string;
  unparsed?: boolean; unsupported?: string; sourceText?: string;
}

// ---------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------
export const ELEMENT_TAG: Record<string, string> = {
  Glacio: 'glacio', Fusion: 'fusion', Electro: 'electro', Aero: 'aero',
  Spectro: 'spectro', Havoc: 'havoc',
};

const TYPE_BY_HEADER: Record<string, string> = {
  'Basic Attack': 'basicAttack', 'Normal Attack': 'basicAttack',
  'Resonance Skill': 'resonanceSkill', 'Resonance Liberation': 'resonanceLiberation',
  'Forte Circuit': 'forteCircuit', 'Intro Skill': 'introSkill', 'Outro Skill': 'outroSkill',
};

// ---------------------------------------------------------------
// Parser de celda multiplicador
// ---------------------------------------------------------------
// Parser de celda multiplicador
// ---------------------------------------------------------------
export interface Term { mult: number; hits: number; stat: StatKey }
export interface Cell {
  /** términos de daño/curación porcentual (cada uno por golpe) */
  terms: Term[];
  /** base plana (heal tipo "660 + 3.00% HP"); si existe, la curación tiene parte FLAT */
  flat: number | null;
}
const emptyCell = (stat: StatKey): Cell => ({ terms: [{ mult: 0, hits: 1, stat }], flat: null });

export function parseCell(raw: string, defaultStat: StatKey = 'ATK'): Cell {
  let stat: StatKey = defaultStat;
  if (/HP/i.test(raw)) stat = 'HP';
  else if (/DEF/i.test(raw)) stat = 'DEF';

  const parts: Array<{ mult: number; hits: number; isPct: boolean }> = [];
  const re = /(\d+(?:\.\d+)?)\s*%?\s*(?:\*\s*(\d+))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const num = parseFloat(m[1]);
    const hits = m[2] ? parseInt(m[2], 10) : 1;
    const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 3);
    const isPct = /%/.test(m[0]) || /HP|DEF/.test(after);
    parts.push({ mult: num, hits, isPct });
  }
  if (!parts.length) return emptyCell(stat);

  const pctParts = parts.filter((p) => p.isPct);
  const numFlat = parts.filter((p) => !p.isPct);

  if (numFlat.length && pctParts.length) {
    // heal flat + % : "660 + 3.00% HP" -> flat base (número sin %) + términos %
    const flat = numFlat.reduce((a, p) => a + p.mult, 0);
    const terms = pctParts.map((p) => ({ mult: p.mult / 100, hits: p.hits, stat }));
    return { terms, flat };
  }
  return { terms: parts.map((p) => ({ mult: p.mult / 100, hits: p.hits, stat })), flat: null };
}

// ---------------------------------------------------------------
// Estructura parseada
// ---------------------------------------------------------------
interface SkillTable { startLv: number; cols: number; rows: Array<{ name: string; values: string[] }> }
interface SkillSection { header: string; type: string; real: SkillTable | null; theory: SkillTable | null }
export interface ParsedMd {
  name: string; element: string; weapon: string; rarity: number;
  baseStats: { hp: number; atk: number; def: number; critRate: number; critDmg: number; energyRegen: number };
  ascension: Array<{ lvl: number; hp: number; atk: number; def: number }>;
  skills: SkillSection[];
  introOutro: string; passives: string; sequences: string[];
}

const cleanBold = (s: string): string => s.replace(/\*\*/g, '').trim();

function parseTablesIn(lines: string[], fromIdx: number): SkillSection[] {
  const skills: SkillSection[] = [];
  for (let i = fromIdx; i < lines.length; i++) {
    const h = lines[i].match(/^###\s+(.+?)\s*—\s*(.+)\s*$/);
    if (!h) continue;
    const typeKey = Object.keys(TYPE_BY_HEADER).find((k) => h[2].includes(k));
    const sec: SkillSection = { header: h[2].trim(), type: typeKey ? TYPE_BY_HEADER[typeKey] : 'misc', real: null, theory: null };
    skills.push(sec);
    let cur: SkillTable | null = null;
    let theory = false;
    const flush = () => { if (cur) { if (theory) sec.theory = cur; else sec.real = cur; } };
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^###\s/.test(l) && /—/.test(l)) break;
      if (/^##\s/.test(l)) break;
      if (/^\*\*Escala te/.test(l)) { flush(); theory = true; cur = null; continue; }
      if (/^\|/.test(l)) {
        const cells = l.split('|').map(cleanBold).map((c) => c.trim());
        // eliminar la celda vacía inicial (de "| a | b |" -> ["", a, b])
        if (cells.length > 1 && cells[0] === '') cells.shift();
        if (cells.length > 1 && cells[cells.length - 1] === '') cells.pop();
        const lvM = cells[0]?.match(/^Lv(\d+)/);
        if (lvM) { flush(); cur = { startLv: parseInt(lvM[1], 10), cols: cells.length, rows: [] }; continue; }
        if (/^---/.test(cells[0] ?? '')) continue;
        if (cur && cells[0] && cells[0] !== '') {
          cur.rows.push({ name: cells[0], values: cells.slice(1).filter((c) => c !== '') });
        }
      }
    }
    flush();
  }
  return skills;
}

export function parseMd(text: string): ParsedMd {
  let name = '';
  const mName = text.match(/^#\s+(.+?)(?:\s*[—-]\s*Referencia.*)?$/m);
  if (mName) name = mName[1].trim();

  let element = ''; let weapon = ''; let rarity = 5;
  const metaLine = text.split('\n').find((l) => l.includes('**Elemento:**'));
  if (metaLine) {
    const el = metaLine.match(/\*\*Elemento:\*\*\s*(\w+)/); if (el) element = el[1];
    const w = metaLine.match(/\*\*Arma:\*\*\s*(\w+)/); if (w) weapon = w[1];
    const r = metaLine.match(/\*\*Rareza:\*\*\s*(\d+)/); if (r) rarity = parseInt(r[1], 10);
  }

  const get = (k: string) => { const m = text.match(new RegExp(`\\*\\*${k}\\*\\*\\s*\\|\\s*([\\d.]+)`)); return m ? parseFloat(m[1]) : 0; };
  const baseStats = { hp: get('HP Base'), atk: get('ATK Base'), def: get('DEF Base'), critRate: 0.05, critDmg: 1.5, energyRegen: 1 };
  const crM = text.match(/\*\*Crit\. Rate\*\*\s*\|\s*([\d.]+)%/); if (crM) baseStats.critRate = parseFloat(crM[1]) / 100;
  const cdM = text.match(/\*\*Crit\. DMG\*\*\s*\|\s*([\d.]+)%/); if (cdM) baseStats.critDmg = parseFloat(cdM[1]) / 100;
  const erM = text.match(/\*\*Energy Regen\*\*\s*\|\s*([\d.]+)%/); if (erM) baseStats.energyRegen = parseFloat(erM[1]) / 100;

  const lines = text.split('\n');
  const ascension: Array<{ lvl: number; hp: number; atk: number; def: number }> = [];
  let inAsc = false;
  for (const l of lines) {
    if (/###\s*1\.1 Tabla de ascensi/.test(l)) { inAsc = true; continue; }
    if (inAsc && /^###\s/.test(l)) break;
    if (inAsc) {
      const mm = l.match(/^\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/);
      if (mm) ascension.push({ lvl: +mm[1], hp: parseFloat(mm[2]), atk: parseFloat(mm[3]), def: parseFloat(mm[4]) });
    }
  }

  let skillStart = lines.findIndex((l) => /^###\s.+ — .*(Attack|Skill|Forte|Circuit|Otra)/i.test(l));
  if (skillStart < 0) skillStart = lines.findIndex((l) => /^###\s/.test(l));
  const skills = skillStart >= 0 ? parseTablesIn(lines, skillStart) : [];

  let introOutro = '';
  const ioM = text.match(/### Intro\/Outro([\s\S]*?)(?=### Habilidades Inherentes|---\n\n## 4|## 4\.)/);
  if (ioM) introOutro = ioM[1].trim();
  let passives = '';
  const passM = text.match(/(### Habilidades Inherentes[\s\S]*?)(?=---\n\n## 4|## 4\.|$)/);
  if (passM) passives = passM[1].replace(/^### Habilidades Inherentes[\s\S]*?\n+/, '').trim();

  const sequences: string[] = [];
  const seqM = text.match(/## 4\. Resonance Chain([\s\S]*?)(?=## 5\.|$)/);
  if (seqM && seqM[1]) for (const l of seqM[1].split('\n')) {
    const mm = l.match(/^\|\s*\*\*(S[1-6])\*\*\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
    if (mm) sequences.push(`${mm[1]}: ${mm[2].trim()} — ${mm[3].trim()}`);
  }

  return { name, element, weapon, rarity, baseStats, ascension, skills, introOutro, passives, sequences };
}

// ---------------------------------------------------------------
// Emisión JSON5
// ---------------------------------------------------------------
const BREAKPOINTS = [1, 20, 40, 50, 60, 70, 80, 90];
const n = (v: number): number => Math.round(v * 100) / 100;

function buildStats(asc: Array<{ lvl: number; hp: number; atk: number; def: number }>) {
  const byLvl = new Map(asc.map((a) => [a.lvl, a]));
  const pick = (key: 'hp' | 'atk' | 'def') => {
    const o: Record<string, number> = {};
    for (const b of BREAKPOINTS) { const r = byLvl.get(b); if (r) o[`${b}`] = n(r[key]); }
    return o;
  };
  return { hp: pick('hp'), atk: pick('atk'), def: pick('def') };
}

type ActionType = 'basicAttack' | 'heavyAttack' | 'plungingAttack' | 'dodgeCounter'
  | 'resonanceSkill' | 'resonanceLiberation' | 'forteCircuit' | 'introSkill' | 'outroSkill' | 'echoSkill';

function rowType(sectionType: string, rowName: string): ActionType {
  const rn = rowName.toLowerCase();
  if (['basicAttack', 'forteCircuit'].includes(sectionType)) {
    if (/mid-air|midair|plung/.test(rn)) return 'plungingAttack';
    if (/dodge/.test(rn)) return 'dodgeCounter';
    if (/heavy/.test(rn)) return 'heavyAttack';
  }
  const valid = ['basicAttack', 'heavyAttack', 'plungingAttack', 'dodgeCounter', 'resonanceSkill',
    'resonanceLiberation', 'forteCircuit', 'introSkill', 'outroSkill', 'echoSkill'];
  return (valid.includes(sectionType) ? sectionType : 'forteCircuit') as ActionType;
}

function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 26);
}

/**
 * Deduce la forma de cálculo de una fila del .md según su nombre (declarativo v2.1).
 * - cura: filas con Heal/Healing/Recovery/Restore/Recuperation
 * - escudo: filas con Shield (pero NO los "Damage Reduction" de escudo, que son stats)
 * - coordinado: filas con Coordinated/Coordination
 * - resto: daño (undefined)
 */
export function deriveActionKind(rowName: string): 'damage' | 'heal' | 'shield' | 'coordinated' | undefined {
  const n = rowName.toLowerCase();
  if (/(coordinated|coordination)/i.test(n)) return 'coordinated';
  if (/(shield)/i.test(n) && !/damage reduction|resist/i.test(n) && !/shield (heal)/i.test(n)) return 'shield';
  if (/(heal|healing|recovery|restore|recuperat)/i.test(n)) return 'heal';
  return undefined;
}

function buildActions(baseId: string, skills: SkillSection[]): Action[] {
  const actions: Action[] = [];
  const used = new Set<string>();
  const push = (a: Action) => { let id = `${baseId}_${a.type}_${a.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 40)}`; let c = 1; while (used.has(id)) { id = `${id}_${c++}`; } used.add(id); a.id = id; actions.push(a); };
  for (const sec of skills) {
    const table = sec.real;
    if (!table) continue;
    const lvCount = table.cols || table.rows[0]?.values.length || 0;
    // Real levels en el juego = 10 SIEMPRE. Si la tabla real tiene 9 columnas (slider
    // max=19, p.ej. Jinhsi/Jianxin), el Lv10 es la PRIMERA columna de la teoría (startLv=10).
    // Completamos con ese valor para guardar siempre 10 multipliers reales.
    const theory = sec.theory?.startLv === 10 ? sec.theory : null;
    const theoryRowVal = (rowName: string): string | undefined => {
      if (!theory) return undefined;
      const tr = theory.rows.find((r) => r.name === rowName);
      return tr?.values[0]; // primera columna = Lv10
    };

    for (const row of table.rows) {
      const lower = row.name.toLowerCase();
      if (/sta cost|duration|cooldown$|concerto|resonance cost| per |requisito|level/.test(lower)) continue;
      const rowKind = deriveActionKind(row.name);
      const statGuessed: StatKey = /HP/i.test(row.name) ? 'HP' : (/DEF/i.test(row.name) ? 'DEF' : 'ATK');
      const cells = row.values.map((v) => parseCell(v ?? '', statGuessed));
      while (cells.length < lvCount) cells.push(emptyCell(statGuessed));
      // si falta el Lv10 y la teoría lo tiene, anexarlo
      const lv10Raw = theoryRowVal(row.name);
      if (cells.length === 9 && lv10Raw !== undefined && sec.theory) {
        const lv10Cell = parseCell(lv10Raw, statGuessed);
        cells.push(lv10Cell);
      }
      const total = cells.length; // 9 o 10

      // 1) parte FLAT si algún nivel tiene base plana (heal "660 + 3.00% HP")
      const hasFlat = cells.some((c) => c.flat !== null);
      if (hasFlat) {
        const flatMults: number[] = cells.map((c) => c.flat ?? 0);
        push({ id: '', name: `${row.name} (Flat)`, type: rowType(sec.type, row.name),
          scaling: [{ stat: 'FLAT', multiplier: flatMults, hits: 1 }], tags: [], kind: rowKind });
      }

      // 2) términos % por golpe
      const termsByLv = cells.map((c) => c.terms);
      const nTerms = Math.max(...termsByLv.map((t) => t.length), 1);
      for (let k = 0; k < nTerms; k++) {
        const mults: number[] = []; let hits = 1; let stat: StatKey = statGuessed;
        for (let lv = 0; lv < total; lv++) {
          const t = termsByLv[lv][k];
          if (!t) { mults.push(0); continue; }
          if (lv === 0) { hits = t.hits; stat = t.stat; }
          mults.push(Math.round(t.mult * 10000) / 10000);
        }
        push({ id: '', name: nTerms > 1 ? `${row.name} - Hit ${k + 1}` : row.name,
          type: rowType(sec.type, row.name),
          scaling: [{ stat, multiplier: mults, hits }], tags: [], kind: rowKind });
      }
    }
  }
  return actions;
}

function fmtObj(o: Record<string, number>): string {
  return `{ ${Object.entries(o).map(([k, v]) => `"${k}": ${v}`).join(', ')} }`;
}

function capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
const esc = (s: string): string => s.replace(/"/g, '\\"').replace(/\n/g, '\\n');

export function buildJson5(p: ParsedMd, baseId: string): string {
  const stats = buildStats(p.ascension);
  const actions = buildActions(baseId, p.skills);
  const effects = buildEffects(baseId, p.introOutro, p.passives, p.sequences, baseId);
  const L: string[] = [];
  L.push('{');
  L.push('  // GENERADO por tools/md2json5/generator.ts desde combate-personajes/*.md');
  L.push('  // Fuente: ' + p.name + ' | elemento ' + p.element + ' | arma ' + p.weapon + '.');
  L.push('  // multipliers[] = nivel real de habilidad (Lv1..LvN). N=' + (actions[0]?.scaling[0]?.multiplier.length ?? '?') + ' detectado en el .md.');
  L.push('  metadata: {');
  L.push('    schemaVersion: "2.0",');
  L.push(`    id: "${baseId}",`);
  L.push(`    name: "${p.name}",`);
  L.push('    entityType: "resonator",');
  L.push(`    rarity: ${p.rarity},`);
  L.push('    version: "1.0",');
  L.push(`    element: "${capitalize(p.element)}",`);
  L.push(`    weaponType: "${p.weapon}",`);
  const elTag = ELEMENT_TAG[capitalize(p.element)];
  const tags = elTag ? [`"${elTag}"`] : [];
  L.push(`    tags: [${tags.join(', ')}],`);
  L.push('    aliases: [],');
  L.push('  },');
  L.push('  stats: {');
  L.push(`    hp: ${fmtObj(stats.hp)},`);
  L.push(`    atk: ${fmtObj(stats.atk)},`);
  L.push(`    def: ${fmtObj(stats.def)},`);
  L.push('    secondaryAttribute: null,');
  L.push('    statNodes: [], // TODO: el .md no expone el árbol de nodos de ascensión; rellenar a mano.');
  L.push('    tuneBreakBoost: 0,');
  L.push('    offTuneBuildupRate: 1,');
  L.push('  },');
  L.push('  actions: [');
  for (const a of actions) {
    L.push('    {');
    L.push(`      id: "${a.id}",`);
    L.push(`      name: "${a.name.replace(/"/g, '\\"')}",`);
    L.push(`      type: "${a.type}",`);
    if (a.kind) L.push(`      kind: "${a.kind}",`);
    L.push('      scaling: [');
    for (const s of a.scaling) {
      L.push('        {');
      L.push(`          stat: "${s.stat}",`);
      L.push(`          multiplier: [${s.multiplier.join(', ')}],`);
      L.push('        },');
    }
    L.push('      ],');
    L.push('      tags: [],');
    L.push('    },');
  }
  L.push('  ],');
  L.push('  effects: [');
  for (const e of effects) L.push(renderEffect(e));
  L.push('  ],');
  L.push('  mechanics: [],');
  L.push('}');
  return L.join('\n');
}

function renderEffect(e: Effect): string {
  const L: string[] = [];
  L.push('    {');
  L.push(`      id: "${e.id}",`);
  L.push(`      name: "${esc(e.name)}",`);
  L.push(`      operation: "${e.operation}",`);
  L.push(`      value: [${e.value.join(', ')}],`);
  L.push(`      maxStacks: ${e.maxStacks},`);
  L.push(`      exclusive: ${e.exclusive},`);
  L.push(`      enabledByDefault: ${e.enabledByDefault},`);
  L.push('      targets: [');
  for (const t of e.targets) L.push(`        { type: "${t.type}", id: "${t.id}" },`);
  L.push('      ],');
  L.push('      modifiers: [');
  for (const m of e.modifiers) {
    L.push('        {');
    L.push(`          operation: "${m.operation}",`);
    L.push(`          valueType: "${m.valueType}",`);
    L.push(`          value: [${m.value.join(', ')}],`);
    L.push('        },');
  }
  L.push('      ],');
  if (e.unparsed) L.push('      // [REVISAR] No pudo traducirse a modifier automaticamente.');
  if (e.unsupported) L.push(`      // [NO SOPORTADO] ${e.unsupported}`);
  L.push(`      descriptionTemplate: ${JSON.stringify(e.descriptionTemplate)},`);
  L.push('    },');
  return L.join('\n');
}

// ---------------------------------------------------------------
// main
// ---------------------------------------------------------------
const ROOT = process.cwd();
const MD_ROOT = path.join(ROOT, 'combate-personajes');
const OUT_ROOT = path.join(ROOT, 'libs/ww/stats/src/resonators');

function baseIdFromMd(f: string): string {
  return path.basename(f).replace(/-combate\.md$/, '').split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function main(): void {
  const args = process.argv.slice(2);
  const validate = args.includes('--validate');
  const all = args.includes('--all');
  let mdFiles: string[];
  if (all) mdFiles = fs.readdirSync(MD_ROOT).filter((f) => f.endsWith('.md')).sort();
  else mdFiles = args.filter((a) => a.endsWith('.md'));

  for (const f of mdFiles) {
    const full = path.join(MD_ROOT, path.basename(f));
    if (!fs.existsSync(full)) { console.error(`No existe: ${full}`); continue; }
    const p = parseMd(fs.readFileSync(full, 'utf8'));
    const id = baseIdFromMd(f);
    const out = buildJson5(p, id);
    // Guard de calidad: datos incompletos (p.ej. legacy format sin tabla de ascensión)
    if (p.ascension.length < 8) {
      console.warn(`SKIP ${f}: ascension incompleta (${p.ascension.length} filas). Formato .md no soportado o datos faltantes.`);
      continue;
    }
    if (validate) {
      console.log(`\n===== ${f} (${p.name} | ${p.element} | ${p.weapon} | ${p.rarity}★) =====`);
      console.log(` skills: ${p.skills.length}, ascension: ${p.ascension.length}, sequences: ${p.sequences.length}`);
      for (const s of p.skills) {
        const cols = s.real?.rows[0]?.values.length ?? 0;
        console.log(`  [${s.type}] ${s.header} | real Lv${s.real?.startLv}+ (${cols} cols) | rows=${s.real?.rows.length ?? 0}`);
      }
      console.log(out);
    } else {
      const outFile = path.join(OUT_ROOT, `${id}.json5`);
      fs.writeFileSync(outFile, out + '\n');
      console.log(`Write: ${outFile} | ${p.name} | acciones=${p.skills.length}`);
    }
  }
}
main();
