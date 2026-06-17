import { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun, Users, Hexagon, Sword, Zap } from 'lucide-react';

// Importamos nuestra base de datos inmutable
import ShorekeeperData from '@ww-stats/resonators/Shorekeeper.json';
import RoverHavocData from '@ww-stats/resonators/RoverHavoc.json';
import SanhuaData from '@ww-stats/resonators/Sanhua.json';

// Diccionario maestro de personajes
const characterDB: Record<string, any> = {
  Shorekeeper: { ...ShorekeeperData, element: 'Spectro' },
  RoverHavoc: { ...RoverHavocData, element: 'Havoc' },
  Sanhua: { ...SanhuaData, element: 'Glacio' },
};

const elementColors: Record<string, string> = {
  Havoc: '#d8b4e2',
  Spectro: '#fef08a',
  Aero: '#bbf7d0',
  Fusion: '#fed7aa',
  Glacio: '#bfdbfe',
  Electro: '#e9d5ff',
};

export default function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('character');
  
  // Estado del personaje activo
  const [selectedChar, setSelectedChar] = useState('Shorekeeper');
  const [level, setLevel] = useState(90);
  const [activeNodes, setActiveNodes] = useState<Record<string, boolean>>({});

  const charData = characterDB[selectedChar];
  const accentColor = elementColors[charData.element || 'Spectro'];

  // Resetea los nodos activos al cambiar de personaje
  useEffect(() => {
    setActiveNodes({});
  }, [selectedChar]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--bg-main', isDarkMode ? '#0f1115' : '#f8fafc');
    document.documentElement.style.setProperty('--bg-panel', isDarkMode ? '#1e2128' : '#ffffff');
    document.documentElement.style.setProperty('--text-main', isDarkMode ? '#f1f5f9' : '#0f172a');
    document.documentElement.style.setProperty('--text-muted', isDarkMode ? '#94a3b8' : '#64748b');
    document.documentElement.style.setProperty('--border', isDarkMode ? '#334155' : '#e2e8f0');
  }, [accentColor, isDarkMode]);

  const toggleNode = (id: string) => {
    setActiveNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navItems = [
    { id: 'character', icon: <Users size={20} />, label: 'Resonator Setup' },
    { id: 'echoes', icon: <Hexagon size={20} />, label: 'Echo Inventory' },
    { id: 'weapons', icon: <Sword size={20} />, label: 'Weapons' },
    { id: 'optimizer', icon: <Zap size={20} />, label: 'Team & Optimize' },
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans flex" 
         style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:relative z-20 flex flex-col h-screen transition-all duration-300 ease-in-out border-r
                        ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'} `}
             style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="h-16 flex items-center justify-between px-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {isSidebarOpen && <span className="font-bold tracking-wider" style={{ color: 'var(--accent)' }}>UN-WAVES</span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:opacity-80 lg:hidden">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200
                ${activeTab === item.id ? 'shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              style={{ 
                backgroundColor: activeTab === item.id ? 'var(--accent)' : 'transparent',
                color: activeTab === item.id ? '#000' : 'var(--text-main)'
              }}
            >
              {item.icon}
              {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b transition-colors"
                style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:opacity-80">
              <Menu size={24} />
            </button>
            
            {/* SELECTOR MAESTRO DE PERSONAJE */}
            <select 
              value={selectedChar} 
              onChange={(e) => setSelectedChar(e.target.value)}
              className="p-2 rounded-lg border appearance-none outline-none font-bold transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
            >
              {Object.keys(characterDB).map(key => (
                <option key={key} value={key}>{characterDB[key].name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full transition-colors" style={{ backgroundColor: 'var(--bg-main)' }}>
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </header>

        {/* WORKSPACE */}
        <div className="flex-1 overflow-auto p-6 lg:p-10">
          {activeTab === 'character' && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* PANEL DEL RESONADOR */}
              <div className="p-6 rounded-2xl border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{charData.name}</h3>
                    <span className="text-sm uppercase tracking-widest opacity-60 font-semibold">{charData.element}</span>
                  </div>
                  <span className="px-3 py-1 text-sm rounded-full font-medium" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                    {charData.weaponType}
                  </span>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ascension Level</label>
                  <select 
                    value={level} 
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="w-full p-3 rounded-lg border appearance-none outline-none font-medium transition-colors"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
                  >
                    {[1, 20, 40, 50, 60, 70, 80, 90].map(lvl => (
                      <option key={lvl} value={lvl}>Level {lvl}</option>
                    ))}
                  </select>
                </div>

                {/* STAT NODES DINÁMICOS */}
                {charData.statNodes && (
                  <div className="pt-4 border-t mt-6" style={{ borderColor: 'var(--border)' }}>
                    <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>Inherent Stat Nodes</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {charData.statNodes.map((node: any) => (
                        <button
                          key={node.id}
                          onClick={() => toggleNode(node.id)}
                          className={`p-3 rounded-lg text-sm font-medium border transition-all flex justify-between items-center ${
                            activeNodes[node.id] ? 'opacity-100 shadow-sm' : 'opacity-50 hover:opacity-80'
                          }`}
                          style={{ 
                            borderColor: activeNodes[node.id] ? 'var(--accent)' : 'var(--border)',
                            backgroundColor: activeNodes[node.id] ? 'var(--bg-main)' : 'transparent',
                            color: activeNodes[node.id] ? 'var(--accent)' : 'var(--text-main)'
                          }}
                        >
                          <span>{node.name}</span>
                          <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                               style={{ borderColor: activeNodes[node.id] ? 'var(--accent)' : 'var(--border)' }}>
                            {activeNodes[node.id] && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
