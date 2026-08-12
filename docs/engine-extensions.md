# Extensiones del motor para las armas

> Guía para entender **qué se cambió en el motor de cálculo** para que las 120 armas
> funcionen, sin necesidad de ser programador. Explica los conceptos, no el código.
>
> Escrito: 2026-08-10

---

## 1. ¿Qué es "el motor"?

El motor es la parte del proyecto que **calcula los números**: cuánto daño hace un golpe,
cuánta vida cura, cuánto escudo da. Vive en:

```
app/ww-frontend/src/engine/
├── calculator.ts        ← las fórmulas de daño/cura/escudo
├── effectResolver.ts    ← interpreta los efectos ("+10% ATK") de personajes y armas
└── combatMechanics.spec.ts ← tests que verifican que las fórmulas son correctas
```

Los datos (personajes, armas, ecos) **no** están en el motor: están en archivos `.json5`.
El motor los lee y calcula. Por eso puedes editar un `.json5` sin tocar código.

---

## 2. ¿Por qué hubo que extender el motor?

Antes de este trabajo el motor solo sabía calcular **daño de personajes**. Las armas
introdujeron 3 cosas nuevas que el motor no entendía:

1. **Pasivas complejas** — muchas armas 5★ tienen efectos que dependen de cosas que el
   motor no simula (estados elementales, estar dentro/fuera del campo, buffs de equipo,
   ignorar DEF/RES bajo condiciones). Ejemplo real de **Frostburn**:
   > "After the wielder applies Glacio Chafe, Glacio DMG is Amplified by 28%, and
   > Resonance Liberation DMG ignores 10% of the target's DEF..."
   El motor no sabe qué es "Glacio Chafe", así que no puede calcularlo.

2. **Stats por nivel (1-90)** — las armas tienen ATK base y stat secundario que crecen
   con cada nivel, no en saltos de ascensión como los personajes.

3. **Buff base siempre activo** — el "Increases ATK by 12%" que todas las armas 5★
   tienen de base, independiente de condiciones.

---

## 3. Las extensiones (en orden de importancia)

### 3.1 `description_raw`: pasivas que el motor no simula (texto visible)

**Problema:** no podemos calcular la pasiva de Frostburn, pero no queremos perderla.

**Solución:** se añadió un campo `description_raw` a los efectos. Es un **texto plano**
que se muestra en la web para que el usuario lea qué hace la pasiva, aunque el motor
no la aplique.

```json5
{
  "id": "frostburn_passive",
  "name": "Pasiva: Frostburn",
  "target": null,                 // sin target = no aplica nada en el cálculo
  "modifiers": [],
  "enabledByDefault": false,
  "description_raw": "After the wielder applies Glacio Chafe, Glacio DMG is Amplified by 28%..."
}
```

**Resultado en la web:** el efecto aparece con su texto completo, con un toggle OFF
(porque no se puede activar de forma automática aún). Ver
`libs/ww/stats/src/weapons/Frostburn.json5`.

> ⚠️ **Importante:** un efecto con `description_raw` y `target: null` **no cambia ningún
> número**. Es documentación visible, no cálculo. Si el usuario quiere que SÍ afecte,
> hay que modelarlo con `target` + `modifiers` (sección 3.3).

### 3.2 Stats de nivel 1-90 en las armas

**Problema:** los personajes suben de nivel en saltos (1, 20, 40, 50, 60, 70, 80, 90),
pero las armas tienen un número por **cada** nivel (1, 2, 3, ..., 90).

**Solución:** el formato de stats ya soporta claves por nivel (`"1": 33, "2": 35.75, ...`).
Las armas simplemente rellenan las 90 claves:

```json5
"stats": {
  "atk": { "1": 33, "2": 35.75, "...": "...", "90": 587.50 },
  "secondaryAttribute": {
    "key": "critRate_",               // qué stat secundario es
    "values": { "1": 0.038, "...": "...", "90": 0.243 }
  }
}
```

La UI ahora muestra **90 opciones** en el selector de nivel de arma (antes solo los
saltos de ascensión). El motor ya sabía leer `context.atk` etc.; lo nuevo es que la
arma aporta su ATK a nivel exacto.

### 3.3 `onAction`: pasivas que se activan al usar una acción

**Problema:** algunas pasivas simples se activan cuando el personaje hace algo
concreto. Ejemplo de **Verdant Summit** (5★ espada):
> "Every time Intro Skill or Resonance Liberation is cast, increases Heavy Attack
> DMG Bonus by 24%"

Esto SÍ se puede modelar: "al usar Intro o Liberación, gana +X% Heavy".

**Solución:** la extensión `condition.onAction` permite declarar en JSON5 que un
efecto se activa con ciertas acciones:

```json5
{
  "id": "vermont_heavy_on_intro",
  "name": "Verdant Summit (condición)",
  "target": "stat.heavyDmg",
  "modifiers": [{ "operation": "Add", "valueType": "Percent", "value": [0.24, 0.30, 0.36, 0.42, 0.48] }],
  "maxStacks": 2,
  "condition": { "type": "onAction", "actionIds": ["introSkill", "resonanceLiberation"] }
}
```

Notas:
- `value` tiene **5 posiciones**: una por rango de refinamiento (R1, R2, R3, R4, R5).
- El motor (en `effectResolver.ts`) consulta si el efecto debe estar activo al calcular.

> ⚠️ **Parcial:** la UI aún no deja al usuario "disparar" manualmente estas
> condiciones. El motor entiende el formato, pero el soporte interactivo completo
> (botón "usé Intro Skill" → se activa el buff) está pendiente. Mientras tanto, estas
> pasivas se guardan mayormente como `description_raw` para no perder el texto.

### 3.4 Buff base: el +ATK siempre activo

**Problema:** casi todas las armas 5★ empiezan su pasiva con un buff incondicional
("Increases ATK by 12%", "Grants 12% All-Attribute DMG Bonus"...). Queremos que eso
**sí** cuente en el cálculo.

**Solución:** el efecto base se modela con `enabledByDefault: true` y un `target`
de stat del motor:

```json5
{
  "id": "woodlandaria_base",
  "name": "Woodland Aria",
  "target": "stat.atk_",                                    // +ATK
  "modifiers": [{ "operation": "Add", "valueType": "Percent", "value": [0.12, 0.15, 0.18, 0.21, 0.24] }],
  "maxStacks": 1,
  "enabledByDefault": true                                   // siempre activo
}
```

`target: "stat.atk_"` significa "sumar al ATK del portador". El motor ya conocía los
paths `stat.*` (de los personajes); las armas los reutilizan.

**Cómo se detectó automáticamente:** el script `tools/weapons/parse_base_buff.cjs`
lee la primera frase de la pasiva y reconoce patrones como:
- `"X is increased by 12%"` → `stat.atk_` / `stat.hp_` / ...
- `"Grants 12% All-Attribute DMG Bonus"` → `stat.allDmgBonus`

Con esto, **las 45 armas 5★** tienen su buff base modelado como efecto real.

---

## 4. Mapa de conceptos → archivos

| Concepto | Dónde vive | Ejemplo |
|---|---|---|
| `description_raw` (texto sin cálculo) | `effectResolver.ts` (lo lee), UI (lo muestra) | `Frostburn.json5` |
| Stats 1-90 | `calculator.ts` (usa `context.atk` etc.) | `AbyssSurges.json5` |
| `condition.onAction` | `effectResolver.ts` (reconoce el formato) | `VerdantSummit.json5` (si se modela) |
| Buff base (`enabledByDefault`) | `effectResolver.ts` (aplica efectos activos) | `WoodlandAria.json5` |
| Paths `stat.*` (atk_, hp_, def_, allDmgBonus...) | `effectResolver.ts` (`PATH_TO_CTX`) | cualquier arma/personaje |
| `EnemyStats.damageTaken` / `damageReduction` | `calculator.ts` (M_DEF/M_DR) | `EnemyBase.json5` |
| **Estados Negativos / Tonalidad** | **`negativeStatus.ts`** (punto fijo, LUT, ticks, registry) | `CharacterTemplate.json5` (`negativeStatuses`) |

### 3.5 Estados Negativos / DoT / Tonalidad (`negativeStatus.ts`)

Extensión nueva (2026-08-12). Implementa la **arquitectura** de los Estados Negativos y del
Sistema de Tonalidad investigados en `docs/estados-elementales.md` y la subcarpeta
`docs/investigacion-estados/` (confirmados con Gemini). No es una simulación de combate en
tiempo real: dado un estado aplicado sobre un objetivo, expone funciones deterministas:

- **Punto fijo ×10000**: `toFixed`/`fromFixed`/`mulFixed` con `Math.floor` para resultados
  idénticos en cualquier plataforma (evita IEEE 754).
- **LUT por nivel**: `levelValue(config, levelOptions, attackerLvl)` interpola el daño base de
  1 stack según el nivel del aplicador (paramétrico, no ATK).
- **Fórmula NS determinista** (`simulateStatusTick`): daño = nivel × stackFactor × RES ×
  DEF(solo si el estado la aplica) × (1 + NS Amp). El **DMG Bonus elemental NO aplica** a NS.
- **Consumo por tick**: `onePerTick` (Spectro Frazzle, Aero Erosion) y `halfFloor` (Electro Flare).
- **Havoc Bane**: `applyHavocBaneDefense` reduce DEF -2%/stack (v2.8); no produce daño.
- **Electro Rage**: overflow → amplifica el próximo tick y se remueve.
- **Burst/Respuestas**: `detonateStatus` para Fusion Burst y respuestas de Tonalidad/Hack.
- **Registry de 9 estados** (`STATUS_REGISTRY`): config declarativa por estado. **Calibrado
  (2026-08-12)** con los valores confirmados de Gemini: Spectro Frazzle (base 4596, kStack 0.811,
  tick 3s, ignora DEF, consume 1), Aero Erosion (base 5000, lineal, aplica DEF), Electro Flare
  (modelo `affine`: 155 + 674×stacks, tick 6s, consume la mitad), Havoc Bane (DEF -2%/stack,
  máx 3), Glacio Chafe (StacksMV, instantáneo). Admite dos modelos de escalado del DoT:
  **`uniform`** (`base × [1+(n-1)×kStack]`) y **`affine`** (`baseOffset + slopePerStack × n`).

Los datos se declaran en JSON5 vía el campo `negativeStatuses` de un resonator/weapon/enemy
(ver `libs/ww/stats/src/_BaseEntity.json5` y `CharacterTemplate.json5`).

---

## 5. Qué falta (sub-nivel en el roadmap)

El motor aún **no** simula (está documentado en `ROADMAP.md` Sub-fase 1b):

- ⚠️ **Modelar los ticks de los DoT en el calculador de personaje** (`ResonatorSetup`): el
  `negativeStatus.ts` ya expone `advanceTimer` y `simulateStatusTick`, pero la UI/hook todavía
  no muestra daño por tick por segundo (cada DoT no es un solo `calculateDamage`).
- Buffs on/off-field (si el portador está dentro o fuera del campo)
- Buffs de equipo (que afectan a otros miembros)
- DEF/RES ignore condicional por tipo de acción
- Amplify (Deepen) elemental condicional
- Conectar las pasivas de armas actualmente en `description_raw` a los paths de estado negativo
  (para Frostburn, Woodland Aria, Azure Oath, etc.)

Cuando se implementen, las pasivas actualmente en `description_raw` podrán migrar a
`target` + `modifiers` reales.

---

## 6. Enlaces relacionados

- `docs/weapons-extraction.md` — cómo se obtuvieron las armas
- `docs/engine-accuracy.md` — los bugs de fidelidad del motor (ya fixeados)
- `libs/ww/stats/src/weapons/README.md` — cómo crear/editar una arma a mano
- `ROADMAP.md` — estado del proyecto y sub-nivel de pasivas complejas
- `Wuthering_Waves_Multiplicadores.md` — la fórmula oficial del juego (raíz del repo)
