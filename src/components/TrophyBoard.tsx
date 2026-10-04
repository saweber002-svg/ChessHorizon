import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { type PieceSymbol, type Color, type Square } from 'chess.js';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Sparkles } from 'lucide-react';
import { loadDrillPack } from '@/lib/drillLoader';
import { computeTrophyPosition } from '@/lib/trophyPosition';
import { attributeTacticPieces, type TacticForAttribution } from '@/lib/tacticalPiecePrestige';
import { TACTICAL_FILE_IDS } from '@/data/drillRegistry';
import { minPrestigeTier } from '../../shared/progressRules';
import { useTheme } from '@/contexts/ThemeContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { getPieceSvg, type PieceThemeColors } from '@/components/pieceStyles';
import { getTierColor, getTierLabel, type Tier } from '@/types';

/** Neutral black/white piece colors for unearned trophy tiers. */
const PLAIN_COLORS: PieceThemeColors = {
  whiteFill: '#F9F9F9',
  whiteStroke: '#1A1A1A',
  blackFill: '#1A1A1A',
  blackStroke: '#F9F9F9',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

interface TrophyPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
  tier: Tier;
  /**
   * Tactical prestige: the best tier earned by this individual piece across
   * the opening's tactical drills (1/3/5/10 perfect completions per drill).
   * Pieces with tactical prestige get a small moving animation.
   */
  tacticalTier: Tier;
}

interface TrophyData {
  packName: string;
  lineName: string;
  lineDescription: string;
  pieces: TrophyPiece[];
  /** Pieces the side lost, i.e. captured by the opponent. */
  capturedByWhite: PieceSymbol[];
  capturedByBlack: PieceSymbol[];
  totalStars: number;
  /**
   * Opening prestige per side: perfect completions of the opening drill as
   * White / as Black. Unmoved pieces prestige by their OWN side's tier —
   * completing the opening perfectly as White never prestiges Black's pieces.
   */
  openingTierWhite: Tier;
  openingTierBlack: Tier;
  /**
   * Board prestige: the minimum tier across every tactical drill for this
   * opening. Never displays a level that hasn't been reached by every
   * tactical drill. Falls back to the opening tier when there are no
   * tactical drills.
   */
  boardTier: Tier;
  allMaster: boolean;
}

interface TrophyBoardProps {
  drillFileId: string;
  openingId: string;
  variationId: string;
  onSelectSide: (side: 'w' | 'b') => void;
  onBack: () => void;
}

function tierOf(value: number | undefined): Tier {
  const t = Math.max(0, Math.min(4, value ?? 0));
  return t as Tier;
}

export function TrophyBoard({
  drillFileId,
  openingId,
  variationId,
  onSelectSide,
  onBack,
}: TrophyBoardProps) {
  const { theme, pieceStyleId } = useTheme();
  const boardTheme = theme.board;
  const themePieces = theme.pieces;
  const { state } = useProgress();
  const { user } = useAuth();
  const [data, setData] = useState<TrophyData | null>(null);
  const [error, setError] = useState(false);

  // Server-authoritative opening prestige for signed-in users (perfect
  // completions recorded before local tracking existed). Anonymous users rely
  // on local progress only.
  const serverOpeningWhite = trpc.progress.getOpening.useQuery(
    { openingId, variationId, side: 'white' },
    { enabled: !!user, retry: 1, refetchOnWindowFocus: false }
  );
  const serverOpeningBlack = trpc.progress.getOpening.useQuery(
    { openingId, variationId, side: 'black' },
    { enabled: !!user, retry: 1, refetchOnWindowFocus: false }
  );
  const serverOpeningTierWhite = serverOpeningWhite.data?.prestigeTier ?? 0;
  const serverOpeningTierBlack = serverOpeningBlack.data?.prestigeTier ?? 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pack = await loadDrillPack(drillFileId);
        const line = pack.lines[0];
        if (!line) throw new Error('empty pack');

        const pos = computeTrophyPosition(pack.startFen, line.moves);

        // Per-move prestige tiers from the opening drill only. Tactical
        // per-move keys live under a `tactical:` namespace and parse as NaN
        // here, so they never leak into the opening's piece tiers.
        const prefix = `${openingId}:${variationId}:`;
        const moveTier = new Map<number, Tier>();
        let totalStars = 0;
        for (const [key, p] of Object.entries(state.moveProgress)) {
          if (!key.startsWith(prefix)) continue;
          totalStars += p.stars ?? 0;
          const idx = Number(key.slice(prefix.length));
          if (Number.isInteger(idx) && idx >= 0) {
            const t = tierOf(p.tier);
            moveTier.set(idx, tierOf(Math.max(moveTier.get(idx) ?? 0, t)));
          }
        }

        // Opening prestige = perfect completions of the opening drill, tracked
        // independently per side. Unmoved pieces prestige by their OWN side's
        // tier: the best of local progress and server progress for that side.
        const openingTierWhite = tierOf(
          Math.max(
            state.openingProgress?.[`${openingId}:${variationId}:white`]?.tier ?? 0,
            serverOpeningTierWhite
          )
        );
        const openingTierBlack = tierOf(
          Math.max(
            state.openingProgress?.[`${openingId}:${variationId}:black`]?.tier ?? 0,
            serverOpeningTierBlack
          )
        );

        // Each individual moved piece prestiges independently: the best tier
        // among the moves THAT piece made. Unmoved pieces get their own
        // side's opening tier.
        const pieceTier = new Map<string, Tier>();
        for (const [idx, pieceId] of pos.moverIdAtIndex) {
          const t = moveTier.get(idx) ?? 0;
          pieceTier.set(pieceId, tierOf(Math.max(pieceTier.get(pieceId) ?? 0, t)));
        }

        // Board prestige: the minimum tier across every tactical drill for
        // this opening. The board never displays a level that hasn't been
        // reached by every tactical drill. No tactical drills -> opening tier.
        const tacticalPackIds = [
          `${variationId}-tacticals`,
          `${variationId}-black-tacticals`,
        ].filter((id) => TACTICAL_FILE_IDS.includes(id));
        const tacticalTiers: Tier[] = [];
        const tacticsForAttribution: TacticForAttribution[] = [];
        for (const tpid of tacticalPackIds) {
          try {
            const tpack = await loadDrillPack(tpid);
            for (const l of tpack.lines) {
              const tp = state.tacticalProgress?.[`${openingId}:${variationId}:${l.id}`];
              const tier = tierOf(tp?.tier ?? 0);
              tacticalTiers.push(tier);
              tacticsForAttribution.push({
                startFen: l.startFen ?? tpack.startFen,
                moves: l.moves,
                tier,
              });
            }
          } catch {
            // A registered pack that fails to load simply doesn't gate the board.
          }
        }
        const boardTier =
          tacticalTiers.length > 0
            ? minPrestigeTier(tacticalTiers)
            : tierOf(Math.min(openingTierWhite, openingTierBlack));

        // Per-piece tactical prestige: each tactic line's tier is credited to
        // the individual pieces the hero side moved, mapped back onto the
        // opening's pieces. Animated on the board below.
        const tacticalPieceTier = attributeTacticPieces(
          pack.startFen,
          line.moves,
          tacticsForAttribution
        );

        const pieces: TrophyPiece[] = pos.pieces.map((p) => ({
          ...p,
          tier:
            pieceTier.get(p.pieceId) ??
            (p.color === 'w' ? openingTierWhite : openingTierBlack),
          tacticalTier: tierOf(tacticalPieceTier.get(p.pieceId) ?? 0),
        }));

        if (!cancelled) {
          setData({
            packName: pack.name,
            lineName: line.name,
            lineDescription: line.description,
            pieces,
            capturedByWhite: pos.capturedByWhite,
            capturedByBlack: pos.capturedByBlack,
            totalStars,
            openingTierWhite,
            openingTierBlack,
            boardTier,
            allMaster: pieces.length > 0 && pieces.every((p) => p.tier === 4),
          });
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Progress is read once when the board is built (plus when server
    // prestige arrives for signed-in users).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillFileId, openingId, variationId, serverOpeningTierWhite, serverOpeningTierBlack]);

  const boardCells = useMemo(() => {
    if (!data) return [];
    const bySquare = new Map(data.pieces.map((p) => [p.square, p]));
    const cells: { square: Square; piece: TrophyPiece | null; isLight: boolean }[] = [];
    RANKS.forEach((rank, r) => {
      FILES.forEach((file, c) => {
        const square = `${file}${rank}` as Square;
        cells.push({ square, piece: bySquare.get(square) ?? null, isLight: (r + c) % 2 === 0 });
      });
    });
    return cells;
  }, [data]);

  const renderPiece = (piece: TrophyPiece, sizeClass: string) => {
    const useSelectedStyle = piece.tier >= 3;
    const styleId = useSelectedStyle ? pieceStyleId : 'staunton';
    const colors = piece.tier >= 4 ? themePieces : PLAIN_COLORS;
    const opacity = piece.tier === 0 ? 0.15 : piece.tier === 1 ? 0.45 : 1;
    const glow =
      piece.tier >= 4
        ? piece.color === 'w'
          ? themePieces.whiteGlow
          : themePieces.blackGlow
        : null;
    // Tactical prestige animates only the pieces that earned it: a small
    // bob whose amplitude and speed grow with the tactical tier.
    const animated = piece.tacticalTier >= 1;
    return (
      <div
        className={`${sizeClass}${animated ? ' trophy-tactic-anim' : ''}`}
        title={animated ? `Tactical prestige: ${getTierLabel(piece.tacticalTier)}` : undefined}
        style={{
          opacity,
          filter: glow ? `drop-shadow(0 0 ${themePieces.glowBlur}px ${glow})` : undefined,
          ...(animated
            ? ({
                '--tactic-bob': `${1.5 + piece.tacticalTier}%`,
                animationDuration: `${2.8 - piece.tacticalTier * 0.35}s`,
              } as CSSProperties)
            : {}),
        }}
        dangerouslySetInnerHTML={{
          __html: getPieceSvg(styleId, piece.type, piece.color, colors),
        }}
      />
    );
  };

  if (error) {
    return (
      <div className="min-h-screen th-bg flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/60 mb-4">Couldn't load this opening's trophy board.</p>
        <button onClick={onBack} className="th-accent-text hover:underline">
          Back to the kingdom
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen th-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 th-accent-border border-t-[var(--th-accent)] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen th-bg flex flex-col items-center px-4 py-6"
    >
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm"
          >
            <ArrowLeft size={16} /> Kingdom
          </button>
          <div className="flex items-center gap-1.5 text-sm text-white/60">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            {data.totalStars}
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                color: getTierColor(data.openingTierWhite),
                border: `1px solid ${getTierColor(data.openingTierWhite)}55`,
              }}
              title="White opening prestige: perfect completions of the opening drill as White"
            >
              W · {getTierLabel(data.openingTierWhite)}
            </span>
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                color: getTierColor(data.openingTierBlack),
                border: `1px solid ${getTierColor(data.openingTierBlack)}55`,
              }}
              title="Black opening prestige: perfect completions of the opening drill as Black"
            >
              B · {getTierLabel(data.openingTierBlack)}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                color: getTierColor(data.boardTier),
                border: `1px solid ${getTierColor(data.boardTier)}55`,
              }}
              title="Board prestige: the lowest prestige reached across every tactical drill for this opening"
            >
              Board · {getTierLabel(data.boardTier)}
            </span>
          </div>
        </div>

        <p className="th-accent-text text-xs uppercase tracking-[0.3em] mb-1 text-center">
          Choose your banner
        </p>
        <h1 className="text-xl font-bold text-white text-center mb-1">{data.packName}</h1>
        <p className="text-white/45 text-sm text-center mb-1">{data.lineName} — completed position</p>
        <p className="text-white/30 text-xs text-center mb-5 max-w-md mx-auto">{data.lineDescription}</p>

        {/* Captured pieces rest on the capturer's edge:
            white pieces captured by Black above, black pieces captured by White below. */}
        <div className="flex items-center justify-center gap-1 h-8 mb-1">
          {data.capturedByBlack.map((t, i) => (
            <div key={`cb-${i}`} className="w-6 h-6 opacity-80">
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{
                  __html: getPieceSvg('staunton', t, 'w', PLAIN_COLORS),
                }}
              />
            </div>
          ))}
          {data.capturedByBlack.length > 0 && (
            <span className="text-[10px] text-white/30 ml-1">captured by Black</span>
          )}
        </div>

        {/* Board with side tap zones */}
        <div
          className="relative rounded-lg overflow-hidden border-2"
          style={{ borderColor: boardTheme.frameColor }}
        >
          <div className="grid grid-cols-8 grid-rows-8 aspect-square">
            {boardCells.map(({ square, piece, isLight }) => (
              <div
                key={square}
                className="relative flex items-center justify-center"
                style={{ backgroundColor: isLight ? boardTheme.lightSquare : boardTheme.darkSquare }}
              >
                {piece && (
                  <div className="w-full h-full p-[2px]">
                    {renderPiece(piece, 'w-full h-full')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* All-master celebration sparkles */}
          {data.allMaster && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <Sparkles size={28} className="th-accent-text animate-pulse" />
            </div>
          )}

          {/* Tap zones: top half = Black, bottom half = White.
              The labels live below the board now so nothing obscures the pieces. */}
          <button
            onClick={() => onSelectSide('b')}
            aria-label="Play as Black"
            className="absolute top-0 left-0 right-0 h-1/2 group"
          >
            <span className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 group-active:bg-red-500/15 transition-colors" />
          </button>
          <button
            onClick={() => onSelectSide('w')}
            aria-label="Play as White"
            className="absolute bottom-0 left-0 right-0 h-1/2 group"
          >
            <span className="absolute inset-0 th-accent/0 group-hover:th-accent/10 group-active:th-accent/15 transition-colors" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1 h-8 mt-1">
          {data.capturedByWhite.map((t, i) => (
            <div key={`cw-${i}`} className="w-6 h-6 opacity-80">
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{
                  __html: getPieceSvg('staunton', t, 'b', PLAIN_COLORS),
                }}
              />
            </div>
          ))}
          {data.capturedByWhite.length > 0 && (
            <span className="text-[10px] text-white/30 ml-1">captured by White</span>
          )}
        </div>

        <p className="text-center text-white/35 text-xs mt-3 mb-4">
          Choose your side — tap a board half or a button below
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => onSelectSide('w')}
            className="flex-1 py-3 rounded-xl border th-accent-border th-accent/5 th-accent-text hover:th-accent/15 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <span aria-hidden>♔</span> Play as White
          </button>
          <button
            onClick={() => onSelectSide('b')}
            className="flex-1 py-3 rounded-xl border border-red-400/30 bg-red-400/5 text-red-300 hover:bg-red-400/15 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <span aria-hidden>♚</span> Play as Black
          </button>
        </div>
      </div>
    </motion.div>
  );
}
