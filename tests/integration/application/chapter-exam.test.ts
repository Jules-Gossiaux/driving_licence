import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContentNotFoundError, ProgressionLockedError } from "@/application/errors";
import { openExamSession, startChapterExam, submitExamAnswer } from "@/application/exam";
import { buildContentCatalog } from "@/domain/content/catalog";
import { InsufficientQuestionPoolError } from "@/domain/exam/selection";
import { CHAPTER_EXAM } from "@/domain/learning/progression";
import type { Attempt } from "@/domain/learning/types";
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
  context = createTestDependencies({ catalog: buildContent(56) });
});

afterEach(() => {
  context.close();
});

function markChapterRead(): void {
  context.deps.repository.setLessonRead(LOCAL_PROFILE_ID, "ch01-l01", true, TEST_STARTED_AT);
}

function getAttempt(attemptId = "attempt-1"): Attempt {
  const attempt = context.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);
  if (!attempt) {
    throw new Error(`Tentative absente : ${attemptId}`);
  }
  return attempt;
}

describe("examen de chapitre", () => {
  it("reste verrouillé tant que les leçons du chapitre ne sont pas terminées", () => {
    expect(() => startChapterExam(context.deps, "ch01")).toThrow(ProgressionLockedError);
  });

  it("refuse une banque inférieure au format de vingt questions", () => {
    const custom = createTestDependencies({
      catalog: buildContent(CHAPTER_EXAM.questionCount - 1),
    });

    try {
      custom.deps.repository.setLessonRead(LOCAL_PROFILE_ID, "ch01-l01", true, TEST_STARTED_AT);
      expect(() => startChapterExam(custom.deps, "ch01")).toThrow(InsufficientQuestionPoolError);
    } finally {
      custom.close();
    }
  });

  it("crée un examen de chapitre de vingt questions", () => {
    markChapterRead();

    expect(startChapterExam(context.deps, "ch01")).toEqual({
      attemptId: "attempt-1",
      resumed: false,
    });

    const attempt = getAttempt();
    expect(attempt).toMatchObject({
      mode: "exam",
      presetId: null,
      chapterId: "ch01",
      questionCount: CHAPTER_EXAM.questionCount,
      secondsPerQuestion: CHAPTER_EXAM.secondsPerQuestion,
      passingScore: CHAPTER_EXAM.passingScore,
      errorPenalty: CHAPTER_EXAM.errorPenalty,
      severeErrorPenalty: CHAPTER_EXAM.severeErrorPenalty,
    });

    const opened = openExamSession(context.deps, attempt.id);
    expect(opened.kind).toBe("session");
    if (opened.kind === "session") {
      expect(opened.session.title).toBe("Examen · Chapitre de test");
      expect(opened.session.questionCount).toBe(CHAPTER_EXAM.questionCount);
    }
  });

  it("reprend l'examen actif au lieu d'en créer un second", () => {
    markChapterRead();
    startChapterExam(context.deps, "ch01");

    expect(startChapterExam(context.deps, "ch01")).toEqual({
      attemptId: "attempt-1",
      resumed: true,
    });
  });

  it("applique le seuil de réussite et enregistre le résultat", () => {
    markChapterRead();
    const { attemptId } = startChapterExam(context.deps, "ch01");

    for (let position = 0; position < CHAPTER_EXAM.questionCount; position += 1) {
      const question = getAttempt(attemptId).questions[position];
      if (!question) {
        throw new Error(`Question absente : ${position}`);
      }

      submitExamAnswer(context.deps, {
        attemptId,
        position,
        optionId: question.snapshot.correctOptionId,
      });
    }

    expect(context.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId)).toMatchObject({
      status: "completed",
      score: CHAPTER_EXAM.questionCount,
      passed: true,
      chapterId: "ch01",
      presetId: null,
    });
    expect(
      context.deps.repository.getLatestCompletedChapterExam(LOCAL_PROFILE_ID, "ch01"),
    ).toMatchObject({
      id: attemptId,
      score: CHAPTER_EXAM.questionCount,
      passed: true,
    });
  });

  it("signale un chapitre inconnu", () => {
    expect(() => startChapterExam(context.deps, "chapitre-inconnu")).toThrow(ContentNotFoundError);
  });
});
