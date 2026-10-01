/**
 * Shared computer difficulty levels (Stockfish Skill Level 0-20).
 * Used by the Coaching Pavilion and the Wilderness sparring board.
 */
export const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', skill: 0, hint: 'Learning the moves' },
  { id: 'casual', label: 'Casual', skill: 5, hint: 'Relaxed games' },
  { id: 'club', label: 'Club', skill: 10, hint: 'Solid club player' },
  { id: 'expert', label: 'Expert', skill: 15, hint: 'Strong tournament player' },
  { id: 'master', label: 'Master', skill: 20, hint: 'Full strength' },
] as const;

export type DifficultyId = (typeof DIFFICULTY_LEVELS)[number]['id'];

export function skillForDifficulty(id: DifficultyId): number {
  return DIFFICULTY_LEVELS.find((d) => d.id === id)?.skill ?? 5;
}
