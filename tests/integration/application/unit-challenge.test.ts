import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContentNotFoundError, ProgressionLockedError } from "@/application/errors";
import {
  getTrainingSession,
  startUnitChallenge,
  submitTrainingAnswer,
} from "@/application/practice";
import { buildContentCatalog } from "@/domain/content/catalog";
import { UNIT_CHALLENGE_QUESTION_COUNT } from "@/domain/learning/progression";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  createTestDependencies,
  TEST_STARTED_AT,
  testChapter,
  testLesson,
  testQuestion,
  testRawContent,
  type TestDependencies,
} from "../../helpers/fixtures";

const UNIT = {
  id: "ch01-u1",
  slug: "unite-1",
  order: 1,
  label: "1.1",
  title: "Unité de test",
};

function buildContent(questionCount: number) {
  const raw = testRawContent();
  raw.presets = [];
  raw.chapters[0]!.chapter = testChapter({ units: [UNIT] });
  raw.chapters[0]!.lessons = [testLesson({ unitId: UNIT.id })];
  raw.chapters[0]!.questions = Array.from({ length: questionCount }, (_, index) =>
    testQuestion({ id: `ch01-q${String(index + 1).padStart(3, "0")}` }),
  );

  return buildContentCatalog(raw).catalog;
}

let context: TestDependencies;

beforeEach(() => {
  context = createTestDependencies({ catalog: buildContent(25) });
});

afterEach(() => {
  context.close();
});

function markUnitRead() {
  context.deps.repository.setLessonRead(LOCAL_PROFILE_ID, "ch01-l01", true, TEST_STARTED_AT);
}

describe("défi d'unité", () => {
  it("reste verrouillé tant que toutes les leçons de l'unité ne sont pas terminées", () => {
    expect(() => startUnitChallenge(context.deps, "ch01", UNIT.id)).toThrow(ProgressionLockedError);
  });

  it("tire vingt questions parmi celles des leçons de l'unité", () => {
    markUnitRead();

    const { attemptId } = startUnitChallenge(context.deps, "ch01", UNIT.id);
    const attempt = context.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);

    expect(attempt).toMatchObject({
      mode: "practice",
      chapterId: "ch01",
      unitId: UNIT.id,
      lessonId: null,
      questionCount: UNIT_CHALLENGE_QUESTION_COUNT,
      passingScore: null,
    });
    expect(new Set(attempt?.questions.map((question) => question.snapshot.questionId)).size).toBe(
      UNIT_CHALLENGE_QUESTION_COUNT,
    );

    const session = getTrainingSession(context.deps, attemptId);
    expect(session).toMatchObject({
      eyebrow: "Défi",
      title: "1.1 — Unité de test",
      initialPosition: 0,
    });
    expect(session.questions).toHaveLength(UNIT_CHALLENGE_QUESTION_COUNT);
  });

  it("termine sans seuil et alimente le dernier défi de l'unité", () => {
    markUnitRead();
    const { attemptId } = startUnitChallenge(context.deps, "ch01", UNIT.id);
    const attempt = context.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);
    if (!attempt) {
      throw new Error("Défi absent.");
    }

    for (const question of attempt.questions) {
      submitTrainingAnswer(context.deps, {
        attemptId,
        position: question.position,
        optionId: question.snapshot.correctOptionId,
      });
    }

    expect(context.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId)).toMatchObject({
      status: "completed",
      score: UNIT_CHALLENGE_QUESTION_COUNT,
      passed: null,
    });
    expect(
      context.deps.repository.getLatestCompletedUnitChallenge(LOCAL_PROFILE_ID, UNIT.id),
    ).toMatchObject({
      id: attemptId,
      score: UNIT_CHALLENGE_QUESTION_COUNT,
      questionCount: UNIT_CHALLENGE_QUESTION_COUNT,
      passed: null,
    });
  });

  it("signale une unité inconnue", () => {
    markUnitRead();

    expect(() => startUnitChallenge(context.deps, "ch01", "unite-inconnue")).toThrow(
      ContentNotFoundError,
    );
  });
});
