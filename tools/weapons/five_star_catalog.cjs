// Catálogo manual de effects para armas 5★ (modelado a mano).
// Cada entrada: id (normalizado), base (buff always-on) y opts (condicionales simples).
// Formato values: [R1, R2, R3, R4, R5] en fracción (0.12 = 12%).
// base: { stat: 'stat.atk_'|'stat.energyRegen'|..., value: [r1..r5] }
// extra: lista de { stat, value, onAction?: [tipos de acción] }
module.exports = {
  // ── buff base: ATK 12%(R1) → 24%(R5) ─────────────────────────
  // La mayoría: "Increases ATK by 12%"
  baseAtk12: { stat: 'stat.atk_', value: [0.12, 0.15, 0.18, 0.21, 0.24] },
  baseEregen128: { stat: 'stat.energyRegen', value: [0.128, 0.16, 0.192, 0.224, 0.256] },
  baseAllDmg12: { stat: 'stat.allDmgBonus', value: [0.12, 0.15, 0.18, 0.21, 0.24] },
  baseDef16: { stat: 'stat.def_', value: [0.16, 0.20, 0.24, 0.28, 0.32] },
  baseHp12: { stat: 'stat.hp_', value: [0.12, 0.15, 0.18, 0.21, 0.24] },
  baseCritRate8: { stat: 'stat.critRate', value: [0.08, 0.10, 0.12, 0.14, 0.16] },

  // ── mapeo por arma (id normalizado) → spec de effects ─────────
  weapons: {
    'LustrousRazor': { base: 'baseEregen128', extra: [
      { stat: 'stat.liberationDmg', value: [0.07,0.0875,0.105,0.1225,0.14], onAction: ['resonanceSkill'], stacks: 3 }
    ]},
    'EmeraldOfGenesis': { base: 'baseEregen128', extra: [
      { stat: 'stat.atk_', value: [0.06,0.075,0.09,0.105,0.12], onAction: ['resonanceSkill'], stacks: 2 }
    ]},
    'AbyssSurges': { base: 'baseEregen128', extra: [
      { stat: 'stat.basicDmg', value: [0.10,0.125,0.15,0.175,0.20], onAction: ['resonanceSkill'] },
      { stat: 'stat.skillDmg', value: [0.10,0.125,0.15,0.175,0.20], onAction: ['basicAttack'] }
    ]},
    'CosmicRipples': { base: 'baseEregen128', extra: [
      { stat: 'stat.basicDmg', value: [0.032,0.04,0.048,0.056,0.064], onAction: ['basicAttack'], stacks: 5 }
    ]},
    'VerdantSummit': { base: 'baseAllDmg12', extra: [
      { stat: 'stat.heavyDmg', value: [0.24,0.30,0.36,0.42,0.48], onAction: ['introSkill','resonanceLiberation'], stacks: 2 }
    ]},
    'Stringmaster': { base: 'baseAllDmg12', extra: [
      { stat: 'stat.atk_', value: [0.12,0.15,0.18,0.21,0.24], onAction: ['resonanceSkill'], stacks: 2 },
      { stat: 'stat.atk_', value: [0.12,0.15,0.18,0.21,0.24], onAction: [], note: 'off-field adicional (no modelable, raw)' }
    ]},
    'Tragicomedy': { base: 'baseAtk12', extra: [
      { stat: 'stat.heavyDmg', value: [0.48,0.60,0.72,0.84,0.96], onAction: ['basicAttack','introSkill'] }
    ]},
    'TheLastDance': { base: 'baseAtk12', extra: [
      { stat: 'stat.skillDmg', value: [0.48,0.60,0.72,0.84,0.96], onAction: ['introSkill','resonanceLiberation'] }
    ]},
    'UnflickeringValor': { base: 'baseCritRate8', extra: [
      { stat: 'stat.basicDmg', value: [0.24,0.30,0.36,0.42,0.48], onAction: ['resonanceLiberation'] },
      { stat: 'stat.basicDmg', value: [0.24,0.30,0.36,0.42,0.48], onAction: ['basicAttack'] }
    ]},
    'StarfieldCalibrator': { base: 'baseDef16', extra: [
      { stat: 'stat.critDmg', value: [0.20,0.25,0.30,0.35,0.40], onAction: ['outroSkill'], note: 'healing team (raw)' }
    ]},
    'StellarSymphony': { base: 'baseHp12', extra: [
      { stat: 'stat.atk_', value: [0.14,0.175,0.21,0.245,0.28], onAction: ['resonanceSkill'], note: 'party heal ATK (raw)' }
    ]},
  }
};
