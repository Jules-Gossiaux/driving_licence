import { LOCAL_PROFILE_ID } from "@/domain/profile";
import { splitLessonSections } from "@/domain/content/sections";
import type { AttemptQuestion } from "@/domain/learning/types";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import type { AppDependencies, LessonMediaView } from "./content-views";
import { listMediaByFile } from "./content-views";
import {
  ContentNotFoundError,
  InvalidAnswerError,
  LessonLockedError,
  PracticeUnavailableError,
} from "./errors";
import {
  createTrainingAttempt,
  toTrainingQuestion,
  type TrainingFeedback,
  type TrainingQuestionView,
} from "./practice";

export type LessonRunContentStep = {
  kind: "content";
  sectionId: string;
  title: string;
  body: string;
  sectionNumber: number;
};

export type LessonRunQuestionStep = {
  kind: "question";
  position: number;
  questionId: string;
  purpose: "check" | "quiz" | "retry";
  sectionId: string | null;
  questionNumber: number;
  question: TrainingQuestionView;
  answered: boolean;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean | null;
  explanation: string | null;
};

export type LessonRunStep = LessonRunContentStep | LessonRunQuestionStep;

export type LessonRunView = {
  attemptId: string;
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  chapterSlug: string;
  chapterTitle: string;
  unitLabel: string | null;
  unitTitle: string | null;
  steps: LessonRunStep[];
  initialStepIndex: number;
  completed: boolean;
  correctCount: number;
  questionCount: number;
  retryCount: number;
  retryCorrectCount: number;
  nextLesson: { slug: string; title: string } | null;
  mediaByFile: Record<string, LessonMediaView>;
};

function resolveLesson(deps: AppDependencies, lessonId: string) {
  const entry = deps.catalog.lessonById.get(lessonId);

  if (!entry) {
    throw new ContentNotFoundError(`leçon ${lessonId}`);
  }

  return entry;
}

function assertUnlocked(deps: AppDependencies, lessonId: string): void {
  const entry = resolveLesson(deps, lessonId);
  const readLessonIds = new Set(
    deps.repository.getLessonProgress(LOCAL_PROFILE_ID).map((progress) => progress.lessonId),
  );

  if (readLessonIds.has(lessonId)) {
    return;
  }

  const lessonIndex = entry.chapter.lessons.findIndex((lesson) => lesson.id === lessonId);
  const blockingLesson =
    lessonIndex > 0
      ? entry.chapter.lessons.slice(0, lessonIndex).find((lesson) => !readLessonIds.has(lesson.id))
      : undefined;

  if (blockingLesson) {
    throw new LessonLockedError(
      `Terminez d'abord la leçon « ${blockingLesson.title} » pour débloquer celle-ci.`,
    );
  }
}

export function startLessonRun(
  deps: AppDependencies,
  lessonId: string,
): { attemptId: string; resumed: boolean } {
  const entry = resolveLesson(deps, lessonId);
  const coreQuestionIds = entry.lesson.coreQuestionIds ?? [];

  if (coreQuestionIds.length === 0) {
    throw new PracticeUnavailableError("Cette leçon n'a pas encore de parcours interactif.");
  }

  assertUnlocked(deps, lessonId);

  const activeRun = deps.repository.getActiveLessonRun(LOCAL_PROFILE_ID, lessonId);

  if (activeRun) {
    return { attemptId: activeRun.id, resumed: true };
  }

  const checkedQuestionIds = new Set(
    (entry.lesson.sectionChecks ?? []).flatMap((check) => check.questionIds),
  );
  const orderedQuestionIds = [
    ...(entry.lesson.sectionChecks ?? []).flatMap((check) => check.questionIds),
    ...coreQuestionIds.filter((questionId) => !checkedQuestionIds.has(questionId)),
  ];
  const questions = orderedQuestionIds.flatMap((questionId) => {
    const question = deps.catalog.questionById.get(questionId);
    return question ? [question] : [];
  });

  if (questions.length === 0) {
    throw new PracticeUnavailableError("Cette leçon n'a pas de question disponible.");
  }

  const { attemptId } = createTrainingAttempt(deps, {
    mode: "practice",
    chapterId: entry.chapter.chapter.id,
    lessonId,
    questions,
    shuffleQuestions: false,
  });

  return { attemptId, resumed: false };
}

export function saveLessonRunStep(
  deps: AppDependencies,
  input: { attemptId: string; stepIndex: number },
): void {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, input.attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(input.attemptId);
  }

  if (!attempt.lessonId) {
    throw new AttemptConflictError("Cette tentative n'est pas un parcours de leçon.");
  }

  if (attempt.status !== "in_progress") {
    return;
  }

  deps.repository.setLessonStep(LOCAL_PROFILE_ID, attempt.id, input.stepIndex);
}

function toQuestionStep(
  deps: AppDependencies,
  attemptQuestion: AttemptQuestion,
  purpose: "check" | "quiz",
  sectionId: string | null,
  questionNumber: number,
): LessonRunQuestionStep {
  const answered = attemptQuestion.answeredAt !== null;

  return {
    kind: "question",
    position: attemptQuestion.position,
    questionId: attemptQuestion.snapshot.questionId,
    purpose,
    sectionId,
    questionNumber,
    question: toTrainingQuestion(deps, attemptQuestion.snapshot),
    answered,
    selectedOptionId: answered ? attemptQuestion.selectedOptionId : null,
    correctOptionId: answered ? attemptQuestion.snapshot.correctOptionId : null,
    isCorrect: answered ? attemptQuestion.isCorrect : null,
    explanation: answered ? attemptQuestion.snapshot.explanation : null,
  };
}

function toRetryStep(
  deps: AppDependencies,
  attemptQuestion: AttemptQuestion,
  retryNumber: number,
): LessonRunQuestionStep {
  const answered = attemptQuestion.retryAnsweredAt !== null;

  return {
    kind: "question",
    position: attemptQuestion.position,
    questionId: attemptQuestion.snapshot.questionId,
    purpose: "retry",
    sectionId: null,
    questionNumber: retryNumber,
    question: toTrainingQuestion(deps, attemptQuestion.snapshot),
    answered,
    selectedOptionId: answered ? attemptQuestion.retrySelectedOptionId : null,
    correctOptionId: answered ? attemptQuestion.snapshot.correctOptionId : null,
    isCorrect: answered ? attemptQuestion.retryIsCorrect : null,
    explanation: answered ? attemptQuestion.snapshot.explanation : null,
  };
}

export function getLessonRunView(deps: AppDependencies, attemptId: string): LessonRunView {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(attemptId);
  }

  if (!attempt.lessonId) {
    throw new AttemptConflictError("Cette tentative n'est pas un parcours de leçon.");
  }

  const entry = resolveLesson(deps, attempt.lessonId);
  const lesson = entry.lesson;
  const sections = splitLessonSections(lesson.body);
  const checksBySection = new Map(
    (lesson.sectionChecks ?? []).map((check) => [check.section, check.questionIds]),
  );
  const attemptQuestions = new Map(
    attempt.questions.map((question) => [question.snapshot.questionId, question]),
  );
  const usedQuestionIds = new Set<string>();
  const steps: LessonRunStep[] = [];
  let questionNumber = 0;

  for (const [sectionIndex, section] of sections.entries()) {
    steps.push({
      kind: "content",
      sectionId: section.id,
      title: section.title,
      body: section.body,
      sectionNumber: sectionIndex + 1,
    });

    for (const questionId of checksBySection.get(section.id) ?? []) {
      const question = attemptQuestions.get(questionId);

      if (!question || usedQuestionIds.has(questionId)) {
        continue;
      }

      usedQuestionIds.add(questionId);
      questionNumber += 1;
      steps.push(toQuestionStep(deps, question, "check", section.id, questionNumber));
    }
  }

  for (const question of attempt.questions) {
    const questionId = question.snapshot.questionId;

    if (usedQuestionIds.has(questionId)) {
      continue;
    }

    usedQuestionIds.add(questionId);
    questionNumber += 1;
    steps.push(toQuestionStep(deps, question, "quiz", null, questionNumber));
  }

  const incorrectQuestions = attempt.questions.filter((question) => question.isCorrect === false);
  const allQuestionsAnswered = attempt.questions.every((question) => question.answeredAt !== null);

  if (attempt.status === "in_progress" && allQuestionsAnswered && incorrectQuestions.length > 0) {
    for (const [index, question] of incorrectQuestions.entries()) {
      steps.push(toRetryStep(deps, question, index + 1));
    }
  }

  const completed = attempt.status === "completed";
  const lessonIndex = entry.chapter.lessons.findIndex((candidate) => candidate.id === lesson.id);
  const nextLesson = lessonIndex >= 0 ? (entry.chapter.lessons[lessonIndex + 1] ?? null) : null;
  const unit = lesson.unitId
    ? (entry.chapter.chapter.units?.find((candidate) => candidate.id === lesson.unitId) ?? null)
    : null;

  return {
    attemptId: attempt.id,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonSlug: lesson.slug,
    chapterSlug: entry.chapter.chapter.slug,
    chapterTitle: entry.chapter.chapter.title,
    unitLabel: unit?.label ?? null,
    unitTitle: unit?.title ?? null,
    steps,
    initialStepIndex: completed
      ? steps.length
      : Math.min(attempt.lessonStep, Math.max(0, steps.length - 1)),
    completed,
    correctCount: attempt.questions.filter((question) => question.isCorrect === true).length,
    questionCount: attempt.questionCount,
    retryCount: incorrectQuestions.length,
    retryCorrectCount: attempt.questions.filter((question) => question.retryIsCorrect === true)
      .length,
    nextLesson: nextLesson ? { slug: nextLesson.slug, title: nextLesson.title } : null,
    mediaByFile: listMediaByFile(deps.catalog),
  };
}

export function submitLessonRetry(
  deps: AppDependencies,
  input: { attemptId: string; position: number; optionId: string },
): TrainingFeedback {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, input.attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(input.attemptId);
  }

  if (!attempt.lessonId) {
    throw new AttemptConflictError("Cette tentative n'est pas un parcours de leçon.");
  }

  if (attempt.status !== "in_progress") {
    throw new AttemptConflictError("Cette leçon est déjà terminée.");
  }

  if (attempt.questions.some((question) => question.answeredAt === null)) {
    throw new AttemptConflictError(
      "Terminez toutes les questions de la leçon avant de reprendre les erreurs.",
    );
  }

  const question = attempt.questions.find((entry) => entry.position === input.position);

  if (!question) {
    throw new AttemptNotFoundError(`${input.attemptId} (question ${input.position})`);
  }

  if (question.isCorrect !== false) {
    throw new AttemptConflictError("Cette question n'a pas été ratée.");
  }

  if (question.retryAnsweredAt !== null) {
    throw new AttemptConflictError("Cette question a déjà été reprise.");
  }

  if (!question.snapshot.options.some((option) => option.id === input.optionId)) {
    throw new InvalidAnswerError("La réponse choisie n'appartient pas à cette question.");
  }

  const now = deps.clock.now();
  const isCorrect = input.optionId === question.snapshot.correctOptionId;

  deps.repository.recordRetryAnswer({
    attemptId: attempt.id,
    position: input.position,
    questionId: question.snapshot.questionId,
    selectedOptionId: input.optionId,
    isCorrect,
    answeredAt: now.toISOString(),
  });

  const updated = deps.repository.getAttempt(LOCAL_PROFILE_ID, attempt.id);

  if (!updated) {
    throw new AttemptNotFoundError(attempt.id);
  }

  const pendingRetries = updated.questions.some(
    (entry) => entry.isCorrect === false && entry.retryAnsweredAt === null,
  );

  if (!pendingRetries) {
    const correctCount = updated.questions.filter((entry) => entry.isCorrect === true).length;
    deps.repository.completeAttempt({
      attemptId: updated.id,
      completedAt: now.toISOString(),
      score: correctCount,
      passed: null,
      durationMs: Math.max(0, now.getTime() - new Date(updated.startedAt).getTime()),
    });
    if (updated.lessonId) {
      deps.repository.setLessonRead(LOCAL_PROFILE_ID, updated.lessonId, true, now.toISOString());
    }
  }

  return {
    attemptId: updated.id,
    position: input.position,
    selectedOptionId: input.optionId,
    correctOptionId: question.snapshot.correctOptionId,
    isCorrect,
    explanation: question.snapshot.explanation,
    nextPosition: null,
    completed: !pendingRetries,
  };
}
