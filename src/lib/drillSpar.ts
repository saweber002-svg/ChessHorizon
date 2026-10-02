import { Chess } from 'chess.js';

/**
 * How many plies an undo should rewind in the post-drill sparring game so
 * play resumes with the player to move: the engine's reply (if it landed)
 * plus the player's own last move. `history[0]` is the drill's final
 * position and `history[i]` the position after i sparring plies, so undo
 * can never rewind into the drill itself. Returns 0 when the player has
 * not moved yet (e.g. only the engine's opening reply is on the board).
 */
export function sparUndoPlies(history: string[], playerColor: 'w' | 'b'): number {
  for (let i = history.length - 1; i >= 1; i--) {
    let mover: string;
    try {
      mover = new Chess(history[i - 1]).turn();
    } catch {
      return 0;
    }
    if (mover === playerColor) return history.length - i;
  }
  return 0;
}
