#!/usr/bin/env node
/**
 * Slice 33 build+verify helper (one-shot, not part of the product build).
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
  'milner-barry-gambit-tacticals',
  'milner-barry-gambit-black-tacticals',
  'winawer-countergambit-tacticals',
  'winawer-countergambit-black-tacticals',
  'portuguese-variation-tacticals',
  'portuguese-variation-black-tacticals',
  'alekhine-chatard-attack-tacticals',
  'alekhine-chatard-attack-black-tacticals',
  'maccutcheon-variation-tacticals',
  'maccutcheon-variation-black-tacticals',
  'max-lange-attack-tacticals',
  'max-lange-attack-black-tacticals',
  'geller-gambit-tacticals',
  'geller-gambit-black-tacticals',
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


for (const [path, pack] of pending) {
  writeFileSync(path, JSON.stringify(pack, null, 2) + '\n');
}
console.log('All slice-33 lines legal. FENs injected, __startMoves stripped.');
