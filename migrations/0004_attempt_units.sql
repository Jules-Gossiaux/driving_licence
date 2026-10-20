ALTER TABLE attempts ADD COLUMN unit_id TEXT;

CREATE INDEX attempts_unit_challenge_idx
  ON attempts(profile_id, unit_id, status);
