import { countPublishedExamQuestions } from "@/domain/content/catalog";
import { splitLessonSections } from "@/domain/content/sections";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import type { Attempt, AttemptSummary } from "@/domain/learning/types";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import {
  listChapterOverviews,
  listExamPresetOverviews,
  resolveMedia,
  resolveOptionViews,
  resolveSourceLabels,
  toLessonSummary,
  type AppDependencies,
  type ChapterDetail,
  type ChapterOverview,
  type ExamPresetOverview,
  type LessonDetail,
  type QuestionMediaView,
  type QuestionOptionView,
  type SourceLabel,
  type UnitOverview,
} from "./content-views";
import { ContentNotFoundError } from "./errors";
import type { LearningStats } from "@/domain/learning/types";

export type RecentAttemptView = {
  id: string;
  title: string;
  mode: AttemptSummary["mode"];
  kind: AttemptSummary["mode"] | "lesson";
  completedAt: string | null;
  score: number | null;
  questionCount: number;
  passingScore: number | null;
  passed: boolean | null;
};

export type NextLessonLink = {
  chapterSlug: string;
  lessonSlug: string;
  title: string;
};

export type DashboardView = {
  chapters: ChapterOverview[];
  stats: LearningStats;
  accuracyPercent: number | null;
  recentAttempts: RecentAttemptView[];
  activeExam: { attemptId: string; title: string } | null;
  presets: ExamPresetOverview[];
  reviewCount: number;
  officialPublishedQuestionCount: number;
  nextLesson: NextLessonLink | null;
};

export type ReviewItem = {
  questionId: string;
  chapterId: string;
  chapterSlug: string;
  chapterTitle: string;
  lessonTitles: string[];
  prompt: string;
  options: QuestionOptionView[];
  correctOptionId: string;
  explanation: string;
  media: QuestionMediaView | null;
  sources: SourceLabel[];
};

export type ResultQuestion = {
  position: number;
  questionId: string;
  prompt: string;
  options: QuestionOptionView[];
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  timedOut: boolean;
  severity: "normal" | "severe";
  explanation: string;
  media: QuestionMediaView | null;
  chapterTitle: string;
  sources: SourceLabel[];
};

export type AttemptResultView = {
  attemptId: string;
  mode: Attempt["mode"];
  title: string;
  completedAt: string;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  penaltyPoints: number;
  score: number;
  passingScore: number | null;
  passed: boolean | null;
  durationMs: number;
  questions: ResultQuestion[];
};

export type AttemptResultLookup =
  | { kind: "completed"; result: AttemptResultView }
  | { kind: "in_progress"; mode: Attempt["mode"]; attemptId: string }
  | { kind: "abandoned"; attemptId: string };

function attemptTitle(
  deps: AppDependencies,
  attempt: Pick<Attempt, "presetId" | "chapterId" | "mode" | "lessonId">,
): string {
  if (attempt.lessonId) {
    return deps.catalog.lessonById.get(attempt.lessonId)?.lesson.title ?? "Leçon";
  }
  if (attempt.presetId) {
    return deps.catalog.presetById.get(attempt.presetId)?.title ?? "Examen blanc";
  }
  if (attempt.chapterId) {
    return (
      deps.catalog.chapterById.get(attempt.chapterId)?.chapter.title ?? "Entraînement par chapitre"
    );
  }
  return attempt.mode === "review" ? "Révision des erreurs" : "Entraînement";
}

function toRecentAttempt(deps: AppDependencies, attempt: AttemptSummary): RecentAttemptView {
  return {
    id: attempt.id,
    title: attemptTitle(deps, attempt),
    mode: attempt.mode,
    kind: attempt.lessonId ? "lesson" : attempt.mode,
    completedAt: attempt.completedAt,
    score: attempt.score,
    questionCount: attempt.questionCount,
    passingScore: attempt.passingScore,
    passed: attempt.passed,
  };
}

export function getDashboardView(deps: AppDependencies): DashboardView {
  const progress = deps.repository.getLessonProgress(LOCAL_PROFILE_ID);
  const chapters = listChapterOverviews(deps.catalog, progress);
  const stats = deps.repository.getCompletedStats(LOCAL_PROFILE_ID);
  const activeExamSummary = deps.repository.getActiveExam(LOCAL_PROFILE_ID);
  const reviewCount = deps.repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID).length;

  let nextLesson: NextLessonLink | null = null;
  for (const entry of deps.catalog.chapters) {
    const lesson = entry.lessons.find(
      (candidate) => !progress.some((read) => read.lessonId === candidate.id),
    );
    if (lesson) {
      nextLesson = {
        chapterSlug: entry.chapter.slug,
        lessonSlug: lesson.slug,
        title: lesson.title,
      };
      break;
    }
  }

  return {
    chapters,
    stats,
    accuracyPercent:
      stats.answeredQuestions > 0
        ? Math.round((stats.correctAnswers / stats.answeredQuestions) * 100)
        : null,
    recentAttempts: deps.repository
      .listRecentCompletedAttempts(LOCAL_PROFILE_ID, 5)
      .map((attempt) => toRecentAttempt(deps, attempt)),
    activeExam: activeExamSummary
      ? {
          attemptId: activeExamSummary.id,
          title: attemptTitle(deps, activeExamSummary),
        }
      : null,
    presets: listExamPresetOverviews(deps.catalog),
    reviewCount,
    officialPublishedQuestionCount: countPublishedExamQuestions(deps.catalog),
    nextLesson,
  };
}

export function getChapterDetail(deps: AppDependencies, slug: string): ChapterDetail {
  const entry = deps.catalog.chapterBySlug.get(slug) ?? deps.catalog.chapterById.get(slug);

  if (!entry) {
    throw new ContentNotFoundError(`chapitre ${slug}`);
  }

  const progress = deps.repository.getLessonProgress(LOCAL_PROFILE_ID);
  const readByLesson = new Map(progress.map((item) => [item.lessonId, item.readAt]));
  const overview = listChapterOverviews(deps.catalog, progress).find(
    (chapter) => chapter.id === entry.chapter.id,
  );

  if (!overview) {
    throw new ContentNotFoundError(`chapitre ${slug}`);
  }

  const lessons = entry.lessons.map((lesson, index) => {
    const previousLesson = index > 0 ? entry.lessons[index - 1] : undefined;
    const readAt = readByLesson.get(lesson.id) ?? null;
    const locked = readAt === null && previousLesson ? !readByLesson.has(previousLesson.id) : false;

    return toLessonSummary(lesson, readAt, locked);
  });

  const units: UnitOverview[] = [...(entry.chapter.units ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((unit) => {
      const unitLessons = lessons.filter((lesson) => lesson.unitId === unit.id);

      return {
        id: unit.id,
        slug: unit.slug,
        label: unit.label,
        title: unit.title,
        summary: unit.summary ?? null,
        order: unit.order,
        lessonCount: unitLessons.length,
        readLessonCount: unitLessons.filter((lesson) => lesson.readAt !== null).length,
        lessons: unitLessons,
      };
    });

  return {
    ...overview,
    lessons,
    units,
  };
}

export function getLessonDetail(
  deps: AppDependencies,
  chapterSlug: string,
  lessonSlug: string,
): LessonDetail {
  const entry =
    deps.catalog.chapterBySlug.get(chapterSlug) ?? deps.catalog.chapterById.get(chapterSlug);

  if (!entry) {
    throw new ContentNotFoundError(`chapitre ${chapterSlug}`);
  }

  const lessonIndex = entry.lessons.findIndex(
    (candidate) => candidate.slug === lessonSlug || candidate.id === lessonSlug,
  );

  if (lessonIndex < 0) {
    throw new ContentNotFoundError(`leçon ${lessonSlug}`);
  }

  const lesson = entry.lessons[lessonIndex]!;
  const progress = deps.repository.getLessonProgress(LOCAL_PROFILE_ID);
  const readByLesson = new Map(progress.map((item) => [item.lessonId, item.readAt]));
  const readAt = readByLesson.get(lesson.id) ?? null;
  const previousLesson = lessonIndex > 0 ? entry.lessons[lessonIndex - 1] : undefined;
  const nextLesson = entry.lessons[lessonIndex + 1];
  const locked = readAt === null && previousLesson ? !readByLesson.has(previousLesson.id) : false;
  const unit = lesson.unitId
    ? (entry.chapter.units?.find((candidate) => candidate.id === lesson.unitId) ?? null)
    : null;
  const activeRun = deps.repository.getActiveLessonRun(LOCAL_PROFILE_ID, lesson.id);

  return {
    lesson,
    chapterSlug: entry.chapter.slug,
    chapterTitle: entry.chapter.title,
    unit: unit ? { id: unit.id, label: unit.label, title: unit.title } : null,
    sections: splitLessonSections(lesson.body).map((section) => ({
      id: section.id,
      title: section.title,
    })),
    hasQuestions: (lesson.coreQuestionIds?.length ?? 0) > 0,
    locked,
    readAt,
    activeRunAttemptId: activeRun?.id ?? null,
    previousLesson: previousLesson
      ? { slug: previousLesson.slug, title: previousLesson.title }
      : null,
    nextLesson: nextLesson ? { slug: nextLesson.slug, title: nextLesson.title } : null,
    sources: resolveSourceLabels(deps.catalog, lesson.sourceRefs),
  };
}

export function getReviewItems(deps: AppDependencies): ReviewItem[] {
  return deps.repository.getLatestIncorrectQuestionIds(LOCAL_PROFILE_ID).flatMap((questionId) => {
    const question = deps.catalog.questionById.get(questionId);
    if (!question) {
      return [];
    }

    const chapter = deps.catalog.chapterById.get(question.chapterId);

    return [
      {
        questionId: question.id,
        chapterId: question.chapterId,
        chapterSlug: chapter?.chapter.slug ?? question.chapterId,
        chapterTitle: chapter?.chapter.title ?? question.chapterId,
        lessonTitles: question.lessonIds.map(
          (lessonId) => deps.catalog.lessonById.get(lessonId)?.lesson.title ?? lessonId,
        ),
        prompt: question.prompt,
        options: resolveOptionViews(deps.catalog, question.options),
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        media: resolveMedia(deps.catalog, question.mediaId),
        sources: resolveSourceLabels(deps.catalog, question.sourceRefs),
      },
    ];
  });
}

function penaltyPointsForAttempt(attempt: Attempt): number {
  const errorPenalty = attempt.errorPenalty;
  const severeErrorPenalty = attempt.severeErrorPenalty;

  if (attempt.mode !== "exam" || errorPenalty === null || severeErrorPenalty === null) {
    return 0;
  }

  return attempt.questions.reduce((total, question) => {
    if (question.isCorrect === true) {
      return total;
    }
    if (question.timedOut) {
      return total + errorPenalty;
    }
    return total + (question.snapshot.severity === "severe" ? severeErrorPenalty : errorPenalty);
  }, 0);
}

export function getAttemptResult(deps: AppDependencies, attemptId: string): AttemptResultLookup {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(attemptId);
  }

  if (attempt.status === "abandoned") {
    return { kind: "abandoned", attemptId };
  }

  if (attempt.status === "in_progress" || attempt.completedAt === null) {
    return { kind: "in_progress", mode: attempt.mode, attemptId };
  }

  const correctCount = attempt.questions.filter((question) => question.isCorrect === true).length;
  const timedOutCount = attempt.questions.filter((question) => question.timedOut).length;

  return {
    kind: "completed",
    result: {
      attemptId: attempt.id,
      mode: attempt.mode,
      title: attemptTitle(deps, attempt),
      completedAt: attempt.completedAt,
      questionCount: attempt.questionCount,
      correctCount,
      incorrectCount: attempt.questionCount - correctCount,
      timedOutCount,
      penaltyPoints: penaltyPointsForAttempt(attempt),
      score: attempt.score ?? correctCount,
      passingScore: attempt.passingScore,
      passed: attempt.passed,
      durationMs: attempt.durationMs ?? 0,
      questions: attempt.questions.map((question) => ({
        position: question.position,
        questionId: question.snapshot.questionId,
        prompt: question.snapshot.prompt,
        options: resolveOptionViews(deps.catalog, question.snapshot.options),
        selectedOptionId: question.selectedOptionId,
        correctOptionId: question.snapshot.correctOptionId,
        isCorrect: question.isCorrect === true,
        timedOut: question.timedOut,
        severity: question.snapshot.severity,
        explanation: question.snapshot.explanation,
        media: resolveMedia(deps.catalog, question.snapshot.mediaId),
        chapterTitle:
          deps.catalog.chapterById.get(question.snapshot.chapterId)?.chapter.title ??
          question.snapshot.chapterId,
        sources: resolveSourceLabels(deps.catalog, question.snapshot.sourceRefs),
      })),
    },
  };
}

export function requireActiveExamAttempt(deps: AppDependencies, attemptId: string): Attempt {
  const attempt = deps.repository.getAttempt(LOCAL_PROFILE_ID, attemptId);

  if (!attempt) {
    throw new AttemptNotFoundError(attemptId);
  }

  if (attempt.mode !== "exam") {
    throw new AttemptConflictError("Cette tentative n'est pas un examen.");
  }

  return attempt;
}
