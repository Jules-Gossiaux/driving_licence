import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openExamSession, startExam, submitExamAnswer } from "@/application/exam";
import { InvalidAnswerError } from "@/application/errors";
import { buildContentCatalog } from "@/domain/content/catalog";
import { InsufficientQuestionPoolError } from "@/domain/exam/selection";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import { createQuestionSnapshot } from "@/domain/learning/snapshot";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  createTestDependencies,
  TEST_STARTED_AT,
  testPreset,
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

function wrongOptionId(attemptId: string, position: number): string {
  const question = getAttempt(attemptId).questions[position];
  if (!question) {
    throw new Error(`Question absente : ${position}`);
  }
  const option = question.snapshot.options.find(
    (candidate) => candidate.id !== question.snapshot.correctOptionId,
  );
  if (!option) {
    throw new Error("Aucune mauvaise option disponible.");
  }
  return option.id;
}

function correctOptionId(attemptId: string, position: number): string {
  const question = getAttempt(attemptId).questions[position];
  if (!question) {
    throw new Error(`Question absente : ${position}`);
  }
  return question.snapshot.correctOptionId;
}

describe("startExam", () => {
  it("crée un examen et présente la première question avec sa limite de temps", () => {
    expect(startExam(context.deps, "preset-demo")).toEqual({
      attemptId: "attempt-1",
      resumed: false,
    });

    const attempt = getAttempt();
    expect(attempt.questionCount).toBe(3);
    expect(attempt.secondsPerQuestion).toBe(15);
    expect(attempt.passingScore).toBe(2);
    expect(attempt.questions[0]?.presentedAt).toBe(TEST_STARTED_AT);
    expect(attempt.questions[0]?.deadlineAt).toBe("2026-10-19T10:00:15.000Z");
  });

  it("reprend l'examen actif au lieu d'en créer un second", () => {
    startExam(context.deps, "preset-demo");
    context.clock.advance(5_000);

    expect(startExam(context.deps, "preset-demo")).toEqual({
      attemptId: "attempt-1",
      resumed: true,
    });
  });

  it("refuse un preset dont la banque est insuffisante", () => {
    const raw = testRawContent();
    raw.presets = [testPreset({ id: "preset-officiel", allowUnpublished: false })];
    const custom = createTestDependencies({ catalog: buildContentCatalog(raw).catalog });

    try {
      expect(() => startExam(custom.deps, "preset-officiel")).toThrow(
        InsufficientQuestionPoolError,
      );
    } finally {
      custom.close();
    }
  });

  it("signale un preset inconnu", () => {
    expect(() => startExam(context.deps, "preset-inconnu")).toThrow(/preset d'examen/);
  });
});

describe("openExamSession", () => {
  it("expose la question publique sans réponse ni explication", () => {
    startExam(context.deps, "preset-demo");
    const opened = openExamSession(context.deps, "attempt-1");

    expect(opened.kind).toBe("session");
    if (opened.kind !== "session") {
      return;
    }

    expect(opened.session.questionNumber).toBe(1);
    expect(opened.session.questionCount).toBe(3);
    expect(opened.session.remainingSeconds).toBe(15);
    expect(opened.session.question).not.toHaveProperty("correctOptionId");
    expect(opened.session.question).not.toHaveProperty("explanation");
  });

  it("recalcule le temps restant côté serveur", () => {
    startExam(context.deps, "preset-demo");
    context.clock.advance(4_000);

    const opened = openExamSession(context.deps, "attempt-1");

    expect(opened.kind).toBe("session");
    if (opened.kind === "session") {
      expect(opened.session.remainingSeconds).toBe(11);
    }
  });

  it("signale une tentative d'entraînement comme invalide", () => {
    const question = context.deps.catalog.questions[0];
    if (!question) {
      throw new Error("Question de test absente.");
    }

    context.deps.repository.createAttempt({
      id: "practice-1",
      profileId: LOCAL_PROFILE_ID,
      mode: "practice",
      presetId: null,
      chapterId: "ch01",
      questionCount: 1,
      secondsPerQuestion: null,
      passingScore: null,
      errorPenalty: null,
      severeErrorPenalty: null,
      startedAt: TEST_STARTED_AT,
      questions: [{ position: 0, snapshot: createQuestionSnapshot(question) }],
    });

    expect(() => openExamSession(context.deps, "practice-1")).toThrow(AttemptConflictError);
  });

  it("signale une tentative inconnue", () => {
    expect(() => openExamSession(context.deps, "attempt-inconnue")).toThrow(AttemptNotFoundError);
  });
});

describe("submitExamAnswer", () => {
  it("refuse une option inconnue ou une réponse nulle avant l'échéance", () => {
    startExam(context.deps, "preset-demo");

    expect(() =>
      submitExamAnswer(context.deps, { attemptId: "attempt-1", position: 0, optionId: "z" }),
    ).toThrow(InvalidAnswerError);
    expect(() =>
      submitExamAnswer(context.deps, { attemptId: "attempt-1", position: 0, optionId: null }),
    ).toThrow(InvalidAnswerError);
  });

  it("enchaîne les questions et termine avec les pénalités", () => {
    startExam(context.deps, "preset-demo");

    expect(
      submitExamAnswer(context.deps, {
        attemptId: "attempt-1",
        position: 0,
        optionId: correctOptionId("attempt-1", 0),
      }),
    ).toEqual({ kind: "next", nextPosition: 1, questionNumber: 2 });

    expect(
      submitExamAnswer(context.deps, {
        attemptId: "attempt-1",
        position: 1,
        optionId: wrongOptionId("attempt-1", 1),
      }),
    ).toEqual({ kind: "next", nextPosition: 2, questionNumber: 3 });

    const final = submitExamAnswer(context.deps, {
      attemptId: "attempt-1",
      position: 2,
      optionId: correctOptionId("attempt-1", 2),
    });

    expect(final).toEqual({
      kind: "completed",
      attemptId: "attempt-1",
      score: {
        score: 0,
        correctCount: 2,
        incorrectCount: 1,
        timedOutCount: 0,
        penaltyPoints: 5,
        passed: false,
      },
    });

    const attempt = getAttempt();
    expect(attempt.status).toBe("completed");
    expect(attempt.score).toBe(0);
    expect(attempt.passed).toBe(false);
  });

  it("compte une question non répondue comme un temps écoulé", () => {
    startExam(context.deps, "preset-demo");
    context.clock.advance(17_000);

    expect(
      submitExamAnswer(context.deps, { attemptId: "attempt-1", position: 0, optionId: null }),
    ).toEqual({ kind: "next", nextPosition: 1, questionNumber: 2 });

    const question = getAttempt().questions[0];
    expect(question?.timedOut).toBe(true);
    expect(question?.selectedOptionId).toBeNull();
    expect(question?.timeSpentMs).toBe(15_000);

    submitExamAnswer(context.deps, {
      attemptId: "attempt-1",
      position: 1,
      optionId: correctOptionId("attempt-1", 1),
    });
    const final = submitExamAnswer(context.deps, {
      attemptId: "attempt-1",
      position: 2,
      optionId: correctOptionId("attempt-1", 2),
    });

    expect(final).toMatchObject({
      kind: "completed",
      score: { score: 2, penaltyPoints: 1, timedOutCount: 1, passed: true },
    });
  });

  it("accepte une réponse pendant la grâce de deux secondes", () => {
    startExam(context.deps, "preset-demo");
    context.clock.advance(16_500);

    expect(
      submitExamAnswer(context.deps, {
        attemptId: "attempt-1",
        position: 0,
        optionId: correctOptionId("attempt-1", 0),
      }),
    ).toMatchObject({ kind: "next", nextPosition: 1 });

    const question = getAttempt().questions[0];
    expect(question?.timedOut).toBe(false);
    expect(question?.isCorrect).toBe(true);
  });

  it("ignore la réponse choisie après l'expiration", () => {
    startExam(context.deps, "preset-demo");
    context.clock.advance(17_001);

    expect(
      submitExamAnswer(context.deps, {
        attemptId: "attempt-1",
        position: 0,
        optionId: correctOptionId("attempt-1", 0),
      }),
    ).toMatchObject({ kind: "next", nextPosition: 1 });

    const question = getAttempt().questions[0];
    expect(question?.timedOut).toBe(true);
    expect(question?.isCorrect).toBe(false);
    expect(question?.selectedOptionId).toBeNull();
  });

  it("signale une tentative close comme terminée", () => {
    startExam(context.deps, "preset-demo");

    for (const position of [0, 1, 2]) {
      submitExamAnswer(context.deps, {
        attemptId: "attempt-1",
        position,
        optionId: correctOptionId("attempt-1", position),
      });
    }

    const repeated = submitExamAnswer(context.deps, {
      attemptId: "attempt-1",
      position: 2,
      optionId: correctOptionId("attempt-1", 2),
    });

    expect(repeated).toMatchObject({ kind: "completed" });
    expect(openExamSession(context.deps, "attempt-1")).toEqual({
      kind: "completed",
      attemptId: "attempt-1",
    });
  });

  it("permet de démarrer un nouvel examen après le précédent", () => {
    startExam(context.deps, "preset-demo");
    for (const position of [0, 1, 2]) {
      submitExamAnswer(context.deps, {
        attemptId: "attempt-1",
        position,
        optionId: correctOptionId("attempt-1", position),
      });
    }

    expect(startExam(context.deps, "preset-demo")).toEqual({
      attemptId: "attempt-2",
      resumed: false,
    });
  });
});
