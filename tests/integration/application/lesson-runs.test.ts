import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LessonLockedError, PracticeUnavailableError } from "@/application/errors";
import {
  getLessonRunView,
  saveLessonRunStep,
  startLessonRun,
  submitLessonRetry,
} from "@/application/lesson-runs";
import { startChapterPractice, submitTrainingAnswer } from "@/application/practice";
import { buildContentCatalog } from "@/domain/content/catalog";
import { AttemptConflictError } from "@/domain/learning/errors";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  createTestDependencies,
  testLesson,
  testQuestion,
  testRawContent,
  type TestDependencies,
} from "../../helpers/fixtures";

let context: TestDependencies;

function buildLessonRunContent() {
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
      },
    ],
  };

  raw.chapters[0]!.questions = [
    testQuestion({ id: "ch01-q001" }),
    testQuestion({ id: "ch01-q002" }),
    testQuestion({ id: "ch01-q003" }),
    testQuestion({ id: "ch01-q004" }),
    testQuestion({ id: "ch01-q005", lessonIds: ["ch01-l02"] }),
    testQuestion({ id: "ch01-q006", lessonIds: ["ch01-l02"] }),
    testQuestion({ id: "ch01-q007", lessonIds: ["ch01-l02"] }),
    testQuestion({ id: "ch01-q008", lessonIds: ["ch01-l02"] }),
  ];

  raw.chapters[0]!.lessons = [
    testLesson({
      id: "ch01-l01",
      unitId: "ch01-u1",
      body: [
        "Un chapeau introductif.",
        "",
        "## Première partie",
        "",
        "Texte A.",
        "",
        "## Seconde partie",
        "",
        "Texte B.",
      ].join("\n"),
      coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"],
      sectionChecks: [{ section: "premiere-partie", questionIds: ["ch01-q001"] }],
    }),
    testLesson({
      id: "ch01-l02",
      slug: "lecon-2",
      order: 2,
      unitId: "ch01-u1",
      body: "## Deuxième leçon\n\nTexte.",
      coreQuestionIds: ["ch01-q005", "ch01-q006", "ch01-q007", "ch01-q008"],
      sectionChecks: [{ section: "deuxieme-lecon", questionIds: ["ch01-q005"] }],
    }),
  ];

  return raw;
}

beforeEach(() => {
  context = createTestDependencies({
    catalog: buildContentCatalog(buildLessonRunContent()).catalog,
  });
});

afterEach(() => {
  context.close();
});

function getAttempt(attemptId: string) {
  const attempt = context.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);
  if (!attempt) {
    throw new Error(`Tentative absente : ${attemptId}`);
  }
  return attempt;
}

function answerCorrectly(attemptId: string): void {
  for (const question of getAttempt(attemptId).questions) {
    submitTrainingAnswer(context.deps, {
      attemptId,
      position: question.position,
      optionId: question.snapshot.correctOptionId,
    });
  }
}

describe("parcours de leçon", () => {
  it("intercale les vérifications entre les sections et garde le quiz final", () => {
    const run = startLessonRun(context.deps, "ch01-l01");

    expect(run.resumed).toBe(false);
    const view = getLessonRunView(context.deps, run.attemptId);
    const timeline = view.steps.map((step) =>
      step.kind === "content" ? step.sectionId : step.questionId,
    );

    expect(timeline).toEqual([
      "introduction",
      "premiere-partie",
      "ch01-q001",
      "seconde-partie",
      "ch01-q002",
      "ch01-q003",
      "ch01-q004",
    ]);
    expect(view.steps[2]).toMatchObject({
      kind: "question",
      purpose: "check",
      sectionId: "premiere-partie",
      questionNumber: 1,
    });
    expect(view.steps[4]).toMatchObject({ kind: "question", purpose: "quiz", sectionId: null });
    expect(view).toMatchObject({
      lessonId: "ch01-l01",
      lessonSlug: "lecon-1",
      unitLabel: "1.1",
      unitTitle: "Unité de test",
      completed: false,
      initialStepIndex: 0,
      questionCount: 4,
      nextLesson: { slug: "lecon-2", title: "Leçon de test" },
    });

    const questionStep = view.steps[2];
    if (questionStep?.kind !== "question") {
      throw new Error("Étape de question absente.");
    }
    expect(questionStep.answered).toBe(false);
    expect(questionStep.correctOptionId).toBeNull();
    expect(questionStep.explanation).toBeNull();
    expect(questionStep.question).not.toHaveProperty("correctOptionId");
  });

  it("reprend un parcours actif sans reculer", () => {
    const first = startLessonRun(context.deps, "ch01-l01");
    saveLessonRunStep(context.deps, { attemptId: first.attemptId, stepIndex: 3 });

    const resumed = startLessonRun(context.deps, "ch01-l01");
    expect(resumed).toEqual({ attemptId: first.attemptId, resumed: true });
    expect(getLessonRunView(context.deps, first.attemptId).initialStepIndex).toBe(3);

    saveLessonRunStep(context.deps, { attemptId: first.attemptId, stepIndex: 1 });
    expect(getLessonRunView(context.deps, first.attemptId).initialStepIndex).toBe(3);
  });

  it("refuse de suivre l'étape d'une tentative qui n'est pas un parcours", () => {
    const practice = startChapterPractice(context.deps, "ch01");

    expect(() =>
      saveLessonRunStep(context.deps, { attemptId: practice.attemptId, stepIndex: 1 }),
    ).toThrow(AttemptConflictError);
  });

  it("verrouille la leçon suivante jusqu'à la fin de la précédente", () => {
    expect(() => startLessonRun(context.deps, "ch01-l02")).toThrow(LessonLockedError);

    const run = startLessonRun(context.deps, "ch01-l01");
    answerCorrectly(run.attemptId);

    expect(getAttempt(run.attemptId).status).toBe("completed");
    expect(context.deps.repository.getLessonProgress(LOCAL_PROFILE_ID)).toEqual([
      expect.objectContaining({ lessonId: "ch01-l01" }),
    ]);

    expect(() => startLessonRun(context.deps, "ch01-l02")).not.toThrow();
  });

  it("expose les corrections et l'étape finale une fois le parcours terminé", () => {
    const run = startLessonRun(context.deps, "ch01-l01");
    answerCorrectly(run.attemptId);

    const view = getLessonRunView(context.deps, run.attemptId);

    expect(view.completed).toBe(true);
    expect(view.correctCount).toBe(4);
    expect(view.initialStepIndex).toBe(view.steps.length);

    const answeredSteps = view.steps.filter((step) => step.kind === "question");
    expect(answeredSteps).toHaveLength(4);
    for (const step of answeredSteps) {
      if (step.kind !== "question") {
        continue;
      }
      expect(step.answered).toBe(true);
      expect(step.correctOptionId).not.toBeNull();
      expect(step.explanation).not.toHaveLength(0);
      expect(step.isCorrect).toBe(true);
    }

    const replay = startLessonRun(context.deps, "ch01-l01");
    expect(replay.resumed).toBe(false);
    expect(replay.attemptId).not.toBe(run.attemptId);
  });

  it("repose à la fin les questions ratées et conserve le score initial", () => {
    const run = startLessonRun(context.deps, "ch01-l01");
    const started = getAttempt(run.attemptId);

    for (const question of started.questions) {
      submitTrainingAnswer(context.deps, {
        attemptId: run.attemptId,
        position: question.position,
        optionId: question.position === 0 ? "b" : question.snapshot.correctOptionId,
      });
    }

    expect(getAttempt(run.attemptId).status).toBe("in_progress");
    expect(context.deps.repository.getLessonProgress(LOCAL_PROFILE_ID)).toEqual([]);

    const pendingView = getLessonRunView(context.deps, run.attemptId);
    expect(pendingView).toMatchObject({
      completed: false,
      retryCount: 1,
      retryCorrectCount: 0,
    });
    const retryStep = pendingView.steps.at(-1);
    expect(retryStep).toMatchObject({
      kind: "question",
      purpose: "retry",
      questionId: started.questions[0]!.snapshot.questionId,
      questionNumber: 1,
      answered: false,
      correctOptionId: null,
      explanation: null,
    });

    if (!retryStep || retryStep.kind !== "question") {
      throw new Error("Étape de reprise absente.");
    }

    const feedback = submitLessonRetry(context.deps, {
      attemptId: run.attemptId,
      position: retryStep.position,
      optionId: started.questions[0]!.snapshot.correctOptionId,
    });

    expect(feedback.completed).toBe(true);
    const completed = getAttempt(run.attemptId);
    expect(completed.status).toBe("completed");
    expect(completed.score).toBe(3);
    expect(completed.questions[0]).toMatchObject({
      isCorrect: false,
      retryIsCorrect: true,
      retrySelectedOptionId: completed.questions[0]!.snapshot.correctOptionId,
    });
    expect(context.deps.repository.getLessonProgress(LOCAL_PROFILE_ID)).toEqual([
      expect.objectContaining({ lessonId: "ch01-l01" }),
    ]);
    expect(getLessonRunView(context.deps, run.attemptId)).toMatchObject({
      completed: true,
      correctCount: 3,
      retryCount: 1,
      retryCorrectCount: 1,
    });
  });

  it("reprend une erreur à l'étape enregistrée et termine même si elle reste fausse", () => {
    const run = startLessonRun(context.deps, "ch01-l01");
    const started = getAttempt(run.attemptId);

    for (const question of started.questions) {
      submitTrainingAnswer(context.deps, {
        attemptId: run.attemptId,
        position: question.position,
        optionId: question.position === 0 ? "b" : question.snapshot.correctOptionId,
      });
    }

    const pendingView = getLessonRunView(context.deps, run.attemptId);
    const retryIndex = pendingView.steps.length - 1;
    saveLessonRunStep(context.deps, { attemptId: run.attemptId, stepIndex: retryIndex });

    expect(getLessonRunView(context.deps, run.attemptId).initialStepIndex).toBe(retryIndex);

    const retryStep = pendingView.steps[retryIndex];
    if (!retryStep || retryStep.kind !== "question") {
      throw new Error("Étape de reprise absente.");
    }

    const feedback = submitLessonRetry(context.deps, {
      attemptId: run.attemptId,
      position: retryStep.position,
      optionId: "b",
    });

    expect(feedback.completed).toBe(true);
    expect(feedback.isCorrect).toBe(false);
    expect(getAttempt(run.attemptId).status).toBe("completed");
    expect(getLessonRunView(context.deps, run.attemptId)).toMatchObject({
      completed: true,
      retryCorrectCount: 0,
    });
  });

  it("protège la phase de reprise", () => {
    const run = startLessonRun(context.deps, "ch01-l01");
    const started = getAttempt(run.attemptId);
    const first = started.questions[0]!;

    submitTrainingAnswer(context.deps, {
      attemptId: run.attemptId,
      position: first.position,
      optionId: "b",
    });

    expect(() =>
      submitLessonRetry(context.deps, {
        attemptId: run.attemptId,
        position: first.position,
        optionId: first.snapshot.correctOptionId,
      }),
    ).toThrow(AttemptConflictError);

    for (const question of getAttempt(run.attemptId).questions) {
      if (question.answeredAt === null) {
        submitTrainingAnswer(context.deps, {
          attemptId: run.attemptId,
          position: question.position,
          optionId: question.snapshot.correctOptionId,
        });
      }
    }

    const second = getAttempt(run.attemptId).questions[1]!;
    expect(() =>
      submitLessonRetry(context.deps, {
        attemptId: run.attemptId,
        position: second.position,
        optionId: second.snapshot.correctOptionId,
      }),
    ).toThrow(AttemptConflictError);

    submitLessonRetry(context.deps, {
      attemptId: run.attemptId,
      position: first.position,
      optionId: first.snapshot.correctOptionId,
    });

    expect(getAttempt(run.attemptId).status).toBe("completed");
  });

  it("refuse une leçon sans questions cœur", () => {
    const raw = buildLessonRunContent();
    raw.chapters[0]!.lessons[2] = testLesson({
      id: "ch01-l03",
      slug: "lecon-3",
      order: 3,
      unitId: "ch01-u1",
      coreQuestionIds: undefined,
    });

    const custom = createTestDependencies({
      catalog: buildContentCatalog(raw).catalog,
    });

    try {
      expect(() => startLessonRun(custom.deps, "ch01-l03")).toThrow(PracticeUnavailableError);
    } finally {
      custom.close();
    }
  });
});
