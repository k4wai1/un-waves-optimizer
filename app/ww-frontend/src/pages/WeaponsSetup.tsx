import { useMemo } from 'react';
import { Sword, Layers } from 'lucide-react';
import { formatDescription, type Modifier } from '../engine/effectResolver';

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

function getMeta(w: any): any { return w?.metadata || w; }
function getStats(w: any): any { return w?.stats || w?.baseStats || {}; }
function getSecondaryAttribute(stats: any, weapon: any, level: number): { key: string; value: number } | null {
  if (stats?.secondaryAttribute?.key) {
    const sa = stats.secondaryAttribute;
    if (sa.values) { const lk = String(level); return { key: sa.key, value: sa.values[lk] ?? sa.values['90'] ?? 0 }; }
    if (sa.value !== undefined) return { key: sa.key, value: sa.value };
  }
  if (weapon?.secondStat?.statKey) {
    const lk = String(level);
    return { key: weapon.secondStat.statKey, value: weapon.secondStat.values?.[lk] ?? weapon.secondStat.values?.['90'] ?? 0 };
  }
  return null;
}
function getWeaponLevels(w: any): number[] {
  const a = getStats(w).atk; if (!a) return [];
  return Object.keys(a).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
}

const statNames: Record<string, string> = { critRate_: 'Crit. Rate', critDmg_: 'Crit. DMG', atk_: 'ATK%', hp_: 'HP%', def_: 'DEF%', energyRegen_: 'Energy Regen' };
const fmtStat = (k: string, v: number) => k.endsWith('_') ? `${(v * 100).toFixed(1)}%` : Math.round(v).toString();
const fmtMod = (m: Modifier, r: number) => {
  const v = m.value[Math.min(r, m.value.length - 1)] ?? 0;
  switch (m.valueType) { case 'Percent': return `${(v * 100).toFixed(1)}%`; case 'Flat': return v.toFixed(0); case 'Multiplier': return `×${v.toFixed(2)}`; }
};
const targetLabel = (t: any) => {
  if (t.type === 'Stat') return statNames[t.id] || t.id;
  if (t.type === 'Action') return `Action: ${t.id}`;
  if (t.type === 'Category') return `All ${t.id.replace(/([A-Z])/g, ' $1').trim()}`;
  return t.id;
};

export function WeaponsSetup({ availableWeapons, equippedWeapon, weaponLevel, weaponRank, weaponImages, weaponStacks, onWeaponChange, onLevelChange, onRankChange, onStacksChange }: WeaponsSetupProps) {
  const weaponLevels = useMemo(() => getWeaponLevels(equippedWeapon), [equippedWeapon]);
  const weaponImageUrl = equippedWeapon ? weaponImages[equippedWeapon.metadata?.id || equippedWeapon.id] : undefined;
  const effects = equippedWeapon?.effects || [];
  const hasStacks = effects.some((e: any) => e.maxStacks > 1);

  if (!equippedWeapon) return (
    <div className="flex flex-col items-center justify-center h-full opacity-50" style={{ color: 'var(--text-muted)' }}>
      <Sword size={48} className="mb-4" /><p>No weapons available for this resonator type</p>
    </div>
  );

  const meta = getMeta(equippedWeapon);
  const wStats = getStats(equippedWeapon);
  const currentAtk = wStats.atk?.[String(weaponLevel)] ?? wStats.atk?.['90'] ?? 0;
  const secondary = getSecondaryAttribute(wStats, equippedWeapon, weaponLevel);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Selector */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-6"><Sword size={24} style={{ color: 'var(--accent)' }} /><h2 className="text-2xl font-bold">Weapon Configuration</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Weapon</label>
            <select value={equippedWeapon.metadata?.id || equippedWeapon.id} onChange={e => { const w = availableWeapons.find(x => (x.metadata?.id || x.id) === e.target.value); if (w) onWeaponChange(w); }}
              className="w-full p-3 rounded-lg border outline-none font-medium" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {availableWeapons.map(w => <option key={w.metadata?.id || w.id} value={w.metadata?.id || w.id}>{w.metadata?.name || w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Ascension Level</label>
            <select value={weaponLevels.includes(weaponLevel) ? weaponLevel : weaponLevels[weaponLevels.length - 1] ?? weaponLevel} onChange={e => onLevelChange(Number(e.target.value))}
              className="w-full p-3 rounded-lg border outline-none font-medium" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {weaponLevels.length === 0 ? <option value={90}>Level 90</option> : weaponLevels.map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Resonance Rank</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => onRankChange(r - 1)}
                  className={`flex-1 p-3 rounded-lg border font-bold transition-all ${weaponRank === r - 1 ? 'shadow-md' : 'opacity-50 hover:opacity-80'}`}
                  style={{ backgroundColor: weaponRank === r - 1 ? 'var(--accent)' : 'transparent', borderColor: weaponRank === r - 1 ? 'var(--accent)' : 'var(--border)', color: weaponRank === r - 1 ? '#000' : 'var(--text-main)' }}>R{r}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vista previa */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-6 mb-4">
          {weaponImageUrl ? <img src={weaponImageUrl} alt={meta.name} className="w-24 h-24 object-contain rounded-xl border shrink-0" style={{ borderColor: 'var(--border)' }} />
            : <div className="w-24 h-24 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}><Sword size={32} className="opacity-30" /></div>}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{meta.name}</h3>
            <span className="text-xs tracking-widest uppercase opacity-50 font-semibold">{meta.rarity ? `${'★'.repeat(meta.rarity)} ` : ''}Lv.{weaponLevel} · R{weaponRank + 1}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Base Stats</h4>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between py-1"><span style={{ color: 'var(--text-muted)' }}>Base ATK</span><span>{currentAtk}</span></div>
            {secondary && <div className="flex justify-between py-1"><span style={{ color: 'var(--text-muted)' }}>{statNames[secondary.key] || secondary.key}</span><span>{fmtStat(secondary.key, secondary.value)}</span></div>}
          </div>
        </div>

        {/* Effects con controles auto-generados */}
        {effects.length > 0 && (
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Effects (R{weaponRank + 1})</h4>
            <div className="space-y-4">
              {effects.map((effect: any) => {
                const desc = effect.descriptionTemplate
                  ? formatDescription(effect.descriptionTemplate, effect.modifiers || [], weaponRank)
                  : effect.name;

                return (
                  <div key={effect.id} className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                    <div className="text-sm font-medium mb-1">{effect.name}</div>
                    <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{desc}</div>

                    {/* Tags de targets */}
                    {effect.targets?.map((t: any, i: number) => (
                      <span key={i} className="inline-block text-[10px] px-2 py-0.5 mr-1 mb-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{targetLabel(t)}</span>
                    ))}

                    {/* Valores del modifier */}
                    {effect.modifiers?.map((m: any, i: number) => (
                      <div key={i} className="text-xs font-mono mt-1" style={{ color: 'var(--accent)' }}>
                        <span className="opacity-60">{m.operation}</span> <span className="font-bold">{fmtMod(m, weaponRank)}</span>
                        {effect.maxStacks > 1 && <span className="opacity-60"> ×{weaponStacks}</span>}
                      </div>
                    ))}

                    {/* Control auto-generado: slider si maxStacks>1 */}
                    {effect.maxStacks > 1 ? (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <Layers size={14} className="opacity-40 shrink-0" />
                        <div className="flex gap-1">
                          {Array.from({ length: effect.maxStacks + 1 }, (_, i) => (
                            <button key={i} onClick={() => onStacksChange(i)}
                              className={`px-3 py-1 text-xs rounded-lg border font-bold transition-all ${weaponStacks === i ? 'shadow-sm' : 'opacity-40 hover:opacity-70'}`}
                              style={{ backgroundColor: weaponStacks === i ? 'var(--accent)' : 'transparent', borderColor: weaponStacks === i ? 'var(--accent)' : 'var(--border)', color: weaponStacks === i ? '#000' : 'var(--text-main)' }}>{i}</button>
                          ))}
                        </div>
                      </div>
                    ) : <div className="mt-2 text-[10px] uppercase tracking-wider opacity-40">Always active</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
