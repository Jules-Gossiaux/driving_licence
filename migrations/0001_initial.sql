CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  created_at TEXT NOT NULL
);

CREATE TABLE lesson_progress (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL CHECK (length(trim(lesson_id)) > 0),
  read_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (profile_id, lesson_id)
);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'exam', 'review')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  preset_id TEXT,
  chapter_id TEXT,
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  seconds_per_question INTEGER CHECK (seconds_per_question IS NULL OR seconds_per_question > 0),
  passing_score INTEGER CHECK (passing_score IS NULL OR passing_score >= 0),
  error_penalty INTEGER CHECK (error_penalty IS NULL OR error_penalty > 0),
  severe_error_penalty INTEGER CHECK (severe_error_penalty IS NULL OR severe_error_penalty > 0),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  score INTEGER CHECK (score IS NULL OR score >= 0),
  passed INTEGER CHECK (passed IS NULL OR passed IN (0, 1)),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  current_position INTEGER NOT NULL DEFAULT 0 CHECK (current_position >= 0)
);

CREATE INDEX attempts_profile_status_idx ON attempts(profile_id, status, mode);
CREATE INDEX attempts_profile_completed_idx ON attempts(profile_id, completed_at DESC);

CREATE TABLE attempt_questions (
  attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  question_id TEXT NOT NULL,
  question_version INTEGER NOT NULL CHECK (question_version > 0),
  snapshot_json TEXT NOT NULL,
  presented_at TEXT,
  deadline_at TEXT,
  answered_at TEXT,
  selected_option_id TEXT,
  is_correct INTEGER CHECK (is_correct IS NULL OR is_correct IN (0, 1)),
  timed_out INTEGER NOT NULL DEFAULT 0 CHECK (timed_out IN (0, 1)),
  time_spent_ms INTEGER CHECK (time_spent_ms IS NULL OR time_spent_ms >= 0),
  PRIMARY KEY (attempt_id, position),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX attempt_questions_question_idx ON attempt_questions(question_id);
CREATE INDEX attempt_questions_answered_idx ON attempt_questions(attempt_id, answered_at);
