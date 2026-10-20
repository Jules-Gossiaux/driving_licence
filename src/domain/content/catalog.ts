import type {
  Chapter,
  ExamPreset,
  Lesson,
  MediaAsset,
  Question,
  SourceDocument,
  SourceRef,
} from "./schemas";
import { splitLessonSections } from "./sections";

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

const CORE_QUESTION_MIN = 4;
const CORE_QUESTION_MAX = 5;

function validateCoreQuestionIds(
  lesson: Lesson,
  chapterQuestions: Question[],
  issues: ContentIssue[],
): void {
  const coreQuestionIds = lesson.coreQuestionIds;

  if (!coreQuestionIds || coreQuestionIds.length === 0) {
    if (lesson.status === "published") {
      issues.push({
        level: "error",
        code: "CORE_QUESTIONS_MISSING",
        path: `lesson:${lesson.id}`,
        message: `Une leçon publiée doit déclarer ${CORE_QUESTION_MIN} à ${CORE_QUESTION_MAX} questions cœur.`,
      });
    }
    return;
  }

  if (new Set(coreQuestionIds).size !== coreQuestionIds.length) {
    issues.push({
      level: "error",
      code: "DUPLICATE_CORE_QUESTION",
      path: `lesson:${lesson.id}`,
      message: "Une question cœur ne peut être déclarée qu'une seule fois dans une leçon.",
    });
  }

  const chapterQuestionById = new Map(chapterQuestions.map((question) => [question.id, question]));

  for (const questionId of coreQuestionIds) {
    const question = chapterQuestionById.get(questionId);

    if (!question) {
      issues.push({
        level: "error",
        code: "UNKNOWN_CORE_QUESTION",
        path: `lesson:${lesson.id}`,
        message: `Question cœur absente du chapitre : ${questionId}.`,
      });
      continue;
    }

    if (!question.lessonIds.includes(lesson.id)) {
      issues.push({
        level: "error",
        code: "CORE_QUESTION_LESSON_MISMATCH",
        path: `lesson:${lesson.id}`,
        message: `La question cœur ${questionId} ne référence pas cette leçon.`,
      });
    }
  }

  const outsideRange =
    coreQuestionIds.length < CORE_QUESTION_MIN || coreQuestionIds.length > CORE_QUESTION_MAX;

  if (outsideRange) {
    issues.push({
      level: lesson.status === "published" ? "error" : "warning",
      code: "CORE_QUESTION_COUNT",
      path: `lesson:${lesson.id}`,
      message: `Une leçon doit proposer ${CORE_QUESTION_MIN} à ${CORE_QUESTION_MAX} questions cœur (${coreQuestionIds.length} déclarée(s)).`,
    });
  }
}

function compareByOrderThenSlug(
  left: { order: number; slug: string },
  right: { order: number; slug: string },
): number {
  return left.order - right.order || left.slug.localeCompare(right.slug);
}

function validateUnits(entry: ChapterContent, issues: ContentIssue[]): void {
  const units = entry.chapter.units ?? [];
  const path = `chapter:${entry.chapter.id}`;

  pushDuplicateIssues(
    issues,
    units.map((unit) => unit.id),
    path,
    "Identifiant d'unité",
  );
  pushDuplicateIssues(
    issues,
    units.map((unit) => unit.slug),
    path,
    "Slug d'unité",
  );
  pushDuplicateIssues(
    issues,
    units.map((unit) => String(unit.order)),
    path,
    "Ordre d'unité",
  );

  const unitIds = new Set(units.map((unit) => unit.id));

  for (const lesson of entry.lessons) {
    if (units.length === 0) {
      if (lesson.unitId) {
        issues.push({
          level: "error",
          code: "UNIT_NOT_DECLARED",
          path: `lesson:${lesson.id}`,
          message: `La leçon référence l'unité ${lesson.unitId}, absente du chapitre.`,
        });
      }
      continue;
    }

    if (!lesson.unitId) {
      issues.push({
        level: "error",
        code: "LESSON_UNIT_MISSING",
        path: `lesson:${lesson.id}`,
        message: "Une leçon doit être rattachée à une unité du chapitre.",
      });
      continue;
    }

    if (!unitIds.has(lesson.unitId)) {
      issues.push({
        level: "error",
        code: "UNKNOWN_UNIT",
        path: `lesson:${lesson.id}`,
        message: `Unité inconnue : ${lesson.unitId}.`,
      });
    }
  }
}

function validateLessonSections(lesson: Lesson, issues: ContentIssue[]): void {
  const sections = splitLessonSections(lesson.body);
  const sectionIds = new Set(sections.map((section) => section.id));
  const checks = lesson.sectionChecks ?? [];

  if (checks.length === 0) {
    return;
  }

  const coreQuestionIds = lesson.coreQuestionIds ?? [];
  const coreIds = new Set(coreQuestionIds);
  const checkedSections = new Set<string>();
  const checkedQuestions = new Set<string>();

  if (coreIds.size === 0) {
    issues.push({
      level: "error",
      code: "SECTION_CHECKS_WITHOUT_CORE",
      path: `lesson:${lesson.id}`,
      message: "Des vérifications de section exigent des questions cœur.",
    });
  }

  for (const check of checks) {
    if (checkedSections.has(check.section)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_SECTION_CHECK",
        path: `lesson:${lesson.id}`,
        message: `La section ${check.section} reçoit plusieurs vérifications.`,
      });
    }
    checkedSections.add(check.section);

    if (!sectionIds.has(check.section)) {
      issues.push({
        level: "error",
        code: "UNKNOWN_LESSON_SECTION",
        path: `lesson:${lesson.id}`,
        message: `Section inconnue dans la leçon : ${check.section}.`,
      });
    }

    for (const questionId of check.questionIds) {
      if (!coreIds.has(questionId)) {
        issues.push({
          level: "error",
          code: "SECTION_QUESTION_NOT_CORE",
          path: `lesson:${lesson.id}`,
          message: `La vérification utilise une question hors du socle : ${questionId}.`,
        });
      }

      if (checkedQuestions.has(questionId)) {
        issues.push({
          level: "error",
          code: "DUPLICATE_SECTION_QUESTION",
          path: `lesson:${lesson.id}`,
          message: `Question utilisée dans plusieurs vérifications : ${questionId}.`,
        });
      }
      checkedQuestions.add(questionId);
    }
  }

  if (coreQuestionIds.length > 0 && coreQuestionIds.every((id) => checkedQuestions.has(id))) {
    issues.push({
      level: "error",
      code: "FINAL_QUIZ_MISSING",
      path: `lesson:${lesson.id}`,
      message: "Au moins une question cœur doit rester pour la fin de la leçon.",
    });
  }
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
    "content/**/media.yaml",
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
        path: "content/**/media.yaml",
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
    validateUnits(entry, issues);

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
      validateCoreQuestionIds(lesson, entry.questions, issues);
      validateLessonSections(lesson, issues);

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
            message: `Image non déclarée dans un manifeste média : ${target}.`,
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

      for (const option of question.options) {
        if (option.mediaId && !media.has(option.mediaId)) {
          issues.push({
            level: "error",
            code: "UNKNOWN_OPTION_MEDIA",
            path: `question:${question.id}`,
            message: `Média d'option inconnu : ${option.mediaId}.`,
          });
        }
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
