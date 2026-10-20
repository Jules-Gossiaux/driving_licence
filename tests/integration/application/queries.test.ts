import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startExam, submitExamAnswer } from "@/application/exam";
import { ContentNotFoundError } from "@/application/errors";
import {
  getAttemptResult,
  getChapterDetail,
  getDashboardView,
  getLessonDetail,
  getReviewItems,
} from "@/application/queries";
import { buildContentCatalog } from "@/domain/content/catalog";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  createTestDependencies,
  TEST_STARTED_AT,
  testLesson,
  testRawContent,
  type TestDependencies,
} from "../../helpers/fixtures";

let context: TestDependencies;

beforeEach(() => {
  const raw = testRawContent();
  raw.chapters[0]!.questions = raw.chapters[0]!.questions.map((question) => ({
    ...question,
    severity: "severe",
  }));
  context = createTestDependencies({ catalog: buildContentCatalog(raw).catalog });
});

afterEach(() => {
  context.close();
});

function getAttempt(attemptId = "attempt-1") {
  const attempt = context.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);
  if (!attempt) {
    throw new Error(`Tentative absente : ${attemptId}`);
  }
  return attempt;
}

function wrongOptionId(position: number): string {
  const question = getAttempt().questions[position]!;
  return question.snapshot.options.find(
    (option) => option.id !== question.snapshot.correctOptionId,
  )!.id;
}

function completeMixedExam(attemptId: string): void {
  submitExamAnswer(context.deps, {
    attemptId,
    position: 0,
    optionId: getAttempt(attemptId).questions[0]!.snapshot.correctOptionId,
  });
  submitExamAnswer(context.deps, {
    attemptId,
    position: 1,
    optionId: wrongOptionId(1),
  });
  context.clock.advance(17_000);
  submitExamAnswer(context.deps, { attemptId, position: 2, optionId: null });
}

describe("getAttemptResult", () => {
  it("retourne le détail complet d'un examen terminé", () => {
    const { attemptId } = startExam(context.deps, "preset-demo");
    completeMixedExam(attemptId);

    const lookup = getAttemptResult(context.deps, attemptId);

    expect(lookup.kind).toBe("completed");
    if (lookup.kind !== "completed") {
      return;
    }

    const result = lookup.result;
    expect(result).toMatchObject({
      attemptId,
      mode: "exam",
      title: "Examen de test",
      questionCount: 3,
      correctCount: 1,
      incorrectCount: 2,
      timedOutCount: 1,
      penaltyPoints: 6,
      score: 0,
      passingScore: 2,
      passed: false,
    });
    expect(result.questions[0]?.isCorrect).toBe(true);
    expect(result.questions[1]?.severity).toBe("severe");
    expect(result.questions[1]?.selectedOptionId).not.toBe(result.questions[1]?.correctOptionId);
    expect(result.questions[2]?.timedOut).toBe(true);
    expect(result.questions[2]?.selectedOptionId).toBeNull();
    expect(result.questions[0]?.explanation).not.toHaveLength(0);
    expect(result.questions[0]?.sources[0]?.title).toBe("Source officielle de test");
  });

  it("signale une tentative encore en cours", () => {
    const { attemptId } = startExam(context.deps, "preset-demo");

    expect(getAttemptResult(context.deps, attemptId)).toEqual({
      kind: "in_progress",
      attemptId,
      mode: "exam",
    });
  });

  it("signale une tentative introuvable", () => {
    expect(() => getAttemptResult(context.deps, "attempt-inconnue")).toThrow(
      /Tentative introuvable/,
    );
  });
});

describe("getDashboardView", () => {
  it("agrège la progression, les tentatives et la révision", () => {
    const { attemptId } = startExam(context.deps, "preset-demo");
    completeMixedExam(attemptId);

    const view = getDashboardView(context.deps);

    expect(view.stats).toEqual({
      completedAttempts: 1,
      answeredQuestions: 3,
      correctAnswers: 1,
      distinctQuestions: 3,
    });
    expect(view.accuracyPercent).toBe(33);
    expect(view.reviewCount).toBe(2);
    expect(view.activeExam).toBeNull();
    expect(view.officialPublishedQuestionCount).toBe(0);
    expect(view.recentAttempts).toHaveLength(1);
    expect(view.recentAttempts[0]).toMatchObject({
      id: attemptId,
      title: "Examen de test",
      score: 0,
      questionCount: 3,
      passed: false,
    });
    expect(view.presets[0]).toMatchObject({
      id: "preset-demo",
      availableQuestions: 3,
      locked: false,
      isDemo: true,
    });
    expect(view.nextLesson).toEqual({
      chapterSlug: "chapitre-1",
      lessonSlug: "lecon-1",
      title: "Leçon de test",
    });
  });
});

describe("getReviewItems", () => {
  it("liste les dernières erreurs avec leur correction", () => {
    const { attemptId } = startExam(context.deps, "preset-demo");
    completeMixedExam(attemptId);

    const items = getReviewItems(context.deps);
    const attempt = getAttempt(attemptId);
    const expectedIds = [
      attempt.questions[1]!.snapshot.questionId,
      attempt.questions[2]!.snapshot.questionId,
    ].sort();

    expect(items.map((item) => item.questionId)).toEqual(expectedIds);
    expect(items[0]).toMatchObject({
      chapterSlug: "chapitre-1",
      chapterTitle: "Chapitre de test",
      lessonTitles: ["Leçon de test"],
      correctOptionId: expect.any(String),
    });
    expect(items[0]?.options.length).toBe(3);
    expect(items[0]?.explanation).not.toHaveLength(0);
  });
});

describe("consultation du contenu", () => {
  it("retourne un chapitre et une leçon avec leur progression", () => {
    const chapter = getChapterDetail(context.deps, "chapitre-1");
    expect(chapter).toMatchObject({
      id: "ch01",
      questionCount: 3,
      lessonCount: 1,
      readLessonCount: 0,
    });

    context.deps.repository.setLessonRead(LOCAL_PROFILE_ID, "ch01-l01", true, TEST_STARTED_AT);

    const lesson = getLessonDetail(context.deps, "chapitre-1", "lecon-1");
    expect(lesson.lesson.id).toBe("ch01-l01");
    expect(lesson.chapterSlug).toBe("chapitre-1");
    expect(lesson.readAt).toBe(TEST_STARTED_AT);
    expect(lesson.sources[0]?.title).toBe("Source officielle de test");
  });

  it("signale un chapitre ou une leçon inconnus", () => {
    expect(() => getChapterDetail(context.deps, "inconnu")).toThrow(ContentNotFoundError);
    expect(() => getLessonDetail(context.deps, "chapitre-1", "inconnue")).toThrow(
      ContentNotFoundError,
    );
  });

  it("regroupe les leçons par unité et verrouille les suivantes", () => {
    const raw = testRawContent();
    raw.chapters[0]!.chapter = {
      ...raw.chapters[0]!.chapter,
      units: [
        {
          id: "ch01-u1",
          slug: "unite-1",
          order: 1,
          label: "1.1",
          title: "Unité de test",
          summary: "Résumé de l'unité.",
        },
      ],
    };
    raw.chapters[0]!.lessons = [
      testLesson({ unitId: "ch01-u1" }),
      testLesson({ id: "ch01-l02", slug: "lecon-2", order: 2, unitId: "ch01-u1" }),
    ];

    const custom = createTestDependencies({
      catalog: buildContentCatalog(raw).catalog,
    });

    try {
      const chapter = getChapterDetail(custom.deps, "chapitre-1");
      expect(chapter.units).toHaveLength(1);
      expect(chapter.units[0]).toMatchObject({
        id: "ch01-u1",
        label: "1.1",
        title: "Unité de test",
        lessonCount: 2,
        readLessonCount: 0,
      });
      expect(chapter.units[0]?.lessons.map((lesson) => lesson.slug)).toEqual([
        "lecon-1",
        "lecon-2",
      ]);
      expect(chapter.lessons.map((lesson) => lesson.locked)).toEqual([false, true]);
      expect(getLessonDetail(custom.deps, "chapitre-1", "lecon-2").locked).toBe(true);

      custom.deps.repository.setLessonRead(LOCAL_PROFILE_ID, "ch01-l01", true, TEST_STARTED_AT);

      const unlocked = getChapterDetail(custom.deps, "chapitre-1");
      expect(unlocked.units[0]?.readLessonCount).toBe(1);
      expect(unlocked.lessons.map((lesson) => lesson.locked)).toEqual([false, false]);
      expect(getLessonDetail(custom.deps, "chapitre-1", "lecon-2").locked).toBe(false);
    } finally {
      custom.close();
    }
  });
});
