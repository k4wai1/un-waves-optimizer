import { useMemo } from 'react';
import { Sword, Layers } from 'lucide-react';

interface WeaponsSetupProps {
  availableWeapons: any[];
  equippedWeapon: any | null;
  weaponLevel: number;
  weaponRank: number;
  weaponImages: Record<string, string>;
  weaponStacks: number;
  onWeaponChange: (weapon: any) => void;
  onLevelChange: (level: number) => void;
  onRankChange: (rank: number) => void;
  onStacksChange: (stacks: number) => void;
}

/**
 * Extrae los niveles disponibles de un arma leyendo las keys de baseStats.atk.
 * Soporta cualquier conjunto de niveles (1, 20, 40, ... 90 o solo 90, etc.)
 */
function getWeaponLevels(weapon: any): number[] {
  if (!weapon?.baseStats?.atk) return [];
  return Object.keys(weapon.baseStats.atk)
    .map(Number)
    .filter(n => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

export function WeaponsSetup({
  availableWeapons,
  equippedWeapon,
  weaponLevel,
  weaponRank,
  weaponImages,
  weaponStacks,
  onWeaponChange,
  onLevelChange,
  onRankChange,
  onStacksChange
}: WeaponsSetupProps) {

  // Niveles dinámicos: se leen directamente de las keys del JSON del arma
  const weaponLevels = useMemo(
    () => getWeaponLevels(equippedWeapon),
    [equippedWeapon]
  );

  // URL de la imagen del arma (si existe un .webp homónimo)
  const weaponImageUrl = equippedWeapon ? weaponImages[equippedWeapon.id] : undefined;

  // Datos de mecánicas del arma
  const maxStacks = equippedWeapon?.mechanics?.maxStacks ?? 1;
  const hasStacks = maxStacks > 1;

  if (!equippedWeapon) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-50" style={{ color: 'var(--text-muted)' }}>
        <Sword size={48} className="mb-4" />
        <p>No weapons available for this resonator type</p>
      </div>
    );
  }

  // Calcular stats al nivel actual
  const levelKey = weaponLevel.toString();
  const currentAtk = equippedWeapon.baseStats?.atk?.[levelKey]
    ?? equippedWeapon.baseStats?.atk?.['90']
    ?? 0;
  const secondStatValue = equippedWeapon.secondStat?.values?.[levelKey]
    ?? equippedWeapon.secondStat?.values?.['90']
    ?? 0;
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

          {/* Selector de Nivel DINÁMICO según las keys del JSON del arma */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ascension Level</label>
            <select 
              value={weaponLevels.includes(weaponLevel) ? weaponLevel : weaponLevels[weaponLevels.length - 1] ?? weaponLevel}
              onChange={(e) => onLevelChange(Number(e.target.value))}
              className="w-full p-3 rounded-lg border outline-none font-medium" 
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {weaponLevels.length === 0 ? (
                <option value={90}>Level 90</option>
              ) : (
                weaponLevels.map(lvl => (
                  <option key={lvl} value={lvl}>Level {lvl}</option>
                ))
              )}
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

      {/* Panel de Previsualización con imagen y stacks */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-6 mb-4">
          {/* Imagen del arma (.webp) */}
          {weaponImageUrl ? (
            <img
              src={weaponImageUrl}
              alt={equippedWeapon.name}
              className="w-24 h-24 object-contain rounded-xl border shrink-0"
              style={{ borderColor: 'var(--border)' }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-xl border flex items-center justify-center shrink-0"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
            >
              <Sword size={32} className="opacity-30" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{equippedWeapon.name}</h3>
            <span className="text-xs tracking-widest uppercase opacity-50 font-semibold">
              {equippedWeapon.rarity ? `${'★'.repeat(equippedWeapon.rarity)} ` : ''}
              Lv.{weaponLevel} · R{weaponRank + 1}
            </span>
          </div>
        </div>
        
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

        {/* Passives (con multiplicador de stacks si aplica) */}
        {equippedWeapon.passives && Object.keys(equippedWeapon.passives).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Passive Effects (R{weaponRank + 1})
              {hasStacks && <span className="ml-2 text-[10px] opacity-50">×{weaponStacks} stacks</span>}
            </h4>
            <div className="space-y-2 text-sm font-mono">
              {Object.entries(equippedWeapon.passives).map(([key, values]: [string, any]) => {
                if (Array.isArray(values)) {
                  const baseValue = values[weaponRank] || 0;
                  const displayValue = hasStacks ? baseValue * weaponStacks : baseValue;
                  return (
                    <div key={key} className="flex justify-between py-1">
                      <span style={{ color: 'var(--text-muted)' }}>
                        {formatStatName(key)}
                        {hasStacks && weaponStacks > 0 && (
                          <span className="text-[10px] ml-1 opacity-40">
                            ({formatStatValue(key, baseValue)} ×{weaponStacks})
                          </span>
                        )}
                      </span>
                      <span style={{ color: 'var(--accent)' }}>
                        +{formatStatValue(key, displayValue)}
                      </span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {/* Control de Stacks del arma (solo si maxStacks > 1) */}
        {hasStacks && (
          <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Layers size={16} style={{ color: 'var(--accent)' }} />
              <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Weapon Stacks — {weaponStacks} / {maxStacks}
              </h4>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: maxStacks + 1 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onStacksChange(i)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                    weaponStacks === i ? 'shadow-sm' : 'opacity-40 hover:opacity-70'
                  }`}
                  style={{
                    backgroundColor: weaponStacks === i ? 'var(--accent)' : 'transparent',
                    borderColor: weaponStacks === i ? 'var(--accent)' : 'var(--border)',
                    color: weaponStacks === i ? '#000' : 'var(--text-main)',
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Descripción cruda del arma */}
        {equippedWeapon.mechanics?.description_raw && (
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Weapon Description</h4>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)', opacity: 0.8 }}>
              {equippedWeapon.mechanics.description_raw}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
