import { describe, expect, it } from "vitest";
import {
  computeExamScore,
  computePracticeScore,
  type ScoredExamAnswer,
} from "@/domain/exam/scoring";

const config = {
  questionCount: 50,
  passingScore: 41,
  errorPenalty: 1,
  severeErrorPenalty: 5,
};

function answers(correct: number, incorrect: ScoredExamAnswer[]): ScoredExamAnswer[] {
  return [
    ...Array.from({ length: correct }, (): ScoredExamAnswer => ({
      isCorrect: true,
      severity: "normal",
      timedOut: false,
    })),
    ...incorrect,
  ];
}

describe("computeExamScore", () => {
  it("applique une pénalité d'un point par erreur normale", () => {
    const result = computeExamScore(
      answers(
        41,
        Array.from({ length: 9 }, (): ScoredExamAnswer => ({
          isCorrect: false,
          severity: "normal",
          timedOut: false,
        })),
      ),
      config,
    );

    expect(result).toMatchObject({
      score: 41,
      correctCount: 41,
      incorrectCount: 9,
      timedOutCount: 0,
      penaltyPoints: 9,
      passed: true,
    });
  });

  it("applique cinq points pour une faute grave et un point pour un temps écoulé", () => {
    const result = computeExamScore(
      answers(7, [
        { isCorrect: false, severity: "severe", timedOut: false },
        { isCorrect: false, severity: "normal", timedOut: false },
        { isCorrect: false, severity: "severe", timedOut: true },
      ]),
      { ...config, questionCount: 10, passingScore: 8 },
    );

    expect(result).toMatchObject({
      score: 3,
      correctCount: 7,
      incorrectCount: 3,
      timedOutCount: 1,
      penaltyPoints: 7,
      passed: false,
    });
  });

  it("ne descend jamais sous zéro", () => {
    const result = computeExamScore(
      [
        { isCorrect: false, severity: "severe", timedOut: false },
        { isCorrect: false, severity: "severe", timedOut: false },
        { isCorrect: false, severity: "severe", timedOut: false },
      ],
      { ...config, questionCount: 3, passingScore: 1 },
    );

    expect(result.score).toBe(0);
    expect(result.penaltyPoints).toBe(15);
    expect(result.passed).toBe(false);
  });

  it("refuse un nombre de réponses différent du nombre de questions", () => {
    expect(() => computeExamScore(answers(41, []), config)).toThrow(/Score impossible/);
  });
});

describe("computePracticeScore", () => {
  it("compte les réponses sans appliquer de pénalité", () => {
    expect(
      computePracticeScore([
        { isCorrect: true, timedOut: false },
        { isCorrect: false, timedOut: false },
        { isCorrect: false, timedOut: true },
      ]),
    ).toEqual({
      correctCount: 1,
      incorrectCount: 2,
      timedOutCount: 1,
      questionCount: 3,
    });
  });
});
