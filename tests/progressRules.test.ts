import { describe, expect, it } from "vitest";
import {
  applyMoveResult,
  applyOpeningCompletion,
  consumeWatch,
  getWatchStatus,
  isPerfectCompletion,
  type MoveProgressSnapshot,
  type OpeningProgressSnapshot,
} from "../shared/progressRules";

const emptyMove: MoveProgressSnapshot = {
  bestStars: 0,
  currentStreak: 0,
  prestigeTier: 0,
  totalAttempts: 0,
};

const emptyOpening: OpeningProgressSnapshot = {
  totalAttempts: 0,
  perfectCompletionStreak: 0,
  prestigeTier: 0,
  lastWatchAttempt: -999,
};

describe("exact prestige rules", () => {
  it("promotes a move at 1, 3, 5, and 10 consecutive perfect results", () => {
    let progress = emptyMove;
    progress = applyMoveResult(progress, 3);
    expect(progress.prestigeTier).toBe(1);
    progress = applyMoveResult(progress, 3);
    progress = applyMoveResult(progress, 3);
    expect(progress.prestigeTier).toBe(2);
    progress = applyMoveResult(progress, 3);
    progress = applyMoveResult(progress, 3);
    expect(progress.prestigeTier).toBe(3);
    for (let i = 5; i < 10; i++) progress = applyMoveResult(progress, 3);
    expect(progress.prestigeTier).toBe(4);
  });

  it("resets only the affected move streak after a non-perfect result", () => {
    let moveA = applyMoveResult(emptyMove, 3);
    const moveB = applyMoveResult(emptyMove, 3);
    moveA = applyMoveResult(moveA, 2);
    expect(moveA.currentStreak).toBe(0);
    expect(moveB.currentStreak).toBe(1);
  });

  it("requires a complete perfect variation for opening prestige", () => {
    expect(isPerfectCompletion([{ moveIndex: 0, stars: 3 }, { moveIndex: 1, stars: 3 }], 2)).toBe(true);
    expect(isPerfectCompletion([{ moveIndex: 0, stars: 3 }, { moveIndex: 1, stars: 2 }], 2)).toBe(false);
    let progress = emptyOpening;
    progress = applyOpeningCompletion(progress, true);
    expect(progress.prestigeTier).toBe(1);
    progress = applyOpeningCompletion(progress, false);
    expect(progress.perfectCompletionStreak).toBe(0);
    expect(progress.prestigeTier).toBe(0);
  });
});

describe("exact Watch Mode rules", () => {
  it("uses attempts since the last watch and does not alter prestige", () => {
    const novice = { ...emptyOpening, prestigeTier: 1 as const, totalAttempts: 4, lastWatchAttempt: 1 };
    expect(getWatchStatus(novice).available).toBe(true);
    const consumed = consumeWatch(novice);
    expect(consumed.lastWatchAttempt).toBe(4);
    expect(consumed.prestigeTier).toBe(1);
    expect(consumed.totalAttempts).toBe(4);
  });

  it("enforces apprentice, journeyman, and master behavior", () => {
    expect(getWatchStatus({ ...emptyOpening, prestigeTier: 2, totalAttempts: 4, lastWatchAttempt: 0 }).available).toBe(false);
    expect(getWatchStatus({ ...emptyOpening, prestigeTier: 2, totalAttempts: 5, lastWatchAttempt: 0 }).available).toBe(true);
    expect(getWatchStatus({ ...emptyOpening, prestigeTier: 3, totalAttempts: 10, lastWatchAttempt: 0 }).autoOnly).toBe(true);
    expect(getWatchStatus({ ...emptyOpening, prestigeTier: 4, totalAttempts: 0, lastWatchAttempt: 0 }).unlimited).toBe(true);
  });
});
