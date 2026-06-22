import { useState, useEffect, useMemo } from 'react';
import { Menu, X, Moon, Sun, Users, Hexagon, Sword, Zap } from 'lucide-react';
import { ResonatorSetup } from './pages/ResonatorSetup';
import { WeaponsSetup } from './pages/WeaponsSetup';
import { Placeholder } from './pages/Placeholder';

import ShorekeeperData from '@ww-stats/resonators/Shorekeeper.json';
import RoverHavocData from '@ww-stats/resonators/RoverHavoc.json';
import SanhuaData from '@ww-stats/resonators/Sanhua.json';

// Carga dinámica de todas las armas
const weaponModules = import.meta.glob('../../libs/ww/stats/src/weapons/*.json', { eager: true });
const weaponsDB = Object.values(weaponModules).map((module: any) => module.default);

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

  // Estados de armas
  const [equippedWeapon, setEquippedWeapon] = useState<any | null>(null);
  const [weaponLevel, setWeaponLevel] = useState(90);
  const [weaponRank, setWeaponRank] = useState(0); // 0-4 para R1-R5

  const charData = characterDB[selectedChar];
  const accentColor = elementColors[charData.element || 'Spectro'];

  // Filtrar armas por tipo de arma del personaje
  const filteredWeapons = useMemo(() => {
    return weaponsDB.filter(w => w.weaponType === charData.weaponType);
  }, [charData.weaponType]);

  // Auto-equipar arma cuando cambie el personaje
  useEffect(() => {
    const defaultWeapon = filteredWeapons[0] || null;
    setEquippedWeapon(defaultWeapon);
    setWeaponLevel(90);
    setWeaponRank(0);
  }, [selectedChar, filteredWeapons]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--bg-main', isDarkMode ? '#0f1115' : '#f8fafc');
    document.documentElement.style.setProperty('--bg-panel', isDarkMode ? '#1e2128' : '#ffffff');
    document.documentElement.style.setProperty('--bg-card', isDarkMode ? '#14161a' : '#f1f5f9');
    document.documentElement.style.setProperty('--text-main', isDarkMode ? '#f1f5f9' : '#0f172a');
    document.documentElement.style.setProperty('--text-muted', isDarkMode ? '#94a3b8' : '#64748b');
    document.documentElement.style.setProperty('--border', isDarkMode ? '#334155' : '#e2e8f0');
  }, [accentColor, isDarkMode]);

  const navItems = [
    { id: 'character', icon: <Users size={20} />, label: 'Resonator Setup' },
    { id: 'weapons', icon: <Sword size={20} />, label: 'Weapons' },
    { id: 'echoes', icon: <Hexagon size={20} />, label: 'Echo Inventory' },
    { id: 'optimizer', icon: <Zap size={20} />, label: 'Team & Optimize' },
  ];

  return (
    <div className="min-h-screen font-sans flex" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>

      {/* SIDEBAR */}
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

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
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

        {/* ROUTER */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {activeTab === 'character' && (
            <ResonatorSetup 
              charData={charData}
              equippedWeapon={equippedWeapon}
              weaponLevel={weaponLevel}
              weaponRank={weaponRank}
            />
          )}
          {activeTab === 'weapons' && (
            <WeaponsSetup
              availableWeapons={filteredWeapons}
              equippedWeapon={equippedWeapon}
              weaponLevel={weaponLevel}
              weaponRank={weaponRank}
              onWeaponChange={setEquippedWeapon}
              onLevelChange={setWeaponLevel}
              onRankChange={setWeaponRank}
            />
          )}
          {activeTab === 'echoes' && <Placeholder title="Echo Inventory" />}
          {activeTab === 'optimizer' && <Placeholder title="Team & Optimize" />}
        </div>
      </main>
    </div>
  );
}
