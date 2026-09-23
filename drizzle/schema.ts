import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  chessComUsername: varchar("chessComUsername", { length: 64 }),
  chessComRating: int("chessComRating"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Wilderness kingdom: user-submitted openings
 */
export const wildernessOpenings = mysqlTable("wilderness_openings", {
  id: int("id").autoincrement().primaryKey(),
  submittedByUserId: int("submittedByUserId"),
  submittedByName: varchar("submittedByName", { length: 128 }),
  name: varchar("name", { length: 256 }).notNull(),
  moves: text("moves").notNull(), // JSON array of SAN moves
  pgn: text("pgn"),
  ecoCode: varchar("ecoCode", { length: 8 }),
  ecoName: varchar("ecoName", { length: 256 }),
  recognizedKingdom: varchar("recognizedKingdom", { length: 64 }), // null = stays in Wilderness
  recognizedVariationId: varchar("recognizedVariationId", { length: 128 }),
  finalFen: text("finalFen"),
  optimizedMoves: text("optimizedMoves"), // JSON array of optimized SAN moves
  status: mysqlEnum("status", ["pending", "validated", "rejected", "promoted"]).default("pending").notNull(),
  validationNotes: text("validationNotes"),
  upvotes: int("upvotes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WildernessOpening = typeof wildernessOpenings.$inferSelect;
export type InsertWildernessOpening = typeof wildernessOpenings.$inferInsert;

/**
 * Puzzle kingdom: user-created and curated puzzles
 */
export const puzzles = mysqlTable("puzzles", {
  id: int("id").autoincrement().primaryKey(),
  createdByUserId: int("createdByUserId"),
  createdByName: varchar("createdByName", { length: 128 }),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  startFen: text("startFen").notNull(),
  solutionMoves: text("solutionMoves").notNull(), // JSON array of SAN moves
  sideToMove: mysqlEnum("sideToMove", ["white", "black"]).default("white").notNull(),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced", "master"]).default("intermediate").notNull(),
  theme: varchar("theme", { length: 64 }), // e.g. "fork", "pin", "discovered_attack"
  rating: int("rating").default(1200).notNull(),
  timesPlayed: int("timesPlayed").default(0).notNull(),
  timesSolved: int("timesSolved").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Puzzle = typeof puzzles.$inferSelect;
export type InsertPuzzle = typeof puzzles.$inferInsert;

/**
 * Puzzle attempts: track user puzzle history
 */
export const puzzleAttempts = mysqlTable("puzzle_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  puzzleId: int("puzzleId").notNull(),
  solved: boolean("solved").default(false).notNull(),
  movesPlayed: text("movesPlayed"), // JSON array
  timeTakenMs: int("timeTakenMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect;

/**
 * PVP games: matchmaking and game state
 */
export const pvpGames = mysqlTable("pvp_games", {
  id: int("id").autoincrement().primaryKey(),
  whiteUserId: int("whiteUserId").notNull(),
  blackUserId: int("blackUserId").notNull(),
  whiteUserName: varchar("whiteUserName", { length: 128 }),
  blackUserName: varchar("blackUserName", { length: 128 }),
  pgn: text("pgn"),
  currentFen: text("currentFen"),
  moves: text("moves"), // JSON array of SAN moves played
  status: mysqlEnum("status", ["waiting", "active", "completed", "abandoned"]).default("waiting").notNull(),
  result: mysqlEnum("result", ["white", "black", "draw", "abandoned"]),
  ranked: boolean("ranked").default(false).notNull(),
  timeControlSeconds: int("timeControlSeconds").default(600),
  whiteTimeRemainingMs: int("whiteTimeRemainingMs"),
  blackTimeRemainingMs: int("blackTimeRemainingMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type PvpGame = typeof pvpGames.$inferSelect;
export type InsertPvpGame = typeof pvpGames.$inferInsert;

/**
 * Matchmaking queue
 */
export const matchmakingQueue = mysqlTable("matchmaking_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  userName: varchar("userName", { length: 128 }),
  ranked: boolean("ranked").default(false).notNull(),
  timeControlSeconds: int("timeControlSeconds").default(600),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type MatchmakingEntry = typeof matchmakingQueue.$inferSelect;

/**
 * Drill attempt counts: persistent per-user, per-move attempt tracking
 * Used for Watch Mode gating and analytics.
 */
export const drillAttemptCounts = mysqlTable("drill_attempt_counts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  openingId: varchar("openingId", { length: 64 }).notNull(),
  variationId: varchar("variationId", { length: 128 }).notNull(),
  moveIndex: int("moveIndex").notNull(),
  side: mysqlEnum("side", ["white", "black"]).notNull(),
  totalAttempts: int("totalAttempts").default(0).notNull(),
  lastWatchAttempt: int("lastWatchAttempt").default(-999).notNull(), // totalAttempts value when last watch was used
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DrillAttemptCount = typeof drillAttemptCounts.$inferSelect;
export type InsertDrillAttemptCount = typeof drillAttemptCounts.$inferInsert;

/** Authoritative per-move prestige state, isolated by side. */
export const moveProgress = mysqlTable("move_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  openingId: varchar("openingId", { length: 64 }).notNull(),
  variationId: varchar("variationId", { length: 128 }).notNull(),
  moveIndex: int("moveIndex").notNull(),
  side: mysqlEnum("side", ["white", "black"]).notNull(),
  bestStars: int("bestStars").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  prestigeTier: int("prestigeTier").default(0).notNull(),
  totalAttempts: int("totalAttempts").default(0).notNull(),
  lastDrilledAt: timestamp("lastDrilledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userMoveSideUnique: uniqueIndex("move_progress_user_move_side_unique").on(
    table.userId,
    table.openingId,
    table.variationId,
    table.moveIndex,
    table.side,
  ),
}));

export type MoveProgress = typeof moveProgress.$inferSelect;
export type InsertMoveProgress = typeof moveProgress.$inferInsert;

/** Full-variation prestige state and the watch-mode quota anchor. */
export const openingProgress = mysqlTable("opening_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  openingId: varchar("openingId", { length: 64 }).notNull(),
  variationId: varchar("variationId", { length: 128 }).notNull(),
  side: mysqlEnum("side", ["white", "black"]).notNull(),
  totalAttempts: int("totalAttempts").default(0).notNull(),
  perfectCompletionStreak: int("perfectCompletionStreak").default(0).notNull(),
  prestigeTier: int("prestigeTier").default(0).notNull(),
  lastWatchAttempt: int("lastWatchAttempt").default(-999).notNull(),
  lastDrilledAt: timestamp("lastDrilledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userOpeningSideUnique: uniqueIndex("opening_progress_user_opening_side_unique").on(
    table.userId,
    table.openingId,
    table.variationId,
    table.side,
  ),
}));

export type OpeningProgress = typeof openingProgress.$inferSelect;
export type InsertOpeningProgress = typeof openingProgress.$inferInsert;

/** Immutable audit trail for idempotent drill and watch submissions. */
export const drillAttemptEvents = mysqlTable("drill_attempt_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  openingId: varchar("openingId", { length: 64 }).notNull(),
  variationId: varchar("variationId", { length: 128 }).notNull(),
  side: mysqlEnum("side", ["white", "black"]).notNull(),
  attemptType: mysqlEnum("attemptType", ["drill", "watch"]).notNull(),
  result: varchar("result", { length: 32 }).notNull(),
  moveResults: text("moveResults"),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdempotencyUnique: uniqueIndex("drill_attempt_events_user_idempotency_unique").on(
    table.userId,
    table.idempotencyKey,
  ),
}));

export type DrillAttemptEvent = typeof drillAttemptEvents.$inferSelect;
