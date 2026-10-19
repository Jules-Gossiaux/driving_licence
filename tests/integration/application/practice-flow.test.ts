import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startExam } from "@/application/exam";
import { InvalidAnswerError, PracticeUnavailableError } from "@/application/errors";
import {
  getTrainingSession,
  startChapterPractice,
  startLessonPractice,
  startReviewSession,
  submitTrainingAnswer,
} from "@/application/practice";
import { AttemptConflictError } from "@/domain/learning/errors";
import { buildContentCatalog } from "@/domain/content/catalog";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  createTestDependencies,
  testLesson,
  testQuestion,
  testRawContent,
  type TestDependencies,
} from "../../helpers/fixtures";

let context: TestDependencies;

beforeEach(() => {
  context = createTestDependencies();
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

function optionFor(position: number, correct: boolean): string {
  const question = getAttempt().questions[position];
  if (!question) {
    throw new Error(`Question absente : ${position}`);
  }
  if (correct) {
    return question.snapshot.correctOptionId;
  }
  const option = question.snapshot.options.find(
    (candidate) => candidate.id !== question.snapshot.correctOptionId,
  );
  if (!option) {
    throw new Error("Aucune mauvaise option disponible.");
  }
  return option.id;
}

describe("sessions d'entraînement", () => {
  it("démarre une session sans exposer les réponses", () => {
    const { attemptId } = startChapterPractice(context.deps, "ch01");
    const session = getTrainingSession(context.deps, attemptId);

    expect(attemptId).toBe("attempt-1");
    expect(session.mode).toBe("practice");
    expect(session.initialPosition).toBe(0);
    expect(session.questions).toHaveLength(3);
    expect(session.questions[0]).not.toHaveProperty("correctOptionId");
    expect(session.questions[0]).not.toHaveProperty("explanation");
  });

  it("donne une correction immédiate et termine la session", () => {
    const { attemptId } = startChapterPractice(context.deps, "ch01");

    const first = submitTrainingAnswer(context.deps, {
      attemptId,
      position: 0,
      optionId: optionFor(0, true),
    });
    expect(first).toMatchObject({ isCorrect: true, nextPosition: 1, completed: false });
    expect(first.explanation).not.toHaveLength(0);

    const second = submitTrainingAnswer(context.deps, {
      attemptId,
      position: 1,
      optionId: optionFor(1, false),
    });
    expect(second).toMatchObject({ isCorrect: false, nextPosition: 2, completed: false });
    expect(second.correctOptionId).not.toBe(second.selectedOptionId);

    const third = submitTrainingAnswer(context.deps, {
      attemptId,
      position: 2,
      optionId: optionFor(2, true),
    });
    expect(third).toMatchObject({ isCorrect: true, nextPosition: null, completed: true });

    const attempt = getAttempt();
    expect(attempt.status).toBe("completed");
    expect(attempt.score).toBe(2);
    expect(attempt.passed).toBeNull();
    expect(getTrainingSession(context.deps, attemptId)).toMatchObject({
      alreadyCompleted: true,
      initialPosition: 3,
    });
  });

  it("refuse une option inconnue et une seconde réponse", () => {
    const { attemptId } = startChapterPractice(context.deps, "ch01");

    expect(() =>
      submitTrainingAnswer(context.deps, { attemptId, position: 0, optionId: "z" }),
    ).toThrow(InvalidAnswerError);

    submitTrainingAnswer(context.deps, {
      attemptId,
      position: 0,
      optionId: optionFor(0, true),
    });

    expect(() =>
      submitTrainingAnswer(context.deps, {
        attemptId,
        position: 0,
        optionId: optionFor(0, true),
      }),
    ).toThrow(AttemptConflictError);
  });

  it("limite une session à dix questions", () => {
    const raw = testRawContent();
    raw.chapters[0]!.questions = Array.from({ length: 12 }, (_, index) =>
      testQuestion({ id: `ch01-q${String(index + 1).padStart(3, "0")}` }),
    );

    const custom = createTestDependencies({
      catalog: buildContentCatalog(raw).catalog,
    });

    try {
      const { attemptId } = startChapterPractice(custom.deps, "ch01");
      expect(custom.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId)?.questionCount).toBe(
        10,
      );
    } finally {
      custom.close();
    }
  });

  it("démarre un entraînement avec les questions cœur de la leçon", () => {
    const raw = testRawContent();
    raw.chapters[0]!.questions.push(testQuestion({ id: "ch01-q004" }));
    raw.chapters[0]!.lessons[0] = testLesson({
      coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"],
    });

    const custom = createTestDependencies({
      catalog: buildContentCatalog(raw).catalog,
    });

    try {
      const { attemptId } = startLessonPractice(custom.deps, "ch01-l01");
      const attempt = custom.deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);

      expect(attempt?.questionCount).toBe(4);
      expect(new Set(attempt?.questions.map((question) => question.snapshot.questionId))).toEqual(
        new Set(["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"]),
      );
    } finally {
      custom.close();
    }
  });

  it("refuse un chapitre inconnu", () => {
    expect(() => startChapterPractice(context.deps, "chapitre-inconnu")).toThrow(/chapitre/);
  });

  it("refuse d'ouvrir une session d'examen comme entraînement", () => {
    const { attemptId } = startExam(context.deps, "preset-demo");

    expect(() => getTrainingSession(context.deps, attemptId)).toThrow(AttemptConflictError);
    expect(() =>
      submitTrainingAnswer(context.deps, { attemptId, position: 0, optionId: "a" }),
    ).toThrow(AttemptConflictError);
  });
});

describe("révision des erreurs", () => {
  it("reprend uniquement les erreurs de la dernière tentative", () => {
    const { attemptId } = startChapterPractice(context.deps, "ch01");
    submitTrainingAnswer(context.deps, {
      attemptId,
      position: 0,
      optionId: optionFor(0, true),
    });
    submitTrainingAnswer(context.deps, {
      attemptId,
      position: 1,
      optionId: optionFor(1, false),
    });
    submitTrainingAnswer(context.deps, {
      attemptId,
      position: 2,
      optionId: optionFor(2, true),
    });

    const wrongQuestionId = getAttempt(attemptId).questions[1]!.snapshot.questionId;

    expect(context.deps.repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID)).toEqual([
      wrongQuestionId,
    ]);

    const review = startReviewSession(context.deps);
    const session = getTrainingSession(context.deps, review.attemptId);

    expect(session.mode).toBe("review");
    expect(session.title).toBe("Révision des erreurs");
    expect(session.questions).toHaveLength(1);
    expect(session.questions[0]?.id).toBe(wrongQuestionId);

    const answer = submitTrainingAnswer(context.deps, {
      attemptId: review.attemptId,
      position: 0,
      optionId: getAttempt(review.attemptId).questions[0]!.snapshot.correctOptionId,
    });

    expect(answer.completed).toBe(true);
    expect(context.deps.repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID)).toEqual([]);
    expect(() => startReviewSession(context.deps)).toThrow(PracticeUnavailableError);
  });

  it("signale l'absence d'erreurs à réviser", () => {
    expect(() => startReviewSession(context.deps)).toThrow(PracticeUnavailableError);
  });
});
