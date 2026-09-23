import { eq, desc, sql, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  wildernessOpenings,
  puzzles,
  puzzleAttempts,
  pvpGames,
  matchmakingQueue,
  drillAttemptCounts,
} from "../drizzle/schema";
import type {
  InsertUser,
  InsertWildernessOpening,
  InsertPuzzle,
  InsertPvpGame,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserChessCom(userId: number, chessComUsername: string, chessComRating: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ chessComUsername, chessComRating }).where(eq(users.id, userId));
}

// ── Wilderness ─────────────────────────────────────────────────────────────────

export async function createWildernessOpening(data: InsertWildernessOpening) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(wildernessOpenings).values(data);
  return result;
}

export async function getWildernessOpenings(status?: "pending" | "validated" | "rejected" | "promoted") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return await db.select().from(wildernessOpenings)
      .where(eq(wildernessOpenings.status, status))
      .orderBy(desc(wildernessOpenings.createdAt));
  }
  return await db.select().from(wildernessOpenings).orderBy(desc(wildernessOpenings.createdAt));
}

export async function getWildernessOpeningById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wildernessOpenings).where(eq(wildernessOpenings.id, id)).limit(1);
  return result[0];
}

export async function upvoteWildernessOpening(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(wildernessOpenings).set({ upvotes: sql`upvotes + 1` }).where(eq(wildernessOpenings.id, id));
}

// ── Puzzles ────────────────────────────────────────────────────────────────────

export async function createPuzzle(data: InsertPuzzle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(puzzles).values(data);
  return result;
}

export async function getApprovedPuzzles(difficulty?: string) {
  const db = await getDb();
  if (!db) return [];
  if (difficulty) {
    return await db.select().from(puzzles)
      .where(sql`status = 'approved' AND difficulty = ${difficulty}`)
      .orderBy(desc(puzzles.createdAt));
  }
  return await db.select().from(puzzles).where(eq(puzzles.status, "approved")).orderBy(desc(puzzles.createdAt));
}

export async function getPuzzleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(puzzles).where(eq(puzzles.id, id)).limit(1);
  return result[0];
}

export async function recordPuzzleAttempt(userId: number, puzzleId: number, solved: boolean, movesPlayed: string[], timeTakenMs: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(puzzleAttempts).values({ userId, puzzleId, solved, movesPlayed: JSON.stringify(movesPlayed), timeTakenMs });
  if (solved) {
    await db.update(puzzles).set({ timesPlayed: sql`timesPlayed + 1`, timesSolved: sql`timesSolved + 1` }).where(eq(puzzles.id, puzzleId));
  } else {
    await db.update(puzzles).set({ timesPlayed: sql`timesPlayed + 1` }).where(eq(puzzles.id, puzzleId));
  }
}

// ── PVP ────────────────────────────────────────────────────────────────────────

export async function joinMatchmakingQueue(userId: number, userName: string, ranked: boolean, timeControlSeconds: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matchmakingQueue)
    .values({ userId, userName, ranked, timeControlSeconds })
    .onDuplicateKeyUpdate({ set: { ranked, timeControlSeconds, joinedAt: new Date() } });
}

export async function leaveMatchmakingQueue(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(matchmakingQueue).where(eq(matchmakingQueue.userId, userId));
}

export async function findMatchInQueue(userId: number, ranked: boolean, timeControlSeconds: number) {
  const db = await getDb();
  if (!db) return undefined;
  const opponents = await db.select().from(matchmakingQueue)
    .where(sql`userId != ${userId} AND ranked = ${ranked} AND timeControlSeconds = ${timeControlSeconds}`)
    .orderBy(matchmakingQueue.joinedAt)
    .limit(1);
  return opponents[0];
}

export async function createPvpGame(data: InsertPvpGame) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(pvpGames).values(data);
  return result;
}

export async function getPvpGameById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pvpGames).where(eq(pvpGames.id, id)).limit(1);
  return result[0];
}

export async function updatePvpGame(id: number, data: Partial<typeof pvpGames.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pvpGames).set(data).where(eq(pvpGames.id, id));
}

export async function getUserPvpGames(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pvpGames)
    .where(sql`whiteUserId = ${userId} OR blackUserId = ${userId}`)
    .orderBy(desc(pvpGames.createdAt))
    .limit(20);
}

// ── Drill Attempt Counts ───────────────────────────────────────────────────────

/** Increment attempt count for a move and return the new total. */
export async function incrementDrillAttempt(
  userId: number,
  openingId: string,
  variationId: string,
  moveIndex: number,
  side: "white" | "black"
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Upsert: insert or increment
  await db.insert(drillAttemptCounts)
    .values({ userId, openingId, variationId, moveIndex, side, totalAttempts: 1, lastWatchAttempt: -999 })
    .onDuplicateKeyUpdate({ set: { totalAttempts: sql`totalAttempts + 1` } });
  const rows = await db.select().from(drillAttemptCounts)
    .where(and(
      eq(drillAttemptCounts.userId, userId),
      eq(drillAttemptCounts.openingId, openingId),
      eq(drillAttemptCounts.variationId, variationId),
      eq(drillAttemptCounts.moveIndex, moveIndex),
      eq(drillAttemptCounts.side, side)
    ))
    .limit(1);
  return rows[0]?.totalAttempts ?? 1;
}

/** Record that the user just used a watch for this move (store current totalAttempts). */
export async function recordWatchUsed(
  userId: number,
  openingId: string,
  variationId: string,
  moveIndex: number,
  side: "white" | "black",
  currentTotal: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(drillAttemptCounts)
    .values({ userId, openingId, variationId, moveIndex, side, totalAttempts: currentTotal, lastWatchAttempt: currentTotal })
    .onDuplicateKeyUpdate({ set: { lastWatchAttempt: currentTotal } });
}

/** Get the current attempt count and last watch attempt for a move. */
export async function getDrillAttemptCount(
  userId: number,
  openingId: string,
  variationId: string,
  moveIndex: number,
  side: "white" | "black"
): Promise<{ totalAttempts: number; lastWatchAttempt: number }> {
  const db = await getDb();
  if (!db) return { totalAttempts: 0, lastWatchAttempt: -999 };
  const rows = await db.select().from(drillAttemptCounts)
    .where(and(
      eq(drillAttemptCounts.userId, userId),
      eq(drillAttemptCounts.openingId, openingId),
      eq(drillAttemptCounts.variationId, variationId),
      eq(drillAttemptCounts.moveIndex, moveIndex),
      eq(drillAttemptCounts.side, side)
    ))
    .limit(1);
  if (!rows[0]) return { totalAttempts: 0, lastWatchAttempt: -999 };
  return { totalAttempts: rows[0].totalAttempts, lastWatchAttempt: rows[0].lastWatchAttempt };
}

/** Get all attempt counts for a user for a given opening (for Watch Mode gating). */
export async function getDrillAttemptCountsForOpening(
  userId: number,
  openingId: string
): Promise<Array<{ variationId: string; moveIndex: number; side: string; totalAttempts: number; lastWatchAttempt: number }>> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(drillAttemptCounts)
    .where(and(
      eq(drillAttemptCounts.userId, userId),
      eq(drillAttemptCounts.openingId, openingId)
    ));
}
