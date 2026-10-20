import type { DatabaseSync } from "node:sqlite";
import type {
  CompleteAttemptInput,
  LearningRepository,
  RecordAnswerInput,
  RecordQuestionPresentedInput,
} from "@/application/ports";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import { questionSnapshotSchema, type QuestionSnapshot } from "@/domain/learning/snapshot";
import type {
  Attempt,
  AttemptMode,
  AttemptQuestion,
  AttemptStatus,
  AttemptSummary,
  LearningStats,
  LessonProgress,
  NewAttempt,
} from "@/domain/learning/types";

type AttemptRow = {
  id: string;
  profile_id: string;
  mode: string;
  status: string;
  preset_id: string | null;
  chapter_id: string | null;
  lesson_id: string | null;
  lesson_step: number;
  question_count: number;
  seconds_per_question: number | null;
  passing_score: number | null;
  error_penalty: number | null;
  severe_error_penalty: number | null;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  passed: number | null;
  duration_ms: number | null;
  current_position: number;
};

type AttemptQuestionRow = {
  position: number;
  question_id: string;
  question_version: number;
  snapshot_json: string;
  presented_at: string | null;
  deadline_at: string | null;
  answered_at: string | null;
  selected_option_id: string | null;
  is_correct: number | null;
  timed_out: number;
  time_spent_ms: number | null;
};

type LessonProgressRow = {
  lesson_id: string;
  read_at: string;
  updated_at: string;
};

type CountRow = {
  completed_attempts: number;
  answered_questions: number;
  correct_answers: number;
  distinct_questions: number;
};

type QuestionIdRow = {
  question_id: string;
};

const ATTEMPT_COLUMNS = `
  id, profile_id, mode, status, preset_id, chapter_id, lesson_id, lesson_step,
  question_count, seconds_per_question, passing_score, error_penalty,
  severe_error_penalty, started_at, completed_at, score, passed, duration_ms,
  current_position
`;

const SUMMARY_COLUMNS = `
  id, mode, status, preset_id, chapter_id, lesson_id, question_count,
  passing_score, started_at, completed_at, score, passed
`;

function parseMode(value: string): AttemptMode {
  if (value === "practice" || value === "exam" || value === "review") {
    return value;
  }
  throw new Error(`Mode de tentative inconnu en base : ${value}.`);
}

function parseStatus(value: string): AttemptStatus {
  if (value === "in_progress" || value === "completed" || value === "abandoned") {
    return value;
  }
  throw new Error(`Statut de tentative inconnu en base : ${value}.`);
}

function parseSnapshot(row: AttemptQuestionRow, attemptId: string): QuestionSnapshot {
  let raw: unknown;

  try {
    raw = JSON.parse(row.snapshot_json);
  } catch {
    throw new Error(
      `Snapshot JSON illisible pour la tentative ${attemptId}, position ${row.position}.`,
    );
  }

  const parsed = questionSnapshotSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(`Snapshot invalide pour la tentative ${attemptId}, position ${row.position}.`);
  }

  if (parsed.data.questionId !== row.question_id || parsed.data.version !== row.question_version) {
    throw new Error(
      `Snapshot incohérent avec les colonnes pour la tentative ${attemptId}, ` +
        `position ${row.position}.`,
    );
  }

  return parsed.data;
}

function toAttemptQuestion(row: AttemptQuestionRow, attemptId: string): AttemptQuestion {
  return {
    position: row.position,
    snapshot: parseSnapshot(row, attemptId),
    presentedAt: row.presented_at,
    deadlineAt: row.deadline_at,
    answeredAt: row.answered_at,
    selectedOptionId: row.selected_option_id,
    isCorrect: row.is_correct === null ? null : row.is_correct === 1,
    timedOut: row.timed_out === 1,
    timeSpentMs: row.time_spent_ms,
  };
}

function toAttemptSummary(row: {
  id: string;
  mode: string;
  status: string;
  preset_id: string | null;
  chapter_id: string | null;
  lesson_id: string | null;
  question_count: number;
  passing_score: number | null;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  passed: number | null;
}): AttemptSummary {
  return {
    id: row.id,
    mode: parseMode(row.mode),
    status: parseStatus(row.status),
    presetId: row.preset_id,
    chapterId: row.chapter_id,
    lessonId: row.lesson_id,
    questionCount: row.question_count,
    passingScore: row.passing_score,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    score: row.score,
    passed: row.passed === null ? null : row.passed === 1,
  };
}

function withTransaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // SQLite peut avoir déjà annulé la transaction.
    }
    throw error;
  }
}

export class SqliteLearningRepository implements LearningRepository {
  constructor(private readonly db: DatabaseSync) {}

  getLessonProgress(profileId: string): LessonProgress[] {
    const rows = this.db
      .prepare(
        "SELECT lesson_id, read_at, updated_at FROM lesson_progress " +
          "WHERE profile_id = ? ORDER BY updated_at DESC",
      )
      .all(profileId) as unknown as LessonProgressRow[];

    return rows.map((row) => ({
      lessonId: row.lesson_id,
      readAt: row.read_at,
      updatedAt: row.updated_at,
    }));
  }

  setLessonRead(profileId: string, lessonId: string, read: boolean, at: string): void {
    if (!read) {
      this.db
        .prepare("DELETE FROM lesson_progress WHERE profile_id = ? AND lesson_id = ?")
        .run(profileId, lessonId);
      return;
    }

    this.db
      .prepare(
        "INSERT INTO lesson_progress (profile_id, lesson_id, read_at, updated_at) " +
          "VALUES (?, ?, ?, ?) " +
          "ON CONFLICT(profile_id, lesson_id) DO UPDATE SET updated_at = excluded.updated_at",
      )
      .run(profileId, lessonId, at, at);
  }

  createAttempt(attempt: NewAttempt): void {
    if (attempt.questions.length !== attempt.questionCount) {
      throw new AttemptConflictError(
        `La tentative ${attempt.id} annonce ${attempt.questionCount} question(s) ` +
          `mais en contient ${attempt.questions.length}.`,
      );
    }

    withTransaction(this.db, () => {
      this.db
        .prepare(
          `INSERT INTO attempts (
            id, profile_id, mode, status, preset_id, chapter_id, lesson_id,
            question_count, seconds_per_question, passing_score, error_penalty,
            severe_error_penalty, started_at, lesson_step, current_position
          ) VALUES (?, ?, ?, 'in_progress', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        )
        .run(
          attempt.id,
          attempt.profileId,
          attempt.mode,
          attempt.presetId,
          attempt.chapterId,
          attempt.lessonId ?? null,
          attempt.questionCount,
          attempt.secondsPerQuestion,
          attempt.passingScore,
          attempt.errorPenalty,
          attempt.severeErrorPenalty,
          attempt.startedAt,
        );

      const insertQuestion = this.db.prepare(
        "INSERT INTO attempt_questions (" +
          "attempt_id, position, question_id, question_version, snapshot_json" +
          ") VALUES (?, ?, ?, ?, ?)",
      );

      for (const question of attempt.questions) {
        insertQuestion.run(
          attempt.id,
          question.position,
          question.snapshot.questionId,
          question.snapshot.version,
          JSON.stringify(question.snapshot),
        );
      }
    });
  }

  getAttempt(profileId: string, attemptId: string): Attempt | null {
    const row = this.db
      .prepare(`SELECT ${ATTEMPT_COLUMNS} FROM attempts WHERE id = ? AND profile_id = ?`)
      .get(attemptId, profileId) as unknown as AttemptRow | undefined;

    if (!row) {
      return null;
    }

    const questionRows = this.db
      .prepare(
        "SELECT position, question_id, question_version, snapshot_json, presented_at, " +
          "deadline_at, answered_at, selected_option_id, is_correct, timed_out, time_spent_ms " +
          "FROM attempt_questions WHERE attempt_id = ? ORDER BY position",
      )
      .all(attemptId) as unknown as AttemptQuestionRow[];

    return {
      id: row.id,
      profileId: row.profile_id,
      mode: parseMode(row.mode),
      status: parseStatus(row.status),
      presetId: row.preset_id,
      chapterId: row.chapter_id,
      lessonId: row.lesson_id,
      lessonStep: row.lesson_step,
      questionCount: row.question_count,
      secondsPerQuestion: row.seconds_per_question,
      passingScore: row.passing_score,
      errorPenalty: row.error_penalty,
      severeErrorPenalty: row.severe_error_penalty,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      score: row.score,
      passed: row.passed === null ? null : row.passed === 1,
      durationMs: row.duration_ms,
      currentPosition: row.current_position,
      questions: questionRows.map((question) => toAttemptQuestion(question, row.id)),
    };
  }

  getActiveExam(profileId: string): AttemptSummary | null {
    const row = this.db
      .prepare(
        `SELECT ${SUMMARY_COLUMNS} FROM attempts ` +
          "WHERE profile_id = ? AND mode = 'exam' AND status = 'in_progress' " +
          "ORDER BY started_at DESC, id DESC LIMIT 1",
      )
      .get(profileId) as unknown as AttemptRow | undefined;

    return row ? toAttemptSummary(row) : null;
  }

  getActiveLessonRun(profileId: string, lessonId: string): AttemptSummary | null {
    const row = this.db
      .prepare(
        `SELECT ${SUMMARY_COLUMNS} FROM attempts ` +
          "WHERE profile_id = ? AND lesson_id = ? AND status = 'in_progress' " +
          "ORDER BY started_at DESC, id DESC LIMIT 1",
      )
      .get(profileId, lessonId) as unknown as AttemptRow | undefined;

    return row ? toAttemptSummary(row) : null;
  }

  listRecentCompletedAttempts(profileId: string, limit: number): AttemptSummary[] {
    if (!Number.isInteger(limit) || limit <= 0) {
      return [];
    }

    const rows = this.db
      .prepare(
        `SELECT ${SUMMARY_COLUMNS} FROM attempts ` +
          "WHERE profile_id = ? AND status = 'completed' AND completed_at IS NOT NULL " +
          "ORDER BY completed_at DESC, id DESC LIMIT ?",
      )
      .all(profileId, limit) as unknown as AttemptRow[];

    return rows.map(toAttemptSummary);
  }

  recordQuestionPresented(input: RecordQuestionPresentedInput): void {
    const result = this.db
      .prepare(
        "UPDATE attempt_questions SET presented_at = ?, deadline_at = ? " +
          "WHERE attempt_id = ? AND position = ? AND presented_at IS NULL " +
          "AND EXISTS (SELECT 1 FROM attempts WHERE id = ? AND status = 'in_progress')",
      )
      .run(input.presentedAt, input.deadlineAt, input.attemptId, input.position, input.attemptId);

    if (result.changes === 0) {
      this.assertQuestionExists(input.attemptId, input.position);
    }

    this.db
      .prepare(
        "UPDATE attempts SET current_position = MAX(current_position, ?) " +
          "WHERE id = ? AND status = 'in_progress'",
      )
      .run(input.position + 1, input.attemptId);
  }

  recordAnswer(input: RecordAnswerInput): void {
    if (input.timeSpentMs < 0) {
      throw new AttemptConflictError("Le temps passé ne peut pas être négatif.");
    }

    const result = this.db
      .prepare(
        "UPDATE attempt_questions SET answered_at = ?, selected_option_id = ?, " +
          "is_correct = ?, timed_out = ?, time_spent_ms = ? " +
          "WHERE attempt_id = ? AND position = ? AND question_id = ? " +
          "AND answered_at IS NULL " +
          "AND EXISTS (SELECT 1 FROM attempts WHERE id = ? AND status = 'in_progress')",
      )
      .run(
        input.answeredAt,
        input.selectedOptionId,
        input.isCorrect ? 1 : 0,
        input.timedOut ? 1 : 0,
        input.timeSpentMs,
        input.attemptId,
        input.position,
        input.questionId,
        input.attemptId,
      );

    if (result.changes === 0) {
      this.assertQuestionExists(input.attemptId, input.position);
      throw new AttemptConflictError(
        `La question ${input.position} de la tentative ${input.attemptId} ` +
          "est déjà répondue ou la tentative est close.",
      );
    }

    this.db
      .prepare(
        "UPDATE attempts SET current_position = MAX(current_position, ?) " +
          "WHERE id = ? AND status = 'in_progress'",
      )
      .run(input.position + 1, input.attemptId);
  }

  completeAttempt(input: CompleteAttemptInput): void {
    if (input.score < 0 || input.durationMs < 0) {
      throw new AttemptConflictError("Score ou durée négatif à l'enregistrement.");
    }

    const result = this.db
      .prepare(
        "UPDATE attempts SET status = 'completed', completed_at = ?, score = ?, " +
          "passed = ?, duration_ms = ? WHERE id = ? AND status = 'in_progress'",
      )
      .run(
        input.completedAt,
        input.score,
        input.passed === null ? null : input.passed ? 1 : 0,
        input.durationMs,
        input.attemptId,
      );

    if (result.changes === 0) {
      this.assertAttemptExists(input.attemptId);
      throw new AttemptConflictError(`La tentative ${input.attemptId} est déjà close.`);
    }
  }

  setLessonStep(profileId: string, attemptId: string, step: number): void {
    if (!Number.isInteger(step) || step < 0) {
      throw new AttemptConflictError("L'étape de leçon doit être un entier positif.");
    }

    const result = this.db
      .prepare(
        "UPDATE attempts SET lesson_step = MAX(lesson_step, ?) " +
          "WHERE id = ? AND profile_id = ? AND lesson_id IS NOT NULL " +
          "AND status = 'in_progress'",
      )
      .run(step, attemptId, profileId);

    if (result.changes === 0) {
      this.assertLessonRunExists(profileId, attemptId);
      throw new AttemptConflictError(`Le parcours ${attemptId} n'est plus modifiable.`);
    }
  }

  abandonAttempt(profileId: string, attemptId: string, at: string): void {
    const result = this.db
      .prepare(
        "UPDATE attempts SET status = 'abandoned', completed_at = ? " +
          "WHERE id = ? AND profile_id = ? AND status = 'in_progress'",
      )
      .run(at, attemptId, profileId);

    if (result.changes === 0) {
      this.assertAttemptExists(attemptId, profileId);
      throw new AttemptConflictError(`La tentative ${attemptId} est déjà close.`);
    }
  }

  getLatestIncorrectQuestionIds(profileId: string): string[] {
    const rows = this.db
      .prepare(
        `WITH ranked AS (
           SELECT aq.question_id, aq.is_correct,
             ROW_NUMBER() OVER (
               PARTITION BY aq.question_id
               ORDER BY a.completed_at DESC, a.id DESC
             ) AS rank
           FROM attempt_questions aq
           JOIN attempts a ON a.id = aq.attempt_id
           WHERE a.profile_id = ?
             AND a.status = 'completed'
             AND a.completed_at IS NOT NULL
             AND aq.answered_at IS NOT NULL
         )
         SELECT question_id FROM ranked
         WHERE rank = 1 AND is_correct = 0
         ORDER BY question_id`,
      )
      .all(profileId) as unknown as QuestionIdRow[];

    return rows.map((row) => row.question_id);
  }

  getCompletedStats(profileId: string): LearningStats {
    const row = this.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM attempts a
             WHERE a.profile_id = ? AND a.status = 'completed') AS completed_attempts,
           COUNT(aq.position) AS answered_questions,
           COALESCE(SUM(CASE WHEN aq.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_answers,
           COUNT(DISTINCT aq.question_id) AS distinct_questions
         FROM attempt_questions aq
         JOIN attempts a ON a.id = aq.attempt_id
         WHERE a.profile_id = ?
           AND a.status = 'completed'
           AND aq.answered_at IS NOT NULL`,
      )
      .get(profileId, profileId) as unknown as CountRow | undefined;

    if (!row) {
      return {
        answeredQuestions: 0,
        correctAnswers: 0,
        distinctQuestions: 0,
        completedAttempts: 0,
      };
    }

    return {
      answeredQuestions: Number(row.answered_questions),
      correctAnswers: Number(row.correct_answers),
      distinctQuestions: Number(row.distinct_questions),
      completedAttempts: Number(row.completed_attempts),
    };
  }

  private assertAttemptExists(attemptId: string, profileId?: string): void {
    const row = this.db
      .prepare(
        profileId
          ? "SELECT id FROM attempts WHERE id = ? AND profile_id = ?"
          : "SELECT id FROM attempts WHERE id = ?",
      )
      .get(...(profileId ? [attemptId, profileId] : [attemptId]));

    if (!row) {
      throw new AttemptNotFoundError(attemptId);
    }
  }

  private assertQuestionExists(attemptId: string, position: number): void {
    this.assertAttemptExists(attemptId);

    const row = this.db
      .prepare("SELECT position FROM attempt_questions WHERE attempt_id = ? AND position = ?")
      .get(attemptId, position);

    if (!row) {
      throw new AttemptNotFoundError(`${attemptId} (question ${position})`);
    }
  }

  private assertLessonRunExists(profileId: string, attemptId: string): void {
    const row = this.db
      .prepare("SELECT id FROM attempts WHERE id = ? AND profile_id = ? AND lesson_id IS NOT NULL")
      .get(attemptId, profileId);

    if (!row) {
      throw new AttemptNotFoundError(attemptId);
    }
  }
}
