import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  createQuestionSnapshot,
  toPublicQuestion,
  type PublicQuestion,
} from "@/domain/learning/snapshot";
import type { Attempt, AttemptMode } from "@/domain/learning/types";
import { shuffle } from "@/domain/exam/selection";
import type { Question } from "@/domain/content/schemas";
import { ContentNotFoundError, InvalidAnswerError, PracticeUnavailableError } from "./errors";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import { resolveMedia, type AppDependencies, type QuestionMediaView } from "./content-views";

const PRACTICE_SESSION_SIZE = 10;

export type TrainingQuestionView = PublicQuestion & {
  media: QuestionMediaView | null;
};

export type TrainingSessionView = {
  attemptId: string;
  mode: Extract<AttemptMode, "practice" | "review">;
  title: string;
  questions: TrainingQuestionView[];
  initialPosition: number;
  alreadyCompleted: boolean;
};

export type TrainingFeedback = {
  position: number;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
  nextPosition: number | null;
  completed: boolean;
  attemptId: string;
};

export type TrainingAnswerActionResult =
  { ok: true; feedback: TrainingFeedback } | { ok: false; message: string };

function createShuffledSnapshot(question: Question, random: () => number) {
  const snapshot = createQuestionSnapshot(question);
  return { ...snapshot, options: shuffle(snapshot.options, random) };
}

function toTrainingQuestion(
  deps: AppDependencies,
  snapshot: Attempt["questions"][number]["snapshot"],
): TrainingQuestionView {
  return {
    ...toPublicQuestion(snapshot),
    media: resolveMedia(deps.catalog, snapshot.mediaId),
  };
}

function firstUnansweredPosition(attempt: Attempt): number | null {
  const unanswered = attempt.questions.find((question) => question.answeredAt === null);
  return unanswered ? unanswered.position : null;
}

function resolveChapter(deps: AppDependencies, chapterId: string) {
  const entry = deps.catalog.chapterById.get(chapterId);
  if (!entry) {
    throw new ContentNotFoundError(`chapitre ${chapterId}`);
  }
  return entry;
}

function createTrainingAttempt(
  deps: AppDependencies,
  input: {
    mode: Extract<AttemptMode, "practice" | "review">;
    chapterId: string | null;
    questions: Question[];
  },
): { attemptId: string } {
  if (input.questions.length === 0) {
    throw new PracticeUnavailableError("Aucune question disponible pour cet entraînement.");
  }

  const now = deps.clock.now();
  const attemptId = deps.newId();
  const selected = shuffle(input.questions, deps.random).slice(0, PRACTICE_SESSION_SIZE);
  const snapshots = selected.map((question) => createShuffledSnapshot(question, deps.random));

  deps.repository.createAttempt({
    id: attemptId,
    profileId: LOCAL_PROFILE_ID,
    mode: input.mode,
    presetId: null,
    chapterId: input.chapterId,
    questionCount: snapshots.length,
    secondsPerQuestion: null,
    passingScore: null,
    errorPenalty: null,
    severeErrorPenalty: null,
    startedAt: now.toISOString(),
    questions: snapshots.map((snapshot, index) => ({
      position: index,
      snapshot,
    })),
  });

  deps.repository.recordQuestionPresented({
    attemptId,
    position: 0,
    presentedAt: now.toISOString(),
    deadlineAt: null,
  });

  return { attemptId };
}

export function startChapterPractice(
  deps: AppDependencies,
  chapterId: string,
): { attemptId: string } {
  const entry = resolveChapter(deps, chapterId);
  return createTrainingAttempt(deps, {
    mode: "practice",
    chapterId,
    questions: entry.questions,
  });
}

export function startReviewSession(
  deps: AppDependencies,
  chapterId?: string,
): { attemptId: string } {
  const incorrectIds = deps.repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID);
  const questions = incorrectIds
    .map((id) => deps.catalog.questionById.get(id))
    .filter((question): question is Question => Boolean(question))
    .filter((question) => !chapterId || question.chapterId === chapterId);

  if (questions.length === 0) {
    throw new PracticeUnavailableError(
      "Aucune erreur récente à réviser. Terminez d'abord un entraînement ou un examen.",
    );
  }

  return createTrainingAttempt(deps, {
    mode: "review",
    chapterId: chapterId ?? null,
    questions,
  });
}

export function getTrainingSession(deps: AppDependencies, attemptId: string): TrainingSessionView {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(attemptId);
  }

  if (attempt.mode === "exam") {
    throw new AttemptConflictError("Cette tentative est un examen, pas un entraînement.");
  }

  const chapterEntry = attempt.chapterId
    ? deps.catalog.chapterById.get(attempt.chapterId)
    : undefined;

  const initialPosition =
    attempt.status === "completed"
      ? attempt.questionCount
      : (firstUnansweredPosition(attempt) ?? 0);

  return {
    attemptId: attempt.id,
    mode: attempt.mode,
    title: chapterEntry?.chapter.title ?? "Révision des erreurs",
    questions: attempt.questions.map((question) => toTrainingQuestion(deps, question.snapshot)),
    initialPosition,
    alreadyCompleted: attempt.status === "completed",
  };
}

export function submitTrainingAnswer(
  deps: AppDependencies,
  input: { attemptId: string; position: number; optionId: string },
): TrainingFeedback {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, input.attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(input.attemptId);
  }

  if (attempt.mode === "exam") {
    throw new AttemptConflictError("Utilisez la soumission d'examen pour cette tentative.");
  }

  if (attempt.status !== "in_progress") {
    throw new AttemptConflictError("Cet entraînement est déjà terminé.");
  }

  const question = attempt.questions.find((entry) => entry.position === input.position);

  if (!question) {
    throw new AttemptNotFoundError(`${input.attemptId} (question ${input.position})`);
  }

  if (question.answeredAt !== null) {
    throw new AttemptConflictError("Cette question a déjà reçu une réponse.");
  }

  if (!question.snapshot.options.some((option) => option.id === input.optionId)) {
    throw new InvalidAnswerError("La réponse choisie n'appartient pas à cette question.");
  }

  const now = deps.clock.now();
  const presentedAt = question.presentedAt ? new Date(question.presentedAt) : now;
  const timeSpentMs = Math.max(0, now.getTime() - presentedAt.getTime());
  const isCorrect = input.optionId === question.snapshot.correctOptionId;

  deps.repository.recordAnswer({
    attemptId: attempt.id,
    position: input.position,
    questionId: question.snapshot.questionId,
    selectedOptionId: input.optionId,
    isCorrect,
    timedOut: false,
    answeredAt: now.toISOString(),
    timeSpentMs,
  });

  const updated = deps.repository.getAttempt(LOCAL_PROFILE_ID, attempt.id);

  if (!updated) {
    throw new AttemptNotFoundError(attempt.id);
  }

  const nextPosition = firstUnansweredPosition(updated);

  if (nextPosition === null) {
    const correctCount = updated.questions.filter((entry) => entry.isCorrect === true).length;
    deps.repository.completeAttempt({
      attemptId: updated.id,
      completedAt: now.toISOString(),
      score: correctCount,
      passed: null,
      durationMs: Math.max(0, now.getTime() - new Date(updated.startedAt).getTime()),
    });
  } else {
    deps.repository.recordQuestionPresented({
      attemptId: updated.id,
      position: nextPosition,
      presentedAt: now.toISOString(),
      deadlineAt: null,
    });
  }

  return {
    attemptId: updated.id,
    position: input.position,
    selectedOptionId: input.optionId,
    correctOptionId: question.snapshot.correctOptionId,
    isCorrect,
    explanation: question.snapshot.explanation,
    nextPosition,
    completed: nextPosition === null,
  };
}
