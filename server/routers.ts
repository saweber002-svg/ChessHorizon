import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  createWildernessOpening, getWildernessOpenings, getWildernessOpeningById, upvoteWildernessOpening,
  createPuzzle, getApprovedPuzzles, getPuzzleById, recordPuzzleAttempt,
  joinMatchmakingQueue, leaveMatchmakingQueue, findMatchInQueue, createPvpGame, getPvpGameById, updatePvpGame, getUserPvpGames,
  updateUserChessCom,
  incrementDrillAttempt, recordWatchUsed, getDrillAttemptCount, getDrillAttemptCountsForOpening,
} from "./db";
import {
  consumeWatchForUser,
  getMoveProgressForUser,
  getOpeningProgressForUser,
  getWatchStatusForUser,
  recordDrillCompletion,
} from "./progress/db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Chess.com account linking ───────────────────────────────────────────────
  chesscom: router({
    link: protectedProcedure
      .input(z.object({ username: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const res = await fetch(`https://api.chess.com/pub/player/${input.username.toLowerCase()}/stats`);
        if (!res.ok) throw new Error("Chess.com username not found");
        const data = await res.json() as Record<string, unknown>;
        const rapid = (data.chess_rapid as { last?: { rating?: number } } | undefined)?.last?.rating;
        const blitz = (data.chess_blitz as { last?: { rating?: number } } | undefined)?.last?.rating;
        const rating = rapid ?? blitz ?? 1200;
        await updateUserChessCom(ctx.user.id, input.username.toLowerCase(), rating);
        return { success: true, username: input.username.toLowerCase(), rating };
      }),
    getStats: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const res = await fetch(`https://api.chess.com/pub/player/${input.username.toLowerCase()}/stats`);
        if (!res.ok) return null;
        return await res.json();
      }),
  }),

  // ── Wilderness kingdom ────────────────────────────────────────────────────────────────
  wilderness: router({
    list: publicProcedure
      .input(z.object({ status: z.enum(["pending", "validated", "rejected", "promoted"]).optional() }))
      .query(async ({ input }) => getWildernessOpenings(input.status)),

    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        moves: z.array(z.string()).min(1).max(50),
        pgn: z.string().optional(),
        submittedByName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let ecoCode: string | undefined, ecoName: string | undefined;
        let recognizedKingdom: string | undefined, validationNotes: string | undefined, optimizedMoves: string | undefined;
        try {
          const classification = await invokeLLM({
            messages: [
              { role: "system", content: `You are a chess opening expert. Given moves in SAN notation, identify: ECO code, opening name, which kingdom (italian/spanish/english/scandinavian/sicilian/wilderness), whether move order is optimal, and optimized moves. Respond in JSON.` },
              { role: "user", content: `Classify this opening: ${input.moves.join(" ")}` }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "opening_classification", strict: true,
                schema: {
                  type: "object",
                  properties: {
                    ecoCode: { type: "string" }, ecoName: { type: "string" },
                    kingdom: { type: "string" }, isOptimal: { type: "boolean" },
                    optimizedMoves: { type: "array", items: { type: "string" } },
                    notes: { type: "string" },
                  },
                  required: ["ecoCode", "ecoName", "kingdom", "isOptimal", "optimizedMoves", "notes"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = classification.choices?.[0]?.message?.content as string | undefined;
          if (content) {
            const p = JSON.parse(content);
            ecoCode = p.ecoCode; ecoName = p.ecoName;
            recognizedKingdom = p.kingdom === "wilderness" ? undefined : p.kingdom;
            optimizedMoves = JSON.stringify(p.optimizedMoves);
            validationNotes = p.notes;
          }
        } catch { validationNotes = "Auto-classification unavailable"; }

        const opening = await createWildernessOpening({
          submittedByUserId: ctx.user?.id ?? null,
          submittedByName: input.submittedByName ?? ctx.user?.name ?? "Anonymous",
          name: input.name, moves: JSON.stringify(input.moves), pgn: input.pgn,
          ecoCode, ecoName, recognizedKingdom, optimizedMoves, validationNotes, status: "validated",
        });
        return { success: true, id: (opening as { insertId?: number }).insertId, recognizedKingdom, ecoCode, ecoName };
      }),

    upvote: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await upvoteWildernessOpening(input.id); return { success: true }; }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getWildernessOpeningById(input.id)),
  }),

  // ── Puzzle kingdom ───────────────────────────────────────────────────────────────────
  puzzles: router({
    list: publicProcedure
      .input(z.object({ difficulty: z.string().optional() }))
      .query(async ({ input }) => getApprovedPuzzles(input.difficulty)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getPuzzleById(input.id)),

    submit: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        startFen: z.string().min(1),
        solutionMoves: z.array(z.string()).min(1).max(20),
        sideToMove: z.enum(["white", "black"]),
        difficulty: z.enum(["beginner", "intermediate", "advanced", "master"]),
        theme: z.string().optional(),
        submittedByName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const puzzle = await createPuzzle({
          createdByUserId: ctx.user?.id ?? null,
          createdByName: input.submittedByName ?? ctx.user?.name ?? "Anonymous",
          title: input.title, description: input.description,
          startFen: input.startFen, solutionMoves: JSON.stringify(input.solutionMoves),
          sideToMove: input.sideToMove, difficulty: input.difficulty, theme: input.theme,
          status: "approved",
        });
        return { success: true, id: (puzzle as { insertId?: number }).insertId };
      }),

    recordAttempt: protectedProcedure
      .input(z.object({ puzzleId: z.number(), solved: z.boolean(), movesPlayed: z.array(z.string()), timeTakenMs: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await recordPuzzleAttempt(ctx.user.id, input.puzzleId, input.solved, input.movesPlayed, input.timeTakenMs);
        return { success: true };
      }),
  }),

  // ── PVP / Clearing kingdom ───────────────────────────────────────────────────────
  pvp: router({
    joinQueue: protectedProcedure
      .input(z.object({ ranked: z.boolean().default(false), timeControlSeconds: z.number().default(600) }))
      .mutation(async ({ ctx, input }) => {
        const opponent = await findMatchInQueue(ctx.user.id, input.ranked, input.timeControlSeconds);
        if (opponent) {
          await leaveMatchmakingQueue(opponent.userId);
          const isWhite = Math.random() > 0.5;
          const game = await createPvpGame({
            whiteUserId: isWhite ? ctx.user.id : opponent.userId,
            blackUserId: isWhite ? opponent.userId : ctx.user.id,
            whiteUserName: isWhite ? (ctx.user.name ?? "Player") : (opponent.userName ?? "Player"),
            blackUserName: isWhite ? (opponent.userName ?? "Player") : (ctx.user.name ?? "Player"),
            status: "active", ranked: input.ranked, timeControlSeconds: input.timeControlSeconds,
            whiteTimeRemainingMs: input.timeControlSeconds * 1000,
            blackTimeRemainingMs: input.timeControlSeconds * 1000,
            moves: "[]", currentFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          });
          return { matched: true, gameId: (game as { insertId?: number }).insertId };
        } else {
          await joinMatchmakingQueue(ctx.user.id, ctx.user.name ?? "Player", input.ranked, input.timeControlSeconds);
          return { matched: false, gameId: null };
        }
      }),

    leaveQueue: protectedProcedure.mutation(async ({ ctx }) => {
      await leaveMatchmakingQueue(ctx.user.id);
      return { success: true };
    }),

    getGame: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getPvpGameById(input.id)),

    makeMove: protectedProcedure
      .input(z.object({ gameId: z.number(), san: z.string(), newFen: z.string(), timeRemainingMs: z.number() }))
      .mutation(async ({ input }) => {
        const game = await getPvpGameById(input.gameId);
        if (!game) throw new Error("Game not found");
        if (game.status !== "active") throw new Error("Game is not active");
        const moves = JSON.parse(game.moves ?? "[]") as string[];
        moves.push(input.san);
        const isWhiteTurn = moves.length % 2 === 1;
        await updatePvpGame(input.gameId, {
          moves: JSON.stringify(moves), currentFen: input.newFen,
          whiteTimeRemainingMs: isWhiteTurn ? game.whiteTimeRemainingMs : input.timeRemainingMs,
          blackTimeRemainingMs: isWhiteTurn ? input.timeRemainingMs : game.blackTimeRemainingMs,
        });
        return { success: true };
      }),

    resign: protectedProcedure
      .input(z.object({ gameId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const game = await getPvpGameById(input.gameId);
        if (!game) throw new Error("Game not found");
        const result = ctx.user.id === game.whiteUserId ? "black" : "white";
        await updatePvpGame(input.gameId, { status: "completed", result, completedAt: new Date() });
        return { success: true };
      }),

     myGames: protectedProcedure.query(async ({ ctx }) => getUserPvpGames(ctx.user.id)),
  }),

  // ── Drill attempt persistence ────────────────────────────────────────────────
  drillAttempts: router({
    increment: protectedProcedure
      .input(z.object({
        openingId: z.string(),
        variationId: z.string(),
        moveIndex: z.number().int().min(0),
        side: z.enum(["white", "black"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const newTotal = await incrementDrillAttempt(
          ctx.user.id, input.openingId, input.variationId, input.moveIndex, input.side
        );
        return { totalAttempts: newTotal };
      }),

    recordWatch: protectedProcedure
      .input(z.object({
        openingId: z.string(),
        variationId: z.string(),
        moveIndex: z.number().int().min(0),
        side: z.enum(["white", "black"]),
        currentTotal: z.number().int().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        await recordWatchUsed(
          ctx.user.id, input.openingId, input.variationId, input.moveIndex, input.side, input.currentTotal
        );
        return { success: true };
      }),

    getCount: protectedProcedure
      .input(z.object({
        openingId: z.string(),
        variationId: z.string(),
        moveIndex: z.number().int().min(0),
        side: z.enum(["white", "black"]),
      }))
      .query(async ({ ctx, input }) => {
        return await getDrillAttemptCount(
          ctx.user.id, input.openingId, input.variationId, input.moveIndex, input.side
        );
      }),

    getForOpening: protectedProcedure
      .input(z.object({ openingId: z.string() }))
      .query(async ({ ctx, input }) => {
        return await getDrillAttemptCountsForOpening(ctx.user.id, input.openingId);
      }),

    getMoveExplanation: publicProcedure
      .input(z.object({
        openingName: z.string(),
        variationName: z.string(),
        moveSan: z.string(),
        fen: z.string(),
        moveIndex: z.number().int().min(0),
      }))
      .query(async ({ input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a chess coach explaining opening moves to students. Give a concise, insightful explanation (2-3 sentences) of why a specific move is the correct choice in a chess opening. Focus on the strategic idea, not just the name. Be encouraging and educational.`,
              },
              {
                role: "user",
                content: `Opening: ${input.openingName} \u2014 ${input.variationName}. Move ${Math.floor(input.moveIndex / 2) + 1} (${input.moveIndex % 2 === 0 ? "White" : "Black"}): ${input.moveSan}. FEN before move: ${input.fen}. Why is ${input.moveSan} the correct move here? Keep it to 2-3 sentences.`,
              },
            ],
          });
          const explanation = result.choices?.[0]?.message?.content as string | undefined;
          return { explanation: explanation ?? "This move follows the main line of this opening, establishing key positional principles." };
        } catch {
          return { explanation: "This move follows the main line of this opening, establishing key positional principles." };
        }
    }),
  }),

  // ── Server-authoritative prestige and Watch Mode ───────────────────────────
  progress: router({
    getMove: protectedProcedure
      .input(z.object({
        openingId: z.string().min(1),
        variationId: z.string().min(1),
        moveIndex: z.number().int().min(0),
        side: z.enum(["white", "black"]),
      }))
      .query(({ ctx, input }) => getMoveProgressForUser(ctx.user.id, input.openingId, input.variationId, input.moveIndex, input.side)),

    getOpening: protectedProcedure
      .input(z.object({
        openingId: z.string().min(1),
        variationId: z.string().min(1),
        side: z.enum(["white", "black"]),
      }))
      .query(({ ctx, input }) => getOpeningProgressForUser(ctx.user.id, input.openingId, input.variationId, input.side)),

    recordDrillCompletion: protectedProcedure
      .input(z.object({
        openingId: z.string().min(1),
        variationId: z.string().min(1),
        side: z.enum(["white", "black"]),
        moveResults: z.array(z.object({
          moveIndex: z.number().int().min(0),
          stars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
        })).min(1),
        idempotencyKey: z.string().min(8).max(128),
      }))
      .mutation(({ ctx, input }) => recordDrillCompletion({ ...input, userId: ctx.user.id })),
  }),

  watch: router({
    getStatus: protectedProcedure
      .input(z.object({
        openingId: z.string().min(1),
        variationId: z.string().min(1),
        side: z.enum(["white", "black"]),
      }))
      .query(({ ctx, input }) => getWatchStatusForUser(ctx.user.id, input.openingId, input.variationId, input.side)),

    consume: protectedProcedure
      .input(z.object({
        openingId: z.string().min(1),
        variationId: z.string().min(1),
        side: z.enum(["white", "black"]),
        idempotencyKey: z.string().min(8).max(128),
      }))
      .mutation(({ ctx, input }) => consumeWatchForUser({ ...input, userId: ctx.user.id })),
  }),
});
export type AppRouter = typeof appRouter;
