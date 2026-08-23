CREATE TABLE `magic_links` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`ip_hash` text NOT NULL,
	`target_route` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `magic_links_email_idx` ON `magic_links` (`email`);--> statement-breakpoint
CREATE INDEX `magic_links_token_hash_idx` ON `magic_links` (`token_hash`);--> statement-breakpoint
CREATE INDEX `magic_links_expires_at_idx` ON `magic_links` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`user_agent` text,
	`ip_hash` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_sessions_user_id_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_sessions_token_hash_idx` ON `user_sessions` (`session_token_hash`);--> statement-breakpoint
CREATE INDEX `user_sessions_expires_at_idx` ON `user_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`created_at` integer NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `submissions` ADD `student_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `submissions` ADD `student_email` text;--> statement-breakpoint
CREATE INDEX `submissions_student_user_id_idx` ON `submissions` (`student_user_id`);--> statement-breakpoint
CREATE INDEX `submissions_student_email_idx` ON `submissions` (`student_email`);--> statement-breakpoint
ALTER TABLE `exams` ADD `creator_user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `exams_creator_user_id_idx` ON `exams` (`creator_user_id`);