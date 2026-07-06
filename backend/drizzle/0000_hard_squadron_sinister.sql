CREATE TABLE `exam_items` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`question_number` integer NOT NULL,
	`sub_label` text,
	`points` real NOT NULL,
	`answer_type` text NOT NULL,
	`answer_config_json` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exam_items_exam_id_idx` ON `exam_items` (`exam_id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`public_code` text NOT NULL,
	`admin_code_hash` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`closed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exams_public_code_unique` ON `exams` (`public_code`);--> statement-breakpoint
CREATE INDEX `exams_public_code_idx` ON `exams` (`public_code`);--> statement-breakpoint
CREATE INDEX `exams_admin_code_hash_idx` ON `exams` (`admin_code_hash`);--> statement-breakpoint
CREATE INDEX `exams_status_idx` ON `exams` (`status`);--> statement-breakpoint
CREATE TABLE `submission_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`item_id` text NOT NULL,
	`raw_answer` text NOT NULL,
	`normalized_answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`score_awarded` real NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `exam_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submission_answers_submission_id_idx` ON `submission_answers` (`submission_id`);--> statement-breakpoint
CREATE INDEX `submission_answers_item_id_idx` ON `submission_answers` (`item_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`student_name` text NOT NULL,
	`student_identifier` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`total_score` real NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_exam_id_idx` ON `submissions` (`exam_id`);--> statement-breakpoint
CREATE INDEX `submissions_student_identifier_idx` ON `submissions` (`student_identifier`);--> statement-breakpoint
CREATE INDEX `submissions_exam_student_idx` ON `submissions` (`exam_id`,`student_identifier`);