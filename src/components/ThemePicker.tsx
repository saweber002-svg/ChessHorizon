import { GAME_THEMES, type GameTheme } from '@/data/gameThemes';
import { PIECE_STYLES, getPieceSvg, type PieceStyleId } from '@/components/pieceStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { EVAL_BAR_LABELS, EVAL_BAR_POSITIONS } from '@/lib/evalBar';

/**
 * Live preview: mini board + the theme's piece design in its own colors.
 */
function ThemePreview({ theme }: { theme: GameTheme }) {
  const squares: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const isLight = (r + c) % 2 === 0;
      squares.push(
        <div
          key={`${r}-${c}`}
          style={{ backgroundColor: isLight ? theme.board.lightSquare : theme.board.darkSquare }}
        />
      );
    }
  }
  const colors = {
    whiteFill: theme.pieces.whiteFill,
    whiteStroke: theme.pieces.whiteStroke,
    blackFill: theme.pieces.blackFill,
    blackStroke: theme.pieces.blackStroke,
    defs: theme.pieces.defs,
  };
  const whiteSvg = getPieceSvg(theme.pieces.styleId, 'n', 'w', colors);
  const blackSvg = getPieceSvg(theme.pieces.styleId, 'n', 'b', colors);
  return (
    <div className="relative w-24 h-24">
      <div
        className="grid grid-cols-4 gap-0 w-24 h-24 rounded-lg overflow-hidden border-2"
        style={{ borderColor: theme.board.frameColor }}
      >
        {squares}
      </div>
      <div className="absolute inset-0 flex items-center justify-center gap-0.5">
        <div
          className="w-9 h-9 drop-shadow"
          dangerouslySetInnerHTML={{ __html: whiteSvg }}
          style={{
            filter: theme.pieces.whiteGlow
              ? `drop-shadow(0 0 ${theme.pieces.glowBlur}px ${theme.pieces.whiteGlow})`
              : undefined,
          }}
        />
        <div
          className="w-9 h-9 drop-shadow"
          dangerouslySetInnerHTML={{ __html: blackSvg }}
          style={{
            filter: theme.pieces.blackGlow
              ? `drop-shadow(0 0 ${theme.pieces.glowBlur}px ${theme.pieces.blackGlow})`
              : undefined,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Piece design preview — shows a knight in the current theme's paint.
 */
function DesignPreview({ styleId, theme }: { styleId: PieceStyleId; theme: GameTheme }) {
  const whiteSvg = getPieceSvg(styleId, 'n', 'w', theme.pieces);
  const blackSvg = getPieceSvg(styleId, 'n', 'b', theme.pieces);
  return (
    <div className="w-24 h-16 rounded-lg th-panel flex items-center justify-center gap-1 p-1">
      <div
        className="w-9 h-9"
        dangerouslySetInnerHTML={{ __html: whiteSvg }}
        style={{
          filter: theme.pieces.whiteGlow
            ? `drop-shadow(0 0 ${theme.pieces.glowBlur}px ${theme.pieces.whiteGlow})`
            : undefined,
        }}
      />
      <div
        className="w-9 h-9"
        dangerouslySetInnerHTML={{ __html: blackSvg }}
        style={{
          filter: theme.pieces.blackGlow
            ? `drop-shadow(0 0 ${theme.pieces.glowBlur}px ${theme.pieces.blackGlow})`
            : undefined,
        }}
      />
    </div>
  );
}

function Checkmark() {
  return (
    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full th-accent flex items-center justify-center">
      <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export default function ThemePicker() {
  const { theme, themeId, setThemeId, pieceStyleId, setPieceStyleId, evalBarPosition, setEvalBarPosition } = useTheme();

  return (
    <div className="space-y-6">
      {/* Unified themes: board + pieces + UI in one choice */}
      <div>
        <h3 className="text-sm font-semibold th-text mb-3">Theme</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {GAME_THEMES.map((theme) => {
            const isActive = theme.id === themeId;
            return (
              <button
                key={theme.id}
                onClick={() => setThemeId(theme.id)}
                className="relative flex flex-col items-center gap-2 group"
                title={theme.description}
              >
                <div className={`relative rounded-lg ${isActive ? 'ring-2 th-ring' : 'ring-1 th-ring-border'}`}>
                  <ThemePreview theme={theme} />
                  {isActive && <Checkmark />}
                </div>
                <span className={`text-xs ${isActive ? 'th-accent-text font-medium' : 'th-muted'}`}>
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs th-muted mt-2">
          A theme sets the board, the pieces, and the menu colors — everything matches.
        </p>
      </div>

      {/* Piece design — silhouette only; the theme paints it */}
      <div>
        <h3 className="text-sm font-semibold th-text mb-3">Piece Design</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PIECE_STYLES.map((style) => {
            const isActive = style.id === pieceStyleId;
            return (
              <button
                key={style.id}
                onClick={() => setPieceStyleId(style.id)}
                className="relative flex flex-col items-center gap-2 group"
                title={style.description}
              >
                <div className={`relative rounded-lg ${isActive ? 'ring-2 th-ring' : 'ring-1 th-ring-border'}`}>
                  <DesignPreview styleId={style.id} theme={theme} />
                  {isActive && <Checkmark />}
                </div>
                <span className={`text-xs ${isActive ? 'th-accent-text font-medium' : 'th-muted'}`}>
                  {style.name}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs th-muted mt-2">
          The silhouette — the theme's colors and materials apply to any design.
        </p>
      </div>

      {/* Evaluation bar */}
      <div>
        <h3 className="text-sm font-semibold th-text mb-3">Evaluation Bar</h3>
        <div className="grid grid-cols-3 gap-2">
          {EVAL_BAR_POSITIONS.map((position) => {
            const isActive = position === evalBarPosition;
            return (
              <button
                key={position}
                onClick={() => setEvalBarPosition(position)}
                className={`relative rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'ring-2 th-ring th-accent-text th-accent-soft'
                    : 'ring-1 th-ring-border th-muted'
                }`}
              >
                {EVAL_BAR_LABELS[position]}
                {isActive && <Checkmark />}
              </button>
            );
          })}
        </div>
        <p className="text-xs th-muted mt-2">
          Shows Stockfish's read on the position next to the board in every game mode.
        </p>
      </div>
    </div>
  );
}
