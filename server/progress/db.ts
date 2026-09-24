import { and, eq } from "drizzle-orm";
import {
  drillAttemptEvents,
  moveProgress,
  openingProgress,
  type MoveProgress,
  type OpeningProgress,
} from "../../drizzle/schema";
import {
  applyMoveResult,
  applyOpeningCompletion,
  consumeWatch as consumeWatchRule,
  getWatchStatus,
  isPerfectCompletion,
  type DrillSide,
  type MoveResult,
  type MoveProgressSnapshot,
  type OpeningProgressSnapshot,
} from "../../shared/progressRules";
import { getDb } from "../db";

function moveKey(userId: number, openingId: string, variationId: string, moveIndex: number, side: DrillSide) {
  return and(
    eq(moveProgress.userId, userId),
    eq(moveProgress.openingId, openingId),
    eq(moveProgress.variationId, variationId),
    eq(moveProgress.moveIndex, moveIndex),
    eq(moveProgress.side, side),
  );
}

function openingKey(userId: number, openingId: string, variationId: string, side: DrillSide) {
  return and(
    eq(openingProgress.userId, userId),
    eq(openingProgress.openingId, openingId),
    eq(openingProgress.variationId, variationId),
    eq(openingProgress.side, side),
  );
}

function toMoveSnapshot(row?: MoveProgress): MoveProgressSnapshot {
  return {
    bestStars: row?.bestStars ?? 0,
    currentStreak: row?.currentStreak ?? 0,
    prestigeTier: (row?.prestigeTier ?? 0) as MoveProgressSnapshot["prestigeTier"],
    totalAttempts: row?.totalAttempts ?? 0,
  };
}

function toOpeningSnapshot(row?: OpeningProgress): OpeningProgressSnapshot {
  return {
    totalAttempts: row?.totalAttempts ?? 0,
    perfectCompletionStreak: row?.perfectCompletionStreak ?? 0,
    prestigeTier: (row?.prestigeTier ?? 0) as OpeningProgressSnapshot["prestigeTier"],
    lastWatchAttempt: row?.lastWatchAttempt ?? -999,
  };
}

export async function getMoveProgressForUser(
  userId: number,
  openingId: string,
  variationId: string,
  moveIndex: number,
  side: DrillSide,
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(moveProgress).where(moveKey(userId, openingId, variationId, moveIndex, side)).limit(1);
  return rows[0] ?? null;
}

export async function getOpeningProgressForUser(
  userId: number,
  openingId: string,
  variationId: string,
  side: DrillSide,
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(openingProgress).where(openingKey(userId, openingId, variationId, side)).limit(1);
  return rows[0] ?? null;
}

export async function recordDrillCompletion(input: {
  userId: number;
  openingId: string;
  variationId: string;
  side: DrillSide;
  moveResults: MoveResult[];
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const prior = await tx.select().from(drillAttemptEvents).where(and(
      eq(drillAttemptEvents.userId, input.userId),
      eq(drillAttemptEvents.idempotencyKey, input.idempotencyKey),
    )).limit(1);
    if (prior[0]) {
      const existingOpening = await tx.select().from(openingProgress).where(openingKey(
        input.userId, input.openingId, input.variationId, input.side,
      )).limit(1);
      return { duplicate: true, openingProgress: existingOpening[0] ?? null, moveProgress: [] };
    }

    const updatedMoves: MoveProgress[] = [];
    for (const result of input.moveResults) {
      const existing = await tx.select().from(moveProgress).where(moveKey(
        input.userId, input.openingId, input.variationId, result.moveIndex, input.side,
      )).limit(1);
      const next = applyMoveResult(toMoveSnapshot(existing[0]), result.stars);
      await tx.insert(moveProgress).values({
        userId: input.userId,
        openingId: input.openingId,
        variationId: input.variationId,
        moveIndex: result.moveIndex,
        side: input.side,
        bestStars: next.bestStars,
        currentStreak: next.currentStreak,
        prestigeTier: next.prestigeTier,
        totalAttempts: next.totalAttempts,
        lastDrilledAt: new Date(),
      }).onDuplicateKeyUpdate({ set: {
        bestStars: next.bestStars,
        currentStreak: next.currentStreak,
        prestigeTier: next.prestigeTier,
        totalAttempts: next.totalAttempts,
        lastDrilledAt: new Date(),
      } });
      const saved = await tx.select().from(moveProgress).where(moveKey(
        input.userId, input.openingId, input.variationId, result.moveIndex, input.side,
      )).limit(1);
      if (saved[0]) updatedMoves.push(saved[0]);
    }

    const existingOpening = await tx.select().from(openingProgress).where(openingKey(
      input.userId, input.openingId, input.variationId, input.side,
    )).limit(1);
    const nextOpening = applyOpeningCompletion(
      toOpeningSnapshot(existingOpening[0]),
      isPerfectCompletion(input.moveResults),
    );
    await tx.insert(openingProgress).values({
      userId: input.userId,
      openingId: input.openingId,
      variationId: input.variationId,
      side: input.side,
      totalAttempts: nextOpening.totalAttempts,
      perfectCompletionStreak: nextOpening.perfectCompletionStreak,
      prestigeTier: nextOpening.prestigeTier,
      lastWatchAttempt: nextOpening.lastWatchAttempt,
      lastDrilledAt: new Date(),
    }).onDuplicateKeyUpdate({ set: {
      totalAttempts: nextOpening.totalAttempts,
      perfectCompletionStreak: nextOpening.perfectCompletionStreak,
      prestigeTier: nextOpening.prestigeTier,
      lastDrilledAt: new Date(),
    } });

    await tx.insert(drillAttemptEvents).values({
      userId: input.userId,
      openingId: input.openingId,
      variationId: input.variationId,
      side: input.side,
      attemptType: "drill",
      result: isPerfectCompletion(input.moveResults) ? "perfect" : "partial",
      moveResults: JSON.stringify(input.moveResults),
      idempotencyKey: input.idempotencyKey,
    });

    const savedOpening = await tx.select().from(openingProgress).where(openingKey(
      input.userId, input.openingId, input.variationId, input.side,
    )).limit(1);
    return { duplicate: false, openingProgress: savedOpening[0] ?? null, moveProgress: updatedMoves };
  });
}

export async function consumeWatchForUser(input: {
  userId: number;
  openingId: string;
  variationId: string;
  side: DrillSide;
  idempotencyKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const existingEvent = await tx.select().from(drillAttemptEvents).where(and(
      eq(drillAttemptEvents.userId, input.userId),
      eq(drillAttemptEvents.idempotencyKey, input.idempotencyKey),
    )).limit(1);
    const existing = await tx.select().from(openingProgress).where(openingKey(
      input.userId, input.openingId, input.variationId, input.side,
    )).limit(1);
    const current = toOpeningSnapshot(existing[0]);
    const next = existingEvent[0] ? current : consumeWatchRule(current);

    if (!existingEvent[0]) {
      await tx.insert(openingProgress).values({
        userId: input.userId,
        openingId: input.openingId,
        variationId: input.variationId,
        side: input.side,
        totalAttempts: next.totalAttempts,
        perfectCompletionStreak: next.perfectCompletionStreak,
        prestigeTier: next.prestigeTier,
        lastWatchAttempt: next.lastWatchAttempt,
      }).onDuplicateKeyUpdate({ set: { lastWatchAttempt: next.lastWatchAttempt } });
      await tx.insert(drillAttemptEvents).values({
        userId: input.userId,
        openingId: input.openingId,
        variationId: input.variationId,
        side: input.side,
        attemptType: "watch",
        result: "watched",
        idempotencyKey: input.idempotencyKey,
      });
    }

    const saved = await tx.select().from(openingProgress).where(openingKey(
      input.userId, input.openingId, input.variationId, input.side,
    )).limit(1);
    const progress = saved[0] ?? null;
    return { duplicate: Boolean(existingEvent[0]), progress, status: progress ? getWatchStatus(toOpeningSnapshot(progress)) : null };
  });
}

export async function getWatchStatusForUser(
  userId: number,
  openingId: string,
  variationId: string,
  side: DrillSide,
) {
  const progress = await getOpeningProgressForUser(userId, openingId, variationId, side);
  return getWatchStatus(toOpeningSnapshot(progress ?? undefined));
}
