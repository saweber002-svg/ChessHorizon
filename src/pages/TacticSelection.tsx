import { useMemo } from 'react';
import { ArrowLeft, Lock, ChevronRight, Swords } from 'lucide-react';
import { useLocation, useParams, useSearch } from 'wouter';
import { useProgress } from '@/contexts/ProgressContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import type { Tier } from '@/types';
import {
  getTacticalVariation,
  tacticsListedUnder,
  unlockedTacticsUnder,
  lockedTacticsUnder,
  prestigeSourceVariationId,
  GATE_TIER_NAMES,
  type TacticalVariation,
} from '@/data/tacticalVariations';
import { TACTICAL_FILE_IDS, hasTacticalDrills } from '@/data/drillRegistry';

const tierOf = (t: number): Tier => Math.max(0, Math.min(4, t)) as Tier;

function usePrestigeTiers(openingId: string, variationId: string): { whiteTier: Tier; blackTier: Tier } {
  const { state } = useProgress();
  const { user } = useAuth();

  const serverWhite = trpc.progress.getOpening.useQuery(
    { openingId, variationId, side: 'white' },
    { enabled: !!user, retry: 1, refetchOnWindowFocus: false }
  );
  const serverBlack = trpc.progress.getOpening.useQuery(
    { openingId, variationId, side: 'black' },
    { enabled: !!user, retry: 1, refetchOnWindowFocus: false }
  );

  return useMemo(() => {
    const localWhite = tierOf(state.openingProgress?.[`${openingId}:${variationId}:white`]?.tier ?? 0);
    const localBlack = tierOf(state.openingProgress?.[`${openingId}:${variationId}:black`]?.tier ?? 0);
    const whiteTier = tierOf(Math.max(localWhite, serverWhite.data?.prestigeTier ?? 0));
    const blackTier = tierOf(Math.max(localBlack, serverBlack.data?.prestigeTier ?? 0));
    return { whiteTier, blackTier };
  }, [state.openingProgress, openingId, variationId, serverWhite.data, serverBlack.data]);
}

function TacticRow({
  tactic,
  unlocked,
  whiteTier,
  blackTier,
  opening,
}: {
  tactic: TacticalVariation;
  unlocked: boolean;
  whiteTier: Tier;
  blackTier: Tier;
  opening: string;
}) {
  const [, setLocation] = useLocation();
  const executingTier = tactic.executingColor === 'w' ? whiteTier : blackTier;
  const whitePack = `${tactic.id}-tacticals`;
  const blackPack = `${tactic.id}-black-tacticals`;
  const hasWhitePack = TACTICAL_FILE_IDS.includes(whitePack);
  const hasBlackPack = TACTICAL_FILE_IDS.includes(blackPack);
  const subTactics = tacticsListedUnder(tactic.id);

  const goPack = (packId: string) => {
    setLocation(`/drill-session/${packId}?opening=${opening}&variation=${tactic.id}`);
  };

  return (
    <div className="w-full text-left p-4 rounded-xl bg-[#141422] border border-[#2a2a3e]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{tactic.name}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                tactic.executingColor === 'w'
                  ? 'bg-white/10 text-white/80'
                  : 'bg-black/40 text-white/60 border border-white/10'
              }`}
            >
              {tactic.executingColor === 'w' ? 'White' : 'Black'} executes
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-purple-500/20 text-purple-300">
              {GATE_TIER_NAMES[tactic.gateTier]}
            </span>
          </div>
          {tactic.placementNote && (
            <div className="text-sm text-white/50 mt-1">{tactic.placementNote}</div>
          )}
          {!unlocked && (
            <div className="flex items-center gap-1.5 text-sm text-amber-300/80 mt-2">
              <Lock size={14} />
              Requires {GATE_TIER_NAMES[tactic.gateTier]} prestige as{' '}
              {tactic.executingColor === 'w' ? 'White' : 'Black'} (current: tier {executingTier})
            </div>
          )}
        </div>
      </div>

      {unlocked && (
        <div className="flex flex-wrap gap-2 mt-3">
          {hasWhitePack && (
            <button
              onClick={() => goPack(whitePack)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00f5d4] text-[#0a0a1f] font-bold text-sm hover:bg-[#00e0c0] transition-colors"
            >
              <Swords size={14} /> White tactics
            </button>
          )}
          {hasBlackPack && (
            <button
              onClick={() => goPack(blackPack)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f5a623] text-[#0a0a1f] font-bold text-sm hover:bg-[#e5941a] transition-colors"
            >
              <Swords size={14} /> Black tactics
            </button>
          )}
          {subTactics.length > 0 && (
            <button
              onClick={() => setLocation(`/tactics/${tactic.id}?opening=${opening}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm hover:bg-white/10 transition-colors"
            >
              Sidelines ({subTactics.length}) <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TacticSelection() {
  const params = useParams<{ variationId: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const variationId = params.variationId ?? '';
  const opening = new URLSearchParams(search).get('opening') ?? '';

  // Prestige is looked up on the opening (walk up through tactic parents).
  const prestigeVariationId = prestigeSourceVariationId(variationId);
  const { whiteTier, blackTier } = usePrestigeTiers(opening, prestigeVariationId);

  const tactics = useMemo(() => tacticsListedUnder(variationId), [variationId]);
  const unlocked = useMemo(
    () => unlockedTacticsUnder(variationId, whiteTier, blackTier),
    [variationId, whiteTier, blackTier]
  );
  const locked = useMemo(
    () => lockedTacticsUnder(variationId, whiteTier, blackTier),
    [variationId, whiteTier, blackTier]
  );
  const unlockedIds = useMemo(() => new Set(unlocked.map((t) => t.id)), [unlocked]);

  const parentTactic = getTacticalVariation(variationId);
  const title = parentTactic ? parentTactic.name : variationId.replace(/-/g, ' ');

  const legacyPackId = hasTacticalDrills(variationId) ? `${variationId}-tacticals` : null;
  const legacyBlackPackId = hasTacticalDrills(variationId) && TACTICAL_FILE_IDS.includes(`${variationId}-black-tacticals`)
    ? `${variationId}-black-tacticals`
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a1f] flex items-start justify-center p-6">
      <div className="max-w-2xl w-full">
        <button
          onClick={() => setLocation('/atlas')}
          className="mb-6 flex items-center gap-2 text-white/50 hover:text-white"
        >
          <ArrowLeft size={18} /> Back to Atlas
        </button>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          Tactics{title ? ` — ${title}` : ''}
        </h2>
        <p className="text-center text-white/60 mb-8">
          {tactics.length > 0
            ? 'Sharp sidelines from this line. Unlock more by earning prestige in the parent opening.'
            : 'Tactical drills for this line.'}
        </p>

        {tactics.length > 0 && (
          <div className="grid gap-3 mb-8">
            {[...unlocked, ...locked].map((tactic) => (
              <TacticRow
                key={tactic.id}
                tactic={tactic}
                unlocked={unlockedIds.has(tactic.id)}
                whiteTier={whiteTier}
                blackTier={blackTier}
                opening={opening}
              />
            ))}
          </div>
        )}

        {(legacyPackId || legacyBlackPackId) && (
          <div className="mt-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-3 text-center">
              Classic drills
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {legacyPackId && (
                <button
                  onClick={() => setLocation(`/drill-session/${legacyPackId}?opening=${opening}&variation=${variationId}`)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm hover:bg-white/10 transition-colors"
                >
                  White classic tactics
                </button>
              )}
              {legacyBlackPackId && (
                <button
                  onClick={() => setLocation(`/drill-session/${legacyBlackPackId}?opening=${opening}&variation=${variationId}`)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm hover:bg-white/10 transition-colors"
                >
                  Black classic tactics
                </button>
              )}
            </div>
          </div>
        )}

        {tactics.length === 0 && !legacyPackId && !legacyBlackPackId && (
          <p className="text-center text-white/40">No tactics listed here yet.</p>
        )}
      </div>
    </div>
  );
}
