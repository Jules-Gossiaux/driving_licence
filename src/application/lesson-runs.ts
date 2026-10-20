import { LOCAL_PROFILE_ID } from "@/domain/profile";
import { splitLessonSections } from "@/domain/content/sections";
import type { AttemptQuestion } from "@/domain/learning/types";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import type { AppDependencies } from "./content-views";
import { ContentNotFoundError, LessonLockedError, PracticeUnavailableError } from "./errors";
import { createTrainingAttempt, toTrainingQuestion, type TrainingQuestionView } from "./practice";

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
  purpose: "check" | "quiz";
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
  nextLesson: { slug: string; title: string } | null;
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
  const previousLesson = lessonIndex > 0 ? entry.chapter.lessons[lessonIndex - 1] : undefined;

  if (previousLesson && !readLessonIds.has(previousLesson.id)) {
    throw new LessonLockedError(
      `Terminez d'abord la leçon « ${previousLesson.title} » pour débloquer celle-ci.`,
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
    nextLesson: nextLesson ? { slug: nextLesson.slug, title: nextLesson.title } : null,
  };
}
