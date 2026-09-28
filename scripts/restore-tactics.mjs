#!/usr/bin/env node
/**
 * Restore keeper tactical drills from the Stockfish regen staging area.
 *
 * Reads ~/workspace/tactics-regen/staging/*.meta.json (produced by
 * scripts/regen-tactics.mjs) and writes restored packs to
 * public/drill-data/<packId>.json, overwriting the quarantined originals
 * with engine-verified content. Quarantined originals are never "repaired" —
 * they are replaced by lines generated from scratch by the engine.
 *
 * Keeper rule:
 *   - TACTIC with engine score >= +0.80 for the solver (a tactic must
 *     actually leave the solver better; damage-control lines are demoted
 *     to PLAN), or
 *   - PLAN without the WEAK_SOLUTION flag (the engine's best move is
 *     meaningfully best: gap >= 15cp).
 * Within a pack, drills sharing (fen, firstMove) are deduplicated to the
 * strongest instance — the old packs repeated identical positions.
 *
 * Copy: the six genuine tactics get hand-written copy (TACTIC_COPY below).
 * Everything else gets accurate template copy derived from the engine line.
 * Original pack name/description/arena are preserved.
 *
 * The script does NOT touch the registries; it prints the restored ID list
 * so the registry edits stay deliberate and reviewable (QUARANTINE.md).
 *
 * Usage:
 *   node scripts/restore-tactics.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = join(process.env.HOME, 'workspace', 'tactics-regen', 'staging');
const DRILL_DATA = join(REPO, 'public', 'drill-data');
const DRY_RUN = process.argv.includes('--dry-run');

// Hand-written copy for the genuine tactics (drillId -> { name, description, brief }).
// The full explanation is generated from the line; these override name/description/brief.
const TACTIC_COPY = {
  'greco-bt1': {
    name: 'Bxe5: Destroying the Outpost',
    description:
      'Black to play. The white knight on e5 looks dominant — remove it and ruin White\u2019s center in one stroke.',
    brief:
      'Bxe5! trades the bishop for the powerful e5-knight; after d3 exd3 White\u2019s pawn center collapses.',
  },
  'scandinavian-qd6-t3': {
    name: 'Qxb7: The Queen Raid',
    description:
      'White to play. Black\u2019s queenside is loose — the queen goes shopping and comes home with the exchange.',
    brief:
      'Qxb7! starts a raid: the queen grabs the b-pawn, then the a8-rook, and escapes before it gets trapped.',
  },
  'sicilian-scheveningen-bt1': {
    name: 'Nxg4: Punishing the Keres',
    description:
      'Black to play. White\u2019s g4 lunge overextends — trade on d4 first, then collect the loose g-pawn.',
    brief:
      'cxd4! provokes Qxd4, and then Nxg4! wins the overextended pawn with tempo.',
  },
  'sicilian-sveshnikov-bt2': {
    name: 'The b4 Break',
    description:
      'Black to play. The queenside pawn lever b4 undermines White\u2019s c3-knight and seizes the initiative.',
    brief:
      'b4! kicks the c3-knight; after Bxf6 gxf6 Black\u2019s queenside majority starts rolling.',
  },
  'ulvestad-t4': {
    name: 'Nxf6+: Blowing Open the Center',
    description:
      'White to play. Sacrifice the knight on f6 to shatter Black\u2019s center, then strike with Bb5+.',
    brief:
      'Nxf6+! wrecks Black\u2019s pawn shield; cxd4 opens the center and Bb5+ picks up the piece.',
  },
  'ulvestad-bt3': {
    name: 'cxd4 and the d3 Wedge',
    description:
      'White to play. Open the center, then clamp it shut with a d3 pawn wedge.',
    brief:
      'cxd4 exd4 d3! fixes Black\u2019s pawns and leaves White with the superior structure.',
  },
};

const PIECE_NAMES = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };

function sideName(s) {
  return s === 'w' ? 'White' : 'Black';
}

function fmtScore(cp) {
  return (cp > 0 ? '+' : '') + (cp / 100).toFixed(2);
}

function narrate(san) {
  const parts = [];
  for (let i = 0; i < san.length; i += 2) {
    parts.push(`${i / 2 + 1}. ${san[i]}${san[i + 1] ? ' ' + san[i + 1] : ''}`);
  }
  return parts.join(' ');
}

function movePoint(firstSan) {
  const piece = PIECE_NAMES[firstSan[0]] ?? 'pawn';
  const dest = firstSan.replace(/^[KQRBN]?x?/, '').replace(/[+#]$/, '');
  return `${piece} to ${dest}`;
}

function main() {
  const files = readdirSync(STAGING).filter((f) => f.endsWith('.meta.json')).sort();
  const restoredIds = [];
  let totalDrills = 0;

  for (const file of files) {
    const packId = file.replace('.meta.json', '');
    const metas = JSON.parse(readFileSync(join(STAGING, file), 'utf8'));

    // 1. Select keepers.
    const keepers = [];
    for (const d of metas) {
      if (d.verdict === 'NEEDS_POSITION') continue;
      const ev = d.evidence;
      const isTactic = d.verdict === 'TACTIC' && (ev.scoreCp ?? 0) >= 80;
      // A "tactic" that leaves the solver no better is really a defensive
      // resource — demote it to PLAN rather than mislabeling it.
      const verdict = isTactic ? 'TACTIC' : 'PLAN';
      const weak = d.flags.includes('WEAK_SOLUTION');
      if (verdict !== 'TACTIC' && weak) continue;
      keepers.push({ ...d, verdict });
    }
    if (keepers.length === 0) continue;

    // 2. Deduplicate identical (fen, firstMove) positions within the pack.
    const byKey = new Map();
    for (const d of keepers) {
      const key = d.evidence.fen + '|' + d.evidence.pvSan[0];
      const cur = byKey.get(key);
      const better =
        !cur ||
        (d.verdict === 'TACTIC' && cur.verdict !== 'TACTIC') ||
        (d.verdict === cur.verdict && (d.evidence.gapCp ?? 0) > (cur.evidence.gapCp ?? 0));
      if (better) byKey.set(key, d);
    }
    const drills = [...byKey.values()].sort((a, b) => a.drillId.localeCompare(b.drillId));

    // 3. Load the original pack for name/description/arena + drill skeletons.
    const origPack = JSON.parse(readFileSync(join(DRILL_DATA, `${packId}.json`), 'utf8'));
    const origById = new Map(origPack.drills.map((d) => [d.drillId, d]));

    const outDrills = drills.map((d) => {
      const ev = d.evidence;
      const san = d.solutionMoves;
      const side = sideName(ev.sideToMove);
      const copy = TACTIC_COPY[d.drillId];
      const isTactic = d.verdict === 'TACTIC';
      const copyReview = d.flags.includes('COPY_REVIEW');
      const orig = origById.get(d.drillId) ?? {};

      const name =
        copy?.name ??
        (!copyReview && orig.name ? orig.name : `${side} plays ${san[0]}`);
      const theme =
        copyReview || !orig.theme
          ? isTactic
            ? 'Tactic'
            : 'Key idea'
          : orig.theme;
      const materialBit =
        isTactic && ev.materialGain >= 1
          ? ` winning ${ev.materialGain >= 5 ? 'the exchange or more' : ev.materialGain === 1 ? 'a pawn' : 'material'}`
          : '';
      const description =
        copy?.description ??
        `${side} to play. The engine's choice${isTactic ? ' — a genuine tactic' + materialBit : ' in this position'}: ${san[0]} (${fmtScore(ev.scoreCp)}).`;
      const brief =
        copy?.brief ??
        `The strongest move is ${san[0]} (${movePoint(san[0])}). ${narrate(san)}.`;
      const explanation =
        `${side} to move. ` +
        (isTactic
          ? `There is a real tactic here: ${san[0]}${materialBit}. `
          : `No forced tactic exists here, but ${san[0]} is clearly the strongest continuation. `) +
        `Line: ${narrate(san)}. ` +
        `Stockfish 18 (depth 16) evaluates the result at ${fmtScore(ev.scoreCp)} for ${side}, ` +
        `${((ev.gapCp ?? 0) / 100).toFixed(2)} pawns better than the next-best alternative.`;

      return {
        drillId: d.drillId,
        name,
        theme,
        description,
        fen: ev.fen,
        solutionMoves: san,
        ...(san[1] ? { opponentResponse: san[1] } : {}),
        stars: orig.stars ?? { 3: 'First move correct', 2: 'Second attempt', 1: 'Third attempt' },
        briefExplanation: brief,
        explanation,
      };
    });

    const outPack = {
      id: packId,
      name: origPack.name,
      description: origPack.description,
      arena: origPack.arena,
      drills: outDrills,
    };

    if (!DRY_RUN) {
      writeFileSync(join(DRILL_DATA, `${packId}.json`), JSON.stringify(outPack, null, 2) + '\n');
    }
    restoredIds.push(packId);
    totalDrills += outDrills.length;
    const tactics = outDrills.filter((_, i) => drills[i].verdict === 'TACTIC').length;
    console.log(`  ${packId}: ${outDrills.length} drills (${tactics} tactics)`);
  }

  console.log(`\nRestored ${restoredIds.length} packs, ${totalDrills} drills${DRY_RUN ? ' (dry run)' : ''}.`);
  console.log('\nRemove from QUARANTINED_TACTICAL_FILE_IDS and add to TACTICAL_FILE_IDS:');
  for (const id of restoredIds) console.log(`  '${id}',`);
}

main();
