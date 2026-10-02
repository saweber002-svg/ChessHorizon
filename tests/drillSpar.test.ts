import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { sparUndoPlies } from '@/lib/drillSpar';

/** Position history after playing the given SANs from the standard start. */
function historyAfter(sans: string[]): string[] {
  const game = new Chess();
  const history = [game.fen()];
  for (const san of sans) {
    game.move(san);
    history.push(game.fen());
  }
  return history;
}

describe('sparUndoPlies', () => {
  it('is 0 before any sparring move', () => {
    expect(sparUndoPlies(historyAfter([]), 'w')).toBe(0);
  });

  it('is 0 when only the engine has moved (player is Black)', () => {
    expect(sparUndoPlies(historyAfter(['e4']), 'b')).toBe(0);
  });

  it('rewinds just the player move while the engine is still thinking', () => {
    expect(sparUndoPlies(historyAfter(['e4']), 'w')).toBe(1);
    expect(sparUndoPlies(historyAfter(['e4', 'e5']), 'b')).toBe(1);
  });

  it('rewinds the engine reply plus the player move', () => {
    expect(sparUndoPlies(historyAfter(['e4', 'e5']), 'w')).toBe(2);
    expect(sparUndoPlies(historyAfter(['e4', 'e5', 'Nf3']), 'b')).toBe(2);
  });

  it('rewinds only the latest exchange, not the whole game', () => {
    expect(sparUndoPlies(historyAfter(['e4', 'e5', 'Nf3', 'Nc6']), 'w')).toBe(2);
  });

  it('allows undoing a game-ending move', () => {
    // Player (Black) delivers Fool's mate: only that move rewinds.
    expect(sparUndoPlies(historyAfter(['f3', 'e5', 'g4', 'Qh4#']), 'b')).toBe(1);
    // Player (White) gets mated: the mate plus White's last move rewind.
    expect(sparUndoPlies(historyAfter(['f3', 'e5', 'g4', 'Qh4#']), 'w')).toBe(2);
    // Scholar's mate delivered by the player (White).
    expect(sparUndoPlies(historyAfter(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']), 'w')).toBe(1);
  });
});
