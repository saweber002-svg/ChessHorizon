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
        <span className="text-sm font-medium text-slate-300">Sound Effects</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            enabled ? 'bg-cyan-500' : 'bg-slate-700'
          }`}
          aria-label={enabled ? 'Mute sounds' : 'Unmute sounds'}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform flex items-center justify-center ${
              enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          >
            {enabled ? (
              <Volume2 className="w-3 h-3 text-cyan-600" />
            ) : (
              <VolumeX className="w-3 h-3 text-slate-500" />
            )}
          </div>
        </button>
      </div>

      {/* Volume */}
      {enabled && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Volume</span>
            <span className="text-xs text-slate-400">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-cyan-400"
          />
        </div>
      )}

      {/* Pack selection */}
      {enabled && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Sound Pack</h3>
          <div className="grid grid-cols-3 gap-3">
            {SOUND_PACKS.map((pack) => {
              const isActive = pack.id === packId;
              return (
                <button
                  key={pack.id}
                  onClick={() => handlePackSelect(pack.id)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                  title={pack.description}
                >
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
                      <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className={`text-sm font-semibold ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {pack.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{pack.description}</div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tap a pack to preview its move sound.
          </p>
        </div>
      )}
    </div>
  );
}
