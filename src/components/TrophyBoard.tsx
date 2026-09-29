import { useEffect, useMemo, useState } from 'react';
import { type PieceSymbol, type Color, type Square } from 'chess.js';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Star, Sparkles } from 'lucide-react';
import { loadDrillPack } from '@/lib/drillLoader';
import { computeTrophyPosition } from '@/lib/trophyPosition';
import { useTheme } from '@/contexts/ThemeContext';
import { useProgress } from '@/contexts/ProgressContext';
import { getPieceSvg } from '@/components/pieceStyles';
import { PIECE_COLOR_THEMES, type PieceColorTheme } from '@/data/pieceColors';
import { getTierColor, getTierLabel, type Tier } from '@/types';

const PLAIN_COLORS: PieceColorTheme =
  PIECE_COLOR_THEMES.find((t) => t.id === 'plain') ?? PIECE_COLOR_THEMES[0];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

interface TrophyPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
  tier: Tier;
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
  openingTier: Tier;
  allMaster: boolean;
}

interface TrophyBoardProps {
  drillFileId: string;
  openingId: string;
  variationId: string;
  onSelectSide: (side: 'w' | 'b') => void;
  onWatch: () => void;
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
  onWatch,
  onBack,
}: TrophyBoardProps) {
  const { boardTheme, pieceStyleId, pieceColor } = useTheme();
  const { state } = useProgress();
  const [data, setData] = useState<TrophyData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pack = await loadDrillPack(drillFileId);
        const line = pack.lines[0];
        if (!line) throw new Error('empty pack');

        const pos = computeTrophyPosition(pack.startFen, line.moves);

        // Prestige tiers from progress.
        const prefix = `${openingId}:${variationId}:`;
        const moveTier = new Map<number, Tier>();
        let openingTier: Tier = 0;
        let totalStars = 0;
        for (const [key, p] of Object.entries(state.moveProgress)) {
          if (!key.startsWith(prefix)) continue;
          const idx = Number(key.slice(prefix.length));
          const t = tierOf(p.tier);
          if (Number.isInteger(idx) && idx >= 0) {
            moveTier.set(idx, tierOf(Math.max(moveTier.get(idx) ?? 0, t)));
          }
          openingTier = tierOf(Math.max(openingTier, t));
          totalStars += p.stars ?? 0;
        }

        // Tier per moved piece type; unmoved pieces inherit the opening tier.
        const typeTier = new Map<string, Tier>();
        for (const [idx, pieceKey] of pos.moverAtIndex) {
          const t = moveTier.get(idx) ?? 0;
          typeTier.set(pieceKey, tierOf(Math.max(typeTier.get(pieceKey) ?? 0, t)));
        }

        const pieces: TrophyPiece[] = pos.pieces.map((p) => {
          const key = `${p.color}${p.type}`;
          return { ...p, tier: typeTier.get(key) ?? openingTier };
        });

        if (!cancelled) {
          setData({
            packName: pack.name,
            lineName: line.name,
            lineDescription: line.description,
            pieces,
            capturedByWhite: pos.capturedByWhite,
            capturedByBlack: pos.capturedByBlack,
            totalStars,
            openingTier,
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
    // Progress is read once when the board is built.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillFileId, openingId, variationId]);

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
    const colors = piece.tier >= 4 ? pieceColor : PLAIN_COLORS;
    const opacity = piece.tier === 0 ? 0.15 : piece.tier === 1 ? 0.45 : 1;
    const glow =
      piece.tier >= 4
        ? piece.color === 'w'
          ? pieceColor.whiteGlow
          : pieceColor.blackGlow
        : null;
    return (
      <div
        className={sizeClass}
        style={{
          opacity,
          filter: glow ? `drop-shadow(0 0 ${pieceColor.glowBlur}px ${glow})` : undefined,
        }}
        dangerouslySetInnerHTML={{
          __html: getPieceSvg(styleId, piece.type, piece.color, {
            whiteFill: colors.whiteFill,
            whiteStroke: colors.whiteStroke,
            blackFill: colors.blackFill,
            blackStroke: colors.blackStroke,
          }),
        }}
      />
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a1f] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/60 mb-4">Couldn't load this opening's trophy board.</p>
        <button onClick={onBack} className="text-[#00f5d4] hover:underline">
          Back to the kingdom
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a1f] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#00f5d4]/30 border-t-[#00f5d4] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0a0a1f] flex flex-col items-center px-4 py-6"
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
                color: getTierColor(data.openingTier),
                border: `1px solid ${getTierColor(data.openingTier)}55`,
              }}
            >
              {getTierLabel(data.openingTier)}
            </span>
          </div>
        </div>

        <p className="text-[#00f5d4] text-xs uppercase tracking-[0.3em] mb-1 text-center">
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
              <Sparkles size={28} className="text-[#00f5d4] animate-pulse" />
            </div>
          )}

          {/* Tap zones: top half = Black, bottom half = White */}
          <button
            onClick={() => onSelectSide('b')}
            aria-label="Play as Black"
            className="absolute top-0 left-0 right-0 h-1/2 group"
          >
            <span className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 backdrop-blur text-[11px] font-semibold text-red-300 border border-red-400/30 opacity-80 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              ▲ Play Black
            </span>
            <span className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 group-active:bg-red-500/15 transition-colors" />
          </button>
          <button
            onClick={() => onSelectSide('w')}
            aria-label="Play as White"
            className="absolute bottom-0 left-0 right-0 h-1/2 group"
          >
            <span className="absolute inset-0 bg-cyan-400/0 group-hover:bg-cyan-400/10 group-active:bg-cyan-400/15 transition-colors" />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 backdrop-blur text-[11px] font-semibold text-cyan-300 border border-cyan-400/30 opacity-80 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              Play White ▼
            </span>
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
          Tap the side of the board you want to play as
        </p>

        <button
          onClick={onWatch}
          className="w-full py-3 rounded-xl border border-[#2a2a3e] text-white/70 hover:border-[#00f5d4]/40 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Eye size={16} /> Watch the line instead
        </button>
      </div>
    </motion.div>
  );
}
