import type { MoveClassification } from '@/lib/coachingAnalysis';

/**
 * Shared chess.com-style presentation for move classifications.
 * Used by the Coaching Pavilion review and the Wilderness sparring board.
 */
export const classificationColors: Record<MoveClassification, string> = {
  Brilliant: '#00f5d4',
  Great: '#10b981',
  Best: '#22c55e',
  Excellent: '#3b82f6',
  Good: '#8b5cf6',
  Book: '#a78bfa',
  Inaccuracy: '#f59e0b',
  Mistake: '#f97316',
  Miss: '#ef4444',
  Blunder: '#dc2626',
};

export const classificationIcons: Record<MoveClassification, string> = {
  Brilliant: '✦',
  Great: '★',
  Best: '✓',
  Excellent: '!',
  Good: '+',
  Book: '📖',
  Inaccuracy: '?!',
  Mistake: '?',
  Miss: '✕',
  Blunder: '??',
};
