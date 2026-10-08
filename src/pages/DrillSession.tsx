import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemePicker from '@/components/ThemePicker';
import SoundPicker from '@/components/SoundPicker';
import { useSound } from '@/contexts/SoundContext';
import { ArrowLeft, Star, RotateCcw, Shuffle, ListOrdered, Lightbulb, Pause, X, Play, Eye, Swords, Undo2, ArrowRight } from 'lucide-react';
import { useLocation, useParams, useSearch } from 'wouter';
import { TrophyBoard } from '@/components/TrophyBoard';
import { kingdomHasDrills } from '@/data/kingdomDrills';
import type { KingdomId } from '@/types';
import { Chess, type Square } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import BoardWithEval from '@/components/BoardWithEval';
import StarOverlay from '@/components/StarOverlay';
import { useProgress } from '@/contexts/ProgressContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import {
  loadDrillPack,
  buildFenFromMoves,
  isPlayerTurn,
  type DrillPack,
  type DrillLine,
} from '@/lib/drillLoader';
import { hasTacticalDrills, hasPuzzleDrills, isTacticalPackId } from '@/data/drillRegistry';
import { tacticsListedUnder } from '@/data/tacticalVariations';
import { isQuarantinedTacticalFileId } from '@/data/quarantinedTacticalRegistry';
import {
  analyzeDeviation,
  deviationCopy,
  type DeviationAnalysis,
} from '@/lib/coachingAnalysis';
import { getEngine } from '@/engine/stockfish';
import { sparUndoPlies } from '@/lib/drillSpar';
import { tap as hapticTap, success as hapticSuccess, error as hapticError } from '@/lib/haptics';

type PlayerColor = 'w' | 'b';
type DrillMode = 'in-order' | 'random';

const MAX_ATTEMPTS = 3;

function starsFromAttempts(attempts: number): number {
  if (attempts === 1) return 3;
  if (attempts === 2) return 2;
  if (attempts === 3) return 1;
  return 0;
}

/** Pick the sound-pack event for a played move: check > capture > quiet move. */
function moveSoundFor(san: string): 'move' | 'capture' | 'check' {
  if (san.includes('+')) return 'check';
  if (san.includes('x')) return 'capture';
  return 'move';
}

export default function DrillSession() {
  const params = useParams<{ drillFileId: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { recordDrillResult, recordOpeningCompletion, getLocalWatchStatus, consumeLocalWatch } = useProgress();
  const { user } = useAuth();

  const drillFileId = params.drillFileId ?? 'giuoco-piano-main';
  const openingId = new URLSearchParams(search).get('opening') ?? 'italian';
  const variationId = new URLSearchParams(search).get('variation') ?? 'giuoco-piano';
  const sideParam = new URLSearchParams(search).get('side');

  const [pack, setPack] = useState<DrillPack | null>(null);
  const [line, setLine] = useState<DrillLine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [drillMode, setDrillMode] = useState<DrillMode>('in-order');
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [glowColor, setGlowColor] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showStars, setShowStars] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  /** Full-screen drill-complete options overlay (opened via Continue). */
  const [resultsOpen, setResultsOpen] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [waitingOpponent, setWaitingOpponent] = useState(false);
  /** Sparring: play out the final drill position against the engine. */
  const [sparring, setSparring] = useState(false);
  const [sparringOver, setSparringOver] = useState(false);
  const [sparringThinking, setSparringThinking] = useState(false);
  /** Sparring position history: [0] is the drill's final position. */
  const [sparHistory, setSparHistory] = useState<string[]>([]);
  /** Move that produced each sparHistory entry after the first. */
  const [sparLastMoves, setSparLastMoves] = useState<Array<{ from: Square; to: Square } | null>>([]);
  /** Bumped on undo/exit/restart so stale sparring engine replies are discarded. */
  const sparSeq = useRef(0);
  const { play: playSound } = useSound();
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveResults, setMoveResults] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintSquares, setHintSquares] = useState<Square[]>([]);
  const [deviation, setDeviation] = useState<DeviationAnalysis | null>(null);
  const [deviationLoading, setDeviationLoading] = useState(false);
  /** Bumped whenever the position changes so stale engine replies are discarded. */
  const deviationSeq = useRef(0);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** In-drill watch: the line plays once, non-interactively, then resets. */
  const [watching, setWatching] = useState(false);
  const [watchNote, setWatchNote] = useState<string | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTacticalPack = isTacticalPackId(drillFileId);

  // Server-enforced watch quota for signed-in drills.
  const watchSide = playerColor === 'b' ? 'black' : 'white';
  const serverWatchStatus = trpc.watch.getStatus.useQuery(
    { openingId, variationId, side: watchSide },
    { enabled: !!user && !!playerColor, retry: 1, refetchOnWindowFocus: false }
  );
  const consumeWatchMutation = trpc.watch.consume.useMutation();

  const clearDeviation = useCallback(() => {
    deviationSeq.current += 1;
    setDeviation(null);
    setDeviationLoading(false);
  }, []);

  /**
   * Ask the engine why a wrong drill move was bad, without blocking the
   * retry flow. Stale replies (user already moved on) are discarded.
   */
  const checkDeviation = useCallback(
    (moveSan: string, fenBefore: string, bookMove: string) => {
      const seq = ++deviationSeq.current;
      setDeviationLoading(true);
      analyzeDeviation(moveSan, fenBefore, bookMove).then(
        (d) => {
          if (deviationSeq.current === seq) setDeviation(d);
        },
        () => {
          /* engine unavailable: the drill plays on exactly as before */
        },
      ).finally(() => {
        if (deviationSeq.current === seq) setDeviationLoading(false);
      });
    },
    []
  );

  const selectTactic = useCallback((tactic: DrillLine) => {
    if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    setWatching(false);
    setWatchNote(null);
    setLine(tactic);
    setPlayerColor(null);
    setSessionComplete(false);
    setResultsOpen(false);
    setSparring(false);
    setSparringOver(false);
    sparSeq.current += 1;
    setSparHistory([]);
    setSparLastMoves([]);
    setMoveIndex(0);
    setAttempts(0);
    setMoveResults([]);
    setHintUsed(false);
    setHintSquares([]);
    setLastMove(null);
    setGlowColor('idle');
    setShowStars(false);
    clearDeviation();
  }, [clearDeviation]);

  /** Enter sparring mode: play the final drill position against Stockfish. */
  const startSparring = useCallback(() => {
    const seq = ++sparSeq.current;
    setSparring(true);
    setResultsOpen(false);
    setSparringOver(false);
    setGlowColor('idle');
    setLastMove(null);
    setSparHistory([fen]);
    setSparLastMoves([]);
    // If it's the opponent's turn in the final position, engine moves first.
    const game = new Chess(fen);
    if (playerColor && game.turn() !== playerColor && !game.isGameOver()) {
      setSparringThinking(true);
      getEngine().findBestMove(fen, 6, 400).then(
        (uci) => {
          if (sparSeq.current !== seq) return; // undone/exited/restarted
          const g = new Chess(fen);
          const moved = g.move({
            from: uci.slice(0, 2) as Square,
            to: uci.slice(2, 4) as Square,
            promotion: uci.length > 4 ? uci[4] : undefined,
          });
          if (moved) {
            setFen(g.fen());
            setLastMove({ from: moved.from, to: moved.to });
            setSparHistory((h) => [...h, g.fen()]);
            setSparLastMoves((m) => [...m, { from: moved.from, to: moved.to }]);
            playSound(moveSoundFor(moved.san));
          }
          setSparringThinking(false);
        },
        () => {
          if (sparSeq.current === seq) setSparringThinking(false);
        },
      );
    }
  }, [fen, playerColor, playSound]);

  /** Handle a user move during sparring. Engine replies as the opponent. */
  const handleSparringMove = useCallback((from: Square, to: Square) => {
    if (sparringOver || sparringThinking) return;
    const game = new Chess(fen);
    if (playerColor && game.turn() !== playerColor) return;
    
    let result;
    try {
      result = game.move({ from, to, promotion: 'q' });
    } catch {
      return;
    }
    if (!result) return;

    const newFen = game.fen();
    setFen(newFen);
    setLastMove({ from: result.from, to: result.to });
    setSparHistory((h) => [...h, newFen]);
    setSparLastMoves((m) => [...m, { from: result.from, to: result.to }]);
    playSound(moveSoundFor(result.san));

    if (game.isGameOver()) {
      setSparringOver(true);
      playSound('drillCompleted');
      return;
    }

    // Engine's turn. The seq guard drops this reply if the user undoes,
    // exits, or restarts before it lands.
    const seq = sparSeq.current;
    setSparringThinking(true);
    getEngine().findBestMove(newFen, 6, 400).then(
      (uci) => {
        if (sparSeq.current !== seq) return;
        const g = new Chess(newFen);
        const moved = g.move({
          from: uci.slice(0, 2) as Square,
          to: uci.slice(2, 4) as Square,
          promotion: uci.length > 4 ? uci[4] : undefined,
        });
        if (moved) {
          setFen(g.fen());
          setLastMove({ from: moved.from, to: moved.to });
          setSparHistory((h) => [...h, g.fen()]);
          setSparLastMoves((m) => [...m, { from: moved.from, to: moved.to }]);
          playSound(moveSoundFor(moved.san));
          if (g.isGameOver()) {
            setSparringOver(true);
            playSound('drillCompleted');
          }
        }
        setSparringThinking(false);
      },
      () => {
        if (sparSeq.current !== seq) return;
        // Engine failed: fall back to random move so play continues
        const g = new Chess(newFen);
        const moves = g.moves({ verbose: true });
        if (moves.length > 0) {
          const m = moves[Math.floor(Math.random() * moves.length)];
          g.move(m);
          setFen(g.fen());
          setLastMove({ from: m.from, to: m.to });
          setSparHistory((h) => [...h, g.fen()]);
          setSparLastMoves((lm) => [...lm, { from: m.from, to: m.to }]);
          playSound(moveSoundFor(m.san));
          if (g.isGameOver()) setSparringOver(true);
        }
        setSparringThinking(false);
      },
    );
  }, [fen, playerColor, sparringOver, sparringThinking, playSound]);

  /** Exit sparring back to the drill-complete results overlay. */
  const exitSparring = useCallback(() => {
    sparSeq.current += 1;
    setSparring(false);
    setSparringOver(false);
    setSparringThinking(false);
    setResultsOpen(true);
  }, []);

  /** Undo the last sparring move: rewind to the player's previous turn. */
  const undoSparMove = useCallback(() => {
    if (!playerColor) return;
    const n = sparUndoPlies(sparHistory, playerColor);
    if (n === 0) return;
    sparSeq.current += 1; // an in-flight engine reply no longer applies
    const newLength = sparHistory.length - n;
    setFen(sparHistory[newLength - 1]);
    setLastMove(newLength >= 2 ? sparLastMoves[newLength - 2] : null);
    setSparHistory(sparHistory.slice(0, newLength));
    setSparLastMoves(sparLastMoves.slice(0, newLength - 1));
    setSparringOver(false);
    setSparringThinking(false);
  }, [playerColor, sparHistory, sparLastMoves]);

  const moves = useMemo(() => line?.moves ?? [], [line]);
  const startFen = line?.startFen ?? pack?.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Lock body scroll while the pause menu or the drill-complete results
  // overlay is open so gestures don't scroll the page behind the modal on
  // touch devices.
  useEffect(() => {
    if (!showPauseMenu && !resultsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showPauseMenu, resultsOpen]);

  useEffect(() => {
    // Reset session state when drillFileId changes
    setPack(null);
    setLine(null);
    setLoadError(null);
    setPlayerColor(null);
    setMoveIndex(0);
    setFen('');
    setAttempts(0);
    setGlowColor('idle');
    setShowStars(false);
    setEarnedStars(0);
    setSessionComplete(false);
    setResultsOpen(false);
    setSparring(false);
    setSparringOver(false);
    setSparringThinking(false);
    sparSeq.current += 1;
    setSparHistory([]);
    setSparLastMoves([]);
    setWaitingOpponent(false);
    setLastMove(null);
    setMoveResults([]);
    setHintUsed(false);
    setHintSquares([]);
    setWatching(false);
    setWatchNote(null);
    if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    clearDeviation();

    loadDrillPack(drillFileId)
      .then((data) => {
        setPack(data);
        // For tactical packs (-tacticals), do NOT auto-start the first one.
        // Let the user choose from the list below.
        const isTacticalPack = isTacticalPackId(drillFileId);
        if (!isTacticalPack) {
          setLine(data.lines[0] ?? null);
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load drill'));
  }, [drillFileId, clearDeviation]);

  const playerMoveIndices = useMemo(() => {
    if (!playerColor || moves.length === 0) return [];
    const indices: number[] = [];
    for (let i = 0; i < moves.length; i++) {
      const fenBefore = buildFenFromMoves(startFen, moves, i);
      if (isPlayerTurn(fenBefore, playerColor)) indices.push(i);
    }
    return indices;
  }, [moves, playerColor, startFen]);

  const currentPlayerMoveIdx = playerMoveIndices[moveIndex] ?? -1;
  const correctMove = currentPlayerMoveIdx >= 0 ? moves[currentPlayerMoveIdx] : undefined;

  // Target square for the mobile tap-expansion: the square the drill expects.
  const targetSquare = useMemo(() => {
    if (!correctMove || sessionComplete || showStars) return null;
    try {
      const testChess = new Chess(fen);
      const m = testChess.moves({ verbose: true }).find((mv) => mv.san === correctMove);
      return m ? (m.to as Square) : null;
    } catch {
      return null;
    }
  }, [fen, correctMove, sessionComplete, showStars]);

  const applyMovesUpTo = useCallback(
    (upTo: number) => {
      setFen(buildFenFromMoves(startFen, moves, upTo));
    },
    [startFen, moves]
  );



  const playOpponentMoves = useCallback(
    (fromIndex: number, color: PlayerColor) => {
      let i = fromIndex;
      const step = () => {
        if (i >= moves.length) {
hapticSuccess();
          setSessionComplete(true);
          return;
        }
        const fenBefore = buildFenFromMoves(startFen, moves, i);
        if (isPlayerTurn(fenBefore, color)) {
          setWaitingOpponent(false);
          applyMovesUpTo(i);
          return;
        }
        setWaitingOpponent(true);
        applyMovesUpTo(i + 1);
        // Opponent moves play the selected sound pack (check > capture > move).
        const san = moves[i] ?? '';
        playSound(moveSoundFor(san));
        i++;
        autoPlayRef.current = setTimeout(step, 450);
      };
      step();
    },
    [moves, startFen, applyMovesUpTo, playSound]
  );

  const beginSession = useCallback(
    (color: PlayerColor) => {
      hapticTap();
      setPlayerColor(color);
      setMoveIndex(0);
      setAttempts(0);
      setMoveResults([]);
      setSessionComplete(false);
      setResultsOpen(false);
      setShowStars(false);
      setHintUsed(false);
      setHintSquares([]);
      clearDeviation();
      // Pre-warm the engine so the first deviation check doesn't pay the WASM download.
      getEngine().ensureReady().catch(() => {});
      applyMovesUpTo(0);
      setTimeout(() => playOpponentMoves(0, color), 300);
    },
    [applyMovesUpTo, playOpponentMoves, clearDeviation]
  );

  /** Restart the current drill line from the beginning. */
  const restartDrill = useCallback(() => {
    if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    setWatching(false);
    setWatchNote(null);
    setSparring(false);
    setSparringOver(false);
    setSparringThinking(false);
    sparSeq.current += 1;
    setSparHistory([]);
    setSparLastMoves([]);
    if (playerColor) {
      beginSession(playerColor);
    }
  }, [playerColor, beginSession]);

  // A ?side=w|b param skips the trophy side-select (e.g. deep links).
  useEffect(() => {
    if (pack && !playerColor && (sideParam === 'w' || sideParam === 'b')) {
      beginSession(sideParam);
    }
  }, [pack, playerColor, sideParam, beginSession]);

  /**
   * In-drill watch. Triggering it consumes a single play from the watch quota
   * (one play per the attempts required by the prestige gating). The full line
   * plays once on the drill board — non-interactive, oriented to the color
   * being played — then the drill resets to the starting position. Per-move
   * prestige already recorded in the progress store is retained; the fresh
   * attempt starts with empty session results.
   */
  const exitWatch = useCallback(() => {
    if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    setWatching(false);
    if (playerColor) beginSession(playerColor);
  }, [beginSession, playerColor]);

  const startWatch = useCallback(async () => {
    if (!playerColor || watching || !line) return;
    const side = playerColor === 'w' ? 'white' : 'black';
    setWatchNote(null);

    const quotaNote = (attemptsRequired: number | null, attemptsSince: number) => {
      const remaining = Math.max(1, (attemptsRequired ?? 1) - attemptsSince);
      setWatchNote(
        `Watch used — complete ${remaining} more attempt${remaining === 1 ? '' : 's'} to earn another.`
      );
    };

    if (user) {
      const status = (await serverWatchStatus.refetch()).data;
      if (status && !status.available) {
        quotaNote(status.attemptsRequired, status.attemptsSinceLastWatch);
        return;
      }
      try {
        await consumeWatchMutation.mutateAsync({
          openingId,
          variationId,
          side,
          idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        });
      } catch {
        // Fail open: a backend hiccup
        // shouldn't lock learning; the quota stays enforced server-side.
      }
      consumeLocalWatch(openingId, variationId, side);
    } else {
      const status = getLocalWatchStatus(openingId, variationId, side);
      if (!status.available) {
        quotaNote(status.attemptsRequired, status.attemptsSinceLastWatch);
        return;
      }
      consumeLocalWatch(openingId, variationId, side);
    }

    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    clearDeviation();
    setWaitingOpponent(false);
    setShowStars(false);
    setGlowColor('idle');
    setHintSquares([]);
    setWatching(true);
    applyMovesUpTo(0);
    setLastMove(null);

    let i = 0;
    const step = () => {
      if (i >= moves.length) {
        exitWatch();
        return;
      }
      const before = buildFenFromMoves(startFen, moves, i);
      try {
        const c = new Chess(before);
        const m = c.move(moves[i]);
        if (m) setLastMove({ from: m.from as Square, to: m.to as Square });
      } catch {
        /* line data is validated; keep playing */
      }
      applyMovesUpTo(i + 1);
      const san = moves[i] ?? '';
      playSound(moveSoundFor(san));
      i += 1;
      watchTimerRef.current = setTimeout(step, 1100);
    };
    watchTimerRef.current = setTimeout(step, 700);
  }, [
    playerColor,
    watching,
    line,
    user,
    serverWatchStatus,
    consumeWatchMutation,
    openingId,
    variationId,
    consumeLocalWatch,
    getLocalWatchStatus,
    clearDeviation,
    applyMovesUpTo,
    moves,
    startFen,
    playSound,
    exitWatch,
  ]);

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  }, []);

  const handleHint = useCallback(() => {
    if (sessionComplete || showStars || !correctMove) return;
    setHintUsed(true);

    const testChess = new Chess(fen);
    const legalMoves = testChess.moves({ verbose: true });
    const correct = legalMoves.find((m) => m.san === correctMove);
    if (correct) {
      setHintSquares([correct.from, correct.to]);
    }

    setTimeout(() => {
      setHintSquares([]);
    }, 3000);
  }, [fen, correctMove, sessionComplete, showStars]);

  const advanceAfterCorrect = useCallback(
    (stars: number) => {
      setMoveResults((prev) => [...prev, stars]);
      // Tactical per-move keys live under a `tactical:` namespace so tactical
      // results never bleed into the opening's per-move prestige tiers.
      const moveKey = isTacticalPack
        ? `${openingId}:${variationId}:tactical:${currentPlayerMoveIdx}`
        : `${openingId}:${variationId}:${currentPlayerMoveIdx}`;
      recordDrillResult(moveKey, stars);

      setTimeout(() => {
        setShowStars(false);
        setAttempts(0);
        setHintUsed(false);
        setHintSquares([]);
        clearDeviation();
        const nextMoveIndex = moveIndex + 1;
        if (nextMoveIndex >= playerMoveIndices.length) {
          const allResults = [...moveResults, stars];
          const avgStars = allResults.reduce((a, b) => a + b, 0) / allResults.length;
          // Play completion sound based on performance
          if (avgStars >= 2.8) {
            playSound('perfectCompletion');
          } else if (avgStars >= 1.5) {
            playSound('drillCompleted');
          } else {
            playSound('drillFailed');
          }
          void recordOpeningCompletion({
            openingId,
            variationId,
            side: playerColor === 'w' ? 'white' : 'black',
            moveResults: [
              ...moveResults.map((value, index) => ({ moveIndex: playerMoveIndices[index] ?? index, stars: Math.max(0, Math.min(3, value)) as 0 | 1 | 2 | 3 })),
              { moveIndex: currentPlayerMoveIdx, stars: Math.max(0, Math.min(3, stars)) as 0 | 1 | 2 | 3 },
            ],
            // Tactical drills prestige on their own track, not the opening's.
            tacticKey: isTacticalPack && line ? line.id : undefined,
          });
hapticSuccess();
          setSessionComplete(true);
          return;
        }
        setMoveIndex(nextMoveIndex);
        const nextIdx = playerMoveIndices[nextMoveIndex];
        if (playerColor) playOpponentMoves(nextIdx, playerColor);
      }, 1200);
    },
    [
      moveIndex,
      playerMoveIndices,
      currentPlayerMoveIdx,
      openingId,
      variationId,
      recordDrillResult,
      recordOpeningCompletion,
      moveResults,
      playOpponentMoves,
      clearDeviation,
      playerColor,
      playSound,
      isTacticalPack,
      line,
    ]
  );

  const handleMove = useCallback(
    (from: Square, to: Square) => {
      if (!correctMove || waitingOpponent || sessionComplete || showStars || !playerColor) return;

      try {
        const test = new Chess(fen);
        const result = test.move({ from, to, promotion: 'q' });
        if (!result) return;

        if (result.san === correctMove) {
          setLastMove({ from, to });
          setFen(test.fen());
          setGlowColor('correct');
          playSound('correct');
          const stars = starsFromAttempts(attempts + 1);
          setEarnedStars(stars);
          setShowStars(true);
          advanceAfterCorrect(stars);
        } else {
          const nextAttempts = attempts + 1;
          setAttempts(nextAttempts);
          setGlowColor('incorrect');
          playSound('incorrect');
          hapticError();
          applyMovesUpTo(currentPlayerMoveIdx);
          // Ask the engine why this was bad — non-blocking, the user can retry immediately.
          checkDeviation(result.san, fen, correctMove);

          if (nextAttempts >= MAX_ATTEMPTS) {
            setMoveResults((prev) => [...prev, 0]);
            const moveKey = isTacticalPack
              ? `${openingId}:${variationId}:tactical:${currentPlayerMoveIdx}`
              : `${openingId}:${variationId}:${currentPlayerMoveIdx}`;
            recordDrillResult(moveKey, 0);
            setTimeout(() => {
              const correct = new Chess(fen);
              const m = correct.move(correctMove);
              if (m) {
                setFen(correct.fen());
                setLastMove({ from: m.from as Square, to: m.to as Square });
                playSound(moveSoundFor(m.san));
              }
              setTimeout(() => {
                const nextMoveIndex = moveIndex + 1;
                if (nextMoveIndex >= playerMoveIndices.length) {
                  void recordOpeningCompletion({
                    openingId,
                    variationId,
                    side: playerColor === 'w' ? 'white' : 'black',
                    moveResults: [
                      ...moveResults.map((value, index) => ({ moveIndex: playerMoveIndices[index] ?? index, stars: Math.max(0, Math.min(3, value)) as 0 | 1 | 2 | 3 })),
                      { moveIndex: currentPlayerMoveIdx, stars: 0 },
                    ],
                    // Tactical drills prestige on their own track, not the opening's.
                    tacticKey: isTacticalPack && line ? line.id : undefined,
                  });
                  hapticSuccess();
          setSessionComplete(true);
                  return;
                }
                setMoveIndex(nextMoveIndex);
                setAttempts(0);
                setHintUsed(false);
                setHintSquares([]);
                setGlowColor('idle');
                clearDeviation();
                if (playerColor) playOpponentMoves(playerMoveIndices[nextMoveIndex], playerColor);
              }, 800);
            }, 600);
          } else {
            setTimeout(() => setGlowColor('idle'), 700);
          }
        }
      } catch {
        /* invalid */
      }
    },
    [
      correctMove,
      fen,
      attempts,
      waitingOpponent,
      sessionComplete,
      showStars,
      playerColor,
      advanceAfterCorrect,
      applyMovesUpTo,
      currentPlayerMoveIdx,
      moveIndex,
      playerMoveIndices,
      openingId,
      variationId,
      recordDrillResult,
      recordOpeningCompletion,
      moveResults,
      playOpponentMoves,
      checkDeviation,
      clearDeviation,
      playSound,
      isTacticalPack,
      line,
    ]
  );

  if (loadError) {
    const isTactical = isTacticalPackId(drillFileId);
    const isQuarantined = isQuarantinedTacticalFileId(drillFileId);
    return (
      <motion.div className="min-h-screen th-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        {isQuarantined ? (
          <>
            <p className="text-amber-300 text-lg">This tactical pack is temporarily unavailable.</p>
            <p className="text-white/50 text-sm max-w-md">
              The source material is preserved for repair but is not exposed until every position and solution passes validation.
            </p>
          </>
        ) : isTactical ? (
          <>
            <p className="text-white/70 text-lg">Tactical drills for this variation are not available yet.</p>
            <p className="text-white/50 text-sm max-w-md">
              The opening drill is complete. More tactical puzzles will be added for this line soon.
            </p>
          </>
        ) : (
          <p className="text-red-400">{loadError}</p>
        )}
        <button
          onClick={() => setLocation('/atlas')}
          className="mt-2 px-6 py-3 rounded-xl th-accent font-bold"
        >
          Return to Atlas
        </button>
      </motion.div>
    );
  }

  // Tactical selector takes priority for -tacticals packs (show list before color choice)
  if (isTacticalPack && !line && pack) {
    const hasDrills = pack.lines && pack.lines.length > 0;
    return (
      <div className="min-h-screen th-bg flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <button
            onClick={() => setLocation('/atlas')}
            className="mb-6 flex items-center gap-2 text-white/50 hover:text-white"
          >
            <ArrowLeft size={18} /> Back to Atlas
          </button>

          <h2 className="text-2xl font-bold text-white mb-2 text-center">Tactical Drills</h2>
          <p className="text-center text-white/60 mb-8">
            {hasDrills
              ? 'Choose a tactic to practice for this variation'
              : 'Tactical puzzles for this line are being prepared.'}
          </p>

          {hasDrills ? (
            <div className="grid gap-3">
              {pack.lines.map((tactic) => (
                <button
                  key={tactic.id}
                  onClick={() => selectTactic(tactic)}
                  className="w-full text-left p-4 rounded-xl th-panel border th-border th-hover-accent-border transition-colors group"
                >
                  <div className="font-semibold text-white group-th-hover-accent-text">
                    {tactic.name}
                  </div>
                  {tactic.leadInMoves && tactic.leadInMoves.length > 0 && (
                    <div className="text-xs text-white/40 mt-1">
                      From: {tactic.leadInMoves.join(' ')}
                    </div>
                  )}
                  {tactic.description && (
                    <div className="text-sm text-white/60 mt-1 line-clamp-2">
                      {tactic.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => setLocation('/atlas')}
                className="px-6 py-3 rounded-xl th-accent font-bold"
              >
                Return to Atlas
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!pack || !line) {
    return (
      <motion.div className="min-h-screen th-bg flex items-center justify-center">
        <p className="th-accent-text animate-pulse tracking-widest uppercase text-sm">Loading drill…</p>
      </motion.div>
    );
  }

  if (line.moves.length === 0) {
    return (
      <motion.div className="min-h-screen th-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-400">This drill does not contain any playable moves.</p>
        <button
          onClick={() => setLocation('/atlas')}
          className="px-6 py-3 rounded-xl th-accent font-bold"
        >
          Return to Atlas
        </button>
      </motion.div>
    );
  }

  if (!playerColor) {
    const backTarget = kingdomHasDrills(openingId as KingdomId)
      ? `/kingdom/${openingId}`
      : '/atlas';
    return (
      <TrophyBoard
        drillFileId={drillFileId}
        openingId={openingId}
        variationId={variationId}
        onSelectSide={(side) => beginSession(side)}
        onBack={() => setLocation(backTarget)}
      />
    );
  }

  const progressPct =
    playerMoveIndices.length > 0
      ? Math.round((moveIndex / playerMoveIndices.length) * 100)
      : 0;

  const deviationInfo = deviation ? deviationCopy(deviation) : null;

  const sparUndoAvailable =
    playerColor !== null && sparUndoPlies(sparHistory, playerColor ?? 'w') > 0;

  /** Drill-complete overlay return target: the opening's kingdom page when it has one. */
  const inKingdom = kingdomHasDrills(openingId as KingdomId);
  const kingdomReturnTarget = inKingdom ? `/kingdom/${openingId}` : '/atlas';
  const kingdomReturnLabel = inKingdom ? 'Return to Kingdom' : 'Return to Atlas';

  return (
    <motion.div className="min-h-screen th-bg">
      <div className="sticky top-0 z-30 th-bg-soft backdrop-blur-md border-b th-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setLocation('/atlas')}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60"
          >
            <ArrowLeft size={20} />
          </button>
          <motion.div className="text-center">
            <h1 className="text-sm font-semibold text-white">{line.name}</h1>
            <p className="text-xs text-white/40">{pack.name}</p>
          </motion.div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className={playerColor === 'w' ? 'text-cyan-400' : 'text-red-400'}>
              {playerColor === 'w' ? '♔ White' : '♚ Black'}
            </span>
            <button
              onClick={() => setShowPauseMenu(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Pause menu"
            >
              <Pause size={18} />
            </button>
          </div>
        </div>
        <div className="h-1 th-panel">
          <motion.div
            className="h-full bg-gradient-to-r from-[#00f5d4] to-[#f5a623]"
            animate={{ width: `${sessionComplete ? 100 : progressPct}%` }}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {sessionComplete ? (
          <div className="relative">
            {/* Board stays visible — final drill position, or live sparring game */}
            <BoardWithEval fen={fen} orientation={playerColor === 'b' ? 'black' : 'white'}>
              <ChessBoard
                fen={fen}
                onMove={handleSparringMove}
                glowColor={glowColor}
                lastMove={lastMove}
                interactive={sparring && !sparringOver && !sparringThinking}
                orientation={playerColor === 'b' ? 'black' : 'white'}
              />
            </BoardWithEval>

            {/* Drill over: the final position stays fully visible with a
                Continue button below the board — the options live in the
                full-screen overlay instead of covering the board. */}
            {!sparring && !resultsOpen && (
              <div className="mt-4 text-center">
                <p className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-2">
                  Drill Complete
                </p>
                <div className="flex justify-center gap-1 mb-4">
                  {moveResults.map((s, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={s > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setResultsOpen(true)}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl th-accent font-bold hover:bg-[#00e0c0] transition-colors"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* Drill-complete options: full-screen overlay so every option is
                visible without scrolling the page. Backdrop tap dismisses. */}
            <AnimatePresence>
              {resultsOpen && !sparring && (
                <motion.div
                  key="complete-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center th-bg/90 backdrop-blur-sm p-4"
                  onClick={() => setResultsOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="w-full max-w-md rounded-2xl th-panel border th-border p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center w-full">
                      <h2 className="text-2xl font-bold text-white mb-3">Drill Complete</h2>
                      <div className="flex justify-center gap-1 mb-5">
                        {moveResults.map((s, i) => (
                          <Star
                            key={i}
                            size={24}
                            className={s > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={restartDrill}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold hover:bg-white/20 transition-colors"
                        >
                          <RotateCcw size={18} /> Drill Again
                        </button>
                        <button
                          onClick={startSparring}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold hover:bg-purple-500/30 transition-colors"
                        >
                          <Swords size={18} /> Play vs Computer
                        </button>
                        {drillFileId.endsWith('-main') && (hasTacticalDrills(variationId) || tacticsListedUnder(variationId).length > 0) && (
                          <button
                            onClick={() => {
                              setLocation(
                                `/tactics/${variationId}?opening=${openingId}`
                              );
                            }}
                            className="px-4 py-3 rounded-xl bg-[#f5a623] text-[#0a0a1f] font-bold hover:bg-[#e5941a] transition-colors"
                          >
                            Drill tactics for this variation
                          </button>
                        )}
                        {drillFileId.endsWith('-main') && hasPuzzleDrills(variationId) && (
                          <button
                            onClick={() => {
                              setLocation(
                                `/drill-session/${variationId}-puzzles?opening=${openingId}&variation=${variationId}`
                              );
                            }}
                            className="px-4 py-3 rounded-xl th-accent font-bold hover:bg-[#00e0c0] transition-colors"
                          >
                            Practice real puzzles
                          </button>
                        )}
                        <button
                          onClick={() => setLocation(kingdomReturnTarget)}
                          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 transition-colors sm:col-span-2"
                        >
                          {kingdomReturnLabel}
                        </button>
                      </div>

                      {/* If we are in a tactical pack, show the other tactics to practice next */}
                      {isTacticalPack && pack && pack.lines.length > 0 && (
                        <div className="mt-6 w-full text-left">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-3 text-center">Practice another tactic</p>
                          <div className="grid gap-2 max-h-48 overflow-y-auto">
                            {pack.lines.map((tactic) => (
                              <button
                                key={tactic.id}
                                onClick={() => selectTactic(tactic)}
                                className={`w-full text-left p-3 rounded-xl border transition-all group ${
                                  line?.id === tactic.id
                                    ? 'th-accent/5 th-accent-border cursor-default'
                                    : 'th-panel th-border th-hover-accent-border hover:th-panel'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className={`font-semibold text-sm ${line?.id === tactic.id ? 'th-accent-text' : 'text-white group-th-hover-accent-text'}`}>
                                    {tactic.name}
                                  </div>
                                  {line?.id === tactic.id && (
                                    <span className="text-[10px] font-bold th-accent-soft th-accent-text px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Just Completed
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sparring status + exit */}
            {sparring && (
              <div className="mt-4 flex items-center justify-center gap-3">
                {sparringThinking && (
                  <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
                    <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Engine thinking…
                  </span>
                )}
                {sparringOver && (
                  <span className="text-sm font-bold th-accent-text uppercase tracking-widest">
                    Game over
                  </span>
                )}
                <button
                  onClick={undoSparMove}
                  disabled={!sparUndoAvailable}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Undo2 size={14} />
                  Undo move
                </button>
                <button
                  onClick={exitSparring}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  {sparringOver ? 'Back to results' : 'End sparring'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-white/50 mb-4">
              {watching ? (
                <span className="th-accent-text/80 animate-pulse">
                  Watching the line… single play
                </span>
              ) : waitingOpponent ? (
                <span className="th-accent-text/80 animate-pulse">Opponent is moving…</span>
              ) : (
                <>
                  Your move {moveIndex + 1} of {playerMoveIndices.length}
                  {attempts > 0 && (
                    <span className="text-yellow-400/70"> · Attempt {attempts + 1}/{MAX_ATTEMPTS}</span>
                  )}
                </>
              )}
            </p>

            <div className="relative pt-14">
              <AnimatePresence>
                {showStars && (
                  <StarOverlay stars={earnedStars} onComplete={() => setShowStars(false)} />
                )}
              </AnimatePresence>

              <BoardWithEval fen={fen} orientation={playerColor === 'b' ? 'black' : 'white'}>
                <ChessBoard
                  fen={fen}
                  onMove={handleMove}
                  glowColor={glowColor}
                  hintSquares={hintSquares}
                  lastMove={lastMove}
                  interactive={!waitingOpponent && !showStars && !watching}
                  orientation={playerColor === 'b' ? 'black' : 'white'}
                  targetSquare={targetSquare}
                />
              </BoardWithEval>
            </div>

            {/* Engine refutation: why the wrong move was bad (or wasn't) */}
            <AnimatePresence>
              {deviationLoading && !deviationInfo && (
                <motion.div
                  key="deviation-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center justify-center gap-3 text-xs uppercase tracking-widest text-white/30"
                >
                  <span className="w-3 h-3 border-2 border-[#00f5d4] border-t-transparent rounded-full animate-spin" />
                  Engine checking your move…
                </motion.div>
              )}
              {deviationInfo && (
                <motion.div
                  key="deviation"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-4 p-4 rounded-2xl border text-left ${
                    deviationInfo.mild
                      ? 'bg-amber-500/10 border-amber-500/25'
                      : 'bg-red-500/10 border-red-500/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`font-bold text-xs uppercase tracking-wider ${
                          deviationInfo.mild ? 'text-amber-400' : 'text-red-400'
                        }`}
                      >
                        {deviationInfo.title}
                      </p>
                      <p className="text-white/75 text-sm mt-1">{deviationInfo.detail}</p>
                      {deviationInfo.refutationLine && (
                        <p className="text-white/60 text-sm mt-2">
                          <span className="text-white/35">One reply: </span>
                          <span className="font-mono text-white/80">{deviationInfo.refutationLine}</span>
                        </p>
                      )}
                      {deviationLoading && (
                        <p className="text-white/30 text-xs mt-1 animate-pulse">Rechecking…</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        deviationSeq.current += 1;
                        setDeviation(null);
                        setDeviationLoading(false);
                      }}
                      aria-label="Dismiss engine note"
                      className="text-white/30 hover:text-white/70 text-xl leading-none px-1"
                    >
                      ×
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div className="flex flex-wrap justify-center gap-2 mt-6">
              {watching ? (
                <button
                  onClick={exitWatch}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg th-panel border th-accent-border th-accent-text text-sm whitespace-nowrap"
                >
                  <X size={16} /> Exit watch
                </button>
              ) : (
                <>
                  <button
                    onClick={() => beginSession(playerColor)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg th-panel border th-border text-white/60 text-sm whitespace-nowrap"
                  >
                    <RotateCcw size={16} /> Restart
                  </button>
                  <button
                    onClick={startWatch}
                    disabled={showStars || waitingOpponent}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg th-panel border th-border text-white/60 text-sm whitespace-nowrap th-hover-accent-text th-hover-accent-border disabled:opacity-40 disabled:hover:text-white/60 disabled:hover:th-border"
                    title="Watch the full line once"
                  >
                    <Eye size={16} /> Watch
                  </button>
                </>
              )}
              <button
                onClick={handleHint}
                disabled={hintUsed || sessionComplete || showStars || watching}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors ${
                  hintUsed
                    ? 'th-panel th-border text-white/30 cursor-not-allowed'
                    : 'th-panel th-border text-white/60 th-hover-accent-text th-hover-accent-border'
                }`}
              >
                <Lightbulb size={16} />
                {hintUsed ? 'Hint Used' : 'Hint'}
              </button>
              <button
                onClick={() => setDrillMode((m) => (m === 'in-order' ? 'random' : 'in-order'))}
                className="flex items-center gap-2 px-3 py-2 rounded-lg th-panel border th-border text-white/60 text-sm whitespace-nowrap"
              >
                {drillMode === 'in-order' ? <ListOrdered size={16} /> : <Shuffle size={16} />}
                {drillMode === 'in-order' ? 'In order' : 'Random'}
              </button>
            </motion.div>
            {watchNote && !watching && (
              <p className="text-center text-xs text-amber-300/80 mt-3">{watchNote}</p>
            )}
          </>
        )}
      </div>

      {/* Pause Menu */}
      <AnimatePresence>
        {showPauseMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex overflow-y-auto bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowPauseMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md mx-auto my-auto rounded-2xl th-panel border th-border p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pause size={20} className="th-accent-text" /> Paused
                </h2>
                <button
                  onClick={() => setShowPauseMenu(false)}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Resume"
                >
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">Board Theme</h3>
              <ThemePicker />
              <div className="mt-6 pt-6 border-t th-border">
                <h3 className="text-sm font-semibold text-white/70 mb-3">Sound</h3>
                <SoundPicker />
              </div>
              <button
                onClick={() => setShowPauseMenu(false)}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl th-accent font-semibold th-accent-hover transition-colors"
              >
                <Play size={18} /> Resume Drill
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
