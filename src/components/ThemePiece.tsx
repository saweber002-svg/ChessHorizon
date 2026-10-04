/**
 * Renders an exact piece sprite for the current theme.
 *
 * Pieces are transparent PNGs extracted from Scott's reference images —
 * one set of 12 per theme. `piece` is a two-letter code like 'wp' (white
 * pawn) or 'bk' (black king).
 */
import { pieceSpriteUrl, type GameTheme } from '@/data/gameThemes';

interface ThemePieceProps {
  theme: GameTheme;
  /** Two-letter code: color ('w'|'b') + symbol ('p','n','b','r','q','k'). */
  piece: string;
  className?: string;
  draggable?: boolean;
}

export default function ThemePiece({ theme, piece, className, draggable }: ThemePieceProps) {
  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <img
        src={pieceSpriteUrl(theme, piece)}
        alt=""
        draggable={draggable}
        style={{
          width: '82%',
          height: '82%',
          objectFit: 'contain',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: draggable ? undefined : 'none',
        }}
      />
    </div>
  );
}
