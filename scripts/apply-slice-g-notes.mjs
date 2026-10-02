import { readFileSync, writeFileSync } from 'fs';

// [packId, drillId, parentDisplay]
const drills = [
  ['caro-kann-advance-tacticals', 'caro-kann-advance-t1', 'Caro-Kann Advance'],
  ['dutch-leningrad-tacticals', 'dutch-leningrad-t2', 'Dutch Leningrad'],
  ['english-main-black-tacticals', 'em-bt4', 'English Opening'],
  ['fried-liver-attack-black-tacticals', 'fried-liver-bt3', 'Fried Liver Attack'],
  ['fried-liver-attack-black-tacticals', 'fried-liver-bt4', 'Fried Liver Attack'],
  ['fried-liver-attack-tacticals', 'fried-liver-t3', 'Fried Liver Attack'],
  ['fried-liver-attack-tacticals', 'fried-liver-t4', 'Fried Liver Attack'],
  ['german-berlin-tacticals', 'german-berlin-t1', 'Berlin Defense'],
  ['greco-counter-attack-black-tacticals', 'greco-bt1', 'Greco Counter-Attack'],
  ['queen-gambit-accepted-tacticals', 'qga-t1', "Queen's Gambit Accepted"],
  ['queen-gambit-accepted-tacticals', 'qga-t4', "Queen's Gambit Accepted"],
  ['ruy-lopez-berlin-black-tacticals', 'ruy-lopez-berlin-bt2', 'Ruy Lopez Berlin'],
  ['ruy-lopez-open-black-tacticals', 'ruy-lopez-open-bt2', 'Ruy Lopez Open'],
  ['scandinavian-defense-tacticals', 'scandinavian-defense-t1', 'Scandinavian Defense'],
  ['scandinavian-nf6-black-tacticals', 'scandinavian-nf6-bt1', 'Scandinavian Nf6'],
  ['scandinavian-nf6-black-tacticals', 'scandinavian-nf6-bt3', 'Scandinavian Nf6'],
  ['scandinavian-nf6-tacticals', 'scandinavian-nf6-t1', 'Scandinavian Nf6'],
  ['scandinavian-qd6-black-tacticals', 'scandinavian-qd6-bt4', 'Scandinavian Qd6'],
  ['sicilian-classical-black-tacticals', 'sicilian-classical-bt1', 'Sicilian Classical'],
  ['sicilian-classical-black-tacticals', 'sicilian-classical-bt2', 'Sicilian Classical'],
  ['sicilian-classical-black-tacticals', 'sicilian-classical-bt3', 'Sicilian Classical'],
  ['sicilian-classical-black-tacticals', 'sicilian-classical-bt4', 'Sicilian Classical'],
  ['sicilian-dragon-black-tacticals', 'sicilian-dragon-bt1', 'Sicilian Dragon'],
  ['sicilian-najdorf-black-tacticals', 'sicilian-najdorf-bt2', 'Sicilian Najdorf'],
  ['sicilian-scheveningen-black-tacticals', 'sicilian-scheveningen-bt1', 'Sicilian Scheveningen'],
  ['sicilian-scheveningen-tacticals', 'sicilian-scheveningen-t1', 'Sicilian Scheveningen'],
  ['sicilian-scheveningen-tacticals', 'sicilian-scheveningen-t3', 'Sicilian Scheveningen'],
  ['sicilian-sveshnikov-black-tacticals', 'sicilian-sveshnikov-bt2', 'Sicilian Sveshnikov'],
  ['slav-defense-tacticals', 'slav-t2', 'Slav Defense'],
  ['slav-defense-tacticals', 'slav-t3', 'Slav Defense'],
  ['traxler-counter-attack-black-tacticals', 'traxler-bt3', 'Traxler Counter Attack'],
  ['traxler-counter-attack-black-tacticals', 'traxler-bt4', 'Traxler Counter Attack'],
  ['traxler-counter-attack-tacticals', 'traxler-t4', 'Traxler Counter Attack'],
  ['two-knights-black-tacticals', 'two-knights-bt3', 'Two Knights Defense'],
  ['two-knights-tacticals', 'two-knights-t2', 'Two Knights Defense'],
  ['two-knights-tacticals', 'two-knights-t3', 'Two Knights Defense'],
  ['ulvestad-variation-black-tacticals', 'ulvestad-bt3', 'Ulvestad Variation'],
  ['ulvestad-variation-tacticals', 'ulvestad-t3', 'Ulvestad Variation'],
  ['ulvestad-variation-tacticals', 'ulvestad-t4', 'Ulvestad Variation'],
];

const DD = 'public/drill-data';
let done = 0;
for (const [packId, drillId, parent] of drills) {
  const packPath = `${DD}/${packId}.json`;
  const pack = JSON.parse(readFileSync(packPath, 'utf8'));
  const drill = pack.drills.find(d => d.drillId === drillId);
  if (!drill) throw new Error(`drill ${drillId} not found in ${packId}`);
  drill.placementNote = `Standalone position — does not arise from the ${parent} main line.`;
  writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
  done++;
}
console.log(`placement notes applied: ${done}`);
