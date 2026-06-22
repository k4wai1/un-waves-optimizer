import { useState, useEffect, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { calculateDamage, type CombatContext } from '../engine/calculator';

interface ResonatorSetupProps {
  charData: any;
  equippedWeapon: any | null;
  weaponLevel: number;
  weaponRank: number;
}

const getSkillCategory = (skillName: string): string => {
  const lower = skillName.toLowerCase();
  if (lower.includes('normal attack')) return 'normalAttack';
  if (lower.includes('resonance skill')) return 'resonanceSkill';
  if (lower.includes('resonance liberation')) return 'resonanceLiberation';
  if (lower.includes('forte')) return 'forteCircuit';
  if (lower.includes('intro')) return 'introSkill';
  if (lower.includes('outro')) return 'outroSkill';
  return 'other';
};

const categoryLabels: Record<string, string> = {
  normalAttack: 'Normal Attack',
  resonanceSkill: 'Resonance Skill',
  resonanceLiberation: 'Resonance Liberation',
  forteCircuit: 'Forte Circuit',
  introSkill: 'Intro Skill',
  outroSkill: 'Outro Skill'
};

export function ResonatorSetup({ charData, equippedWeapon, weaponLevel, weaponRank }: ResonatorSetupProps) {
  const availableLevels = Object.keys(charData.baseStats?.hp || {}).map(Number).sort((a, b) => a - b);
  const [level, setLevel] = useState(availableLevels[availableLevels.length - 1] || 90);
  const [activeNodes, setActiveNodes] = useState<Record<string, boolean>>({});
  const [skillLevels, setSkillLevels] = useState({
    normalAttack: 10,
    resonanceSkill: 10,
    resonanceLiberation: 10,
    forteCircuit: 10,
    introSkill: 10,
    outroSkill: 10,
    other: 10
  });
  const [sequenceRank, setSequenceRank] = useState(0);

  useEffect(() => {
    setLevel(availableLevels[availableLevels.length - 1] || 90);
    setActiveNodes({});
    setSequenceRank(0);
    setSkillLevels({
      normalAttack: 10,
      resonanceSkill: 10,
      resonanceLiberation: 10,
      forteCircuit: 10,
      introSkill: 10,
      outroSkill: 10,
      other: 10
    });
  }, [charData.name]);

  const combatContext = useMemo(() => {
    const baseHp = charData.baseStats.hp[level.toString()] || charData.baseStats.hp["90"] || 800;
    const baseAtk = charData.baseStats.atk[level.toString()] || charData.baseStats.atk["90"] || 300;
    const baseDef = charData.baseStats.def[level.toString()] || charData.baseStats.def["90"] || 100;
    const baseTuneBreak = charData.baseStats.tuneBreakBoost?.[level.toString()] || 0;
    
    // ========== INTEGRACIÓN DE ARMA ==========
    let weaponAtk = 0;
    if (equippedWeapon) {
      const weaponLevelKey = weaponLevel.toString();
      weaponAtk = equippedWeapon.baseStats.atk[weaponLevelKey] || equippedWeapon.baseStats.atk["90"] || 0;
    }

    let extraHp_ = 0;
    let extraAtk_ = 0;
    let extraDef_ = 0;
    let extraCritRate_ = 0;
    let extraCritDmg_ = 0;
    let extraEnergyRegen_ = 0;
    
    const elementalBonuses: Record<string, number> = {
      physical: 0, glacio: 0, fusion: 0, electro: 0, aero: 0, spectro: 0, havoc: 0
    };
    
    let resonanceSkillBonus = 0;
    let basicAttackBonus = 0;
    let heavyAttackBonus = 0;
    let resonanceLiberationBonus = 0;
    let echoSkillBonus = 0;

    // Aplicar secondStat del arma
    if (equippedWeapon?.secondStat) {
      const weaponLevelKey = weaponLevel.toString();
      const secondStatValue = equippedWeapon.secondStat.values[weaponLevelKey] || equippedWeapon.secondStat.values["90"] || 0;
      const secondStatKey = equippedWeapon.secondStat.statKey;

      if (secondStatKey === 'atk_') extraAtk_ += secondStatValue;
      else if (secondStatKey === 'hp_') extraHp_ += secondStatValue;
      else if (secondStatKey === 'def_') extraDef_ += secondStatValue;
      else if (secondStatKey === 'critRate_') extraCritRate_ += secondStatValue;
      else if (secondStatKey === 'critDmg_') extraCritDmg_ += secondStatValue;
      else if (secondStatKey === 'energyRegen_') extraEnergyRegen_ += secondStatValue;
    }

    // Aplicar passives del arma
    if (equippedWeapon?.passives) {
      Object.entries(equippedWeapon.passives).forEach(([key, values]: [string, any]) => {
        if (Array.isArray(values) && values[weaponRank] !== undefined) {
          const passiveValue = values[weaponRank];
          
          if (key === 'atk_') extraAtk_ += passiveValue;
          else if (key === 'hp_') extraHp_ += passiveValue;
          else if (key === 'def_') extraDef_ += passiveValue;
          else if (key === 'critRate_') extraCritRate_ += passiveValue;
          else if (key === 'critDmg_') extraCritDmg_ += passiveValue;
          else if (key === 'energyRegen_') extraEnergyRegen_ += passiveValue;
        }
      });
    }

    // Procesar Inherent Stat Nodes
    if (charData.statNodes) {
      charData.statNodes.forEach((node: any) => {
        if (activeNodes[node.id] && node.buffs) {
          if (node.buffs.hp_) extraHp_ += node.buffs.hp_;
          if (node.buffs.atk_) extraAtk_ += node.buffs.atk_;
          if (node.buffs.def_) extraDef_ += node.buffs.def_;
          if (node.buffs.critRate_) extraCritRate_ += node.buffs.critRate_;
          if (node.buffs.critDmg_) extraCritDmg_ += node.buffs.critDmg_;
          if (node.buffs.energyRegen_) extraEnergyRegen_ += node.buffs.energyRegen_;
          
          Object.keys(elementalBonuses).forEach(elem => {
            const key = `${elem}DmgBonus_`;
            if (node.buffs[key]) elementalBonuses[elem] += node.buffs[key];
          });
          
          if (node.buffs.resonanceSkillDmgBonus_) resonanceSkillBonus += node.buffs.resonanceSkillDmgBonus_;
          if (node.buffs.basicAttackDmgBonus_) basicAttackBonus += node.buffs.basicAttackDmgBonus_;
          if (node.buffs.heavyAttackDmgBonus_) heavyAttackBonus += node.buffs.heavyAttackDmgBonus_;
          if (node.buffs.resonanceLiberationDmgBonus_) resonanceLiberationBonus += node.buffs.resonanceLiberationDmgBonus_;
          if (node.buffs.echoSkillDmgBonus_) echoSkillBonus += node.buffs.echoSkillDmgBonus_;
        }
      });
    }

    // Procesar Sequences activas
    if (charData.sequences && sequenceRank > 0) {
      for (let i = 1; i <= sequenceRank; i++) {
        const seq = charData.sequences[`s${i}`];
        if (seq?.buffs) {
          if (seq.buffs.hp_) extraHp_ += seq.buffs.hp_;
          if (seq.buffs.atk_) extraAtk_ += seq.buffs.atk_;
          if (seq.buffs.def_) extraDef_ += seq.buffs.def_;
          if (seq.buffs.critRate_) extraCritRate_ += seq.buffs.critRate_;
          if (seq.buffs.critDmg_) extraCritDmg_ += seq.buffs.critDmg_;
          if (seq.buffs.skill_dmg_) resonanceSkillBonus += seq.buffs.skill_dmg_;
          if (seq.buffs.energyRegen_) extraEnergyRegen_ += seq.buffs.energyRegen_;
          
          Object.keys(elementalBonuses).forEach(elem => {
            const key = `${elem}_dmg_`;
            if (seq.buffs[key]) elementalBonuses[elem] += seq.buffs[key];
          });
          
          if (seq.buffs.havoc_dmg_) elementalBonuses.havoc += seq.buffs.havoc_dmg_;
        }
      }
    }

    const elementKey = charData.element.toLowerCase();
    const totalElementalBonus = elementalBonuses[elementKey] || 0;

    return {
      hp: baseHp * (1 + extraHp_),
      atk: (baseAtk + weaponAtk) * (1 + extraAtk_),
      def: baseDef * (1 + extraDef_),
      tuneBreakBoost: baseTuneBreak,
      maxSTA: 0,
      maxFlightSTA: 0,
      critRate_: 0.05 + extraCritRate_,
      critDmg_: 1.50 + extraCritDmg_,
      energyRegen_: extraEnergyRegen_,
      offTuneBuildupRate_: 0,
      resonanceSkillDmgBonus_: resonanceSkillBonus,
      basicAttackDmgBonus_: basicAttackBonus,
      heavyAttackDmgBonus_: heavyAttackBonus,
      resonanceLiberationDmgBonus_: resonanceLiberationBonus,
      echoSkillDmgBonus_: echoSkillBonus,
      physicalDmgBonus_: elementalBonuses.physical,
      glacioDmgBonus_: elementalBonuses.glacio,
      fusionDmgBonus_: elementalBonuses.fusion,
      electroDmgBonus_: elementalBonuses.electro,
      aeroDmgBonus_: elementalBonuses.aero,
      spectroDmgBonus_: elementalBonuses.spectro,
      havocDmgBonus_: elementalBonuses.havoc,
      physicalRes_: 0,
      glacioRes_: 0,
      fusionRes_: 0,
      electroRes_: 0,
      aeroRes_: 0,
      spectroRes_: 0,
      havocRes_: 0,
      healingBonus_: 0,
      allDmgBonus_: totalElementalBonus,
      dmgAmplify_: 0,
      attackerLvl: level,
      enemyDef: 1000,
      defIgnore_: 0,
      resTotal: 0.10
    };
  }, [charData, level, activeNodes, sequenceRank, equippedWeapon, weaponLevel, weaponRank]);

  const elementalStatKey = `${charData.element.toLowerCase()}DmgBonus_`;
  
  const statConfig = [
    { key: 'hp', label: 'HP', format: 'flat', alwaysShow: true },
    { key: 'atk', label: 'ATK', format: 'flat', alwaysShow: true },
    { key: 'def', label: 'DEF', format: 'flat', alwaysShow: true },
    { key: 'tuneBreakBoost', label: 'Tune Break Boost', format: 'flat', alwaysShow: false },
    { key: 'critRate_', label: 'Crit. Rate', format: 'percent', alwaysShow: true },
    { key: 'critDmg_', label: 'Crit. DMG', format: 'percent', alwaysShow: true },
    { key: 'energyRegen_', label: 'Energy Regen', format: 'percent', alwaysShow: true },
    { key: elementalStatKey, label: `${charData.element} DMG Bonus`, format: 'percent', alwaysShow: true },
    { key: 'resonanceSkillDmgBonus_', label: 'Resonance Skill DMG Bonus', format: 'percent', alwaysShow: false },
    { key: 'basicAttackDmgBonus_', label: 'Basic Attack DMG Bonus', format: 'percent', alwaysShow: false },
    { key: 'heavyAttackDmgBonus_', label: 'Heavy Attack DMG Bonus', format: 'percent', alwaysShow: false },
    { key: 'resonanceLiberationDmgBonus_', label: 'Resonance Liberation DMG Bonus', format: 'percent', alwaysShow: false },
  ];

  const generateCombatTable = (categoryName: string, categoryData: any) => {
    if (!categoryData) return null;
    const rows: { name: string, mv: number, scaler: string }[] = [];
    const category = getSkillCategory(categoryName);
    const currentSkillLevel = skillLevels[category as keyof typeof skillLevels];

    const parseNode = (node: any, path: string) => {
      if (node && typeof node === 'object' && node.scaler && Array.isArray(node.multiplier)) {
        const mv = node.multiplier[Math.min(currentSkillLevel - 1, node.multiplier.length - 1)];
        if (mv) rows.push({ name: path, mv, scaler: node.scaler });
      } 
      else if (Array.isArray(node)) {
        const mv = node[Math.min(currentSkillLevel - 1, node.length - 1)];
        if (mv) rows.push({ name: path, mv, scaler: 'atk' });
      } 
      else if (node && typeof node === 'object') {
        Object.entries(node).forEach(([k, v]) => parseNode(v, `${path} ${k}`));
      }
    };

    Object.entries(categoryData).forEach(([k, v]) => parseNode(v, k));
    if (rows.length === 0) return null;

    return (
      <div key={categoryName} className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          {categoryName}
        </h4>
        <div className="w-full border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-4 text-[11px] p-2 border-b font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <div className="col-span-1">Move</div>
            <div className="text-right">Normal</div>
            <div className="text-right">Average</div>
            <div className="text-right">Crit</div>
          </div>
          {rows.map((r, i) => {
            const dmg = calculateDamage(combatContext, r.mv, r.scaler);
            return (
              <div key={i} className="grid grid-cols-4 text-xs p-2 border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                <div className="col-span-1 truncate font-medium capitalize text-gray-300" title={r.name}>
                  {r.name.replace(/_/g, ' ').trim()}
                  {r.scaler !== 'atk' && <span className="text-[9px] ml-1 opacity-50 uppercase">({r.scaler})</span>}
                </div>
                <div className="text-right font-mono opacity-90">{dmg.normal}</div>
                <div className="text-right font-mono opacity-60">{dmg.average}</div>
                <div className="text-right font-mono font-bold" style={{ color: 'var(--accent)' }}>{dmg.crit}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const availableSkillCategories = useMemo(() => {
    const categories = new Set<string>();
    const dmgData = charData.DMG || charData.formula || {};
    Object.keys(dmgData).forEach(key => {
      categories.add(getSkillCategory(key));
    });
    return Array.from(categories).filter(c => c !== 'other');
  }, [charData]);

  const toggleNode = (id: string) => setActiveNodes(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
      
      <div className="flex-1 space-y-6">
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{charData.name}</h3>
              <span className="text-sm uppercase tracking-widest opacity-60 font-semibold">{charData.element}</span>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 text-sm rounded-full font-medium border block" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {charData.weaponType}
              </span>
              {equippedWeapon && (
                <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>
                  {equippedWeapon.name}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ascension Level</label>
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                {availableLevels.map(lvl => <option key={lvl} value={lvl}>Level {lvl}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Resonance Chain</label>
              <select value={sequenceRank} onChange={(e) => setSequenceRank(Number(e.target.value))} className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                {[0, 1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>S{s}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Skill Levels</h4>
            <div className="grid grid-cols-2 gap-3">
              {availableSkillCategories.map(cat => (
                <div key={cat}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{categoryLabels[cat]}</label>
                  <select 
                    value={skillLevels[cat as keyof typeof skillLevels]} 
                    onChange={(e) => setSkillLevels(prev => ({ ...prev, [cat]: Number(e.target.value) }))}
                    className="w-full p-2 text-sm rounded-lg border outline-none" 
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                    {[...Array(10)].map((_, i) => <option key={i} value={i + 1}>Lv. {i + 1}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {charData.statNodes && (
          <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Inherent Stat Nodes</h4>
            <div className="grid grid-cols-2 gap-3">
              {charData.statNodes.map((node: any) => (
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
      </div>

      <div className="flex-1 lg:max-w-[500px] xl:max-w-[600px] space-y-6 pb-20">
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <Activity size={20} style={{ color: 'var(--accent)' }} />
            <h3 className="font-bold">Combat Statistics</h3>
          </div>

          <div className="space-y-2 text-sm font-mono mb-6">
            {statConfig
              .filter(stat => {
                if (stat.alwaysShow) return true;
                const value = combatContext[stat.key as keyof CombatContext];
                return typeof value === 'number' && value > 0;
              })
              .map((stat) => {
                const value = combatContext[stat.key as keyof CombatContext] as number;
                const formattedValue = stat.format === 'percent' 
                  ? `${(value * 100).toFixed(1)}%` 
                  : Math.round(value).toString();
                
                return (
                  <div key={stat.key} className="flex justify-between py-1">
                    <span style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
                    <span>{formattedValue}</span>
                  </div>
                );
              })}
          </div>

          <div className="space-y-4">
            {charData.DMG 
              ? Object.keys(charData.DMG).map(key => generateCombatTable(key, charData.DMG[key]))
              : charData.formula && Object.keys(charData.formula).map(key => generateCombatTable(key, charData.formula[key]))
            }
          </div>
        </div>
      </div>
      
    </div>
  );
}
