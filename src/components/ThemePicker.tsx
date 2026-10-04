import { GAME_THEMES, pieceSpriteUrl, type GameTheme } from '@/data/gameThemes';
import { useTheme } from '@/contexts/ThemeContext';
import { EVAL_BAR_LABELS, EVAL_BAR_POSITIONS } from '@/lib/evalBar';

/**
 * Live preview: the theme's exact board image with its exact piece sprites.
 */
function ThemePreview({ theme }: { theme: GameTheme }) {
  return (
    <div className="relative w-24 h-24">
      <img
        src={theme.board.image}
        alt=""
        draggable={false}
        className="w-24 h-24 rounded-lg object-cover border-2"
        style={{ borderColor: theme.board.frameColor }}
      />
      <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
        <img src={pieceSpriteUrl(theme, 'wn')} alt="" draggable={false} className="w-9 h-9" />
        <img src={pieceSpriteUrl(theme, 'bn')} alt="" draggable={false} className="w-9 h-9" />
      </div>
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
  const { themeId, setThemeId, evalBarPosition, setEvalBarPosition } = useTheme();

  return (
    <div className="space-y-6">
      {/* Unified themes: exact board + exact pieces + UI in one choice */}
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
