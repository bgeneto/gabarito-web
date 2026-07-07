CREATE TABLE `access_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`event_type` text NOT NULL,
	`method` text,
	`path` text NOT NULL,
	`route_category` text NOT NULL,
	`status_code` integer,
	`ip_hash` text NOT NULL,
	`user_agent` text,
	`exam_id` text,
	`response_time_ms` integer,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `access_logs_timestamp_idx` ON `access_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `access_logs_event_type_idx` ON `access_logs` (`event_type`);--> statement-breakpoint
CREATE INDEX `access_logs_route_category_idx` ON `access_logs` (`route_category`);--> statement-breakpoint
CREATE INDEX `access_logs_exam_id_idx` ON `access_logs` (`exam_id`);
