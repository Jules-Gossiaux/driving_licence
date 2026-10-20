ALTER TABLE attempts ADD COLUMN lesson_id TEXT;
ALTER TABLE attempts ADD COLUMN lesson_step INTEGER NOT NULL DEFAULT 0;

CREATE INDEX attempts_lesson_run_idx ON attempts(profile_id, lesson_id, status);
