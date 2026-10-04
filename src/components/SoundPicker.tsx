import { SOUND_PACKS, getSoundPack } from '@/audio/soundPacks';
import { useSound } from '@/contexts/SoundContext';
import { Volume2, VolumeX } from 'lucide-react';

export default function SoundPicker() {
  const { packId, setPackId, volume, setVolume, enabled, setEnabled } = useSound();

  const handlePackSelect = (id: string) => {
    setPackId(id);
    // Preview the pack with a move sound
    setTimeout(() => {
      getSoundPack(id).play('move');
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Enable/disable */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium th-text">Sound Effects</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            enabled ? 'th-accent' : 'th-panel'
          }`}
          aria-label={enabled ? 'Mute sounds' : 'Unmute sounds'}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform flex items-center justify-center ${
              enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          >
            {enabled ? (
              <Volume2 className="w-3 h-3 th-accent-text" />
            ) : (
              <VolumeX className="w-3 h-3 th-muted" />
            )}
          </div>
        </button>
      </div>

      {/* Volume */}
      {enabled && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium th-text">Volume</span>
            <span className="text-xs th-muted">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none th-panel accent-[var(--th-accent)]"
          />
        </div>
      )}

      {/* Pack selection */}
      {enabled && (
        <div>
          <h3 className="text-sm font-semibold th-text mb-3">Sound Pack</h3>
          <div className="grid grid-cols-3 gap-3">
            {SOUND_PACKS.map((pack) => {
              const isActive = pack.id === packId;
              return (
                <button
                  key={pack.id}
                  onClick={() => handlePackSelect(pack.id)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? 'th-accent-border th-accent-soft'
                      : 'th-border th-panel hover:th-border'
                  }`}
                  title={pack.description}
                >
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full th-accent flex items-center justify-center">
                      <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className={`text-sm font-semibold ${isActive ? 'th-accent-text' : 'th-text'}`}>
                    {pack.name}
                  </div>
                  <div className="text-xs th-muted mt-1">{pack.description}</div>
                </button>
              );
            })}
          </div>
          <p className="text-xs th-muted mt-2">
            Tap a pack to preview its move sound.
          </p>
        </div>
      )}
    </div>
  );
}
