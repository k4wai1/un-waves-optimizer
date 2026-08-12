import { useState, useEffect, useMemo } from 'react';
import { Activity, Layers } from 'lucide-react';
import { calculateDamage, type CombatContext } from '../engine/calculator';
import { resolveEnemyStats } from '../engine/enemy';
import {
  resolveEffects, indexEffects,
  calculateActionDamage, formatDescription,
  type Effect, type ActiveEffect, type Action as CalcAction,
} from '../engine/effectResolver';

interface ResonatorSetupProps {
  charData: any;
  equippedWeapon: any | null;
  weaponLevel: number;
  weaponRank: number;
  weaponStacks: number;
  selectedEnemy?: any | null;
  enemyLevel?: number;
}

function getStats(d: any): any { if (!d) return {}; return d.stats || d.baseStats || {}; }
function getMeta(d: any): any { if (!d) return {}; return d.metadata || d; }
function getStatValue(s: any, k: string, lv: number, fb: number): number {
  const o = s[k]; if (!o || typeof o !== 'object') return fb;
  return o[String(lv)] ?? o['90'] ?? fb;
}

const typeLabels: Record<string, string> = {
  basicAttack: 'Normal Attack', heavyAttack: 'Heavy Attack', plungingAttack: 'Plunging Attack',
  dodgeCounter: 'Dodge Counter', resonanceSkill: 'Resonance Skill', resonanceLiberation: 'Resonance Liberation',
  forteCircuit: 'Forte Circuit', introSkill: 'Intro Skill', outroSkill: 'Outro Skill', echoSkill: 'Echo Skill',
};

const statNames: Record<string, string> = {
  critRate_: 'Crit. Rate', critDmg_: 'Crit. DMG', energyRegen_: 'Energy Regen',
  skillDmg_: 'Skill DMG', basicDmg_: 'Basic DMG', heavyDmg_: 'Heavy DMG',
  liberationDmg_: 'Liberation DMG', echoDmg_: 'Echo DMG',
  coordinated_dmg_: 'Coord. DMG', outroDmg_: 'Outro DMG',
  healing_bonus_: 'Healing Bonus',
};

export function ResonatorSetup({ charData, equippedWeapon, weaponLevel, weaponRank, weaponStacks, selectedEnemy, enemyLevel = 100 }: ResonatorSetupProps) {
  if (!charData) return <div className="p-6 text-center opacity-50" style={{ color: 'var(--text-muted)' }}>No character data available</div>;

  const meta = getMeta(charData);
  const stats = getStats(charData);
  const availableLevels = Object.keys(stats.hp || {}).map(Number).sort((a, b) => a - b);
  const [level, setLevel] = useState(availableLevels[availableLevels.length - 1] || 90);
  const [activeNodes, setActiveNodes] = useState<Record<string, boolean>>({});
  const [sequenceRank, setSequenceRank] = useState(0);

  const allEffects: Effect[] = useMemo(() => {
    const ce: Effect[] = charData.effects || [];
    const we: Effect[] = equippedWeapon?.effects || [];
    return [...ce, ...we];
  }, [charData, equippedWeapon]);
  const effectsDb = useMemo(() => indexEffects(allEffects), [allEffects]);

  const [effectStates, setEffectStates] = useState<Record<string, ActiveEffect>>({});

  useEffect(() => {
    const init: Record<string, ActiveEffect> = {};
    for (const e of allEffects) {
      const seqNum = parseInt(e.id.split('s')[1]?.split('_')[0] || '0', 10) || 0;
      init[e.id] = {
        effectId: e.id, rank: 0, stacks: Math.min(1, e.maxStacks),
        enabled: e.enabledByDefault ?? (seqNum > 0 && seqNum <= sequenceRank),
      };
    }
    setEffectStates(init);
  }, [charData?.metadata?.id, equippedWeapon?.metadata?.id, sequenceRank]);

  // Actions
  const actions: any[] = charData.actions || [];
  const actionsByType = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const a of actions) { if (!m[a.type]) m[a.type] = []; m[a.type].push(a); }
    return m;
  }, [actions]);
  const availableTypes = Object.keys(actionsByType).filter(t => typeLabels[t]);

  const maxSkillLevels = useMemo(() => {
    const lv: Record<string, number> = {};
    for (const a of actions) for (const sc of a.scaling || []) {
      const len = sc.multiplier?.length || 0;
      if (len > (lv[a.type] || 0)) lv[a.type] = len;
    }
    return lv;
  }, [actions]);

  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({});
  useEffect(() => {
    setSkillLevels(Object.fromEntries(Object.entries(maxSkillLevels).map(([t, m]) => [t, m])));
  }, [charData?.metadata?.id]);

  const weaponStats = getStats(equippedWeapon);

  const combatContext = useMemo(() => {
    const baseHp = getStatValue(stats, 'hp', level, 800);
    const baseAtk = getStatValue(stats, 'atk', level, 300);
    const baseDef = getStatValue(stats, 'def', level, 100);
    let weaponAtk = 0;
    if (equippedWeapon) weaponAtk = getStatValue(weaponStats, 'atk', weaponLevel, 0);

    const ctx: CombatContext = {
      hp: baseHp, atk: baseAtk + weaponAtk, def: baseDef,
      tuneBreakBoost: stats.tuneBreakBoost ?? 0,
      maxSTA: 0, maxFlightSTA: 0,
      critRate_: 0.05, critDmg_: 1.50, energyRegen_: 0,
      allDmgBonus_: 0, dmgAmplify_: 0, offTuneBuildupRate_: 0,
      resonanceSkillDmgBonus_: 0, basicAttackDmgBonus_: 0, heavyAttackDmgBonus_: 0,
      resonanceLiberationDmgBonus_: 0, echoSkillDmgBonus_: 0,
      coordinatedDmgBonus_: 0, outroSkillDmgBonus_: 0,
      physicalDmgBonus_: 0, glacioDmgBonus_: 0, fusionDmgBonus_: 0, electroDmgBonus_: 0,
      aeroDmgBonus_: 0, spectroDmgBonus_: 0, havocDmgBonus_: 0,
      physicalRes_: 0, glacioRes_: 0, fusionRes_: 0, electroRes_: 0, aeroRes_: 0, spectroRes_: 0, havocRes_: 0,
      healingBonus_: 0, attackerLvl: level, defIgnore_: 0,
      // Enemigo: el seleccionado en el menú Enemies (escalado a enemyLevel), o dummy.
      enemy: resolveEnemyStats(selectedEnemy, enemyLevel),
    };

    // secondaryAttribute
    const sa = weaponStats?.secondaryAttribute;
    if (sa?.values) {
      const v = sa.values[String(weaponLevel)] ?? sa.values['90'] ?? 0;
      if (sa.key === 'critRate_') ctx.critRate_ += v;
      else if (sa.key === 'critDmg_') ctx.critDmg_ += v;
      else if (sa.key === 'energyRegen_') ctx.energyRegen_ += v;
    }

    // Stat nodes
    const nodes = stats.statNodes || charData.statNodes || [];
    // Acumular los % de hp/atk/def de TODOS los nodos activos (no sobrescribir por nodo)
    let hpPct = 0, atkPct = 0, defPct = 0;
    for (const node of nodes) {
      if (!activeNodes[node.id] || !node.buffs) continue;
      Object.entries(node.buffs).forEach(([bk, bv]) => {
        const val = bv as number;
        if (bk === 'hp_') { hpPct += val; return; }
        if (bk === 'atk_') { atkPct += val; return; }
        if (bk === 'def_') { defPct += val; return; }
        const map: Record<string, string> = {
          critRate_: 'critRate_', critDmg_: 'critDmg_', energyRegen_: 'energyRegen_',
          glacio_dmg_: 'glacioDmgBonus_', fusion_dmg_: 'fusionDmgBonus_',
          electro_dmg_: 'electroDmgBonus_', aero_dmg_: 'aeroDmgBonus_',
          spectro_dmg_: 'spectroDmgBonus_', havoc_dmg_: 'havocDmgBonus_',
          healing_bonus_: 'healingBonus_',
        };
        const ck = map[bk];
        if (ck && ck in ctx) (ctx as any)[ck] += val;
      });
    }
    if (hpPct) ctx.hp = baseHp * (1 + hpPct);
    if (atkPct) ctx.atk = (baseAtk + weaponAtk) * (1 + atkPct);
    if (defPct) ctx.def = baseDef * (1 + defPct);

    const activeList = Object.values(effectStates).filter(ae => ae.enabled);
    return resolveEffects(ctx, activeList, effectsDb);
  }, [charData, level, activeNodes, equippedWeapon, weaponLevel, weaponRank, weaponStacks, effectStates, effectsDb, stats, weaponStats, selectedEnemy, enemyLevel]);

  const elementKey = (meta.element || 'Spectro').toLowerCase();
  const elementalStatKey = `${elementKey}DmgBonus_`;

  const statConfig = [
    { key: 'hp', label: 'HP', format: 'flat', alwaysShow: true },
    { key: 'atk', label: 'ATK', format: 'flat', alwaysShow: true },
    { key: 'def', label: 'DEF', format: 'flat', alwaysShow: true },
    { key: 'critRate_', label: 'Crit. Rate', format: 'percent', alwaysShow: true },
    { key: 'critDmg_', label: 'Crit. DMG', format: 'percent', alwaysShow: true },
    { key: 'energyRegen_', label: 'Energy Regen', format: 'percent', alwaysShow: true },
    { key: elementalStatKey, label: `${meta.element || 'Spectro'} DMG Bonus`, format: 'percent', alwaysShow: true },
    { key: 'resonanceSkillDmgBonus_', label: 'Skill DMG Bonus', format: 'percent', alwaysShow: false },
    { key: 'basicAttackDmgBonus_', label: 'Basic Attack DMG Bonus', format: 'percent', alwaysShow: false },
    { key: 'heavyAttackDmgBonus_', label: 'Heavy Attack DMG Bonus', format: 'percent', alwaysShow: false },
    { key: 'resonanceLiberationDmgBonus_', label: 'Liberation DMG Bonus', format: 'percent', alwaysShow: false },
  ];

  // ─── Combat table with calculateActionDamage ─────────────────────────
  const generateCombatTable = (type: string, actionsList: any[]) => {
    if (!actionsList?.length) return null;
    const lvl = skillLevels[type] || 1;
    const activeList = Object.values(effectStates).filter(ae => ae.enabled);

    const rows: { name: string; mv: number; stat: string; act: CalcAction; kind?: string }[] = [];
    for (const a of actionsList) {
      const idx = Math.min(lvl - 1, 9);
      for (const sc of a.scaling || []) {
        const mult = sc.multiplier?.[idx];
        if (mult !== undefined) {
          rows.push({
            name: a.name, mv: mult, stat: sc.stat,
            kind: a.kind,
            act: { id: a.id, type: a.type, tags: a.tags || [], kind: a.kind, flat: a.flat, formId: a.formId },
          });
        }
      }
    }
    if (!rows.length) return null;

    // Si el grupo contiene acciones no-daño (heal/shield), la cabecera muestra un valor único.
    const hasNonDamage = rows.some(r => r.kind === 'heal' || r.kind === 'shield');
    const valueLabel = rows.some(r => r.kind === 'shield') && !rows.some(r => r.kind === 'heal')
      ? 'Shield'
      : rows.some(r => r.kind === 'heal') ? 'Healing' : 'Value';

    return (
      <div key={type} className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{typeLabels[type] || type}</h4>
        <div className="w-full border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-4 text-[11px] p-2 border-b font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <div className="col-span-1">Move</div>
            {hasNonDamage
              ? <div className="text-right col-span-3">{valueLabel}</div>
              : <><div className="text-right">Normal</div><div className="text-right">Average</div><div className="text-right">Crit</div></>}
          </div>
          {rows.map((r, i) => {
            const scaler = r.stat === 'HP' ? 'hp' : r.stat === 'FLAT' ? 'flat' : r.stat.toLowerCase();
            const dmg = calculateActionDamage(combatContext, r.act, r.mv, scaler, elementKey, activeList, effectsDb, calculateDamage);
            const isNonDamage = r.kind === 'heal' || r.kind === 'shield';
            return (
              <div key={i} className="grid grid-cols-4 text-xs p-2 border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                <div className="col-span-1 truncate font-medium capitalize text-gray-300" title={r.name}>
                  {r.name}{r.stat !== 'ATK' && r.stat !== 'FLAT' && <span className="text-[9px] ml-1 opacity-50 uppercase">({r.stat})</span>}
                  {r.act.formId && <span className="text-[9px] ml-1 opacity-40 uppercase italic">[{r.act.formId}]</span>}
                </div>
                {isNonDamage ? (
                  <>
                    <div className="text-right font-mono font-bold col-span-3" style={{ color: 'var(--accent)' }}>{dmg.normal}</div>
                  </>
                ) : (
                  <>
                    <div className="text-right font-mono opacity-90">{dmg.normal}</div>
                    <div className="text-right font-mono opacity-60">{dmg.average}</div>
                    <div className="text-right font-mono font-bold" style={{ color: 'var(--accent)' }}>{dmg.crit}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const toggleNode = (id: string) => setActiveNodes(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
      <div className="flex-1 space-y-6">
        {/* Character header */}
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{meta.name}</h3>
              <span className="text-sm uppercase tracking-widest opacity-60 font-semibold">{meta.element || 'Unknown'}</span>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 text-sm rounded-full font-medium border block" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{meta.weaponType || 'Unknown'}</span>
              {equippedWeapon && <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>{equippedWeapon.metadata?.name || equippedWeapon.name}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ascension Level</label>
              <select value={level} onChange={e => setLevel(Number(e.target.value))} className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                {availableLevels.map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Resonance Chain</label>
              <select value={sequenceRank} onChange={e => setSequenceRank(Number(e.target.value))} className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                {[0, 1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>S{s}</option>)}
              </select>
            </div>
          </div>

          {availableTypes.length > 0 && (
            <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border)' }}>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Skill Levels</h4>
              <div className="grid grid-cols-2 gap-3">
                {availableTypes.map(type => {
                  const maxLv = maxSkillLevels[type] || 10;
                  const fixed = maxLv <= 1;
                  return (
                    <div key={type}>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{typeLabels[type] || type}{fixed && <span className="ml-1 opacity-50">(fixed)</span>}</label>
                      <select value={skillLevels[type] || maxLv} onChange={e => setSkillLevels(p => ({ ...p, [type]: Number(e.target.value) }))} disabled={fixed}
                        className={`w-full p-2 text-sm rounded-lg border outline-none ${fixed ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                        {[...Array(maxLv)].map((_, i) => <option key={i} value={i + 1}>Lv. {i + 1}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stat Nodes */}
        {(stats.statNodes || charData.statNodes) && (
          <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Inherent Stat Nodes</h4>
            <div className="grid grid-cols-2 gap-3">
              {(stats.statNodes || charData.statNodes || []).map((node: any) => (
                <button key={node.id} onClick={() => toggleNode(node.id)}
                  className={`p-3 rounded-lg text-xs font-medium border flex justify-between items-center transition-all ${activeNodes[node.id] ? 'opacity-100 shadow-sm' : 'opacity-40 hover:opacity-60'}`}
                  style={{ borderColor: activeNodes[node.id] ? 'var(--accent)' : 'var(--border)', color: activeNodes[node.id] ? 'var(--accent)' : 'var(--text-main)', backgroundColor: activeNodes[node.id] ? 'var(--bg-card)' : 'transparent' }}>
                  <span>{node.name}</span>
                  <div className="w-3 h-3 rounded-full border" style={{ borderColor: activeNodes[node.id] ? 'var(--accent)' : 'var(--border)' }}>
                    {activeNodes[node.id] && <div className="w-full h-full rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Effects auto-generados */}
        {allEffects.length > 0 && (
          <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Effects</h4>
            <div className="space-y-3">
              {allEffects.map(effect => {
                const state = effectStates[effect.id];
                const isOn = state?.enabled ?? false;
                const stacks = state?.stacks ?? 1;
                const desc = effect.descriptionTemplate
                  ? formatDescription(effect.descriptionTemplate, effect.modifiers || [], state?.rank || 0)
                  : (effect.description_raw || effect.name);

                return (
                  <div key={effect.id} className="p-4 rounded-xl border" style={{ borderColor: isOn ? 'var(--accent)' : 'var(--border)', backgroundColor: 'var(--bg-card)', opacity: isOn ? 1 : 0.5 }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium">{effect.name}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                      <button onClick={() => setEffectStates(p => ({ ...p, [effect.id]: { ...p[effect.id], enabled: !isOn } }))}
                        className="text-xs px-3 py-1.5 rounded-lg border font-bold shrink-0 ml-2"
                        style={{ borderColor: isOn ? 'var(--accent)' : 'var(--border)', color: isOn ? 'var(--accent)' : 'var(--text-muted)', backgroundColor: isOn ? 'var(--bg-main)' : 'transparent' }}>
                        {isOn ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {effect.targets?.map((t: any, i: number) => (
                      <span key={i} className="inline-block text-[10px] px-2 py-0.5 mr-1 mb-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        {t.type === 'Stat' ? (statNames[t.id] || t.id) : t.type === 'Action' ? `Action: ${t.id}` : `Category: ${t.id.replace(/([A-Z])/g, ' $1').trim()}`}
                      </span>
                    ))}

                    {effect.modifiers?.map((m: any, i: number) => {
                      const v = m.value[Math.min(state?.rank || 0, m.value.length - 1)] ?? 0;
                      const vs = m.valueType === 'Percent' ? `${(v * 100).toFixed(1)}%` : m.valueType === 'Flat' ? v.toFixed(0) : `×${v.toFixed(2)}`;
                      return <div key={i} className="text-xs font-mono mt-1" style={{ color: 'var(--accent)' }}>{m.operation} {vs}{effect.maxStacks > 1 && ` ×${stacks}`}</div>;
                    })}

                    {effect.maxStacks > 1 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <Layers size={14} className="opacity-40 shrink-0" />
                        <div className="flex gap-1">
                          {Array.from({ length: effect.maxStacks + 1 }, (_, i) => (
                            <button key={i} onClick={() => setEffectStates(p => ({ ...p, [effect.id]: { ...p[effect.id], stacks: i } }))}
                              className={`px-3 py-1 text-xs rounded-lg border font-bold transition-all ${stacks === i ? 'shadow-sm' : 'opacity-40 hover:opacity-70'}`}
                              style={{ backgroundColor: stacks === i ? 'var(--accent)' : 'transparent', borderColor: stacks === i ? 'var(--accent)' : 'var(--border)', color: stacks === i ? '#000' : 'var(--text-main)' }}>{i}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Combat stats */}
      <div className="flex-1 lg:max-w-[500px] xl:max-w-[600px] space-y-6 pb-20">
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <Activity size={20} style={{ color: 'var(--accent)' }} /><h3 className="font-bold">Combat Statistics</h3>
          </div>

          <div className="space-y-2 text-sm font-mono mb-6">
            {statConfig.filter(s => s.alwaysShow || (combatContext[s.key as keyof CombatContext] as number) > 0).map(stat => {
              const value = combatContext[stat.key as keyof CombatContext] as number;
              return (
                <div key={stat.key} className="flex justify-between py-1">
                  <span style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
                  <span>{stat.format === 'percent' ? `${(value * 100).toFixed(1)}%` : Math.round(value).toString()}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            {actions.length > 0
              ? Object.entries(actionsByType).filter(([t]) => typeLabels[t]).map(([t, list]) => generateCombatTable(t, list))
              : <div className="text-xs opacity-40 text-center py-8">No actions data</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
