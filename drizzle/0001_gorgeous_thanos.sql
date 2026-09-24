ALTER TABLE `drill_attempt_events` MODIFY COLUMN `side` enum('white','black','both') NOT NULL;--> statement-breakpoint
ALTER TABLE `move_progress` MODIFY COLUMN `side` enum('white','black','both') NOT NULL;--> statement-breakpoint
ALTER TABLE `opening_progress` MODIFY COLUMN `side` enum('white','black','both') NOT NULL;