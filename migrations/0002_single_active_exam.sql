CREATE UNIQUE INDEX attempts_one_active_exam_per_profile
  ON attempts(profile_id)
  WHERE mode = 'exam' AND status = 'in_progress';
