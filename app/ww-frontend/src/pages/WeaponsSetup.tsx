import { Sword } from 'lucide-react';

interface WeaponsSetupProps {
  availableWeapons: any[];
  equippedWeapon: any | null;
  weaponLevel: number;
  weaponRank: number;
  onWeaponChange: (weapon: any) => void;
  onLevelChange: (level: number) => void;
  onRankChange: (rank: number) => void;
}

const WEAPON_LEVELS = [1, 20, 40, 50, 60, 70, 80, 90];

export function WeaponsSetup({
  availableWeapons,
  equippedWeapon,
  weaponLevel,
  weaponRank,
  onWeaponChange,
  onLevelChange,
  onRankChange
}: WeaponsSetupProps) {
  
  if (!equippedWeapon) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-50" style={{ color: 'var(--text-muted)' }}>
        <Sword size={48} className="mb-4" />
        <p>No weapons available for this resonator type</p>
      </div>
    );
  }

  // Calcular stats al nivel actual
  const currentAtk = equippedWeapon.baseStats.atk[weaponLevel.toString()] || equippedWeapon.baseStats.atk["90"];
  const secondStatValue = equippedWeapon.secondStat?.values[weaponLevel.toString()] || equippedWeapon.secondStat?.values["90"] || 0;
  const secondStatKey = equippedWeapon.secondStat?.statKey || '';

  // Formatear nombre de stat secundaria
  const formatStatName = (key: string) => {
    const names: Record<string, string> = {
      'critRate_': 'Crit. Rate',
      'critDmg_': 'Crit. DMG',
      'atk_': 'ATK%',
      'def_': 'DEF%',
      'hp_': 'HP%',
      'energyRegen_': 'Energy Regen'
    };
    return names[key] || key;
  };

  const formatStatValue = (key: string, value: number) => {
    if (key.endsWith('_')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return Math.round(value).toString();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Panel de Selección */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-6">
          <Sword size={24} style={{ color: 'var(--accent)' }} />
          <h2 className="text-2xl font-bold">Weapon Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Selector de Arma */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Weapon</label>
            <select 
              value={equippedWeapon.id} 
              onChange={(e) => {
                const weapon = availableWeapons.find(w => w.id === e.target.value);
                if (weapon) onWeaponChange(weapon);
              }}
              className="w-full p-3 rounded-lg border outline-none font-medium" 
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {availableWeapons.map(weapon => (
                <option key={weapon.id} value={weapon.id}>{weapon.name}</option>
              ))}
            </select>
          </div>

          {/* Selector de Nivel */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ascension Level</label>
            <select 
              value={weaponLevel} 
              onChange={(e) => onLevelChange(Number(e.target.value))}
              className="w-full p-3 rounded-lg border outline-none font-medium" 
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {WEAPON_LEVELS.map(lvl => (
                <option key={lvl} value={lvl}>Level {lvl}</option>
              ))}
            </select>
          </div>

          {/* Selector de Refinamiento */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Resonance Rank</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rank) => (
                <button
                  key={rank}
                  onClick={() => onRankChange(rank - 1)}
                  className={`flex-1 p-3 rounded-lg border font-bold transition-all ${
                    weaponRank === rank - 1 ? 'shadow-md' : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: weaponRank === rank - 1 ? 'var(--accent)' : 'transparent',
                    borderColor: weaponRank === rank - 1 ? 'var(--accent)' : 'var(--border)',
                    color: weaponRank === rank - 1 ? '#000' : 'var(--text-main)'
                  }}
                >
                  R{rank}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Previsualización */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>{equippedWeapon.name}</h3>
        
        {/* Stats Base */}
        <div className="mb-6">
          <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Base Stats</h4>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between py-1">
              <span style={{ color: 'var(--text-muted)' }}>Base ATK</span>
              <span>{currentAtk}</span>
            </div>
            {secondStatKey && (
              <div className="flex justify-between py-1">
                <span style={{ color: 'var(--text-muted)' }}>{formatStatName(secondStatKey)}</span>
                <span>{formatStatValue(secondStatKey, secondStatValue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Passives */}
        {equippedWeapon.passives && Object.keys(equippedWeapon.passives).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Passive Effects (R{weaponRank + 1})
            </h4>
            <div className="space-y-2 text-sm font-mono">
              {Object.entries(equippedWeapon.passives).map(([key, values]: [string, any]) => {
                if (Array.isArray(values)) {
                  const currentValue = values[weaponRank] || 0;
                  return (
                    <div key={key} className="flex justify-between py-1">
                      <span style={{ color: 'var(--text-muted)' }}>{formatStatName(key)}</span>
                      <span style={{ color: 'var(--accent)' }}>+{formatStatValue(key, currentValue)}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {/* Descripción */}
        {equippedWeapon.mechanics?.description_raw && (
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Weapon Passive</h4>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)', opacity: 0.8 }}>
              {equippedWeapon.mechanics.description_raw}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
