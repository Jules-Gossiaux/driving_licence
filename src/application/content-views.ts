import type { Clock } from "@/domain/clock";
import { getEligibleQuestionsForPreset, type ContentCatalog } from "@/domain/content/catalog";
import type {
  Chapter,
  Lesson,
  Question,
  QuestionOption,
  SourceRef,
} from "@/domain/content/schemas";
import type { LearningRepository } from "./ports";
import type { IdGenerator, RandomFn } from "./ports";

export type AppDependencies = {
  catalog: ContentCatalog;
  repository: LearningRepository;
  clock: Clock;
  newId: IdGenerator;
  random: RandomFn;
};

export type QuestionMediaView = {
  id: string;
  file: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
};

export type SourceLabel = {
  documentId: string;
  title: string;
  page: number | null;
  locator: string | null;
  note: string | null;
};

export type ChapterOverview = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  order: number;
  status: Chapter["status"];
  published: boolean;
  lessonCount: number;
  readLessonCount: number;
  questionCount: number;
  sources: SourceLabel[];
};

export type LessonSummary = {
  id: string;
  unitId: string | null;
  slug: string;
  title: string;
  summary: string;
  order: number;
  status: Lesson["status"];
  published: boolean;
  keyPoints: string[];
  readAt: string | null;
  locked: boolean;
};

export type UnitOverview = {
  id: string;
  slug: string;
  label: string;
  title: string;
  summary: string | null;
  order: number;
  lessonCount: number;
  readLessonCount: number;
  lessons: LessonSummary[];
};

export type ChapterDetail = ChapterOverview & {
  lessons: LessonSummary[];
  units: UnitOverview[];
};

export type LessonNavigation = {
  slug: string;
  title: string;
};

export type LessonDetail = {
  lesson: Lesson;
  chapterSlug: string;
  chapterTitle: string;
  unit: { id: string; label: string; title: string } | null;
  sections: Array<{ id: string; title: string }>;
  hasQuestions: boolean;
  locked: boolean;
  readAt: string | null;
  activeRunAttemptId: string | null;
  previousLesson: LessonNavigation | null;
  nextLesson: LessonNavigation | null;
  sources: SourceLabel[];
};

export type QuestionMedia = QuestionMediaView;

export type QuestionOptionView = {
  id: string;
  label: string;
  media: QuestionMediaView | null;
};

export type ExamPresetOverview = {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  secondsPerQuestion: number;
  passingScore: number;
  availableQuestions: number;
  locked: boolean;
  isDemo: boolean;
};

export type ResolvedQuestion = {
  question: Question;
  options: QuestionOptionView[];
  correctOptionId: string;
  explanation: string;
  media: QuestionMediaView | null;
  sources: SourceLabel[];
};

export function resolveMedia(
  catalog: ContentCatalog,
  mediaId: string | null | undefined,
): QuestionMediaView | null {
  if (!mediaId) {
    return null;
  }

  const asset = catalog.media.get(mediaId);
  if (!asset) {
    return null;
  }

  return {
    id: asset.id,
    file: asset.file,
    alt: asset.alt,
    caption: asset.caption ?? null,
    width: asset.width,
    height: asset.height,
  };
}

export function resolveOptionViews(
  catalog: ContentCatalog,
  options: ReadonlyArray<{ id: string; label: string; mediaId?: string | null }>,
): QuestionOptionView[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label,
    media: resolveMedia(catalog, option.mediaId),
  }));
}

export function resolveSourceLabels(
  catalog: ContentCatalog,
  refs: readonly SourceRef[],
): SourceLabel[] {
  return refs.map((ref) => {
    const document = catalog.sources.get(ref.documentId);
    return {
      documentId: ref.documentId,
      title: document?.title ?? ref.documentId,
      page: ref.page ?? null,
      locator: ref.locator ?? null,
      note: ref.note ?? null,
    };
  });
}

export function toChapterOverview(
  catalog: ContentCatalog,
  entry: ContentCatalog["chapters"][number],
  readLessonIds: ReadonlySet<string>,
): ChapterOverview {
  return {
    id: entry.chapter.id,
    slug: entry.chapter.slug,
    title: entry.chapter.title,
    summary: entry.chapter.summary,
    order: entry.chapter.order,
    status: entry.chapter.status,
    published: entry.chapter.status === "published",
    lessonCount: entry.lessons.length,
    readLessonCount: entry.lessons.filter((lesson) => readLessonIds.has(lesson.id)).length,
    questionCount: entry.questions.length,
    sources: resolveSourceLabels(catalog, entry.chapter.sourceRefs),
  };
}

export function toLessonSummary(
  lesson: Lesson,
  readAt: string | null,
  locked = false,
): LessonSummary {
  return {
    id: lesson.id,
    unitId: lesson.unitId ?? null,
    slug: lesson.slug,
    title: lesson.title,
    summary: lesson.summary,
    order: lesson.order,
    status: lesson.status,
    published: lesson.status === "published",
    keyPoints: lesson.keyPoints,
    readAt,
    locked,
  };
}

export function resolveQuestion(
  catalog: ContentCatalog,
  question: Question,
  options?: QuestionOption[],
): ResolvedQuestion {
  return {
    question,
    options: resolveOptionViews(catalog, options ?? question.options),
    correctOptionId: question.correctOptionId,
    explanation: question.explanation,
    media: resolveMedia(catalog, question.mediaId),
    sources: resolveSourceLabels(catalog, question.sourceRefs),
  };
}

export function listChapterOverviews(
  catalog: ContentCatalog,
  progress: ReadonlyArray<{ lessonId: string }>,
): ChapterOverview[] {
  const readLessonIds = new Set(progress.map((entry) => entry.lessonId));
  return catalog.chapters.map((entry) => toChapterOverview(catalog, entry, readLessonIds));
}

export function listExamPresetOverviews(catalog: ContentCatalog): ExamPresetOverview[] {
  return catalog.presets.map((preset) => {
    const availableQuestions = getEligibleQuestionsForPreset(preset, catalog).length;

    return {
      id: preset.id,
      title: preset.title,
      description: preset.description,
      questionCount: preset.questionCount,
      secondsPerQuestion: preset.secondsPerQuestion,
      passingScore: preset.passingScore,
      availableQuestions,
      locked: availableQuestions < preset.questionCount,
      isDemo: preset.allowUnpublished,
    };
  });
}
