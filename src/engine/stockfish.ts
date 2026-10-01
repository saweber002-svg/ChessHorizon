/**
 * Stockfish WASM engine layer.
 *
 * Runs the official Stockfish 18 lite single-threaded build inside a Web
 * Worker (the same architecture lichess uses). The engine files live in
 * public/engine/ (copied from node_modules on postinstall) and are
 * lazy-loaded on first use so the ~7MB download never blocks initial render.
 *
 * Communication uses the UCI text protocol:
 *   uci -> uciok | isready -> readyok | position fen ... | go depth N
 *   <- info depth D score cp X pv ... | bestmove e2e4
 *
 * All engine scores are from the *side to move's* perspective.
 */

export interface EngineScore {
  /** 'cp' = centipawns, 'mate' = moves to mate (positive = side to move mates) */
  type: 'cp' | 'mate';
  value: number;
}

export interface EngineLine {
  bestMove: string; // UCI, e.g. "e2e4"
  score: EngineScore; // from the side to move's perspective
  pv: string[]; // principal variation, UCI moves
  depth: number;
  multiPv: number;
}

export interface AnalyzeOptions {
  depth?: number;
  multiPv?: number;
  /** milliseconds of thinking time; overrides depth when set */
  movetimeMs?: number;
}

export class EngineUnavailableError extends Error {
  constructor(message = 'Chess engine failed to load') {
    super(message);
    this.name = 'EngineUnavailableError';
  }
}

const ENGINE_JS = 'stockfish-18-lite-single.js';
const DEFAULT_DEPTH = 14;
const HASH_MB = 16;
const UCI_TIMEOUT_MS = 45_000;
const LOAD_TIMEOUT_MS = 60_000;

/** True when this browser can run the WASM engine at all. */
export function isEngineSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof WebAssembly !== 'undefined' &&
    typeof window !== 'undefined'
  );
}

// ---------------------------------------------------------------------------
// Pure UCI parsing helpers (unit-testable, no Worker needed)
// ---------------------------------------------------------------------------

/**
 * Parse an `info depth ...` line into a partial EngineLine.
 * Returns null for info lines that carry no search result (currmove, etc.).
 */
export function parseInfoLine(line: string): Omit<EngineLine, 'bestMove'> | null {
  if (!line.startsWith('info ')) return null;
  const tokens = line.split(/\s+/);
  const get = (key: string): string | null => {
    const i = tokens.indexOf(key);
    return i >= 0 && i + 1 < tokens.length ? tokens[i + 1] : null;
  };

  const depth = Number(get('depth'));
  if (!Number.isFinite(depth) || depth <= 0) return null;

  const scoreKind = get('score');
  const scoreVal = Number(tokens[tokens.indexOf('score') + 2]);
  if ((scoreKind !== 'cp' && scoreKind !== 'mate') || !Number.isFinite(scoreVal)) return null;

  const pvIndex = tokens.indexOf('pv');
  const pv = pvIndex >= 0 ? tokens.slice(pvIndex + 1) : [];
  if (pv.length === 0) return null;

  const multiPv = Number(get('multipv') ?? '1');

  return {
    score: { type: scoreKind, value: scoreVal },
    pv,
    depth,
    multiPv: Number.isFinite(multiPv) ? multiPv : 1,
  };
}

/** Parse a `bestmove e2e4 [ponder e7e5]` line. Returns the UCI move or null. */
export function parseBestmoveLine(line: string): string | null {
  const m = /^bestmove\s+(\S+)/.exec(line.trim());
  if (!m || m[1] === '(none)') return null;
  return m[1];
}

/**
 * Convert an engine score to a clamped centipawn number from the same
 * perspective. Mate scores map near +/-10000, slightly preferring faster mates.
 */
export function scoreToCp(score: EngineScore): number {
  if (score.type === 'cp') return Math.max(-10000, Math.min(10000, score.value));
  const sign = score.value > 0 ? 1 : -1;
  return sign * (10000 - 10 * Math.min(Math.abs(score.value), 999));
}

/**
 * Centipawn loss for the mover, given the engine score before the move and
 * after the move — both from the *mover's* perspective. Never negative.
 */
export function computeCpLoss(before: EngineScore, after: EngineScore): number {
  return Math.max(0, Math.round(scoreToCp(before) - scoreToCp(after)));
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private waiters = new Map<string, (line: string) => void>();
  private latest = new Map<number, Omit<EngineLine, 'bestMove'>>();

  /** Load the WASM engine and complete the UCI handshake. Safe to call repeatedly. */
  ensureReady(): Promise<void> {
    if (!isEngineSupported()) {
      return Promise.reject(new EngineUnavailableError('Web Workers or WebAssembly are not available'));
    }
    if (!this.ready) {
      this.ready = this.boot().catch((err) => {
        // Allow a later retry after a failed boot.
        this.ready = null;
        this.worker = null;
        throw err instanceof EngineUnavailableError ? err : new EngineUnavailableError(String(err));
      });
    }
    return this.ready;
  }

  private boot(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${import.meta.env.BASE_URL}engine/${ENGINE_JS}`;
      let worker: Worker;
      try {
        worker = new Worker(url);
      } catch (err) {
        reject(new EngineUnavailableError(`Could not start engine worker: ${String(err)}`));
        return;
      }
      this.worker = worker;

      const timer = setTimeout(() => {
        reject(new EngineUnavailableError('Timed out waiting for the engine to load'));
      }, LOAD_TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : String(e.data);
        this.route(line);
      };
      worker.onerror = (e: ErrorEvent) => {
        reject(new EngineUnavailableError(`Engine worker error: ${e.message}`));
      };

      this.waitFor('uciok', LOAD_TIMEOUT_MS).then(
        () => {
          clearTimeout(timer);
          this.send(`setoption name Hash value ${HASH_MB}`);
          this.send('isready');
          this.waitFor('readyok', LOAD_TIMEOUT_MS).then(
            () => resolve(),
            () => reject(new EngineUnavailableError('Engine did not become ready')),
          );
        },
        () => {
          clearTimeout(timer);
          reject(new EngineUnavailableError('Engine did not answer the UCI handshake'));
        },
      );

      worker.postMessage('uci');
    });
  }

  private route(line: string): void {
    if (line === 'uciok' || line === 'readyok') {
      this.waiters.get(line)?.(line);
      return;
    }
    if (line.startsWith('bestmove')) {
      this.waiters.get('bestmove')?.(line);
      return;
    }
    if (line.startsWith('info ')) {
      const parsed = parseInfoLine(line);
      if (parsed) {
        const prev = this.latest.get(parsed.multiPv);
        if (!prev || parsed.depth >= prev.depth) this.latest.set(parsed.multiPv, parsed);
      }
    }
  }

  private send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private waitFor(token: 'uciok' | 'readyok' | 'bestmove', timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(token);
        reject(new Error(`Timed out waiting for ${token}`));
      }, timeoutMs);
      this.waiters.set(token, (line) => {
        clearTimeout(timer);
        this.waiters.delete(token);
        resolve(line);
      });
    });
  }

  /** Serialize engine commands: Stockfish handles one search at a time. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    // Keep the chain alive even if this task rejects.
    this.queue = run.catch(() => undefined);
    return run;
  }

  /**
   * Analyze a position. Returns one line per requested MultiPV, ordered by
   * multipv rank. Scores are from the side to move's perspective.
   */
  analyze(fen: string, opts: AnalyzeOptions = {}): Promise<EngineLine[]> {
    return this.enqueue(async () => {
      await this.ensureReady();
      const { depth = DEFAULT_DEPTH, multiPv = 1, movetimeMs } = opts;
      this.send('stop');
      this.send(`setoption name MultiPV value ${Math.max(1, Math.floor(multiPv))}`);
      this.send(`position fen ${fen}`);
      this.latest.clear();
      this.send(movetimeMs ? `go movetime ${movetimeMs}` : `go depth ${depth}`);

      const bestmoveLine = await this.waitFor('bestmove', UCI_TIMEOUT_MS);
      const bestMove = parseBestmoveLine(bestmoveLine);
      if (!bestMove) throw new Error('Engine returned no move');

      const lines: EngineLine[] = [];
      for (const [rank, info] of [...this.latest.entries()].sort((a, b) => a[0] - b[0])) {
        lines.push({ bestMove: rank === 1 ? bestMove : info.pv[0], ...info });
      }
      if (lines.length === 0) {
        // Extremely rare: bestmove arrived with no usable info line.
        return [{ bestMove, score: { type: 'cp', value: 0 }, pv: [bestMove], depth: 0, multiPv: 1 }];
      }
      return lines;
    });
  }

  /** Ask the engine to play a move, at a human-like skill level (0-20). */
  async findBestMove(fen: string, skillLevel = 6, movetimeMs = 400): Promise<string> {
    const [line] = await this.enqueue(async () => {
      await this.ensureReady();
      this.send('stop');
      const clamped = Math.max(0, Math.min(20, Math.round(skillLevel)));
      this.send(`setoption name Skill Level value ${clamped}`);
      this.send(`setoption name MultiPV value 1`);
      this.send(`position fen ${fen}`);
      this.latest.clear();
      this.send(`go movetime ${movetimeMs}`);
      const bestmoveLine = await this.waitFor('bestmove', UCI_TIMEOUT_MS);
      const bestMove = parseBestmoveLine(bestmoveLine);
      if (!bestMove) throw new Error('Engine returned no move');
      return [{ bestMove }];
    });
    return line.bestMove;
  }

  /** Halt any in-progress search. */
  stop(): void {
    this.send('stop');
  }

  /**
   * Ask the engine to play a move the way a human at `skill` would.
   * `blunderRate` (0..1) is the probability of deliberately playing a
   * sub-optimal move picked from outside its top candidate — this is what
   * makes the lower difficulties feel human instead of like a grandmaster
   * holding back. Analysis callers should keep using findBestMove/analyze.
   */
  async findPlayMove(
    fen: string,
    opts: { skill?: number; movetimeMs?: number; blunderRate?: number } = {},
  ): Promise<string> {
    const { skill = 6, movetimeMs = 400, blunderRate = 0 } = opts;
    const [line] = await this.enqueue(async () => {
      await this.ensureReady();
      this.send('stop');
      const clamped = Math.max(0, Math.min(20, Math.round(skill)));
      this.send(`setoption name Skill Level value ${clamped}`);
      this.send(`setoption name MultiPV value ${blunderRate > 0 ? 5 : 1}`);
      this.send(`position fen ${fen}`);
      this.latest.clear();
      this.send(`go movetime ${movetimeMs}`);
      const bestmoveLine = await this.waitFor('bestmove', UCI_TIMEOUT_MS);
      const bestMove = parseBestmoveLine(bestmoveLine);
      if (!bestMove) throw new Error('Engine returned no move');
      if (blunderRate > 0 && Math.random() < blunderRate) {
        const candidates = [...this.latest.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, info]) => info.pv[0])
          .filter((m): m is string => typeof m === 'string' && m !== bestMove);
        if (candidates.length > 0) {
          return [{ bestMove: candidates[Math.floor(Math.random() * candidates.length)] }];
        }
      }
      return [{ bestMove }];
    });
    return line.bestMove;
  }

  /** Shut the engine down entirely (frees the worker + WASM memory). */
  terminate(): void {
    this.send('quit');
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.waiters.clear();
    this.latest.clear();
  }
}

let singleton: StockfishEngine | null = null;

/** Shared engine instance for the app. Boot is lazy and happens once. */
export function getEngine(): StockfishEngine {
  if (!singleton) singleton = new StockfishEngine();
  return singleton;
}
