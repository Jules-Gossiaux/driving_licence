import type { QuestionSeverity } from "@/domain/content/schemas";

export type ExamScoreConfig = {
  questionCount: number;
  passingScore: number;
  errorPenalty: number;
  severeErrorPenalty: number;
};

export type ScoredExamAnswer = {
  isCorrect: boolean;
  severity: QuestionSeverity;
  timedOut: boolean;
};

export type ExamScore = {
  score: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  penaltyPoints: number;
  passed: boolean;
};

export function computeExamScore(
  answers: readonly ScoredExamAnswer[],
  config: ExamScoreConfig,
): ExamScore {
  if (answers.length !== config.questionCount) {
    throw new Error(
      `Score impossible : ${answers.length} réponse(s) pour ${config.questionCount} question(s).`,
    );
  }

  let correctCount = 0;
  let timedOutCount = 0;
  let penaltyPoints = 0;

  for (const answer of answers) {
    if (answer.isCorrect) {
      correctCount += 1;
      continue;
    }

    if (answer.timedOut) {
      timedOutCount += 1;
      penaltyPoints += config.errorPenalty;
      continue;
    }

    penaltyPoints += answer.severity === "severe" ? config.severeErrorPenalty : config.errorPenalty;
  }

  const score = Math.max(0, config.questionCount - penaltyPoints);

  return {
    score,
    correctCount,
    incorrectCount: answers.length - correctCount,
    timedOutCount,
    penaltyPoints,
    passed: score >= config.passingScore,
  };
}

export type PracticeScore = {
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  questionCount: number;
};

export function computePracticeScore(
  answers: readonly { isCorrect: boolean; timedOut: boolean }[],
): PracticeScore {
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const timedOutCount = answers.filter((answer) => answer.timedOut).length;

  return {
    correctCount,
    incorrectCount: answers.length - correctCount,
    timedOutCount,
    questionCount: answers.length,
  };
}
