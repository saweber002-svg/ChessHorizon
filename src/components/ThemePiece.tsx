/**
 * Renders an exact piece sprite for the current theme.
 *
 * Pieces are transparent PNGs extracted from Scott's reference images —
 * one set of 12 per theme. `piece` is a two-letter code like 'wp' (white
 * pawn) or 'bk' (black king).
 *
 * The img is absolutely positioned directly in the (relative) square cell.
 * No wrapper div: WebKit fails to resolve percentage heights (h-full) on
 * children of CSS grid items, which broke centering on iOS Safari.
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
  );
}
