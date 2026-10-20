import { getEligibleQuestionsForPreset } from "@/domain/content/catalog";
import type { Question } from "@/domain/content/schemas";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import { CHAPTER_EXAM } from "@/domain/learning/progression";
import {
  createQuestionSnapshot,
  toPublicQuestion,
  type PublicQuestion,
} from "@/domain/learning/snapshot";
import type { Attempt } from "@/domain/learning/types";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  InsufficientQuestionPoolError,
  selectExamQuestions,
  shuffle,
} from "@/domain/exam/selection";
import { computeExamScore, type ExamScore } from "@/domain/exam/scoring";
import {
  ANSWER_GRACE_MS,
  addSeconds,
  clampElapsedMs,
  durationMs,
  isDeadlineExpired,
  remainingSeconds,
} from "@/domain/exam/time";
import { ContentNotFoundError, InvalidAnswerError, ProgressionLockedError } from "./errors";
import {
  resolveMedia,
  resolveOptionViews,
  type AppDependencies,
  type QuestionMediaView,
  type QuestionOptionView,
} from "./content-views";

export type ExamQuestionView = Omit<PublicQuestion, "options"> & {
  options: QuestionOptionView[];
  media: QuestionMediaView | null;
};

export type ExamSessionView = {
  attemptId: string;
  title: string;
  chapterTitle: string | null;
  questionNumber: number;
  questionCount: number;
  secondsPerQuestion: number;
  deadlineAt: string;
  remainingSeconds: number;
  question: ExamQuestionView;
};

export type OpenExamResult =
  | { kind: "session"; session: ExamSessionView }
  | { kind: "completed"; attemptId: string }
  | { kind: "abandoned"; attemptId: string };

export type SubmitExamResult =
  | { kind: "next"; nextPosition: number; questionNumber: number }
  | { kind: "completed"; attemptId: string; score: ExamScore };

function createExamSnapshot(question: Question, random: () => number) {
  const snapshot = createQuestionSnapshot(question);
  return { ...snapshot, options: shuffle(snapshot.options, random) };
}

function firstUnanswered(attempt: Attempt) {
  return attempt.questions.find((question) => question.answeredAt === null) ?? null;
}

function toExamQuestion(
  deps: AppDependencies,
  attempt: Attempt,
  position: number,
): ExamQuestionView {
  const entry = attempt.questions.find((question) => question.position === position);

  if (!entry) {
    throw new AttemptNotFoundError(`${attempt.id} (question ${position})`);
  }

  const publicQuestion = toPublicQuestion(entry.snapshot);

  return {
    ...publicQuestion,
    options: resolveOptionViews(deps.catalog, publicQuestion.options),
    media: resolveMedia(deps.catalog, entry.snapshot.mediaId),
  };
}

function requireExamConfig(attempt: Attempt) {
  if (
    attempt.secondsPerQuestion === null ||
    attempt.passingScore === null ||
    attempt.errorPenalty === null ||
    attempt.severeErrorPenalty === null
  ) {
    throw new AttemptConflictError(
      "La configuration de cet examen est incomplète et ne permet pas la notation.",
    );
  }

  return {
    questionCount: attempt.questionCount,
    passingScore: attempt.passingScore,
    errorPenalty: attempt.errorPenalty,
    severeErrorPenalty: attempt.severeErrorPenalty,
    secondsPerQuestion: attempt.secondsPerQuestion,
  };
}

function finalizeExam(deps: AppDependencies, attempt: Attempt, now: Date): ExamScore {
  const config = requireExamConfig(attempt);

  const score = computeExamScore(
    attempt.questions.map((question) => ({
      isCorrect: question.isCorrect === true,
      severity: question.snapshot.severity,
      timedOut: question.timedOut || question.answeredAt === null,
    })),
    config,
  );

  deps.repository.completeAttempt({
    attemptId: attempt.id,
    completedAt: now.toISOString(),
    score: score.score,
    passed: score.passed,
    durationMs: durationMs(new Date(attempt.startedAt), now),
  });

  return score;
}

export function startExam(
  deps: AppDependencies,
  presetId: string,
): { attemptId: string; resumed: boolean } {
  const preset = deps.catalog.presetById.get(presetId);

  if (!preset) {
    throw new ContentNotFoundError(`preset d'examen ${presetId}`);
  }

  const active = deps.repository.getActiveExam(LOCAL_PROFILE_ID);

  if (active) {
    return { attemptId: active.id, resumed: true };
  }

  const pool = getEligibleQuestionsForPreset(preset, deps.catalog);

  if (pool.length < preset.questionCount) {
    throw new InsufficientQuestionPoolError(pool.length, preset.questionCount);
  }

  const selected = selectExamQuestions(pool, preset.questionCount, deps.random);

  return {
    attemptId: createExamAttempt(deps, {
      presetId: preset.id,
      chapterId: null,
      questions: selected,
      secondsPerQuestion: preset.secondsPerQuestion,
      passingScore: preset.passingScore,
      errorPenalty: preset.errorPenalty,
      severeErrorPenalty: preset.severeErrorPenalty,
    }),
    resumed: false,
  };
}

export function startChapterExam(
  deps: AppDependencies,
  chapterId: string,
): { attemptId: string; resumed: boolean } {
  const entry = deps.catalog.chapterById.get(chapterId);

  if (!entry) {
    throw new ContentNotFoundError(`chapitre ${chapterId}`);
  }

  if ((entry.chapter.units?.length ?? 0) === 0) {
    throw new ProgressionLockedError("Ce chapitre ne contient pas encore d'unités.");
  }

  const active = deps.repository.getActiveExam(LOCAL_PROFILE_ID);

  if (active) {
    return { attemptId: active.id, resumed: true };
  }

  const readLessonIds = new Set(
    deps.repository.getLessonProgress(LOCAL_PROFILE_ID).map((progress) => progress.lessonId),
  );
  const allLessonsRead =
    entry.lessons.length > 0 && entry.lessons.every((lesson) => readLessonIds.has(lesson.id));

  if (!allLessonsRead) {
    throw new ProgressionLockedError(
      "Terminez toutes les leçons du chapitre avant de passer son examen.",
    );
  }

  const pool = entry.questions.filter((question) => question.examEligible);

  if (pool.length < CHAPTER_EXAM.questionCount) {
    throw new InsufficientQuestionPoolError(pool.length, CHAPTER_EXAM.questionCount);
  }

  const selected = selectExamQuestions(pool, CHAPTER_EXAM.questionCount, deps.random);

  return {
    attemptId: createExamAttempt(deps, {
      presetId: null,
      chapterId,
      questions: selected,
      secondsPerQuestion: CHAPTER_EXAM.secondsPerQuestion,
      passingScore: CHAPTER_EXAM.passingScore,
      errorPenalty: CHAPTER_EXAM.errorPenalty,
      severeErrorPenalty: CHAPTER_EXAM.severeErrorPenalty,
    }),
    resumed: false,
  };
}

function createExamAttempt(
  deps: AppDependencies,
  input: {
    presetId: string | null;
    chapterId: string | null;
    questions: Question[];
    secondsPerQuestion: number;
    passingScore: number;
    errorPenalty: number;
    severeErrorPenalty: number;
  },
): string {
  const attemptId = deps.newId();
  const now = deps.clock.now();

  deps.repository.createAttempt({
    id: attemptId,
    profileId: LOCAL_PROFILE_ID,
    mode: "exam",
    presetId: input.presetId,
    chapterId: input.chapterId,
    questionCount: input.questions.length,
    secondsPerQuestion: input.secondsPerQuestion,
    passingScore: input.passingScore,
    errorPenalty: input.errorPenalty,
    severeErrorPenalty: input.severeErrorPenalty,
    startedAt: now.toISOString(),
    questions: input.questions.map((question, index) => ({
      position: index,
      snapshot: createExamSnapshot(question, deps.random),
    })),
  });

  deps.repository.recordQuestionPresented({
    attemptId,
    position: 0,
    presentedAt: now.toISOString(),
    deadlineAt: addSeconds(now, input.secondsPerQuestion).toISOString(),
  });

  return attemptId;
}

export function openExamSession(deps: AppDependencies, attemptId: string): OpenExamResult {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(attemptId);
  }

  if (attempt.mode !== "exam") {
    throw new AttemptConflictError("Cette tentative n'est pas un examen.");
  }

  if (attempt.status === "completed") {
    return { kind: "completed", attemptId };
  }

  if (attempt.status === "abandoned") {
    return { kind: "abandoned", attemptId };
  }

  const config = requireExamConfig(attempt);
  const now = deps.clock.now();
  let current = firstUnanswered(attempt);

  if (!current) {
    finalizeExam(deps, attempt, now);
    return { kind: "completed", attemptId };
  }

  if (!current.deadlineAt) {
    deps.repository.recordQuestionPresented({
      attemptId,
      position: current.position,
      presentedAt: now.toISOString(),
      deadlineAt: addSeconds(now, config.secondsPerQuestion).toISOString(),
    });

    const refreshed = deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);
    const refreshedCurrent = refreshed ? firstUnanswered(refreshed) : null;

    if (!refreshed || !refreshedCurrent || !refreshedCurrent.deadlineAt) {
      throw new AttemptConflictError("Impossible de démarrer la question de l'examen.");
    }

    current = refreshedCurrent;
  }

  const deadlineAt = current.deadlineAt;

  if (!deadlineAt) {
    throw new AttemptConflictError("La question de l'examen n'a pas de limite de temps.");
  }

  const preset = attempt.presetId ? deps.catalog.presetById.get(attempt.presetId) : undefined;
  const chapterTitle = attempt.chapterId
    ? (deps.catalog.chapterById.get(attempt.chapterId)?.chapter.title ?? null)
    : null;

  return {
    kind: "session",
    session: {
      attemptId: attempt.id,
      title: preset?.title ?? (chapterTitle ? `Examen · ${chapterTitle}` : "Examen blanc"),
      chapterTitle,
      questionNumber: current.position + 1,
      questionCount: attempt.questionCount,
      secondsPerQuestion: config.secondsPerQuestion,
      deadlineAt,
      remainingSeconds: remainingSeconds(new Date(deadlineAt), now),
      question: toExamQuestion(deps, attempt, current.position),
    },
  };
}

export function submitExamAnswer(
  deps: AppDependencies,
  input: { attemptId: string; position: number; optionId: string | null },
): SubmitExamResult {
  let attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, input.attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(input.attemptId);
  }

  if (attempt.mode !== "exam") {
    throw new AttemptConflictError("Cette tentative n'est pas un examen.");
  }

  if (attempt.status === "completed") {
    return {
      kind: "completed",
      attemptId: attempt.id,
      score: computeExamScore(
        attempt.questions.map((question) => ({
          isCorrect: question.isCorrect === true,
          severity: question.snapshot.severity,
          timedOut: question.timedOut,
        })),
        requireExamConfig(attempt),
      ),
    };
  }

  if (attempt.status !== "in_progress") {
    throw new AttemptConflictError("Cet examen est abandonné.");
  }

  const config = requireExamConfig(attempt);
  const question = attempt.questions.find((entry) => entry.position === input.position);

  if (!question) {
    throw new AttemptNotFoundError(`${input.attemptId} (question ${input.position})`);
  }

  if (question.answeredAt !== null) {
    const next = firstUnanswered(attempt);
    if (!next) {
      const now = deps.clock.now();
      const score = finalizeExam(deps, attempt, now);
      return { kind: "completed", attemptId: attempt.id, score };
    }
    return {
      kind: "next",
      nextPosition: next.position,
      questionNumber: next.position + 1,
    };
  }

  const now = deps.clock.now();
  let deadlineAt = question.deadlineAt;

  if (!deadlineAt) {
    deadlineAt = addSeconds(now, config.secondsPerQuestion).toISOString();
    deps.repository.recordQuestionPresented({
      attemptId: attempt.id,
      position: question.position,
      presentedAt: now.toISOString(),
      deadlineAt,
    });
  }

  const deadline = new Date(deadlineAt);
  const expired = isDeadlineExpired(deadline, now, ANSWER_GRACE_MS);
  let selectedOptionId: string | null = null;
  let timedOut = false;
  let isCorrect = false;

  if (input.optionId === null) {
    if (now.getTime() < deadline.getTime()) {
      throw new InvalidAnswerError("Le temps n'est pas encore écoulé.");
    }
    timedOut = true;
  } else if (expired) {
    timedOut = true;
  } else {
    if (!question.snapshot.options.some((option) => option.id === input.optionId)) {
      throw new InvalidAnswerError("La réponse choisie n'appartient pas à cette question.");
    }
    selectedOptionId = input.optionId;
    isCorrect = input.optionId === question.snapshot.correctOptionId;
  }

  const presentedAt = question.presentedAt ? new Date(question.presentedAt) : now;

  deps.repository.recordAnswer({
    attemptId: attempt.id,
    position: question.position,
    questionId: question.snapshot.questionId,
    selectedOptionId,
    isCorrect,
    timedOut,
    answeredAt: now.toISOString(),
    timeSpentMs: clampElapsedMs(presentedAt, now, config.secondsPerQuestion * 1_000),
  });

  attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, attempt.id);

  if (!attempt) {
    throw new AttemptNotFoundError(input.attemptId);
  }

  const next = firstUnanswered(attempt);

  if (!next) {
    const score = finalizeExam(deps, attempt, now);
    return { kind: "completed", attemptId: attempt.id, score };
  }

  deps.repository.recordQuestionPresented({
    attemptId: attempt.id,
    position: next.position,
    presentedAt: now.toISOString(),
    deadlineAt: addSeconds(now, config.secondsPerQuestion).toISOString(),
  });

  return {
    kind: "next",
    nextPosition: next.position,
    questionNumber: next.position + 1,
  };
}
