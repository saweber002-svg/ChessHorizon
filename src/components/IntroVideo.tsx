import { useState } from 'react';
import { INTRO_VIDEO_SRC } from '@/data/storyVideo';

interface IntroVideoProps {
  /** First-run plays are unskippable (Scott, 2026-10-23); pavilion replays pass true. */
  skippable: boolean;
  onDone: () => void;
}

/**
 * Full-screen story introduction player. On first run there is no skip
 * control and no dismiss: the only exits are the video ending, or — if
 * the asset fails to load — an explicit Continue button, so a missing
 * file can never brick entry to the atlas.
 */
export function IntroVideo({ skippable, onDone }: IntroVideoProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
      {!failed ? (
        <video
          src={INTRO_VIDEO_SRC}
          autoPlay
          playsInline
          controls={false}
          onEnded={onDone}
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl th-bg border th-accent-border text-center">
          <p className="th-accent-text text-xs uppercase tracking-[0.3em] mb-3">Introduction</p>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            The introduction video could not be loaded. Your journey still begins in Italy,
            with the Giuoco Piano.
          </p>
          <button
            onClick={onDone}
            className="w-full py-3 rounded-xl th-accent th-accent-hover font-bold"
          >
            Continue
          </button>
        </div>
      )}
      {skippable && !failed && (
        <button
          onClick={onDone}
          className="absolute top-4 right-4 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/20 transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  );
}
