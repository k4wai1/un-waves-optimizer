import { useState, useEffect, useMemo } from 'react';
import { Menu, X, Moon, Sun, Users, Hexagon, Sword, Zap, Activity } from 'lucide-react';
import { calculateDamage, type CombatContext } from './engine/calculator';

import ShorekeeperData from '@ww-stats/resonators/Shorekeeper.json';
import RoverHavocData from '@ww-stats/resonators/RoverHavoc.json';
import SanhuaData from '@ww-stats/resonators/Sanhua.json';

const characterDB: Record<string, any> = {
  Shorekeeper: { ...ShorekeeperData, element: 'Spectro' },
  RoverHavoc: { ...RoverHavocData, element: 'Havoc' },
  Sanhua: { ...SanhuaData, element: 'Glacio' },
};

const elementColors: Record<string, string> = {
  Havoc: '#d8b4e2', Spectro: '#fef08a', Aero: '#bbf7d0',
  Fusion: '#fed7aa', Glacio: '#bfdbfe', Electro: '#e9d5ff',
};

export default function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('character');

  const [selectedChar, setSelectedChar] = useState('Shorekeeper');
  const charData = characterDB[selectedChar];
  const accentColor = elementColors[charData.element || 'Spectro'];

  const availableLevels = Object.keys(charData.baseStats?.hp || {}).map(Number).sort((a, b) => a - b);
  const [level, setLevel] = useState(availableLevels[availableLevels.length - 1] || 90);

  const [activeNodes, setActiveNodes] = useState<Record<string, boolean>>({});
  const [skillLevel, setSkillLevel] = useState(7);

  useEffect(() => {
    setLevel(availableLevels[availableLevels.length - 1] || 90);
    setActiveNodes({});
  }, [selectedChar]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--bg-main', isDarkMode ? '#0f1115' : '#f8fafc');
    document.documentElement.style.setProperty('--bg-panel', isDarkMode ? '#1e2128' : '#ffffff');
    document.documentElement.style.setProperty('--bg-card', isDarkMode ? '#14161a' : '#f1f5f9');
    document.documentElement.style.setProperty('--text-main', isDarkMode ? '#f1f5f9' : '#0f172a');
    document.documentElement.style.setProperty('--text-muted', isDarkMode ? '#94a3b8' : '#64748b');
    document.documentElement.style.setProperty('--border', isDarkMode ? '#334155' : '#e2e8f0');
  }, [accentColor, isDarkMode]);

  const toggleNode = (id: string) => setActiveNodes(p => ({ ...p, [id]: !p[id] }));

  const navItems = [
    { id: 'character', icon: <Users size={20} />, label: 'Resonator Setup' },
    { id: 'echoes', icon: <Hexagon size={20} />, label: 'Echo Inventory' },
    { id: 'weapons', icon: <Sword size={20} />, label: 'Weapons' },
    { id: 'optimizer', icon: <Zap size={20} />, label: 'Team & Optimize' },
  ];

  const combatContext = useMemo(() => {
    const baseAtk = charData.baseStats.atk[level.toString()] || charData.baseStats.atk["90"] || 300;
    const weaponAtk = 412;
    const totalBaseAtk = baseAtk + weaponAtk;

    let extraAtk_ = 0;
    let extraDmg_ = 0;
    let extraCritRate_ = 0;

    if (charData.statNodes) {
      charData.statNodes.forEach((node: any) => {
        if (activeNodes[node.id]) {
          if (node.buffs.atk_) extraAtk_ += node.buffs.atk_;
          if (node.buffs.critRate_) extraCritRate_ += node.buffs.critRate_;
          Object.keys(node.buffs).forEach(k => {
            if (k.includes('dmg_')) extraDmg_ += node.buffs[k];
          });
        }
      });
    }

    return {
      atk: totalBaseAtk * (1 + extraAtk_),
      allDmgBonus_: extraDmg_,
      dmgAmplify_: 0,
      critRate_: 0.05 + extraCritRate_, 
      critDmg_: 1.50, 
      attackerLvl: level,
      enemyDef: 1000, 
      defIgnore_: 0,
      resTotal: 0.10 
    };
  }, [charData, level, activeNodes]);

  const generateCombatTable = (categoryName: string, categoryData: any) => {
    if (!categoryData) return null;
    const rows: { name: string, mv: number }[] = [];

    const parseNode = (node: any, path: string) => {
      if (Array.isArray(node)) {
        const mv = node[Math.min(skillLevel, node.length - 1)];
        if (mv) rows.push({ name: path, mv });
      } else if (typeof node === 'object') {
        Object.entries(node).forEach(([k, v]) => parseNode(v, `${path} ${k}`));
      }
    };

    Object.entries(categoryData).forEach(([k, v]) => parseNode(v, k));
    if (rows.length === 0) return null;

    return (
      <div key={categoryName} className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          {categoryName.replace(/_/g, ' ')}
        </h4>
        <div className="w-full border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-4 text-[11px] p-2 border-b font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <div className="col-span-1">Move</div>
            <div className="text-right">Normal</div>
            <div className="text-right">Average</div>
            <div className="text-right">Crit</div>
          </div>
          {rows.map((r, i) => {
            const dmg = calculateDamage(combatContext, r.mv);
            return (
              <div key={i} className="grid grid-cols-4 text-xs p-2 border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                <div className="col-span-1 truncate font-medium capitalize text-gray-300" title={r.name}>{r.name.replace(/_/g, ' ')}</div>
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

  return (
    <div className="min-h-screen font-sans flex" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>

      <aside className={`fixed lg:relative z-20 flex flex-col h-screen transition-all duration-300 border-r
                        ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'} `}
             style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="h-16 flex items-center justify-between px-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {isSidebarOpen && <span className="font-bold tracking-wider" style={{ color: 'var(--accent)' }}>UN-WAVES</span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:opacity-80 lg:hidden"><X size={20} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200
                ${activeTab === item.id ? 'shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              style={{ 
                backgroundColor: activeTab === item.id ? 'var(--accent)' : 'transparent',
                color: activeTab === item.id ? '#000' : 'var(--text-main)'
              }}>
              {item.icon}
              {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b shrink-0" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:opacity-80"><Menu size={24} /></button>
            <select value={selectedChar} onChange={(e) => setSelectedChar(e.target.value)}
              className="p-2 rounded-lg border outline-none font-bold cursor-pointer"
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {Object.keys(characterDB).map(key => <option key={key} value={key}>{characterDB[key].name}</option>)}
            </select>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full" style={{ backgroundColor: 'var(--bg-main)' }}>
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {activeTab === 'character' && (
            <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
              
              <div className="flex-1 space-y-6">
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{charData.name}</h3>
                      <span className="text-sm uppercase tracking-widest opacity-60 font-semibold">{charData.element}</span>
                    </div>
                    <span className="px-3 py-1 text-sm rounded-full font-medium border" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      {charData.weaponType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ascension Level</label>
                      <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                        {availableLevels.map(lvl => <option key={lvl} value={lvl}>Level {lvl}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Global Skill Level</label>
                      <select value={skillLevel} onChange={(e) => setSkillLevel(Number(e.target.value))} className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                        {[...Array(10)].map((_, i) => <option key={i} value={i + 1}>Level {i + 1}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {charData.statNodes && (
                  <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                    <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Inherent Stat Nodes</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {charData.statNodes.map((node: any) => (
                        <button key={node.id} onClick={() => toggleNode(node.id)}
                          className={`p-3 rounded-lg text-xs font-medium border flex justify-between items-center ${activeNodes[node.id] ? 'opacity-100 shadow-sm' : 'opacity-40'}`}
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
                    <h3 className="font-bold">Combat Simulation Engine</h3>
                  </div>

                  <div className="space-y-2 text-sm font-mono mb-6">
                    <div className="flex justify-between py-1"><span style={{ color: 'var(--text-muted)' }}>Total ATK</span><span>{Math.round(combatContext.atk)}</span></div>
                    <div className="flex justify-between py-1"><span style={{ color: 'var(--text-muted)' }}>Crit Rate</span><span>{(combatContext.critRate_ * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between py-1"><span style={{ color: 'var(--text-muted)' }}>Crit DMG</span><span>{(combatContext.critDmg_ * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between py-1 border-t mt-2 pt-2" style={{ borderColor: 'var(--border)' }}><span style={{ color: 'var(--accent)' }}>{charData.element} DMG</span><span style={{ color: 'var(--accent)' }}>{(combatContext.allDmgBonus_ * 100).toFixed(1)}%</span></div>
                  </div>

                  <div className="space-y-4">
                    {charData.formula && Object.keys(charData.formula).map(key => 
                      generateCombatTable(key, charData.formula[key])
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          )}

          {activeTab !== 'character' && (
            <div className="flex flex-col items-center justify-center h-full opacity-50" style={{ color: 'var(--text-muted)' }}>
              <Hexagon size={48} className="mb-4" />
              <p>Section under construction...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
