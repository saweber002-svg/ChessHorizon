import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'fs';

const LEAD_PLIES = 6;

const drills = [
  ['english-reversed-sicilian-tacticals', 'ers-t1', 'english-reversed-sicilian-main', 16, 'English Reversed Sicilian'],
  ['english-reversed-sicilian-tacticals', 'ers-t2', 'english-reversed-sicilian-main', 16, 'English Reversed Sicilian'],
  ['english-reversed-sicilian-tacticals', 'ers-t3', 'english-reversed-sicilian-main', 16, 'English Reversed Sicilian'],
  ['english-reversed-sicilian-tacticals', 'ers-t4', 'english-reversed-sicilian-main', 16, 'English Reversed Sicilian'],
  ['evans-gambit-tacticals', 'evans-gambit-t3', 'evans-gambit-main', 16, 'Evans Gambit'],
  ['fried-liver-attack-black-tacticals', 'fried-liver-bt2', 'fried-liver-attack-main', 14, 'Fried Liver Attack'],
  ['greco-counter-attack-tacticals', 'greco-t3', 'greco-counter-attack-main', 22, 'Greco Counter Attack'],
  ['london-system-tacticals', 'london-system-t2', 'london-system-main', 16, 'London System'],
  ['london-vs-qgd-tacticals', 'qgd-t1', 'london-vs-qgd-main', 16, 'London vs QGD'],
  ['london-vs-qgd-tacticals', 'qgd-t2', 'london-vs-qgd-main', 16, 'London vs QGD'],
  ['london-vs-qgd-tacticals', 'qgd-t3', 'london-vs-qgd-main', 16, 'London vs QGD'],
  ['london-vs-qgd-tacticals', 'qgd-t4', 'london-vs-qgd-main', 16, 'London vs QGD'],
  ['moeller-attack-black-tacticals', 'moeller-bt2', 'moeller-attack-main', 26, 'Moeller Attack'],
  ['moeller-attack-tacticals', 'moeller-t1', 'moeller-attack-main', 26, 'Moeller Attack'],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t1', 'ruy-lopez-berlin-main', 16, 'Ruy Lopez Berlin'],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t2', 'ruy-lopez-berlin-main', 16, 'Ruy Lopez Berlin'],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t3', 'ruy-lopez-berlin-main', 16, 'Ruy Lopez Berlin'],
  ['ruy-lopez-berlin-tacticals', 'ruy-lopez-berlin-t4', 'ruy-lopez-berlin-main', 16, 'Ruy Lopez Berlin'],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t1', 'ruy-lopez-morphy-main', 16, 'Ruy Lopez Morphy'],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t2', 'ruy-lopez-morphy-main', 16, 'Ruy Lopez Morphy'],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t3', 'ruy-lopez-morphy-main', 16, 'Ruy Lopez Morphy'],
  ['ruy-lopez-morphy-tacticals', 'ruy-lopez-morphy-t4', 'ruy-lopez-morphy-main', 16, 'Ruy Lopez Morphy'],
  ['scandinavian-qd6-tacticals', 'scandinavian-qd6-t3', 'scandinavian-qd6-main', 16, 'Scandinavian Qd6'],
  ['sicilian-classical-tacticals', 'sicilian-classical-t1', 'sicilian-classical-main', 16, 'Sicilian Classical'],
  ['sicilian-classical-tacticals', 'sicilian-classical-t2', 'sicilian-classical-main', 16, 'Sicilian Classical'],
  ['sicilian-classical-tacticals', 'sicilian-classical-t3', 'sicilian-classical-main', 16, 'Sicilian Classical'],
  ['sicilian-classical-tacticals', 'sicilian-classical-t4', 'sicilian-classical-main', 16, 'Sicilian Classical'],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t1', 'sicilian-dragon-main', 16, 'Sicilian Dragon'],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t2', 'sicilian-dragon-main', 16, 'Sicilian Dragon'],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t3', 'sicilian-dragon-main', 16, 'Sicilian Dragon'],
  ['sicilian-dragon-tacticals', 'sicilian-dragon-t4', 'sicilian-dragon-main', 16, 'Sicilian Dragon'],
  ['sicilian-sveshnikov-tacticals', 'sicilian-sveshnikov-t1', 'sicilian-sveshnikov-main', 16, 'Sicilian Sveshnikov'],
  ['traxler-counter-attack-black-tacticals', 'traxler-bt2', 'traxler-counter-attack-main', 14, 'Traxler Counter Attack'],
];

const DD = 'public/drill-data';
let done = 0;
for (const [packId, drillId, mainFile, matchPly, parentName] of drills) {
  const packPath = `${DD}/${packId}.json`;
  const pack = JSON.parse(readFileSync(packPath, 'utf8'));
  const drill = pack.drills.find(d => d.drillId === drillId);
  if (!drill) throw new Error(`drill ${drillId} not found in ${packId}`);

  const main = JSON.parse(readFileSync(`${DD}/${mainFile}.json`, 'utf8'));
  const parentMoves = main.lines[0].moves;
  if (parentMoves.length < matchPly) throw new Error(`${mainFile} too short for ply ${matchPly}`);

  // Verify drill FEN matches parent position at matchPly
  const g = new Chess();
  for (let i = 0; i < matchPly; i++) g.move(parentMoves[i]);
  const norm = f => f.split(' ').slice(0, 4).join(' ');
  if (norm(g.fen()) !== norm(drill.fen)) {
    throw new Error(`${drillId}: FEN mismatch at ply ${matchPly}\n  parent: ${g.fen()}\n  drill:  ${drill.fen}`);
  }

  const leadStart = Math.max(0, matchPly - LEAD_PLIES);
  const leadMoves = parentMoves.slice(leadStart, matchPly);

  const g2 = new Chess();
  for (let i = 0; i < leadStart; i++) g2.move(parentMoves[i]);
  const newFen = g2.fen();

  const newSolution = [...leadMoves, ...drill.solutionMoves];
  // Verify full solution legal from new FEN
  const g3 = new Chess(newFen);
  for (const s of newSolution) g3.move(s); // throws if illegal

  drill.fen = newFen;
  drill.solutionMoves = newSolution;
  if (newSolution.length > 1) drill.opponentResponse = newSolution[1];
  const note = ` Lead-in: plays through the ${parentName} main line into this position.`;
  if (!drill.description.includes('Lead-in:')) drill.description = (drill.description || '') + note;

  writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
  done++;
}
console.log(`lead-ins applied: ${done}`);
