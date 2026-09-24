CREATE TABLE `drill_attempt_counts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openingId` varchar(64) NOT NULL,
	`variationId` varchar(128) NOT NULL,
	`moveIndex` int NOT NULL,
	`side` enum('white','black') NOT NULL,
	`totalAttempts` int NOT NULL DEFAULT 0,
	`lastWatchAttempt` int NOT NULL DEFAULT -999,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drill_attempt_counts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drill_attempt_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openingId` varchar(64) NOT NULL,
	`variationId` varchar(128) NOT NULL,
	`side` enum('white','black') NOT NULL,
	`attemptType` enum('drill','watch') NOT NULL,
	`result` varchar(32) NOT NULL,
	`moveResults` text,
	`idempotencyKey` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drill_attempt_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `drill_attempt_events_user_idempotency_unique` UNIQUE(`userId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `matchmaking_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(128),
	`ranked` boolean NOT NULL DEFAULT false,
	`timeControlSeconds` int DEFAULT 600,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matchmaking_queue_id` PRIMARY KEY(`id`),
	CONSTRAINT `matchmaking_queue_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `move_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openingId` varchar(64) NOT NULL,
	`variationId` varchar(128) NOT NULL,
	`moveIndex` int NOT NULL,
	`side` enum('white','black') NOT NULL,
	`bestStars` int NOT NULL DEFAULT 0,
	`currentStreak` int NOT NULL DEFAULT 0,
	`prestigeTier` int NOT NULL DEFAULT 0,
	`totalAttempts` int NOT NULL DEFAULT 0,
	`lastDrilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `move_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `move_progress_user_move_side_unique` UNIQUE(`userId`,`openingId`,`variationId`,`moveIndex`,`side`)
);
--> statement-breakpoint
CREATE TABLE `opening_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openingId` varchar(64) NOT NULL,
	`variationId` varchar(128) NOT NULL,
	`side` enum('white','black') NOT NULL,
	`totalAttempts` int NOT NULL DEFAULT 0,
	`perfectCompletionStreak` int NOT NULL DEFAULT 0,
	`prestigeTier` int NOT NULL DEFAULT 0,
	`lastWatchAttempt` int NOT NULL DEFAULT -999,
	`lastDrilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opening_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `opening_progress_user_opening_side_unique` UNIQUE(`userId`,`openingId`,`variationId`,`side`)
);
--> statement-breakpoint
CREATE TABLE `puzzle_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`puzzleId` int NOT NULL,
	`solved` boolean NOT NULL DEFAULT false,
	`movesPlayed` text,
	`timeTakenMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `puzzle_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `puzzles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int,
	`createdByName` varchar(128),
	`title` varchar(256) NOT NULL,
	`description` text,
	`startFen` text NOT NULL,
	`solutionMoves` text NOT NULL,
	`sideToMove` enum('white','black') NOT NULL DEFAULT 'white',
	`difficulty` enum('beginner','intermediate','advanced','master') NOT NULL DEFAULT 'intermediate',
	`theme` varchar(64),
	`rating` int NOT NULL DEFAULT 1200,
	`timesPlayed` int NOT NULL DEFAULT 0,
	`timesSolved` int NOT NULL DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `puzzles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pvp_games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whiteUserId` int NOT NULL,
	`blackUserId` int NOT NULL,
	`whiteUserName` varchar(128),
	`blackUserName` varchar(128),
	`pgn` text,
	`currentFen` text,
	`moves` text,
	`status` enum('waiting','active','completed','abandoned') NOT NULL DEFAULT 'waiting',
	`result` enum('white','black','draw','abandoned'),
	`ranked` boolean NOT NULL DEFAULT false,
	`timeControlSeconds` int DEFAULT 600,
	`whiteTimeRemainingMs` int,
	`blackTimeRemainingMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `pvp_games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`chessComUsername` varchar(64),
	`chessComRating` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `wilderness_openings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submittedByUserId` int,
	`submittedByName` varchar(128),
	`name` varchar(256) NOT NULL,
	`moves` text NOT NULL,
	`pgn` text,
	`ecoCode` varchar(8),
	`ecoName` varchar(256),
	`recognizedKingdom` varchar(64),
	`recognizedVariationId` varchar(128),
	`finalFen` text,
	`optimizedMoves` text,
	`status` enum('pending','validated','rejected','promoted') NOT NULL DEFAULT 'pending',
	`validationNotes` text,
	`upvotes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wilderness_openings_id` PRIMARY KEY(`id`)
);
