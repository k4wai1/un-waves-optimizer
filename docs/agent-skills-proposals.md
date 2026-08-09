# Propuestas de skills para el agente de IA

> Ideas de skills adicionales para `.agents/skills/`. El proyecto ya tiene
> `wuw-gg-datamine` (extraccion de datos de wuthering.gg).

## Skills creadas (2026-08-09)

### 1. spec-validator

**Ubicacion:** `.agents/skills/spec-validator/SKILL.md`

Valida que los `.json5` de `libs/ww/stats/src/` cumplan el esquema antes de commitear.

Que verifica:
- Campos requeridos (metadata.id, metadata.name, stats.hp, stats.atk, stats.def)
- IDs unicos en actions y effects
- Multipliers de 10 niveles (no 9, no 11)
- statNodes con 8 nodos (2 stats x 4)
- kind valido en actions (damage/heal/shield/coordinated)
- Formato JSON5 parseable

### 2. character-creator

**Ubicacion:** `.agents/skills/character-creator/SKILL.md`

Guia al agente paso a paso para crear un personaje nuevo desde cero.

Pasos:
1. Copiar CharacterTemplate.json5
2. Rellenar metadata (id, name, element, weaponType)
3. Rellenar stats (hp/atk/def por nivel 1-90)
4. Crear actions (basic, heavy, skill, liberation, forte, intro)
5. Crear effects (pasivas, S1-S6, inherent skills)
6. Anadir statNodes (8 nodos desde encore.moe)
7. Validar con spec-validator

### 3. engine-formula

**Ubicacion:** `.agents/skills/engine-formula/SKILL.md`

Explica la formula de dano de WuWa y como el motor la implementa.

Cubre:
- La ecuacion completa (D_final)
- Como cada multiplicador se mapea a codigo
- Bugs conocidos y como fixearlos
- Como depurar discrepancias con el juego

## Ideas futuras (no implementadas)

### echo-set-importer

Extraer datos de echo sets desde wuthering.gg o encore.moe. Similar a
`wuw-gg-datamine` pero enfocado en echoes (sets, costs, main stats, substats,
skill descriptions).

### weapon-datamine

Extraer datos de armas desde wuthering.gg. Actualmente solo hay 8 armas;
faltan 50+.

### optimizer-tester

Genera casos de prueba para el optimizador: dados unos echoes y un personaje,
verifica que el optimizador encuentra la build esperada.

### combat-log-verifier

Compara el dano calculado por el motor con capturas de pantalla del juego
o logs de combate reales. Usaria OCR o entrada manual para verificar fidelidad.
