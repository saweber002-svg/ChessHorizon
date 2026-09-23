import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'drill-data');
const registryPath = path.join(root, 'src', 'data', 'drillRegistry.ts');
const quarantinePath = path.join(root, 'src', 'data', 'quarantinedTacticalRegistry.ts');
const files = fs.readdirSync(dataDir).filter((name) => name.endsWith('.json')).sort();
const registrySource = fs.readFileSync(registryPath, 'utf8');
const quarantineSource = fs.readFileSync(quarantinePath, 'utf8');
const registryBlock = registrySource.match(/ALL_DRILL_FILE_IDS\s*=\s*\[(.*?)\]\s*as const/s)?.[1] ?? '';
const registryIds = [...registryBlock.replaceAll(/\/\/.*$/gm, '').matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
const quarantineBlock = quarantineSource.match(/QUARANTINED_TACTICAL_FILE_IDS\s*=\s*\[(.*?)\]\s*as const/s)?.[1] ?? '';
const quarantinedIds = [
  ...quarantineBlock.replaceAll(/\/\/.*$/gm, '').matchAll(/['"]([^'"]+)['"]/g),
].map((match) => match[1]);

const failures = [];
const seenRegistryIds = new Set();
const seenPackIds = new Map();
const seenTacticalIds = new Map();
const fileIds = new Set(files.map((file) => file.replace(/\.json$/, '')));
const quarantinedFileIds = new Set(quarantinedIds);
const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function fail(file, message, details = {}) {
  failures.push({ file, message, ...details });
}

function parseFen(file, fen, context) {
  try {
    return new Chess(fen);
  } catch (error) {
    fail(file, `invalid FEN: ${error instanceof Error ? error.message : String(error)}`, context);
    return null;
  }
}

function applyMove(chess, move, file, context) {
  if (typeof move !== 'string' || move.trim() === '') {
    fail(file, 'move must be a non-empty string', context);
    return false;
  }

  try {
    chess.move(move);
    return true;
  } catch {
    const uci = move.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
    if (uci) {
      try {
        chess.move({ from: uci[1].toLowerCase(), to: uci[2].toLowerCase(), promotion: uci[3]?.toLowerCase() });
        return true;
      } catch {
        // Fall through to the actionable error below.
      }
    }
    fail(file, 'illegal move', { ...context, move, fen: chess.fen() });
    return false;
  }
}

function recordId(id, file, kind, seen = seenPackIds) {
  if (typeof id !== 'string' || id.trim() === '') {
    fail(file, `${kind} identifier is missing`);
    return;
  }
  const previous = seen.get(id);
  if (previous) {
    fail(file, `duplicate ${kind} identifier`, { id, firstSeenIn: previous });
  } else {
    seen.set(id, file);
  }
}

for (const [index, id] of registryIds.entries()) {
  if (seenRegistryIds.has(id)) fail('src/data/drillRegistry.ts', 'duplicate registry identifier', { id, index });
  seenRegistryIds.add(id);
}

for (const [index, id] of quarantinedIds.entries()) {
  if (quarantinedIds.indexOf(id) !== index) {
    fail('src/data/quarantinedTacticalRegistry.ts', 'duplicate quarantine identifier', { id, index });
  }
  if (!fileIds.has(id)) {
    fail('src/data/quarantinedTacticalRegistry.ts', 'quarantined file is missing', { id });
  }
  if (registryIds.includes(id)) {
    fail('src/data/drillRegistry.ts', 'quarantined file is active', { id });
  }
}

for (const file of files) {
  const fileId = file.replace(/\.json$/, '');
  if (quarantinedFileIds.has(fileId)) {
    try {
      JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    } catch (error) {
      fail(file, `quarantined file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    continue;
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch (error) {
    fail(file, `invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  if (!raw || typeof raw !== 'object') {
    fail(file, 'pack must be a JSON object');
    continue;
  }
  if (raw.id !== fileId) fail(file, 'pack id does not match filename', { expected: fileId, actual: raw.id });
  recordId(raw.id, file, 'pack');

  if (Array.isArray(raw.lines)) {
    if (raw.lines.length === 0) fail(file, 'main-line pack has no lines');
    const packFen = typeof raw.startFen === 'string' ? raw.startFen : defaultFen;
    for (const [lineIndex, line] of raw.lines.entries()) {
      const context = { line: lineIndex + 1, lineId: line?.id };
      if (!line || typeof line !== 'object') {
        fail(file, 'line must be an object', context);
        continue;
      }
      recordId(`${file}:${line.id}`, file, 'line');
      if (!Array.isArray(line.moves) || line.moves.length === 0) {
        fail(file, 'line has no moves', context);
        continue;
      }
      const fen = typeof line.startFen === 'string' ? line.startFen : packFen;
      const chess = parseFen(file, fen, context);
      if (!chess) continue;
      for (const [ply, move] of line.moves.entries()) {
        if (!applyMove(chess, move, file, { ...context, ply: ply + 1 })) break;
      }
    }
  } else if (Array.isArray(raw.drills)) {
    if (raw.drills.length === 0) fail(file, 'tactical pack has no drills');
    for (const [drillIndex, drill] of raw.drills.entries()) {
      const context = { drill: drillIndex + 1, drillId: drill?.drillId };
      if (!drill || typeof drill !== 'object') {
        fail(file, 'tactical drill must be an object', context);
        continue;
      }
      recordId(drill.drillId, file, 'tactical drill', seenTacticalIds);
      if (typeof drill.fen !== 'string') {
        fail(file, 'tactical drill is missing FEN', context);
        continue;
      }
      const chess = parseFen(file, drill.fen, context);
      if (!chess) continue;
      if (!Array.isArray(drill.solutionMoves) || drill.solutionMoves.length === 0) {
        fail(file, 'tactical drill has no solution moves', context);
        continue;
      }
      for (const [ply, move] of drill.solutionMoves.entries()) {
        if (!applyMove(chess, move, file, { ...context, ply: ply + 1 })) break;
      }
    }
  } else {
    fail(file, 'unsupported pack shape; expected lines[] or drills[]');
  }
}

for (const id of registryIds) {
  if (!fileIds.has(id)) fail('src/data/drillRegistry.ts', 'registry entry has no matching JSON file', { id });
}
for (const id of fileIds) {
  if (quarantinedFileIds.has(id)) continue;
  if (!seenRegistryIds.has(id)) fail(`${id}.json`, 'JSON file is not registered', { id });
}

if (failures.length > 0) {
  console.error(`DRILL_VALIDATION_FAILED: ${failures.length} issue(s)`);
  for (const issue of failures) console.error(JSON.stringify(issue));
  process.exitCode = 1;
} else {
  console.log(
    `DRILL_VALIDATION_PASSED: ${registryIds.length} active files, ${quarantinedIds.length} quarantined files, ${seenPackIds.size + seenTacticalIds.size} unique active pack/puzzle IDs`,
  );
}
