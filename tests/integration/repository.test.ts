import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LearningRepository } from "@/application/ports";
import type { Question } from "@/domain/content/schemas";
import { createQuestionSnapshot } from "@/domain/learning/snapshot";
import { AttemptConflictError } from "@/domain/learning/errors";
import type { AttemptMode } from "@/domain/learning/types";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import { openDatabase } from "@/infrastructure/db/open";
import { SqliteLearningRepository } from "@/infrastructure/db/repository";
import { TEST_STARTED_AT, testQuestion } from "../helpers/fixtures";

let db: DatabaseSync;
let repository: LearningRepository;

beforeEach(() => {
  db = openDatabase(":memory:").db;
  repository = new SqliteLearningRepository(db);
});

afterEach(() => {
  db.close();
});

function createAttempt(
  id: string,
  questions: Question[],
  options: {
    mode?: AttemptMode;
    startedAt?: string;
    lessonId?: string | null;
    secondsPerQuestion?: number | null;
    passingScore?: number | null;
    errorPenalty?: number | null;
    severeErrorPenalty?: number | null;
  } = {},
): void {
  const mode = options.mode ?? "practice";
  const isExam = mode === "exam";

  repository.createAttempt({
    id,
    profileId: LOCAL_PROFILE_ID,
    mode,
    presetId: isExam ? "preset-demo" : null,
    chapterId: isExam ? null : "ch01",
    lessonId: options.lessonId ?? null,
    questionCount: questions.length,
    secondsPerQuestion: options.secondsPerQuestion ?? (isExam ? 15 : null),
    passingScore: options.passingScore ?? (isExam ? 2 : null),
    errorPenalty: options.errorPenalty ?? (isExam ? 1 : null),
    severeErrorPenalty: options.severeErrorPenalty ?? (isExam ? 5 : null),
    startedAt: options.startedAt ?? TEST_STARTED_AT,
    questions: questions.map((question, position) => ({
      position,
      snapshot: createQuestionSnapshot(question),
    })),
  });

  repository.recordQuestionPresented({
    attemptId: id,
    position: 0,
    presentedAt: options.startedAt ?? TEST_STARTED_AT,
    deadlineAt: null,
  });
}

function answer(
  attemptId: string,
  question: Question,
  position: number,
  isCorrect: boolean,
  answeredAt = TEST_STARTED_AT,
): void {
  repository.recordAnswer({
    attemptId,
    position,
    questionId: question.id,
    selectedOptionId: isCorrect ? question.correctOptionId : "b",
    isCorrect,
    timedOut: false,
    answeredAt,
    timeSpentMs: 1_000,
  });
}

const q1 = testQuestion({ id: "ch01-q001" });
const q2 = testQuestion({ id: "ch01-q002" });

describe("SqliteLearningRepository", () => {
  it("mémorise et relit une tentative avec ses snapshots", () => {
    createAttempt("attempt-1", [q1, q2]);

    const attempt = repository.getAttempt(LOCAL_PROFILE_ID, "attempt-1");

    expect(attempt).not.toBeNull();
    expect(attempt?.status).toBe("in_progress");
    expect(attempt?.questions).toHaveLength(2);
    expect(attempt?.questions[0]?.snapshot).toMatchObject({
      questionId: "ch01-q001",
      correctOptionId: "a",
      explanation: "Explication de test.",
    });
    expect(attempt?.questions[0]?.presentedAt).toBe(TEST_STARTED_AT);
  });

  it("enregistre une réponse une seule fois", () => {
    createAttempt("attempt-1", [q1]);
    answer("attempt-1", q1, 0, true);

    expect(repository.getAttempt(LOCAL_PROFILE_ID, "attempt-1")?.questions[0]?.isCorrect).toBe(
      true,
    );
    expect(() => answer("attempt-1", q1, 0, false)).toThrow(AttemptConflictError);
    expect(repository.getAttempt(LOCAL_PROFILE_ID, "attempt-1")?.questions[0]?.isCorrect).toBe(
      true,
    );
  });

  it("termine une tentative et libère l'examen actif", () => {
    createAttempt("exam-1", [q1], { mode: "exam" });
    expect(repository.getActiveExam(LOCAL_PROFILE_ID)?.id).toBe("exam-1");

    repository.completeAttempt({
      attemptId: "exam-1",
      completedAt: "2026-10-19T10:01:00.000Z",
      score: 1,
      passed: true,
      durationMs: 60_000,
    });

    expect(repository.getActiveExam(LOCAL_PROFILE_ID)).toBeNull();
    expect(repository.getAttempt(LOCAL_PROFILE_ID, "exam-1")?.status).toBe("completed");
  });

  it("interdit deux examens actifs pour le même profil", () => {
    createAttempt("exam-1", [q1], { mode: "exam" });

    expect(() => createAttempt("exam-2", [q2], { mode: "exam" })).toThrow(
      /UNIQUE constraint failed/,
    );
  });

  it("retient la dernière réponse de chaque question pour la révision", () => {
    createAttempt("attempt-a", [q1, q2], { startedAt: TEST_STARTED_AT });
    answer("attempt-a", q1, 0, false, "2026-10-19T10:01:00.000Z");
    answer("attempt-a", q2, 1, false, "2026-10-19T10:02:00.000Z");
    repository.completeAttempt({
      attemptId: "attempt-a",
      completedAt: "2026-10-19T10:05:00.000Z",
      score: 0,
      passed: null,
      durationMs: 300_000,
    });

    expect(repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID)).toEqual([
      "ch01-q001",
      "ch01-q002",
    ]);

    createAttempt("attempt-b", [q1], { startedAt: TEST_STARTED_AT });
    answer("attempt-b", q1, 0, true, "2026-10-19T10:09:00.000Z");
    repository.completeAttempt({
      attemptId: "attempt-b",
      completedAt: "2026-10-19T10:10:00.000Z",
      score: 1,
      passed: null,
      durationMs: 60_000,
    });

    expect(repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID)).toEqual(["ch01-q002"]);

    createAttempt("attempt-c", [q1], { startedAt: TEST_STARTED_AT });
    answer("attempt-c", q1, 0, false, "2026-10-19T10:14:00.000Z");
    repository.completeAttempt({
      attemptId: "attempt-c",
      completedAt: "2026-10-19T10:15:00.000Z",
      score: 0,
      passed: null,
      durationMs: 60_000,
    });

    expect(repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID)).toEqual([
      "ch01-q001",
      "ch01-q002",
    ]);
  });

  it("calcule les statistiques des tentatives terminées uniquement", () => {
    createAttempt("attempt-completed", [q1, q2]);
    answer("attempt-completed", q1, 0, true);
    answer("attempt-completed", q2, 1, false);
    repository.completeAttempt({
      attemptId: "attempt-completed",
      completedAt: "2026-10-19T10:05:00.000Z",
      score: 1,
      passed: null,
      durationMs: 300_000,
    });

    createAttempt("attempt-abandoned", [q1]);
    answer("attempt-abandoned", q1, 0, true);
    repository.abandonAttempt(LOCAL_PROFILE_ID, "attempt-abandoned", "2026-10-19T10:06:00.000Z");

    expect(repository.getCompletedStats(LOCAL_PROFILE_ID)).toEqual({
      completedAttempts: 1,
      answeredQuestions: 2,
      correctAnswers: 1,
      distinctQuestions: 2,
    });
  });

  it("retrouve le parcours actif d'une leçon et avance son étape", () => {
    createAttempt("run-1", [q1, q2], { lessonId: "ch01-l01" });

    expect(repository.getActiveLessonRun(LOCAL_PROFILE_ID, "ch01-l01")?.id).toBe("run-1");
    expect(repository.getActiveLessonRun(LOCAL_PROFILE_ID, "ch01-l02")).toBeNull();

    const initial = repository.getAttempt(LOCAL_PROFILE_ID, "run-1");
    expect(initial).toMatchObject({ lessonId: "ch01-l01", lessonStep: 0 });

    repository.setLessonStep(LOCAL_PROFILE_ID, "run-1", 3);
    expect(repository.getAttempt(LOCAL_PROFILE_ID, "run-1")?.lessonStep).toBe(3);

    repository.setLessonStep(LOCAL_PROFILE_ID, "run-1", 1);
    expect(repository.getAttempt(LOCAL_PROFILE_ID, "run-1")?.lessonStep).toBe(3);

    repository.completeAttempt({
      attemptId: "run-1",
      completedAt: "2026-10-19T10:05:00.000Z",
      score: 2,
      passed: null,
      durationMs: 300_000,
    });
    expect(repository.getActiveLessonRun(LOCAL_PROFILE_ID, "ch01-l01")).toBeNull();
  });

  it("gère la progression des leçons", () => {
    repository.setLessonRead(LOCAL_PROFILE_ID, "ch01-l01", true, TEST_STARTED_AT);
    expect(repository.getLessonProgress(LOCAL_PROFILE_ID)).toEqual([
      {
        lessonId: "ch01-l01",
        readAt: TEST_STARTED_AT,
        updatedAt: TEST_STARTED_AT,
      },
    ]);

    repository.setLessonRead(LOCAL_PROFILE_ID, "ch01-l01", false, "2026-10-19T11:00:00.000Z");
    expect(repository.getLessonProgress(LOCAL_PROFILE_ID)).toEqual([]);
  });

  it("détecte un snapshot altéré", () => {
    createAttempt("attempt-1", [q1]);
    db.prepare("UPDATE attempt_questions SET snapshot_json = '{}' WHERE attempt_id = ?").run(
      "attempt-1",
    );

    expect(() => repository.getAttempt(LOCAL_PROFILE_ID, "attempt-1")).toThrow(/Snapshot invalide/);
  });

  it("refuse d'enregistrer une réponse sur une tentative inconnue", () => {
    expect(() =>
      repository.recordAnswer({
        attemptId: "attempt-inconnue",
        position: 0,
        questionId: "ch01-q001",
        selectedOptionId: "a",
        isCorrect: true,
        timedOut: false,
        answeredAt: TEST_STARTED_AT,
        timeSpentMs: 1_000,
      }),
    ).toThrow(/introuvable/i);
  });
});
