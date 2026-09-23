import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  Star,
  ZoomIn,
  ZoomOut,
  Move,
  Box,
} from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { useProgress } from '@/contexts/ProgressContext';
import { useWilderness } from '@/contexts/WildernessContext';
import PrestigeBadge from '@/components/PrestigeBadge';
import { getTierColor, getTierLabel, type Tier } from '@/types';
import openingsData from '@/data/openings.json';

const openings = openingsData as Record<string, {
  name: string;
  variations: Array<{
    id: string;
    name: string;
    moveCount: number;
    moves: string[];
  }>;
}>;

// Piece SVGs for 3D board (neon colored)
const PIECE_SVGS: Record<string, string> = {
  wp: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#00f5d4" stroke="#00d4b8" stroke-width="1.5"/></svg>`,
  wr: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#00f5d4" stroke="#00d4b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path d="M5 16v-3h3v-2h4v2h6v-2h4v2h6v-2h4v2h3v3H5z"/></g></svg>`,
  wn: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#00f5d4" stroke="#00d4b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.034-.5-2-.5-3-1.5-1-2.5.5-2.5.5s-1.13 2.25-2.5 2.25c-.24 0-.5 0-.5-.5C8.5 17 11 12 11 12s3.13-4 6.5-4c3.5 0 6.5 2 6.5 6"/><circle cx="17.5" cy="9" r="1.5" fill="none"/></g></svg>`,
  wb: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#00f5d4" stroke="#00d4b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill="none"/></g></svg>`,
  wq: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#00f5d4" stroke="#00d4b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.7 13.6-3-14.5-3 14.5-5.7-13.6-.3 14.1-7.5-11.5L9 26z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 2.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5h24s2-1 .5-2.5c0 0-.5-1.5-1.5-2.5-.5-2.5-.5-1 .5-3.5 1-2 2.5-2 2.5-4"/><circle cx="11" cy="14" r="1.5" fill="none"/><circle cx="22.5" cy="9" r="1.5" fill="none"/><circle cx="34" cy="14" r="1.5" fill="none"/></g></svg>`,
  wk: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#00f5d4" stroke="#00d4b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="none"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-1-5 5-8 9-3.5-3.5-2.5-9-8-9-5.5 0-4.5 5.5-8 9-3-4-4-10-8-9-3 6 6 10.5 6 10.5v7z"/><path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" fill="none"/></g></svg>`,
  bp: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#ff4757" stroke="#e03e4d" stroke-width="1.5"/></svg>`,
  br: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#ff4757" stroke="#e03e4d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path d="M5 16v-3h3v-2h4v2h6v-2h4v2h6v-2h4v2h3v3H5z"/></g></svg>`,
  bn: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#ff4757" stroke="#e03e4d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.034-.5-2-.5-3-1.5-1-2.5.5-2.5.5s-1.13 2.25-2.5 2.25c-.24 0-.5 0-.5-.5C8.5 17 11 12 11 12s3.13-4 6.5-4c3.5 0 6.5 2 6.5 6"/><circle cx="17.5" cy="9" r="1.5" fill="none"/></g></svg>`,
  bb: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#ff4757" stroke="#e03e4d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill="none"/></g></svg>`,
  bq: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#ff4757" stroke="#e03e4d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.7 13.6-3-14.5-3 14.5-5.7-13.6-.3 14.1-7.5-11.5L9 26z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 2.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5h24s2-1 .5-2.5c0 0-.5-1.5-1.5-2.5-.5-2.5-.5-1 .5-3.5 1-2 2.5-2 2.5-4"/><circle cx="11" cy="14" r="1.5" fill="none"/><circle cx="22.5" cy="9" r="1.5" fill="none"/><circle cx="34" cy="14" r="1.5" fill="none"/></g></svg>`,
  bk: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#ff4757" stroke="#e03e4d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="none"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-1-5 5-8 9-3.5-3.5-2.5-9-8-9-5.5 0-4.5 5.5-8 9-3-4-4-10-8-9-3 6 6 10.5 6 10.5v7z"/><path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" fill="none"/></g></svg>`,
};

function MiniBoard3D({
  moveIndex,
  move,
  tier,
  stars,
  openingId,
  variationId,
}: {
  moveIndex: number;
  move: string;
  tier: Tier;
  stars: number;
  openingId: string;
  variationId: string;
}) {
  const [, setLocation] = useLocation();
  const tierColor = getTierColor(tier);
  const tierLabel = getTierLabel(tier);

  // Generate a board representation - we'll show the position after moveIndex moves
  // For visual purposes, we place pieces in a pattern based on the move index
  const board = useMemo(() => {
    const b: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

    // Standard starting position pieces (simplified for visual)
    const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

    // For moveIndex, progressively show pieces developing
    // This is a visual approximation - real positions would need chess.js

    // Pawns row
    for (let c = 0; c < 8; c++) {
      b[6][c] = 'wp';
      b[1][c] = 'bp';
    }

    // Back rank
    for (let c = 0; c < 8; c++) {
      b[7][c] = `w${backRank[c]}`;
      b[0][c] = `b${backRank[c]}`;
    }

    // Simulate some moves based on moveIndex for visual interest
    if (moveIndex >= 0) {
      // e4 - move white e-pawn
      b[6][4] = null;
      b[4][4] = 'wp';
    }
    if (moveIndex >= 1) {
      // e5 - move black e-pawn
      b[1][4] = null;
      b[3][4] = 'bp';
    }
    if (moveIndex >= 2) {
      // Nf3
      b[7][6] = null;
      b[5][5] = 'wn';
    }
    if (moveIndex >= 3) {
      // Nc6
      b[0][1] = null;
      b[2][2] = 'bn';
    }
    if (moveIndex >= 4) {
      // Bc4
      b[7][5] = null;
      b[4][2] = 'wb';
    }
    if (moveIndex >= 5) {
      // Bc5
      b[0][5] = null;
      b[3][2] = 'bb';
    }

    return b;
  }, [moveIndex]);

  return (
    <motion.div
      className="trophy-board-card cursor-pointer group"
      whileHover={{ scale: 1.03 }}
      onClick={() =>
        setLocation(`/drill/${openingId}/${variationId}/${moveIndex}`)
      }
    >
      {/* 3D Board */}
      <div className="board-3d-container p-4">
        <div className="board-3d rounded-lg overflow-hidden border border-[#2a2a3e]">
          <div className="grid grid-cols-8" style={{ width: '200px', height: '200px' }}>
            {Array.from({ length: 64 }).map((_, i) => {
              const r = Math.floor(i / 8);
              const c = i % 8;
              const isLight = (r + c) % 2 === 0;
              const piece = board[r]?.[c];

              return (
                <div
                  key={i}
                  className={`flex items-center justify-center ${
                    isLight ? 'bg-[#2a2a3e]' : 'bg-[#141422]'
                  }`}
                  style={{ width: '25px', height: '25px' }}
                >
                  {piece && PIECE_SVGS[piece] && (
                    <div
                      className="board-3d-piece"
                      style={{ width: '22px', height: '22px' }}
                      dangerouslySetInnerHTML={{
                        __html: PIECE_SVGS[piece],
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Shadow */}
        <div
          className="mx-auto rounded-[50%] bg-black/30"
          style={{
            width: '160px',
            height: '20px',
            marginTop: '-8px',
            filter: 'blur(8px)',
          }}
        />
      </div>

      {/* Info */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-white/40">
            {Math.floor(moveIndex / 2) + 1}
            {moveIndex % 2 === 0 ? '.' : '...'}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                size={10}
                className={
                  s <= stars
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-[#2a2a3e]'
                }
              />
            ))}
          </div>
        </div>
        <p className="text-sm font-mono text-white/80 mb-2">{move}</p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: tierColor,
              boxShadow: `0 0 6px ${tierColor}50`,
            }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: tierColor }}
          >
            {tierLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function TrophyBoard3D() {
  const params = useParams<{ openingId?: string; variationId?: string }>();
  const [, setLocation] = useLocation();
  const { getMoveProgress, getMasteredCount } = useProgress();
  const { getOpening: getWildernessOpening } = useWilderness();
  const [zoom, setZoom] = useState(1);

  const openingId = params.openingId || 'italian';
  const variationId = params.variationId || 'giuoco-piano';

  // Try standard openings first, then wilderness
  const standardOpening = openings[openingId];
  const wildOpening = !standardOpening ? getWildernessOpening(openingId) : null;

  let openingName = '';
  let variation: { name: string; moves: string[] } | null = null;

  if (standardOpening) {
    openingName = standardOpening.name;
    const v = standardOpening.variations.find((v) => v.id === variationId);
    if (v) variation = { name: v.name, moves: v.moves };
  } else if (wildOpening) {
    openingName = wildOpening.name;
    const v = wildOpening.variations.find((v) => v.id === variationId);
    if (v) variation = { name: v.name, moves: v.moves };
  }

  if (!variation) {
    return (
      <div className="min-h-screen bg-[#0a0a1f] flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  const moveCount = variation.moves.length;
  const masteredCount = getMasteredCount(openingId, variationId, moveCount);
  const masteryPercent = moveCount > 0 ? Math.round((masteredCount / moveCount) * 100) : 0;
  const openingTier = variation.moves.reduce<Tier>((highest, _, index) => {
    const tier = getMoveProgress(`${openingId}:${variationId}:${index}`).tier;
    return tier > highest ? tier : highest;
  }, 0);

  return (
    <div className="min-h-screen bg-[#0a0a1f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a1f]/95 backdrop-blur-md border-b border-[#2a2a3e]/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/atlas')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={20} className="text-white/60" />
              </button>
              <div className="flex items-center gap-2">
                <Trophy className="text-[#00f5d4]" size={20} />
                <div>
                  <h1 className="text-sm font-semibold text-white">
                    {variation.name} - 3D View
                  </h1>
                  <p className="text-xs text-white/40">{openingName}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={16} className="text-white/40" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={16} className="text-white/40" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats & Prestige Header */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-2xl bg-[#141422] border border-[#2a2a3e] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white/60 uppercase tracking-widest">Variation Mastery</span>
              <span className="text-3xl font-black text-[#00f5d4]">{masteryPercent}%</span>
            </div>
            <div className="w-full h-4 bg-[#0a0a1f] rounded-full overflow-hidden p-1 border border-[#2a2a3e]">
              <motion.div
                className="h-full bg-gradient-to-r from-[#14b8a6] to-[#00f5d4] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${masteryPercent}%` }}
                transition={{ duration: 1.5, ease: 'circOut' }}
              />
            </div>
            <p className="text-xs text-white/30 mt-4">
              Complete {moveCount} moves at Master tier to reach 100% prestige.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-[#1a1a2e] border border-[#00f5d4]/20 flex flex-col items-center justify-center text-center">
            <PrestigeBadge tier={openingTier as Tier} size="lg" showLabel />
            <p className="text-[10px] text-white/40 mt-2 max-w-[120px]">
              Overall prestige for {variation.name}
            </p>
          </div>
        </div>
        {/* Hidden old stats div */}
        <div className="hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-white/60">Mastery</span>
                <div className="text-2xl font-bold text-[#00f5d4]">
                  {masteryPercent}%
                </div>
              </div>
              <div className="w-px h-10 bg-[#2a2a3e]" />
              <div>
                <span className="text-sm text-white/60">Mastered</span>
                <div className="text-lg font-bold text-white">
                  {masteredCount} / {moveCount}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Box size={16} />
              <span>3D Trophy Room</span>
            </div>
          </div>
          <div className="w-full h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#14b8a6] to-[#00f5d4] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${masteryPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* 3D Boards Grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
          style={{
            perspective: '1200px',
            transformStyle: 'preserve-3d',
            transform: `scale(${zoom})`,
          }}
        >
          {variation.moves.map((move, index) => {
            const key = `${openingId}:${variationId}:${index}`;
            const progress = getMoveProgress(key);

            return (
              <div
                key={key}
                className="bg-[#141422] rounded-2xl border border-[#2a2a3e] hover:border-[#00f5d4]/30 transition-all"
                style={{
                  perspective: '800px',
                  transformStyle: 'preserve-3d',
                }}
              >
                <MiniBoard3D
                  moveIndex={index}
                  move={move}
                  tier={progress.tier}
                  stars={progress.stars}
                  openingId={openingId}
                  variationId={variationId}
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-[#141422] border border-[#2a2a3e]">
          <span className="text-sm text-white/40">Tier Legend:</span>
          {([0, 1, 2, 3, 4] as Tier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: getTierColor(tier),
                  boxShadow: `0 0 6px ${getTierColor(tier)}50`,
                }}
              />
              <span className="text-xs text-white/60">
                {getTierLabel(tier)}
              </span>
            </div>
          ))}
          <div className="w-px h-4 bg-[#2a2a3e] mx-2" />
          <div className="flex items-center gap-1.5 text-white/40">
            <Move size={14} />
            <span className="text-xs">Click any board to drill that move</span>
          </div>
        </div>
      </div>
    </div>
  );
}
