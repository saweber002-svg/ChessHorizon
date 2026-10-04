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
    <img
      src={pieceSpriteUrl(theme, piece)}
      alt=""
      draggable={draggable}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: draggable ? undefined : 'none' }}
    />
  );
}
