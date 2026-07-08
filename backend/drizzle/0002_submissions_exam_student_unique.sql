DROP INDEX `submissions_exam_student_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_exam_student_unique` ON `submissions` (`exam_id`,`student_identifier`);
