import type { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useEvaluation } from '@/hooks/useEvaluation';
import EvalBar from '@/components/EvalBar';

interface BoardWithEvalProps {
  /** The position the board is showing — the bar evaluates this FEN. */
  fen: string;
  /** Which side sits at the bottom of the board. Defaults to 'white'. */
  orientation?: 'white' | 'black';
  children: ReactNode;
}

/**
 * Wraps a ChessBoard with the Stockfish evaluation bar in the position the
 * user picked in Settings (left of the board by default, top, or off).
 * Every game mode renders its board through this wrapper — drills, coaching,
 * sparring, the Clearing (and future online PvP there), and the Wilderness
 * board editor — so the preference applies everywhere at once.
 */
export default function BoardWithEval({ fen, orientation = 'white', children }: BoardWithEvalProps) {
  const { evalBarPosition } = useTheme();
  const score = useEvaluation(fen, evalBarPosition !== 'off');

  if (evalBarPosition === 'off') {
    return <>{children}</>;
  }

  if (evalBarPosition === 'top') {
    return (
      <div className="flex flex-col gap-2">
        <EvalBar score={score} layout="horizontal" boardOrientation={orientation} />
        {children}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <EvalBar score={score} layout="vertical" boardOrientation={orientation} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
