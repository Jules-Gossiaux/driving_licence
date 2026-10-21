ALTER TABLE attempt_questions ADD COLUMN retry_answered_at TEXT;
ALTER TABLE attempt_questions ADD COLUMN retry_selected_option_id TEXT;
ALTER TABLE attempt_questions ADD COLUMN retry_is_correct INTEGER
  CHECK (retry_is_correct IS NULL OR retry_is_correct IN (0, 1));
