import { Chess } from 'chess.js';
import { isQuarantinedTacticalFileId } from '@/data/quarantinedTacticalRegistry';

export interface DrillLine {
  id: string;
  name: string;
  description: string;
  moves: string[];
  moveCount: number;
  difficulty: string;
  /** Optional per-line starting FEN for tactical drills */
  startFen?: string;
}

export interface DrillPack {
  id: string;
  name: string;
  description: string;
  startFen: string;
  lines: DrillLine[];
}

interface TacticalDrill {
  drillId?: string;
  name?: string;
  description?: string;
  briefExplanation?: string;
  difficulty?: string;
  fen?: string;
  solutionMoves?: unknown;
}

const DEFAULT_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const cache = new Map<string, DrillPack>();

export async function loadDrillPack(drillFileId: string): Promise<DrillPack> {
  if (isQuarantinedTacticalFileId(drillFileId)) {
    throw new Error(`Tactical drill pack is quarantined pending validation: ${drillFileId}`);
  }

  const cached = cache.get(drillFileId);
  if (cached) return cached;

  const res = await fetch(`${import.meta.env.BASE_URL}drill-data/${drillFileId}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load drill: ${drillFileId}`);
  }

  const raw = await res.json();

  // Normalize line packs too; older files do not always include optional metadata.
  if (raw && Array.isArray(raw.lines)) {
    const data: DrillPack = {
      id: raw.id ?? drillFileId,
      name: raw.name ?? drillFileId,
      description: raw.description ?? '',
      startFen: raw.startFen ?? DEFAULT_START_FEN,
      lines: raw.lines.map((line: Partial<DrillLine>, idx: number) => {
        const moves = Array.isArray(line.moves) ? line.moves : [];
        return {
          id: line.id ?? `${drillFileId}-l${idx}`,
          name: line.name ?? `Line ${idx + 1}`,
          description: line.description ?? '',
          moves,
          moveCount: moves.length,
          difficulty: line.difficulty ?? 'Standard',
          startFen: line.startFen,
        };
      }),
    };
    cache.set(drillFileId, data);
    return data;
  }

  // Support tactical-style files that export `drills[]` (per-position puzzles).
  // Normalize them into the DrillPack/DrillLine shape expected by the players.
  if (raw && Array.isArray(raw.drills)) {
    const lines: DrillLine[] = raw.drills.map((d: TacticalDrill, idx: number) => {
      const moves: string[] = Array.isArray(d.solutionMoves)
        ? d.solutionMoves.filter((move): move is string => typeof move === 'string')
        : [];
      return {
        id: d.drillId ?? `${drillFileId}-t${idx}`,
        name: d.name ?? `Tactic ${idx + 1}`,
        description: d.description ?? d.briefExplanation ?? '',
        moves,
        moveCount: moves.length,
        difficulty: d.difficulty ?? 'Tactical',
        startFen: d.fen ?? undefined,
      };
    });

    const pack: DrillPack = {
      id: raw.id ?? drillFileId,
      name: raw.name ?? drillFileId,
      description: raw.description ?? '',
      // Use the first drill's FEN as the pack-level startFen (players will prefer line.startFen when present)
      startFen: lines[0]?.startFen ?? DEFAULT_START_FEN,
      lines,
    };

    cache.set(drillFileId, pack);
    return pack;
  }

  throw new Error(`Unsupported drill file format: ${drillFileId}`);
}

/** Map openings.json variation id → drill JSON file id (main line). */
export function variationToDrillFileId(variationId: string, variant: 'main' | 'tacticals' = 'main'): string {
  return `${variationId}-${variant}`;
}

export function buildFenFromMoves(startFen: string, moves: string[], upToIndex: number): string {
  const chess = new Chess(startFen);
  for (let i = 0; i < upToIndex && i < moves.length; i++) {
    try {
      chess.move(moves[i]);
    } catch {
      break;
    }
  }
  return chess.fen();
}

export function getPlayerColorFromFen(fen: string): 'w' | 'b' {
  return new Chess(fen).turn();
}

export function isPlayerTurn(fen: string, playerColor: 'w' | 'b'): boolean {
  return getPlayerColorFromFen(fen) === playerColor;
}
