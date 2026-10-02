import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const LEAD_PLIES = 6;

const drills = [
  ['english-reversed-sicilian-tacticals', 'ers-t1', 'english-reversed-sicilian-main', 16],
  ['english-reversed-sicilian-tacticals', 'ers-t2', 'english-reversed-sicilian-main', 16],
  ['english-reversed-sicilian-tacticals', 'ers-t3', 'english-reversed-sicilian-main', 16],
  ['english-reversed-sicilian-tacticals', 'ers-t4', 'english-reversed-sicilian-main', 16],
  ['evans-gambit-tacticals', 'evans-gambit-t3', 'evans-gambit-main', 16],
  ['fried-liver-attack-black-tacticals', 'fried-liver-bt2', 'fried-liver-attack-main', 14],
  ['greco-counter-attack-tacticals', 'greco-t3', 'greco-counter-attack-main', 22],
  ['london-system-tacticals', 'london-system-t2', 'london-system-main', 16],
  ['london-vs-qgd-tacticals', 'qgd-t1', 'london-vs-qgd-main', 16],
  ['london-vs-qgd-tacticals', 'qgd-t2', 'london-vs-qgd-main', 16],
  ['london-vs-qgd-tacticals', 'qgd-t3', 'london-vs-qgd-main', 16],
  ['london-vs-qgd-tacticals', 'qgd-t4', 'london-vs-qgd-main', 16],
  ['moeller-attack-black-tacticals', 'moeller-bt2', 'moeller-attack-main', 26],
  ['moeller-attack-tacticals', 'moeller-t1', 'moeller-attack-main', 26],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t1', 'ruy-lopez-berlin-main', 16],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t2', 'ruy-lopez-berlin-main', 16],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t3', 'ruy-lopez-berlin-main', 16],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t4', 'ruy-lopez-berlin-main', 16],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t1', 'ruy-lopez-morphy-main', 16],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t2', 'ruy-lopez-morphy-main', 16],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t3', 'ruy-lopez-morphy-main', 16],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t4', 'ruy-lopez-morphy-main', 16],
  ['scandinavian-qd6-tacticals', 'scandinavian-qd6-t3', 'scandinavian-qd6-main', 16],
  ['sicilian-classical-tacticals', 'sicilian-classical-t1', 'sicilian-classical-main', 16],
  ['sicilian-classical-tacticals', 'sicilian-classical-t2', 'sicilian-classical-main', 16],
  ['sicilian-classical-tacticals', 'sicilian-classical-t3', 'sicilian-classical-main', 16],
  ['sicilian-classical-tacticals', 'sicilian-classical-t4', 'sicilian-classical-main', 16],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t1', 'sicilian-dragon-main', 16],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t2', 'sicilian-dragon-main', 16],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t3', 'sicilian-dragon-main', 16],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t4', 'sicilian-dragon-main', 16],
  ['sicilian-sveshnikov-tacticals', 'sicilian-sveshnikov-t1', 'sicilian-sveshnikov-main', 16],
  ['traxler-counter-attack-black-tacticals', 'traxler-bt2', 'traxler-counter-attack-main', 14],
];

const DD = 'public/drill-data';
let done = 0;
for (const [packId, drillId, mainFile, matchPly] of drills) {
  const packPath = `${DD}/${packId}.json`;
  // Original drill from HEAD (before lead-in prepend)
  const origPack = JSON.parse(execSync(`git show HEAD:${packPath}`, { encoding: 'utf8' }));
  const origDrill = origPack.drills.find(d => d.drillId === drillId);
  // Current drill (may have placementNote)
  const curPack = JSON.parse(readFileSync(packPath, 'utf8'));
  const curDrill = curPack.drills.find(d => d.drillId === drillId);

  const main = JSON.parse(readFileSync(`${DD}/${mainFile}.json`, 'utf8'));
  const parentMoves = main.lines[0].moves;

  // Verify original FEN matches parent at matchPly
  const g = new Chess();
  for (let i = 0; i < matchPly; i++) g.move(parentMoves[i]);
  const norm = f => f.split(' ').slice(0, 4).join(' ');
  if (norm(g.fen()) !== norm(origDrill.fen)) {
    throw new Error(`${drillId}: FEN mismatch`);
  }

  const leadStart = Math.max(0, matchPly - LEAD_PLIES);
  const leadInMoves = parentMoves.slice(leadStart, matchPly);
  // Verify lead-ins lead exactly into the drill FEN
  const g2 = new Chess();
  for (let i = 0; i < leadStart; i++) g2.move(parentMoves[i]);
  const beforeFen = g2.fen();
  for (const m of leadInMoves) g2.move(m);
  if (norm(g2.fen()) !== norm(origDrill.fen)) {
    throw new Error(`${drillId}: lead-in does not reach drill FEN`);
  }

  // Restore original fields, add leadInMoves, preserve placementNote
  curDrill.fen = origDrill.fen;
  curDrill.solutionMoves = origDrill.solutionMoves;
  curDrill.opponentResponse = origDrill.opponentResponse;
  curDrill.description = origDrill.description;
  curDrill.leadInMoves = leadInMoves;
  // placementNote already on curDrill if it was added; keep it

  writeFileSync(packPath, JSON.stringify(curPack, null, 2) + '\n');
  done++;
}
console.log(`leadInMoves set (FEN/solution restored): ${done}`);
