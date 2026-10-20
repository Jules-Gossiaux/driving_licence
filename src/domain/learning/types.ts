import type { QuestionSnapshot } from "./snapshot";

export type AttemptMode = "practice" | "exam" | "review";
export type AttemptStatus = "in_progress" | "completed" | "abandoned";

export type AttemptQuestion = {
  position: number;
  snapshot: QuestionSnapshot;
  presentedAt: string | null;
  deadlineAt: string | null;
  answeredAt: string | null;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  timedOut: boolean;
  timeSpentMs: number | null;
};

export type Attempt = {
  id: string;
  profileId: string;
  mode: AttemptMode;
  status: AttemptStatus;
  presetId: string | null;
  chapterId: string | null;
  unitId: string | null;
  lessonId: string | null;
  lessonStep: number;
  questionCount: number;
  secondsPerQuestion: number | null;
  passingScore: number | null;
  errorPenalty: number | null;
  severeErrorPenalty: number | null;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
  durationMs: number | null;
  currentPosition: number;
  questions: AttemptQuestion[];
};

export type AttemptSummary = {
  id: string;
  mode: AttemptMode;
  status: AttemptStatus;
  presetId: string | null;
  chapterId: string | null;
  unitId: string | null;
  lessonId: string | null;
  questionCount: number;
  passingScore: number | null;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
};

export type LessonProgress = {
  lessonId: string;
  readAt: string;
  updatedAt: string;
};

export type LearningStats = {
  answeredQuestions: number;
  correctAnswers: number;
  distinctQuestions: number;
  completedAttempts: number;
};

export type NewAttempt = {
  id: string;
  profileId: string;
  mode: AttemptMode;
  presetId: string | null;
  chapterId: string | null;
  unitId?: string | null;
  lessonId?: string | null;
  questionCount: number;
  secondsPerQuestion: number | null;
  passingScore: number | null;
  errorPenalty: number | null;
  severeErrorPenalty: number | null;
  startedAt: string;
  questions: Array<{ position: number; snapshot: QuestionSnapshot }>;
};
