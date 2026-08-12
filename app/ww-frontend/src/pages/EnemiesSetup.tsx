import { useMemo } from 'react';
import { Ghost, Shield, Heart, Swords } from 'lucide-react';
import { resolveEnemyStats, enemyInfo } from '../engine/enemy';

interface EnemiesSetupProps {
  enemiesDB: Record<string, any>;
  enemyImages: Record<string, string>;
  selectedEnemy: string | null;
  enemyLevel: number;
  onEnemyChange: (id: string | null) => void;
  onLevelChange: (level: number) => void;
}

function getMeta(e: any): any { return e?.metadata || e; }
function getStats(e: any): any { return e?.stats || {}; }

const elementResNames: Record<string, string> = {
  glacio: 'Glacio RES', fusion: 'Fusion RES', electro: 'Electro RES',
  aero: 'Aero RES', havoc: 'Havoc RES', spectro: 'Spectro RES',
};

const rarityColor: Record<string, string> = {
  Calamity: '#f87171', Overlord: '#fbbf24', Elite: '#a78bfa', Standard: '#94a3b8',
};

export function EnemiesSetup({ enemiesDB, enemyImages, selectedEnemy, enemyLevel, onEnemyChange, onLevelChange }: EnemiesSetupProps) {
  // Ordenar por clase y nombre
  const sorted = useMemo(() => {
    const classOrder: Record<string, number> = { Calamity: 0, Overlord: 1, Elite: 2, Standard: 3 };
    return Object.values(enemiesDB).sort((a: any, b: any) => {
      const ca = classOrder[getMeta(a).rarityClass] ?? 4;
      const cb = classOrder[getMeta(b).rarityClass] ?? 4;
      if (ca !== cb) return ca - cb;
      return (getMeta(a).name || '').localeCompare(getMeta(b).name || '');
    });
  }, [enemiesDB]);

  const enemy = selectedEnemy ? enemiesDB[selectedEnemy] : null;
  const meta = getMeta(enemy);
  const stats = getStats(enemy);
  const info = enemyInfo(enemy);
  const resolved = enemy ? resolveEnemyStats(enemy, enemyLevel) : null;
  const imageUrl = enemy ? enemyImages[meta.id] : undefined;

  if (!enemy) return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-6"><Ghost size={24} style={{ color: 'var(--accent)' }} /><h2 className="text-2xl font-bold">Enemy Configuration</h2></div>
        {Object.keys(enemiesDB).length === 0
          ? <p className="opacity-50" style={{ color: 'var(--text-muted)' }}>No enemies database loaded.</p>
          : <p className="opacity-50" style={{ color: 'var(--text-muted)' }}>Select an enemy to begin.</p>}
      </div>
    </div>
  );

  const resEntries = resolved ? Object.entries(resolved.elementalResistances) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Selector */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-6"><Ghost size={24} style={{ color: 'var(--accent)' }} /><h2 className="text-2xl font-bold">Enemy Configuration</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Enemy</label>
            <select value={selectedEnemy || ''} onChange={e => onEnemyChange(e.target.value || null)}
              className="w-full p-3 rounded-lg border outline-none font-medium" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {sorted.map(e => {
                const m = getMeta(e);
                return <option key={m.id} value={m.id}>{m.name || m.id}{m.rarityClass ? ` (${m.rarityClass})` : ''}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Enemy Level</label>
            <select value={enemyLevel} onChange={e => onLevelChange(Number(e.target.value))}
              className="w-full p-3 rounded-lg border outline-none font-medium" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border)', color: 'var(--text-main)' }}>
              {Array.from({ length: 120 }, (_, i) => i + 1).map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Detalle */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-6 mb-4">
          {imageUrl ? <img src={imageUrl} alt={meta.name} className="w-28 h-28 object-contain rounded-xl border shrink-0" style={{ borderColor: 'var(--border)' }} />
            : <div className="w-28 h-28 rounded-xl border flex items-center justify-center shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}><Ghost size={32} className="opacity-30" /></div>}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{meta.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {meta.rarityClass && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--bg-main)', color: rarityColor[meta.rarityClass] || 'var(--text-muted)' }}>{meta.rarityClass}</span>}
              {meta.element && <span className="text-xs px-2 py-0.5 rounded-full border font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{meta.element.toUpperCase()}</span>}
            </div>
            {stats.atk !== undefined && <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>ID {meta.id} · Lv.{enemyLevel}</div>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {resolved && (
            <>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}><Heart size={12} /> HP</div>
                <div className="font-mono font-bold">{Math.round(resolved.hp).toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}><Swords size={12} /> ATK</div>
                <div className="font-mono font-bold">{info.atk || '—'}</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}><Shield size={12} /> DEF</div>
                <div className="font-mono font-bold">{resolved.defense}</div>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}><Ghost size={12} /> DMG Taken</div>
                <div className="font-mono font-bold">{resolved.damageTaken}×</div>
              </div>
            </>
          )}
        </div>

        {/* Resistencias */}
        <div className="mb-6">
          <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Resistances</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {resEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{elementResNames[k] || k}</span>
                <span className="font-mono font-semibold">{(v as number * 100).toFixed(1)}%</span>
              </div>
            ))}
            {resolved && <div className="flex justify-between px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Physical RES</span>
              <span className="font-mono font-semibold">{(resolved.physicalResistance * 100).toFixed(1)}%</span>
            </div>}
          </div>
          {resolved && resolved.damageReduction > 0 && (
            <div className="mt-2 text-xs px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              M_DR (Damage Reduction): {resolved.damageReduction * 100}% (barrera de boss, se multiplica al final)
            </div>
          )}
        </div>

        {/* Descripción */}
        {meta && (enemy?.lore?.about || enemy?.lore?.undiscovered) && (
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Lore</h4>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{enemy.lore.about || enemy.lore.undiscovered}</p>
          </div>
        )}
      </div>
    </div>
  );
}
