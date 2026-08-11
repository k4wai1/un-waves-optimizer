# Glacio Chafe (estado negativo Glacio)

Estado de investigación. Nombres en inglés: **Glacio Chafe**.

## 🔍 Pregunta para pasar a Gemini
> Investigá el estado negativo **Glacio Chafe** en *Wuthering Waves* (nombres en inglés):
> 1. **Daño**: ¿inflige daño al aplicar cada stack? ¿Hay daño por tick/DoT? ¿Cuál es el
>    **daño por stack** (valor o % de ATK) y cómo escala (ATK, nivel, DEF/RES enemigo)?
> 2. **Stacks/duración**: ¿máximo de stacks? ¿duración exacta? ¿se refresca al aplicar?
> 3. **Efectos**: ¿reduce Glacio RES? ¿reduce velocidad de movimiento? ¿congela a X stacks?
> 4. **Aplicación**: ¿qué acciones lo infligen? Detallá **Hiyuki** (5★, Sword) y
>    **Lucilla** (5★, Rectifier), y sus amplificaciones de daño de Chafe (Outros/armas/ecos).
> 5. **Implementación**: ¿cómo modelarlo en un motor de cálculo TS (tipo DOT/EXPLOSION/
>    instantáneo, stack máx, tick interval, scaling, formulazo del daño por stack)?
>
> ⭐ Dato a confirmar: el arma **Frostburn** amplifica "Glacio Chafe DMG" (¿el daño del
> estado en sí?) y los Outros de Hiyuki/Lucilla amplifican el daño de Chafe. Confirmá si
> ese "Chafe DMG" es el daño del estado y cómo entra en la fórmula.

## Estado de la data (desde DeepSeek)
- ❓ **Daño por stack**: sin confirmar. Se inflige al aplicar cada stack (daño instantáneo,
  no DoT periódico). No hay % público.
- ⚠️ Stacks: 10 por defecto. Al llegar a 10 → congela y elimina stacks.
- ⚠️ Duración: ~19 s (aprox.) — refresca al aplicar.
- ✅ No reduce Glacio RES (solo slow + freeze).
- ✅ Aplican: Hiyuki (v3.3) y Lucilla (v3.4).
- ✅ Hiyuki: 1 stack con varios ataques; convierte Chafe cercano en "Glacio Bite" (10+ → Frostbind).
- ✅ Lucilla: Outro +60% daño de Chafe (30s); aplicar Chafe → +30% Glacio DMG (14s).

## ✅ Resultado de Gemini (confirmado, 2026-08-11)

### Confirmaciones clave
- **Es daño instantáneo por aplicación**, NO DoT periódico (no tiene ticks). Su frecuencia
  se acopla a la velocidad de aplicación de ataques. ✅
- **NO escala con ATK ni Crit** del resonador. Escala con **nivel del personaje que aplica**
  (propietario de la aplicación, activo o fuera de campo) + DEF/RES enemigo + Amp. ✅
- **NO reduce Glacio RES** por sí mismo (el slow/freeze es lo inherente). ✅
- Stacks máx: **10 por defecto**. Al llegar → **congela**, purga stacks a 0, suspende nueva
  aplicación hasta liberarse. ✅
- Duración: **~19 s**, refresca al aplicar. Acción Límite 10 → MV≈2.0377; límite 13 → MV≈4.0753. ✅

### Fórmula maestra (NS determinista)
```
DMG = LevelModifier × (1 + MvModifier%) × (StacksMV/10000) × DefModifier% × ResistModifier% × (1 + Amp%)
```
- **Amp** (solo "NS DMG Amplification" / "Glacio Chafe DMG Amplification") — el DMG Bonus
  convencional (Glacio DMG Bonus de ecos) **NO aplica**. Frostburn/Outros entran SOLO por Amp.
- Aritmética: **punto fijo ×10000** (entero), `Math.floor`, para determinismo (evita IEEE 754).

### StacksMV (eje central de escalado)
- El daño por aplicación NO depende de stacks activos, sino del **límite máximo** vigente.
  Primera aplicación = novena aplicación (DPS constante).
- Límite 10 → **MV = 2.0377** (entero 20377).
- Límite 13 (Chisa/Suisui) → **MV = 4.0753** (entero 40753).
- A nivel 90: ~5000 daño/app (límite 10) → ~10-11k daño/app (límite 13). ✅

### Sub-motor Glacio Bite (Hiyuki) ✅
- Cuando Hiyuki entra al equipo: purga Chafe existente → reclasifica como **Glacio Bite**
  (hereda reglas/amplif. de "Glacio Chafe DMG"). Si Hiyuki sale y nadie mantiene Bite → GC.
- **Inherent Skill "Fine Snow"** → recurso **Snow Rust** (2 unidades al aplicar Chafe o
  Havoc Bane). Con 2 unidades, cada aplicación dispara **2 instancias de daño**:
  1. **Max Stacks Proc**: ecuación NS con StacksMV dinámico (2.0377 o 4.0753).
  2. **Fixed MV Proc**: instancia "Glacio Bite DMG" con **MV fijo = 102% (1.02)**, NO critica,
     se beneficia de Amp.
- Aplica 1 stack en varios ataques; "Foreclaiming: Inward Vision" → 4; "Iai" (Frostharden) → 3.
- **Frozenback:** a ≥10 Glacio Bite stacks, Inward Vision/Iai **consumen 10 stacks** para
  detonar **Frostbind** (daño masivo) en vez de freeze default.

### Frostburn (arma de Hiyuki) ✅
- +12% ATK, +28% Glacio DMG Amp (no confundir con DMG Bonus) al aplicar Chafe, RL ignora 10% DEF.
- Si el portador es activo: **+20% Glacio Chafe DMG Amp** global (Amp += 2000 en punto fijo).

### Lucilla (Outro "Montage") ✅
- Modo Glacio Chafe, al salir: **+60% Glacio Chafe AMP** (30s) → Amp += 0.60.
- Arma **Freeze Frame**: aplicar Chafe → +30% Glacio DMG (portador, para sus ataques directos)
  y +24% ATK (equipo).
- **Film Roll (pasiva off-field)**: si un compañero aplica Glacio Chafe, Lu consume 1 Film Roll
  → aplica **2 stacks extra** de forma autónoma desde fuera. Crea un bucle denso de eventos
  (p. ej. 1 básico de Hiyuki → hasta 6 instancias de daño NS + 3 actualizaciones de stacks).

### Chisa / Suisui (manipuladores de stack limit) ✅
- **Chisa** ("Unraveling - Law Zero"): +3 stacks NS (10 → 13, MV 2.0377 → 4.0753) por 15s.
  **Thread of Bane**: DEF Shred -18%. Con límite 13, el freeze default se postpone a 13
  (pero **Frostbind sigue consumiendo 10** → margen táctico de 3).
- **Suisui** (v3.5, Rectifier, Healer/Support): "Ceaseless Landscape" +3 stacks NS igual que
  Chisa. Outro: **+25% All DMG Amp** (30s) + ATK% que escala con su ER. Aplica Chafe con
  "Awakening Spring" y básico "Cleansing Rain" Stage 4.

### Arquitectura propuesta (TS)
- **Estado:** `StatusEffect { type: GLACIO_CHAFE|GLACIO_BITE, currentStacks, maxStacksLimit,
  expirationFrame, sourceCharacterId }` en un `StatusManager`.
- **Pipeline determinista:** `emit('APPLY_STATUS')` → interceptor (Hiyuki: Chafe→Bite; Chisa:
  maxStacksLimit=13) → triggers reactivos (Lucilla Film Roll) → cálculo NS en enteros → stack
  reconciliation (`if currentStacks>=maxStacksLimit → FREEZE_TARGET + reset 0`).
- **Aritmética entera:** escalar ×10000, `Math.floor` en cada paso.
- **Edge cases:** overflow (4 stacks sobre 11 con límite 13) → iterar stack por stack; orden
  DEF Shred (18%) antes de DEF Ignore (10%); GC de Glacio Bite si Hiyuki+Lucilla salen del equipo.

### Implementación TS (función núcleo)
```ts
function simulateNSDamage(levelModifier:number, mvModifier:number, stacksMV:number,
  defModifier:number, resistModifier:number, ampTotal:number): number {
  const SCALE = 10000;
  let s1 = Math.floor(levelModifier * (SCALE + mvModifier) / SCALE); // MvModifier
  let s2 = Math.floor(s1 * stacksMV / SCALE);                        // StacksMV (20377|40753)
  let s3 = Math.floor(s2 * defModifier / SCALE);                     // DEF
  let s4 = Math.floor(s3 * resistModifier / SCALE);                  // RES
  return Math.floor(s4 * (SCALE + ampTotal) / SCALE);                // Amp (Deepen)
}
```

### Fuente
- Respuesta arquitectónica/matemática de **Gemini** (2026-08-11), pasada por el usuario en el
  chat. Complementa a DeepSeek (Game8 `archives/558103`, fandom `wiki/Glacio_Chafe`).
  ⚠️ Los valores numéricos concretos (2.0377, 4.0753, 102%, 19s) provienen de Gemini; conviene
  refrendarlos contra Game8/fandom si se va a implementar con esos números exactos.
