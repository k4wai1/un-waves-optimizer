# Pando Architecture – Low‑Level Integration Guide

This document explains how the calculation engine in `/libs/pando/engine/` is integrated
with the game‑specific formula and stats layers in `/libs/zzz/formula/` and
`/libs/zzz/stats/`.
It is intended as a reference for building an identical structure for *Wuthering Waves*.

---

## 1. Declaring Base Character Stats

### 1.1 Raw data source
Base stats (HP, ATK, DEF, etc.) for each character are stored in JSON files under
`/libs/zzz/dm/` (data‑mining).
The file `readDMJSON` utility reads these files at build time.

### 1.2 Stat generation (`/libs/zzz/stats/`)
The executor `gen-stats` (defined in `/libs/zzz/stats/src/executors/gen-stats/`) processes
the raw DM data and produces a TypeScript file that exports a constant object for each
character.
Example output (simplified):

```ts
// generated file: libs/zzz/stats/src/char/Anby.ts
export const data = {
  base: {
    hp: 1000,
    atk: 150,
    def: 60,
  },
  promotion: {
    // per ascension level
  },
} as const;


These generated files are placed in /libs/zzz/stats/src/char/.

1.3 Formula layer (/libs/zzz/formula/)

The formula layer reads the generated stats and wraps them into read nodes (see §2).
The entry point is /libs/zzz/formula/src/data/util/read.ts, which defines a Read class
that extends the engine’s BaseRead.


// simplified from read.ts
export class Read extends BaseRead<Tag> {
  // adds a value (number or node) to the tag map
  add(value: number | string | AnyNode, force = false): TagMapNodeEntry { … }
}


Each base stat is registered with a specific tag, e.g.:


const { hp, atk, def } = reader.withTag({ sheet: 'char', src: 'base' });
hp.add(1000);
atk.add(150);
def.add(60);


The tag categories (sheet, src, q, etc.) are defined in
/libs/pando/engine/src/tag/type.ts.

------------------------------------------------------------------------------------------


2. Building Mathematical Nodes for a Basic Attack

2.1 Node types

The engine (/libs/pando/engine/src/node/type.ts) provides a set of node types:

 • Const<number> – a constant value
 • Sum<OP> – sum of children
 • Prod<OP> – product of children
 • Threshold<NumNode, OP> – conditional (if‑then‑else)
 • Match<NumNode, OP> – pattern matching
 • Lookup<NumNode, OP> – lookup in a tag map
 • ReadNode<number> – reads a value from the tag map

All nodes implement the NumNode union type.

2.2 Constructing a basic‑attack damage formula

A typical basic‑attack damage formula looks like:


damage = baseATK * skillMultiplier * (1 + dmgBonus) * (1 + critDmg) * enemyDefReduction


In the formula layer this is expressed as a tree of nodes:


// pseudo‑code from a character sheet
const baseATK = reader.withTag({ sheet: 'char', q: 'base_atk' });
const skillMult = reader.withTag({ sheet: 'skill', q: 'normal_attack', src: 'mult' });
const dmgBonus = reader.withTag({ sheet: 'char', q: 'dmg_bonus' });
const critDmg = reader.withTag({ sheet: 'char', q: 'crit_dmg' });
const defReduction = reader.withTag({ sheet: 'enemy', q: 'def_mult' });

const damage = Prod(
  baseATK,
  skillMult,
  Sum(1, dmgBonus),
  Sum(1, critDmg),
  defReduction
);


Each reader.withTag(…) returns a ReadNode that will later be resolved by the engine.

2.3 Registration in the tag map

The formula layer registers these nodes using the add method of Read.
For example, the skill multiplier is registered in a character‑specific file under
/libs/zzz/formula/src/char/:


// libs/zzz/formula/src/char/Anby.ts
export const data = reader
  .withTag({ sheet: 'char', q: 'base_atk' })
  .add(150);


The engine’s TagMapKeys (in /libs/pando/engine/src/tag/keys.ts) compiles these
registrations into a compact binary format for fast lookup.

------------------------------------------------------------------------------------------


3. Connecting Calculations to the User Interface

3.1 UI‑side data layer (/libs/zzz/ui/)

The UI does not directly call the engine. Instead, it uses a UIData class (defined in
/libs/gi/uidata/src/uiData.ts – the same pattern is used for ZZZ).


export class UIData {
  origin: UIData;
  children = new Map<Data, UIData>();
  data: Data[];
  nodes = new Map<NumNode | StrNode, CalcResult<number | string | undefined>>();
  processed = new Map<…, NodeDisplay<…>>();
}


When a component needs a value (e.g., “show ATK”), it calls:


const atkNode = reader.withTag({ sheet: 'char', q: 'base_atk' });
const result = uiData.compute(atkNode);
// result.value === 150


3.2 React hooks

The UI uses React hooks such as useBoolState (from
/libs/common/react-util/src/hooks/useBoolState.tsx) to manage state, but the actual
computation is triggered by a custom hook that subscribes to database changes.

In /libs/zzz/ui/src/Components/ZCard.tsx (and similar components), the pattern is:


const { database } = useDatabase(); // from /libs/zzz/db/src/Database/Database.ts
const uiData = useMemo(() => new UIData(database), [database]);
const atk = uiData.compute(atkNode);


3.3 Database triggers

When the user changes a character’s level or equipment, the database
(/libs/zzz/db/src/Database/Database.ts) emits a 'update' event.
The UIData instance listens to these events and invalidates its cached nodes, causing a
re‑computation on the next render.

3.4 Display formatting

The computed raw numbers are passed to React components that format them (e.g., rounding,
adding “%” signs).
The formatting logic lives in /libs/zzz/ui/src/Components/ and uses the FormulaText type
(defined in /libs/game-opt/sheet-ui/src/types/formulaText.ts) to describe how a value
should be displayed.

------------------------------------------------------------------------------------------


Summary of the Data Flow


DM JSON files
    ↓ (gen-stats executor)
Generated stats (TypeScript constants)
    ↓ (formula layer)
Read nodes with tags
    ↓ (engine compilation)
TagMapKeys + TagMapValues (binary lookup)
    ↓ (runtime)
UIData.compute(node) → CalcResult
    ↓ (React)
UI component renders the value


Each step is isolated and can be replicated for a new game by:

 1 Creating a /libs/<game>/dm/ folder with raw data.
 2 Creating a /libs/<game>/stats/ executor that generates base stats.
 3 Creating a /libs/<game>/formula/ layer that registers nodes using the same Read class.
 4 Creating a /libs/<game>/ui/ layer that uses UIData and React hooks.

The engine (/libs/pando/engine/) remains unchanged – it is game‑agnostic.
