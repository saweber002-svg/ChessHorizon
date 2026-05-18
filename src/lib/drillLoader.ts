import { Chess } from 'chess.js';

export interface DrillLine {
  id: string;
  name: string;
  description: string;
  moves: string[];
  moveCount: number;
  difficulty: string;
}

export interface DrillPack {
  id: string;
  name: string;
  description: string;
  startFen: string;
  lines: DrillLine[];
}

const cache = new Map<string, DrillPack>();

export async function loadDrillPack(drillFileId: string): Promise<DrillPack> {
  const cached = cache.get(drillFileId);
  if (cached) return cached;

  const res = await fetch(`/drill-data/${drillFileId}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load drill: ${drillFileId}`);
  }
  const data = (await res.json()) as DrillPack;
  cache.set(drillFileId, data);
  return data;
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
