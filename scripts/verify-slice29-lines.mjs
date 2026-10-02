#!/usr/bin/env node
/**
 * Slice 29 build+verify helper (one-shot, not part of the product build).
 *
 * Each new/edited drill JSON carries a private "__startMoves" field: SAN moves
 * from the standard start position reaching the drill's start position.
 * This script:
 *  1. plays __startMoves with chess.js -> derives the exact start FEN,
 *  2. injects it as `fen`,
 *  3. plays `solutionMoves` (tacticals) or `moves` (main lines) from that FEN,
 *     verifying every SAN is legal AND matches chess.js's normalized SAN
 *     (catches wrong +/-/# suffixes),
 *  4. strips __startMoves and rewrites the file (2-space JSON).
 *
 * Aborts without writing anything if any line is illegal.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRILL_DIR = join(__dirname, '..', 'public', 'drill-data');

const TACTICAL_FILES = [
  'winawer-poisoned-pawn-tacticals',
  'winawer-poisoned-pawn-black-tacticals',
  'najdorf-poisoned-pawn-tacticals',
  'najdorf-poisoned-pawn-black-tacticals',
  'marshall-attack-tacticals',
  'marshall-attack-black-tacticals',
  'schliemann-gambit-tacticals',
  'schliemann-gambit-black-tacticals',
  'albin-countergambit-tacticals',
  'albin-countergambit-black-tacticals',
  'smith-morra-gambit-tacticals',
  'smith-morra-gambit-black-tacticals',
  'scandinavian-icelandic-gambit-tacticals',
  'scandinavian-icelandic-gambit-black-tacticals',
];

function deriveFen(startMoves, label) {
  const g = new Chess();
  for (const san of startMoves) {
    let mv;
    try {
      mv = g.move(san);
    } catch {
      throw new Error(`${label}: illegal start move "${san}" at position ${g.fen()}`);
    }
    if (mv.san !== san) {
      throw new Error(`${label}: start SAN mismatch "${san}" -> normalized "${mv.san}"`);
    }
  }
  return g.fen();
}

function verifySolution(fen, solutionMoves, label) {
  const g = new Chess(fen);
  for (const san of solutionMoves) {
    let mv;
    try {
      mv = g.move(san);
    } catch {
      throw new Error(`${label}: illegal solution move "${san}" at position ${g.fen()}`);
    }
    if (mv.san !== san) {
      throw new Error(`${label}: solution SAN mismatch "${san}" -> normalized "${mv.san}"`);
    }
  }
  return g.fen();
}

const pending = [];
for (const fileId of TACTICAL_FILES) {
  const path = join(DRILL_DIR, `${fileId}.json`);
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  for (const drill of pack.drills) {
    if (!drill.__startMoves) throw new Error(`${drill.drillId}: missing __startMoves`);
    const fen = deriveFen(drill.__startMoves, drill.drillId);
    verifySolution(fen, drill.solutionMoves, drill.drillId);
    drill.fen = fen;
    delete drill.__startMoves;
  }
  pending.push([path, pack]);
  console.log(`OK ${fileId}: ${pack.drills.length} drills verified`);
}

// Main packs: verify line moves from startFen.
for (const fileId of ['scandinavian-icelandic-gambit-main', 'scandinavian-nf6-main']) {
  const path = join(DRILL_DIR, `${fileId}.json`);
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  for (const line of pack.lines) {
    const g = new Chess(pack.startFen);
    for (const san of line.moves) {
      let mv;
      try {
        mv = g.move(san);
      } catch {
        throw new Error(`${fileId}/${line.id}: illegal move "${san}" at ${g.fen()}`);
      }
      if (mv.san !== san) throw new Error(`${fileId}/${line.id}: SAN mismatch "${san}" -> "${mv.san}"`);
    }
    if (line.moves.length !== line.moveCount) {
      throw new Error(`${fileId}/${line.id}: moveCount ${line.moveCount} != moves ${line.moves.length}`);
    }
  }
  pending.push([path, pack]);
  console.log(`OK ${fileId}: main line verified`);
}

for (const [path, pack] of pending) {
  writeFileSync(path, JSON.stringify(pack, null, 2) + '\n');
}
console.log('All slice-29 lines legal. FENs injected, __startMoves stripped.');
