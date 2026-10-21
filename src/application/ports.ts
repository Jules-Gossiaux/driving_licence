import type {
  Attempt,
  AttemptSummary,
  LearningStats,
  LessonProgress,
  NewAttempt,
} from "@/domain/learning/types";

export type RecordQuestionPresentedInput = {
  attemptId: string;
  position: number;
  presentedAt: string;
  deadlineAt: string | null;
};

export type RecordAnswerInput = {
  attemptId: string;
  position: number;
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  timedOut: boolean;
  answeredAt: string;
  timeSpentMs: number;
};

export type RecordRetryAnswerInput = {
  attemptId: string;
  position: number;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  answeredAt: string;
};

export type CompleteAttemptInput = {
  attemptId: string;
  completedAt: string;
  score: number;
  passed: boolean | null;
  durationMs: number;
};

export interface LearningRepository {
  getLessonProgress(profileId: string): LessonProgress[];
  setLessonRead(profileId: string, lessonId: string, read: boolean, at: string): void;

  createAttempt(attempt: NewAttempt): void;
  getAttempt(profileId: string, attemptId: string): Attempt | null;
  getActiveExam(profileId: string): AttemptSummary | null;
  getActiveLessonRun(profileId: string, lessonId: string): AttemptSummary | null;
  getLatestCompletedUnitChallenge(profileId: string, unitId: string): AttemptSummary | null;
  getLatestCompletedChapterExam(profileId: string, chapterId: string): AttemptSummary | null;
  listRecentCompletedAttempts(profileId: string, limit: number): AttemptSummary[];
  recordQuestionPresented(input: RecordQuestionPresentedInput): void;
  recordAnswer(input: RecordAnswerInput): void;
  recordRetryAnswer(input: RecordRetryAnswerInput): void;
  setLessonStep(profileId: string, attemptId: string, step: number): void;
  completeAttempt(input: CompleteAttemptInput): void;
  abandonAttempt(profileId: string, attemptId: string, at: string): void;

  getLatestIncorrectQuestionIds(profileId: string): string[];
  getCompletedStats(profileId: string): LearningStats;
}

export type IdGenerator = () => string;
export type RandomFn = () => number;
