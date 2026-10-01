import type { EngineScore } from '@/engine/stockfish';
import { formatEval, whiteShare } from '@/lib/evalBar';

interface EvalBarProps {
  /** White-perspective engine score, or null while the first eval is pending. */
  score: EngineScore | null;
  layout: 'vertical' | 'horizontal';
  /** Which side sits at the bottom of the board the bar belongs to. */
  boardOrientation: 'white' | 'black';
}

const TRACK_CLASS = 'relative overflow-hidden rounded-md border border-white/15 bg-[#17171f]';
const FILL_CLASS = 'absolute bg-[#f4f4f5] transition-all duration-700 ease-out';

/**
 * Stockfish evaluation bar. White's share of the bar grows from White's end
 * of the board — the bottom (or left) when White is at the bottom, the top
 * (or right) when the board is flipped for Black.
 */
export default function EvalBar({ score, layout, boardOrientation }: EvalBarProps) {
  const share = score ? whiteShare(score) : 0.5;
  const pct = `${Math.round(share * 1000) / 10}%`;
  const label = score ? formatEval(score) : '';
  const flipped = boardOrientation === 'black';

  if (layout === 'vertical') {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1.5" aria-label="Engine evaluation">
        <div className={`${TRACK_CLASS} w-[18px] flex-1`}>
          <div
            className={FILL_CLASS}
            style={{
              left: 0,
              right: 0,
              height: pct,
              ...(flipped ? { top: 0 } : { bottom: 0 }),
            }}
          />
        </div>
        <span className="w-6 text-center font-mono text-[9px] leading-none text-white/60">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" aria-label="Engine evaluation">
      <div className={`${TRACK_CLASS} h-4 flex-1`}>
        <div
          className={FILL_CLASS}
          style={{
            top: 0,
            bottom: 0,
            width: pct,
            ...(flipped ? { right: 0 } : { left: 0 }),
          }}
        />
      </div>
      <span className="w-8 font-mono text-[10px] leading-none text-white/60">{label}</span>
    </div>
  );
}
