import { BOARD_THEMES } from '@/data/boardThemes';
import { PIECE_COLOR_THEMES } from '@/data/pieceColors';
import { PIECE_STYLES, getPieceSvg, type PieceStyleId } from '@/components/pieceStyles';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Live mini-board preview for board themes.
 */
function BoardPreview({ themeId }: { themeId: string }) {
  const theme = BOARD_THEMES.find((t) => t.id === themeId)!;
  const squares: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const isLight = (r + c) % 2 === 0;
      squares.push(
        <div
          key={`${r}-${c}`}
          style={{ backgroundColor: isLight ? theme.lightSquare : theme.darkSquare }}
        />
      );
    }
  }
  return (
    <div className="grid grid-cols-4 gap-0 w-20 h-20 rounded-lg overflow-hidden border-2"
      style={{ borderColor: theme.frameColor }}>
      {squares}
    </div>
  );
}

/**
 * Piece style preview — shows a knight in the current piece color.
 */
function StylePreview({ styleId }: { styleId: PieceStyleId }) {
  const { pieceColor } = useTheme();
  const svg = getPieceSvg(styleId, 'n', 'w', {
    whiteFill: pieceColor.whiteFill,
    whiteStroke: pieceColor.whiteStroke,
    blackFill: pieceColor.blackFill,
    blackStroke: pieceColor.blackStroke,
  });
  return (
    <div
      className="w-16 h-16 rounded-lg bg-slate-800/50 flex items-center justify-center p-1"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * Piece color preview — shows white/black pawns in the color theme.
 */
function ColorPreview({ colorId }: { colorId: string }) {
  const color = PIECE_COLOR_THEMES.find((c) => c.id === colorId)!;
  const whiteSvg = getPieceSvg('staunton', 'p', 'w', {
    whiteFill: color.whiteFill,
    whiteStroke: color.whiteStroke,
    blackFill: color.blackFill,
    blackStroke: color.blackStroke,
  });
  const blackSvg = getPieceSvg('staunton', 'p', 'b', {
    whiteFill: color.whiteFill,
    whiteStroke: color.whiteStroke,
    blackFill: color.blackFill,
    blackStroke: color.blackStroke,
  });
  return (
    <div className="w-16 h-16 rounded-lg bg-slate-800/50 flex items-center justify-center">
      <div className="w-8 h-8" dangerouslySetInnerHTML={{ __html: whiteSvg }}
        style={{ filter: color.whiteGlow ? `drop-shadow(0 0 ${color.glowBlur}px ${color.whiteGlow})` : undefined }} />
      <div className="w-8 h-8" dangerouslySetInnerHTML={{ __html: blackSvg }}
        style={{ filter: color.blackGlow ? `drop-shadow(0 0 ${color.glowBlur}px ${color.blackGlow})` : undefined }} />
    </div>
  );
}

function Checkmark() {
  return (
    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
      <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export default function ThemePicker() {
  const {
    boardThemeId, setBoardThemeId,
    pieceStyleId, setPieceStyleId,
    pieceColorId, setPieceColorId,
    boardTheme,
  } = useTheme();

  return (
    <div className="space-y-6">
      {/* Board themes */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Board</h3>
        <div className="grid grid-cols-4 gap-3">
          {BOARD_THEMES.map((theme) => {
            const isActive = theme.id === boardThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => setBoardThemeId(theme.id)}
                className="relative flex flex-col items-center gap-2 group"
                title={theme.description}
              >
                <div className={`relative rounded-lg ${isActive ? 'ring-2 ring-cyan-400' : 'ring-1 ring-slate-700 group-hover:ring-slate-500'}`}>
                  <BoardPreview themeId={theme.id} />
                  {isActive && <Checkmark />}
                </div>
                <span className={`text-xs ${isActive ? 'text-cyan-300 font-medium' : 'text-slate-400'}`}>
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Piece styles */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Piece Style</h3>
        <div className="grid grid-cols-4 gap-3">
          {PIECE_STYLES.map((style) => {
            const isActive = style.id === pieceStyleId;
            return (
              <button
                key={style.id}
                onClick={() => setPieceStyleId(style.id)}
                className="relative flex flex-col items-center gap-2 group"
                title={style.description}
              >
                <div className={`relative ${isActive ? 'ring-2 ring-cyan-400 rounded-lg' : 'ring-1 ring-slate-700 rounded-lg group-hover:ring-slate-500'}`}>
                  <StylePreview styleId={style.id} />
                  {isActive && <Checkmark />}
                </div>
                <span className={`text-xs ${isActive ? 'text-cyan-300 font-medium' : 'text-slate-400'}`}>
                  {style.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Piece colors */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Piece Color</h3>
        <div className="grid grid-cols-5 gap-2">
          {PIECE_COLOR_THEMES.map((color) => {
            const isActive = color.id === pieceColorId;
            const isDisabled = color.darkBoardsOnly && !boardTheme.isDark;
            return (
              <button
                key={color.id}
                onClick={() => !isDisabled && setPieceColorId(color.id)}
                disabled={isDisabled}
                className="relative flex flex-col items-center gap-2 group"
                title={isDisabled ? 'Requires a dark board' : color.description}
              >
                <div className={`relative ${isActive ? 'ring-2 ring-cyan-400 rounded-lg' : 'ring-1 ring-slate-700 rounded-lg group-hover:ring-slate-500'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <ColorPreview colorId={color.id} />
                  {isActive && <Checkmark />}
                </div>
                <span className={`text-xs ${isActive ? 'text-cyan-300 font-medium' : 'text-slate-400'}`}>
                  {color.name}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Horizon requires a dark board (Midnight or Ocean).
        </p>
      </div>
    </div>
  );
}
