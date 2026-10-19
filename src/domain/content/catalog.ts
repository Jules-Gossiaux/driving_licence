import type {
  Chapter,
  ExamPreset,
  Lesson,
  MediaAsset,
  Question,
  SourceDocument,
  SourceRef,
} from "./schemas";

export type ContentIssueLevel = "error" | "warning";

export type ContentIssue = {
  level: ContentIssueLevel;
  code: string;
  path: string;
  message: string;
};

export type ChapterContent = {
  chapter: Chapter;
  lessons: Lesson[];
  questions: Question[];
};

export type RawContent = {
  sources: SourceDocument[];
  media: MediaAsset[];
  chapters: ChapterContent[];
  presets: ExamPreset[];
};

export type ContentCatalog = {
  sources: ReadonlyMap<string, SourceDocument>;
  media: ReadonlyMap<string, MediaAsset>;
  mediaByFile: ReadonlyMap<string, MediaAsset>;
  chapters: ChapterContent[];
  chapterById: ReadonlyMap<string, ChapterContent>;
  chapterBySlug: ReadonlyMap<string, ChapterContent>;
  lessons: Lesson[];
  lessonById: ReadonlyMap<string, { lesson: Lesson; chapter: ChapterContent }>;
  questions: Question[];
  questionById: ReadonlyMap<string, Question>;
  presets: ExamPreset[];
  presetById: ReadonlyMap<string, ExamPreset>;
};

export type CatalogBuildResult = {
  catalog: ContentCatalog;
  issues: ContentIssue[];
};

function compareByOrderThenSlug(
  left: { order: number; slug: string },
  right: { order: number; slug: string },
): number {
  return left.order - right.order || left.slug.localeCompare(right.slug);
}

function pushDuplicateIssues(
  issues: ContentIssue[],
  ids: string[],
  path: string,
  label: string,
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_ID",
        path,
        message: `${label} dupliqué : ${id}.`,
      });
    }
    seen.add(id);
  }
}

function validateSourceRefs(
  refs: SourceRef[],
  path: string,
  sources: ReadonlyMap<string, SourceDocument>,
  issues: ContentIssue[],
): void {
  for (const ref of refs) {
    if (!sources.has(ref.documentId)) {
      issues.push({
        level: "error",
        code: "UNKNOWN_SOURCE",
        path,
        message: `Référence source inconnue : ${ref.documentId}.`,
      });
    }
  }
}

function extractMarkdownImageTargets(markdown: string): string[] {
  const targets: string[] = [];
  const imagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of markdown.matchAll(imagePattern)) {
    const target = match[1];
    if (target) {
      targets.push(target);
    }
  }
  return targets;
}

export function getEligibleQuestionsForPreset(
  preset: ExamPreset,
  catalog: Pick<ContentCatalog, "questions" | "chapterById">,
): Question[] {
  const chapterFilter = new Set(preset.chapterIds);
  return catalog.questions.filter((question) => {
    if (!question.examEligible) {
      return false;
    }

    if (chapterFilter.size > 0 && !chapterFilter.has(question.chapterId)) {
      return false;
    }

    if (preset.allowUnpublished) {
      return true;
    }

    const chapter = catalog.chapterById.get(question.chapterId);
    return question.status === "published" && chapter?.chapter.status === "published";
  });
}

export function buildContentCatalog(raw: RawContent): CatalogBuildResult {
  const issues: ContentIssue[] = [];

  pushDuplicateIssues(
    issues,
    raw.sources.map((source) => source.id),
    "content/sources.yaml",
    "Identifiant de source",
  );
  pushDuplicateIssues(
    issues,
    raw.media.map((asset) => asset.id),
    "content/media.yaml",
    "Identifiant de média",
  );
  pushDuplicateIssues(
    issues,
    raw.presets.map((preset) => preset.id),
    "content/exam-presets",
    "Identifiant de preset",
  );

  const sources = new Map(raw.sources.map((source) => [source.id, source]));
  const media = new Map(raw.media.map((asset) => [asset.id, asset]));
  const mediaByFile = new Map<string, MediaAsset>();

  for (const asset of raw.media) {
    if (mediaByFile.has(asset.file)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_MEDIA_FILE",
        path: "content/media.yaml",
        message: `Le fichier média ${asset.file} est déclaré plusieurs fois.`,
      });
    }
    mediaByFile.set(asset.file, asset);
    validateSourceRefs(asset.sourceRefs, `media:${asset.id}`, sources, issues);
  }

  const chapterIds = raw.chapters.map((entry) => entry.chapter.id);
  const chapterSlugs = raw.chapters.map((entry) => entry.chapter.slug);
  pushDuplicateIssues(issues, chapterIds, "content/chapters", "Identifiant de chapitre");
  pushDuplicateIssues(issues, chapterSlugs, "content/chapters", "Slug de chapitre");

  const allLessons: Lesson[] = [];
  const allQuestions: Question[] = [];
  const chapters = [...raw.chapters]
    .sort((left, right) => compareByOrderThenSlug(left.chapter, right.chapter))
    .map((entry) => ({
      chapter: entry.chapter,
      lessons: [...entry.lessons].sort(compareByOrderThenSlug),
      questions: [...entry.questions].sort((left, right) => left.id.localeCompare(right.id)),
    }));

  const chapterById = new Map<string, ChapterContent>();
  const chapterBySlug = new Map<string, ChapterContent>();
  const lessonById = new Map<string, { lesson: Lesson; chapter: ChapterContent }>();

  for (const entry of chapters) {
    chapterById.set(entry.chapter.id, entry);
    chapterBySlug.set(entry.chapter.slug, entry);
    validateSourceRefs(entry.chapter.sourceRefs, `chapter:${entry.chapter.id}`, sources, issues);

    if (entry.questions.length === 0) {
      issues.push({
        level: "warning",
        code: "CHAPTER_WITHOUT_QUESTIONS",
        path: `chapter:${entry.chapter.id}`,
        message: "Ce chapitre ne contient aucune question : l'entraînement sera indisponible.",
      });
    }

    const lessonSlugs = entry.lessons.map((lesson) => lesson.slug);
    pushDuplicateIssues(issues, lessonSlugs, `chapter:${entry.chapter.id}`, "Slug de leçon");

    const lessonOrders = entry.lessons.map((lesson) => String(lesson.order));
    pushDuplicateIssues(issues, lessonOrders, `chapter:${entry.chapter.id}`, "Ordre de leçon");

    for (const lesson of entry.lessons) {
      allLessons.push(lesson);

      if (lesson.chapterId !== entry.chapter.id) {
        issues.push({
          level: "error",
          code: "LESSON_CHAPTER_MISMATCH",
          path: `lesson:${lesson.id}`,
          message: `La leçon déclare le chapitre ${lesson.chapterId} au lieu de ${entry.chapter.id}.`,
        });
      }

      validateSourceRefs(lesson.sourceRefs, `lesson:${lesson.id}`, sources, issues);

      for (const target of extractMarkdownImageTargets(lesson.body)) {
        if (!target.startsWith("/media/")) {
          issues.push({
            level: "error",
            code: "EXTERNAL_IMAGE",
            path: `lesson:${lesson.id}`,
            message: `Image externe interdite dans une leçon : ${target}.`,
          });
          continue;
        }

        if (!mediaByFile.has(target)) {
          issues.push({
            level: "error",
            code: "UNKNOWN_MEDIA_FILE",
            path: `lesson:${lesson.id}`,
            message: `Image non déclarée dans content/media.yaml : ${target}.`,
          });
        }
      }
    }

    for (const question of entry.questions) {
      allQuestions.push(question);

      if (question.chapterId !== entry.chapter.id) {
        issues.push({
          level: "error",
          code: "QUESTION_CHAPTER_MISMATCH",
          path: `question:${question.id}`,
          message: `La question déclare le chapitre ${question.chapterId} au lieu de ${entry.chapter.id}.`,
        });
      }

      const chapterLessonIds = new Set(entry.lessons.map((lesson) => lesson.id));
      for (const lessonId of question.lessonIds) {
        if (!chapterLessonIds.has(lessonId)) {
          issues.push({
            level: "error",
            code: "UNKNOWN_LESSON",
            path: `question:${question.id}`,
            message: `La question référence une leçon absente du chapitre : ${lessonId}.`,
          });
        }
      }

      if (question.mediaId && !media.has(question.mediaId)) {
        issues.push({
          level: "error",
          code: "UNKNOWN_MEDIA",
          path: `question:${question.id}`,
          message: `Média inconnu : ${question.mediaId}.`,
        });
      }

      validateSourceRefs(question.sourceRefs, `question:${question.id}`, sources, issues);
    }
  }

  pushDuplicateIssues(
    issues,
    allLessons.map((lesson) => lesson.id),
    "content/chapters",
    "Identifiant de leçon",
  );
  pushDuplicateIssues(
    issues,
    allQuestions.map((question) => question.id),
    "content/chapters",
    "Identifiant de question",
  );

  for (const entry of chapters) {
    for (const lesson of entry.lessons) {
      lessonById.set(lesson.id, { lesson, chapter: entry });
    }
  }

  const questionById = new Map(allQuestions.map((question) => [question.id, question]));
  const presetById = new Map(raw.presets.map((preset) => [preset.id, preset]));

  for (const preset of raw.presets) {
    validateSourceRefs(preset.sourceRefs, `preset:${preset.id}`, sources, issues);

    for (const chapterId of preset.chapterIds) {
      if (!chapterById.has(chapterId)) {
        issues.push({
          level: "error",
          code: "UNKNOWN_CHAPTER",
          path: `preset:${preset.id}`,
          message: `Chapitre inconnu dans le preset : ${chapterId}.`,
        });
      }
    }
  }

  const catalog: ContentCatalog = {
    sources,
    media,
    mediaByFile,
    chapters,
    chapterById,
    chapterBySlug,
    lessons: allLessons,
    lessonById,
    questions: allQuestions,
    questionById,
    presets: [...raw.presets].sort((left, right) => left.id.localeCompare(right.id)),
    presetById,
  };

  for (const preset of catalog.presets) {
    const eligible = getEligibleQuestionsForPreset(preset, catalog);
    if (eligible.length < preset.questionCount) {
      issues.push({
        level: "warning",
        code: "EXAM_POOL_INSUFFICIENT",
        path: `preset:${preset.id}`,
        message: `${eligible.length}/${preset.questionCount} questions utilisables pour ce preset.`,
      });
    }
  }

  return { catalog, issues };
}

export function countPublishedExamQuestions(
  catalog: Pick<ContentCatalog, "questions" | "chapterById">,
): number {
  return catalog.questions.filter((question) => {
    const chapter = catalog.chapterById.get(question.chapterId);
    return (
      question.examEligible &&
      question.status === "published" &&
      chapter?.chapter.status === "published"
    );
  }).length;
}
