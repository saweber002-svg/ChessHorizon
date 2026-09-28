#!/usr/bin/env node
/**
 * regen-tactics.mjs — Regenerate quarantined tactical drill solutions from scratch.
 *
 * For each quarantined tactical pack in public/drill-data/, this script takes the
 * drill's FEN (position) and uses Stockfish 18 (lite-single WASM, via the stockfish
 * npm package in Node) to find the best continuation from scratch. The engine's
 * principal variation becomes the new solutionMoves.
 *
 * It NEVER modifies the quarantined originals. Output goes to --out:
 *   <out>/staging/<pack-id>.json       regenerated pack (solutionMoves replaced)
 *   <out>/staging/<pack-id>.meta.json  per-drill engine evidence + verdicts
 *   <out>/report.md                    human review report
 *
 * Verdicts per drill:
 *   TACTIC         genuine tactic found: mate in the PV, or wins >= 1 pawn of
 *                  material by force with a clearly unique first move
 *   PLAN           engine's best line is sensible but contains no tactic
 *                  (this matches the character of the current production packs)
 *   NEEDS_POSITION FEN invalid or unusable — new position required, engine can't help
 *
 * Usage:
 *   node scripts/regen-tactics.mjs --out /tmp/tactics-regen [--depth 16]
 *       [--pack caro-kann-classical-tacticals] [--max-drills 3]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { Chess } from 'chess.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const DEPTH = parseInt(arg('depth', '16'), 10);
const OUT = arg('out', join(REPO, '.tactics-regen'));
const ONLY_PACK = arg('pack', null);
const MAX_DRILLS = parseInt(arg('max-drills', '0'), 10) || Infinity;
const MAX_PLIES = 5; // match production convention (~5 plies per tactic)
const TACTIC_GAP_CP = 50; // min gap between best and 2nd-best for a genuine tactic

// ---------------------------------------------------------------------------
// Minimal promise-based UCI driver over the stockfish npm package (Node build)
// ---------------------------------------------------------------------------
class UciEngine {
  async init() {
    const req = createRequire(import.meta.url);
    const initEngine = req('stockfish');
    this.engine = await initEngine('lite-single');
    this.pending = null;
    // NOTE: this build routes UCI output through engine.listener, not engine.print.
    this.engine.listener = (raw) => {
      const line = String(raw).trim();
      if (!line) return;
      const p = this.pending;
      if (!p) return;
      if (line === p.term || line.startsWith(p.term + ' ')) {
        this.pending = null;
        p.infos.push(line); // include the terminal line (e.g. bestmove ...) for parsing
        p.resolve(p.infos);
      } else {
        p.infos.push(line);
      }
    };
    await this.cmd('uci', 'uciok');
    this.send('setoption name Hash value 64');
    this.send('setoption name MultiPV value 3');
    await this.cmd('isready', 'readyok');
  }

  send(cmd) {
    this.engine.sendCommand(cmd);
  }

  cmd(cmd, term) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending) { this.pending = null; }
        reject(new Error(`UCI timeout waiting for "${term}" after "${cmd}"`));
      }, 180000);
      this.pending = { term, infos: [], resolve: (infos) => { clearTimeout(timer); resolve(infos); } };
      this.send(cmd);
    });
  }

  /** Search a FEN; returns { bestmove, lines: [{multipv, score, mate, pv}] } at final depth. */
  async search(fen, depth) {
    this.send(`position fen ${fen}`);
    await this.cmd('isready', 'readyok');
    const infos = await this.cmd(`go depth ${depth}`, 'bestmove');
    let bestmove = null;
    const tail = infos[infos.length - 1] || '';
    const m = tail.match(/^bestmove\s+(\S+)/);
    if (m) bestmove = m[1];

    // Collect the deepest info line per multipv.
    let maxDepth = 0;
    for (const l of infos) {
      const d = l.match(/^info depth (\d+)/);
      if (d) maxDepth = Math.max(maxDepth, parseInt(d[1], 10));
    }
    const byMpv = new Map();
    for (const l of infos) {
      const d = l.match(/^info depth (\d+).*?\bmultipv (\d+).*?\bscore (cp|mate) (-?\d+).*?\bpv (.+)$/);
      if (d && parseInt(d[1], 10) === maxDepth) {
        byMpv.set(parseInt(d[2], 10), {
          multipv: parseInt(d[2], 10),
          scoreCp: d[3] === 'cp' ? parseInt(d[4], 10) : null,
          mateIn: d[3] === 'mate' ? parseInt(d[4], 10) : null,
          pv: d[5].trim().split(/\s+/),
        });
      }
    }
    const lines = [...byMpv.values()].sort((a, b) => a.multipv - b.multipv);
    return { bestmove, lines, depth: maxDepth };
  }
}

/** Count material (pawn=1, minor=3, rook=5, queen=9) for a color. */
function materialFor(chess, color) {
  const vals = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let m = 0;
  for (const row of chess.board())
    for (const sq of row) if (sq && sq.color === color) m += vals[sq.type];
  return m;
}

/** Validate the position strictly (chess.js accepts some positions Stockfish
 *  rejects, e.g. 9 pawns). Returns null if OK, else a flag string. */
function validatePosition(fen) {
  let chess;
  try {
    chess = new Chess(fen);
  } catch {
    return 'BAD_FEN';
  }
  let wk = 0, bk = 0, wp = 0, bp = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      if (sq.type === 'k') { if (sq.color === 'w') wk++; else bk++; }
      if (sq.type === 'p') {
        if (sq.color === 'w') wp++; else bp++;
        if (r === 0 || r === 7) return 'PAWN_ON_BACK_RANK';
      }
    }
  }
  if (wk !== 1 || bk !== 1) return 'BAD_FEN';
  if (wp > 8 || bp > 8) return 'ILLEGAL_PAWN_COUNT';
  if (chess.isGameOver()) return 'POSITION_ALREADY_OVER';
  return null;
}

/** Normalize a score to centipawns from the searcher's perspective (mate => huge). */
function normCp(line) {
  if (line.mateIn !== null && line.mateIn !== undefined) {
    const sign = line.mateIn > 0 ? 1 : -1;
    return sign * (100000 - Math.abs(line.mateIn));
  }
  return line.scoreCp ?? 0;
}

/** Replay a UCI PV on chess.js; return SAN moves (truncated at first illegal PV move). */
function pvToSan(fen, pv) {
  const chess = new Chess(fen);
  const san = [];
  for (const uci of pv) {
    let mv = null;
    try {
      mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch { break; }
    if (!mv) break;
    san.push(mv.san);
  }
  return san;
}

const SAN_TOKEN = /\b(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

function analyzeDrill(drill, search) {
  const flags = [];

  // Strict position validation first (catches FENs chess.js accepts but Stockfish rejects).
  const posFlag = validatePosition(drill.fen);
  if (posFlag) {
    return { verdict: 'NEEDS_POSITION', flags: [posFlag], solutionMoves: null, evidence: { fen: drill.fen } };
  }
  const chess = new Chess(drill.fen);
  const sideToMove = chess.turn(); // 'w' | 'b'

  const [best, second] = [search.lines[0], search.lines[1]];
  if (!best || !search.bestmove || search.bestmove === '(none)') {
    return { verdict: 'NEEDS_POSITION', flags: ['ENGINE_REJECTED_POSITION'], solutionMoves: null, evidence: { fen: drill.fen } };
  }

  const san = pvToSan(drill.fen, best.pv);
  const solutionMoves = san.slice(0, MAX_PLIES);
  const bestCp = normCp(best);
  const gapCp = second ? bestCp - normCp(second) : Infinity;
  const isMate = best.mateIn !== null && best.mateIn !== undefined && best.mateIn > 0;

  // Material swing (solver minus opponent) across the tactic window (first 5 plies).
  // (The full PV is too long — deep lines wander through unrelated exchanges.)
  // NOTE: diff-based — winning a piece without losing one must count.
  const opp = sideToMove === 'w' ? 'b' : 'w';
  const diffBefore = materialFor(chess, sideToMove) - materialFor(chess, opp);
  const end = new Chess(drill.fen);
  for (const s of san.slice(0, 5)) { try { end.move(s); } catch { break; } }
  const materialGain = (materialFor(end, sideToMove) - materialFor(end, opp)) - diffBefore;

  // Verdict taxonomy:
  //   TACTIC         genuine tactic: mate, or wins >=1 pawn of material by force
  //                  (solver-vs-opponent diff) with a clearly unique first move.
  //   PLAN           engine's best line is sensible but contains no tactic
  //                  (matches the character of the current production packs).
  //   NEEDS_POSITION unusable FEN — a new position is required.
  let verdict;
  if (isMate || (materialGain >= 1 && gapCp >= TACTIC_GAP_CP)) {
    verdict = 'TACTIC';
  } else {
    verdict = 'PLAN';
  }

  if (san.length < 4) flags.push('SHORT_PV');
  if (!isMate && gapCp < TACTIC_GAP_CP) flags.push('NON_UNIQUE');
  // A "plan" drill where any move is equally good teaches nothing.
  if (verdict === 'PLAN' && gapCp < 15) flags.push('WEAK_SOLUTION');

  // Side-to-move vs. description actor mismatch (e.g. "Black strikes" but White to move).
  const desc = `${drill.name} ${drill.description} ${drill.briefExplanation || ''}`;
  if (sideToMove === 'w' && /\bblack\b/i.test(desc) && !/\bwhite\b/i.test(desc)) flags.push('SIDE_MISMATCH');
  if (sideToMove === 'b' && /\bwhite\b/i.test(desc) && !/\bblack\b/i.test(desc)) flags.push('SIDE_MISMATCH');

  // Description names concrete moves absent from the new line -> copy needs review.
  const mentioned = new Set((drill.description || '').match(SAN_TOKEN) || []);
  if (mentioned.size > 0) {
    const lineSet = new Set(solutionMoves.map((s) => s.replace(/[+#]$/, '')));
    const overlap = [...mentioned].some((t) => lineSet.has(t.replace(/[+#]$/, '')));
    if (!overlap) flags.push('COPY_REVIEW');
  }

  const verdictAlready = verdict;
  return {
    verdict: verdictAlready,
    flags,
    solutionMoves,
    evidence: {
      fen: drill.fen,
      sideToMove: sideToMove === 'w' ? 'white' : 'black',
      bestMoveUci: search.bestmove,
      bestMoveSan: san[0] || null,
      scoreCp: best.scoreCp,
      mateIn: best.mateIn,
      gapCp: Number.isFinite(gapCp) ? Math.round(gapCp) : null,
      materialGain,
      pvSan: san,
      depth: search.depth,
    },
  };
}

function loadQuarantinedIds() {
  // TACTICS_IDS="a-tacticals,b-tacticals" overrides the quarantine registry (for calibration).
  if (process.env.TACTICS_IDS) return process.env.TACTICS_IDS.split(',').map((s) => s.trim()).filter(Boolean);
  const src = readFileSync(join(REPO, 'src/data/quarantinedTacticalRegistry.ts'), 'utf8');
  return [...src.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

async function main() {
  const engine = new UciEngine();
  console.log('Booting Stockfish 18 lite-single in Node...');
  await engine.init();
  console.log(`Engine ready. Depth=${DEPTH}.`);

  mkdirSync(join(OUT, 'staging'), { recursive: true });
  let ids = loadQuarantinedIds();
  if (ONLY_PACK) ids = ids.filter((id) => id === ONLY_PACK);
  console.log(`Packs to process: ${ids.length}`);

  const report = [];
  let drillCount = 0;

  for (const id of ids) {
    const raw = JSON.parse(readFileSync(join(REPO, 'public/drill-data', `${id}.json`), 'utf8'));
    const drills = raw.drills ?? [];
    const newDrills = [];
    const meta = [];

    for (const drill of drills) {
      if (drillCount >= MAX_DRILLS) break;
      drillCount++;
      const t0 = Date.now();
      let result;
      try {
        const search = await engine.search(drill.fen, DEPTH);
        result = analyzeDrill(drill, search);
      } catch (e) {
        result = { verdict: 'PLAN', flags: ['ENGINE_ERROR'], solutionMoves: null, evidence: { error: String(e) } };
      }
      const ms = Date.now() - t0;
      console.log(`  [${result.verdict}] ${drill.drillId} (${ms}ms) ${result.flags.join(',')}`);

      meta.push({ drillId: drill.drillId, name: drill.name, ...result, ms });
      report.push({ pack: id, drillId: drill.drillId, name: drill.name, ...result });

      newDrills.push({
        ...drill,
        solutionMoves: result.solutionMoves ?? drill.solutionMoves,
      });
    }

    writeFileSync(join(OUT, 'staging', `${id}.json`), JSON.stringify({ ...raw, drills: newDrills }, null, 2));
    writeFileSync(join(OUT, 'staging', `${id}.meta.json`), JSON.stringify(meta, null, 2));
  }

  // ---- Markdown report ----
  const counts = {};
  for (const r of report) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  const lines = [
    '# Tactical Regen Report',
    '',
    `Engine: Stockfish 18 lite-single, depth ${DEPTH}, MultiPV 3.`,
    `Packs: ${ids.length}, drills processed: ${report.length}.`,
    '',
    '## Summary',
    '',
    ...Object.entries(counts).map(([v, n]) => `- ${v}: ${n}`),
    '',
    '## Drills',
    '',
    '| Pack | Drill | Name | Verdict | Flags | New line |',
    '|---|---|---|---|---|---|',
  ];
  for (const r of report) {
    const line = (r.solutionMoves || []).join(' ');
    const ev = r.evidence || {};
    const score = ev.mateIn ? `mate ${ev.mateIn}` : (ev.scoreCp !== undefined && ev.scoreCp !== null ? `${ev.scoreCp > 0 ? '+' : ''}${(ev.scoreCp / 100).toFixed(2)}` : '?');
    const gain = ev.materialGain !== undefined && ev.materialGain !== null ? `+${ev.materialGain}` : '';
    lines.push(`| ${r.pack} | ${r.drillId} | ${r.name} | ${r.verdict} | ${r.flags.join(', ') || '—'} | ${line} (${score}${gain ? `, mat ${gain}` : ''}) |`);
  }
  lines.push('');
  writeFileSync(join(OUT, 'report.md'), lines.join('\n'));
  console.log(`\nDone. ${report.length} drills. Report: ${join(OUT, 'report.md')}`);
  console.log(counts);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
