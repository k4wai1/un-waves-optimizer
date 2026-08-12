import { useState, useEffect, useMemo } from 'react';
import { Menu, X, Moon, Sun, Users, Hexagon, Sword, Zap, Ghost } from 'lucide-react';
import { ResonatorSetup } from './pages/ResonatorSetup';
import { WeaponsSetup } from './pages/WeaponsSetup';
import { EnemiesSetup } from './pages/EnemiesSetup';
import { Placeholder } from './pages/Placeholder';

// ─── Carga de datos con Vite-plugin-json5 (tolera comentarios JSON5) ───

// Resonadores: todos los .json5 de la carpeta resonators
const resonatorModules = import.meta.glob<{ default: string }>(
  '../../../libs/ww/stats/src/resonators/*.json5',
  { eager: true }
) as Record<string, any>;
const allResonators: Record<string, any> = {};
for (const [fp, mod] of Object.entries(resonatorModules)) {
  const key = mod.metadata?.id || fp.split('/').pop()?.replace(/\.json5$/, '') || '';
  allResonators[key] = mod;
}

// Armas: todos los .json5 de la carpeta weapons
const weaponModules = import.meta.glob<Record<string, any>>(
  '../../../libs/ww/stats/src/weapons/*.json5',
  { eager: true }
) as Record<string, any>;
const allWeapons: Record<string, any> = {};
for (const [fp, mod] of Object.entries(weaponModules)) {
  const key = mod.metadata?.id || fp.split('/').pop()?.replace(/\.json5$/, '') || '';
  allWeapons[key] = mod;
}

// Filtra armas válidas (que tengan id, name, weaponType) en metadata o raíz
const weaponsDB = Object.values(allWeapons).filter(
  (w: any) => w && (w.metadata?.id || w.id) && (w.metadata?.name || w.name) && (w.metadata?.weaponType || w.weaponType)
);

// Imágenes de armas (.webp y .png) — se cargan por nombre de archivo, que debe coincidir con metadata.id
const weaponImageModules = import.meta.glob<{ default: string }>(
  '../../../libs/ww/stats/src/weapons/*.{webp,png}',
  { eager: true, query: '?url' }
) as Record<string, { default: string }>;
const weaponImages: Record<string, string> = {};
for (const [filePath, mod] of Object.entries(weaponImageModules)) {
  const id = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
  weaponImages[id] = mod.default;
}

// ─── Enemigos: todos los .json5 reales de la carpeta enemies (excluye templates) ───
const enemyModules = import.meta.glob<Record<string, any>>(
  '../../../libs/ww/stats/src/enemies/*.json5',
  { eager: true }
) as Record<string, any>;
const enemiesDB: Record<string, any> = {};
for (const [fp, mod] of Object.entries(enemyModules)) {
  const key = mod.metadata?.id || fp.split('/').pop()?.replace(/\.json5$/, '') || '';
  const name = mod.metadata?.name || mod.name;
  // Excluye plantillas/dummy que no tienen name real o rarityClass
  if (!name || key === 'EnemyName' || key === 'EnemyBase') continue;
  enemiesDB[key] = mod;
}

// Imágenes de enemigos (.webp) — se cargan por id (debe coincidir con metadata.id)
const enemyImageModules = import.meta.glob<{ default: string }>(
  '../../../libs/ww/stats/src/enemies/img/*.{webp,png}',
  { eager: true, query: '?url' }
) as Record<string, { default: string }>;
const enemyImages: Record<string, string> = {};
for (const [filePath, mod] of Object.entries(enemyImageModules)) {
  const id = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
  enemyImages[id] = mod.default;
}

// ─── Constantes ───

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
  const [weaponRank, setWeaponRank] = useState(0);
  const [weaponStacks, setWeaponStacks] = useState(0);

  // Estados de enemigo
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [enemyLevel, setEnemyLevel] = useState(100);

  // Auto-seleccionar el primer enemigo disponible al iniciar
  useEffect(() => {
    if (!selectedEnemy && Object.keys(enemiesDB).length > 0) {
      const first = Object.keys(enemiesDB).sort()[0];
      setSelectedEnemy(first);
    }
  }, [enemiesDB]);

  const charData = allResonators[selectedChar] || allResonators.Shorekeeper;
  // Leer de metadata (nuevo formato) con fallback a raíz (formato legacy)
  const charMeta = charData?.metadata || charData;
  const charElement = charMeta?.element || 'Spectro';
  const accentColor = elementColors[charElement] || elementColors.Spectro;

  // Filtro case-insensitive de armas por tipo (metadata o raíz).
  // Si el personaje no tiene un tipo de arma válido, se muestran todas.
  const filteredWeapons = useMemo(() => {
    const wt = charMeta?.weaponType;
    if (!wt) return weaponsDB;
    const targetType = wt.toLowerCase();
    const matches = weaponsDB.filter(
      (w: any) => {
        const wType = w.metadata?.weaponType || w.weaponType;
        return wType && wType.toLowerCase() === targetType;
      }
    );
    return matches.length ? matches : weaponsDB;
  }, [charMeta?.weaponType]);

  // Auto-equipar arma al cambiar de personaje
  useEffect(() => {
    const defaultWeapon = filteredWeapons[0] || null;
    setEquippedWeapon(defaultWeapon);
    setWeaponLevel(90);
    setWeaponRank(0);
  }, [selectedChar, filteredWeapons]);

  // Resetear stacks al cambiar de arma
  useEffect(() => {
    setWeaponStacks(0);
  }, [equippedWeapon?.id]);

  // Tema oscuro / claro
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
    { id: 'enemies', icon: <Ghost size={20} />, label: 'Enemies' },
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
              {Object.entries(allResonators).map(([key, r]: [string, any]) => {
                const name = r?.metadata?.name || r?.name;
                return name ? <option key={key} value={key}>{name}</option> : null;
              })}
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
              weaponStacks={weaponStacks}
              selectedEnemy={selectedEnemy ? enemiesDB[selectedEnemy] : null}
              enemyLevel={enemyLevel}
            />
          )}
          {activeTab === 'weapons' && (
            <WeaponsSetup
              availableWeapons={filteredWeapons}
              equippedWeapon={equippedWeapon}
              weaponLevel={weaponLevel}
              weaponRank={weaponRank}
              weaponImages={weaponImages}
              weaponStacks={weaponStacks}
              onWeaponChange={setEquippedWeapon}
              onLevelChange={setWeaponLevel}
              onRankChange={setWeaponRank}
              onStacksChange={setWeaponStacks}
            />
          )}
          {activeTab === 'enemies' && (
            <EnemiesSetup
              enemiesDB={enemiesDB}
              enemyImages={enemyImages}
              selectedEnemy={selectedEnemy}
              enemyLevel={enemyLevel}
              onEnemyChange={setSelectedEnemy}
              onLevelChange={setEnemyLevel}
            />
          )}
          {activeTab === 'echoes' && <Placeholder title="Echo Inventory" />}
          {activeTab === 'optimizer' && <Placeholder title="Team & Optimize" />}
        </div>
      </main>
    </div>
  );
}
