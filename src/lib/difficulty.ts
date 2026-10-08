/**
 * Shared computer difficulty levels (Stockfish Skill Level 0-20).
 * Used by the Coaching Pavilion and the sparring board.
 *
 * `blunder` is the probability that the engine deliberately plays a
 * sub-optimal move (picked from outside its top candidate) instead of its
 * best move. Low skill levels alone still play like a strong player who
 * occasionally "tries" less — the blunder rate is what makes the lower
 * levels feel human: they hang pieces and miss tactics sometimes.
 *
 * Target Elos (2026-10-07): beginner ~400, casual ~800, club ~1200,
 * expert ~1600, master ~2200.
 */
export const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', skill: 0, blunder: 0.65, hint: 'Learning the moves' },
  { id: 'casual', label: 'Casual', skill: 1, blunder: 0.35, hint: 'Relaxed games' },
  { id: 'club', label: 'Club', skill: 5, blunder: 0.15, hint: 'Solid club player' },
  { id: 'expert', label: 'Expert', skill: 10, blunder: 0.05, hint: 'Strong tournament player' },
  { id: 'master', label: 'Master', skill: 19, blunder: 0, hint: 'Full strength' },
] as const;

export type DifficultyId = (typeof DIFFICULTY_LEVELS)[number]['id'];

export function skillForDifficulty(id: DifficultyId): number {
  return DIFFICULTY_LEVELS.find((d) => d.id === id)?.skill ?? 2;
}

export function blunderForDifficulty(id: DifficultyId): number {
  return DIFFICULTY_LEVELS.find((d) => d.id === id)?.blunder ?? 0.25;
}
