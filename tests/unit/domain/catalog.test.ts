import { describe, expect, it } from "vitest";
import {
  buildContentCatalog,
  countPublishedExamQuestions,
  getEligibleQuestionsForPreset,
} from "@/domain/content/catalog";
import type { Lesson } from "@/domain/content/schemas";
import { testLesson, testPreset, testQuestion, testRawContent } from "../../helpers/fixtures";

describe("getEligibleQuestionsForPreset", () => {
  it("accepte les brouillons quand le preset le permet", () => {
    const { catalog } = buildContentCatalog(testRawContent());
    const preset = catalog.presetById.get("preset-demo")!;

    expect(getEligibleQuestionsForPreset(preset, catalog)).toHaveLength(3);
  });

  it("exige une question et un chapitre publiés pour le preset officiel", () => {
    const raw = testRawContent();
    raw.presets = [
      testPreset({ id: "preset-officiel", questionCount: 1, allowUnpublished: false }),
    ];
    raw.chapters[0]!.questions = [testQuestion({ id: "ch01-q001" })];

    const drafts = buildContentCatalog(raw);
    expect(
      getEligibleQuestionsForPreset(
        drafts.catalog.presetById.get("preset-officiel")!,
        drafts.catalog,
      ),
    ).toHaveLength(0);

    raw.chapters[0]!.chapter = {
      ...raw.chapters[0]!.chapter,
      status: "published",
      reviewedBy: "Relecteur",
      reviewedAt: "2026-10-19T10:00:00.000Z",
    };
    raw.chapters[0]!.questions[0] = {
      ...raw.chapters[0]!.questions[0]!,
      status: "published",
      reviewedBy: "Relecteur",
      reviewedAt: "2026-10-19T10:00:00.000Z",
    };

    const published = buildContentCatalog(raw);
    expect(
      getEligibleQuestionsForPreset(
        published.catalog.presetById.get("preset-officiel")!,
        published.catalog,
      ),
    ).toHaveLength(1);
    expect(countPublishedExamQuestions(published.catalog)).toBe(1);
  });

  it("exclut les questions non éligibles et les chapitres hors preset", () => {
    const raw = testRawContent();
    raw.chapters[0]!.questions[0] = {
      ...raw.chapters[0]!.questions[0]!,
      examEligible: false,
    };
    raw.presets = [testPreset({ chapterIds: ["autre-chapitre"] })];

    const { catalog } = buildContentCatalog(raw);
    expect(
      getEligibleQuestionsForPreset(catalog.presetById.get("preset-demo")!, catalog),
    ).toHaveLength(0);
  });
});

describe("buildContentCatalog", () => {
  it("ne signale aucun problème sur un contenu cohérent", () => {
    const { issues } = buildContentCatalog(testRawContent());
    expect(issues).toEqual([]);
  });

  it("signale une banque insuffisante pour le preset officiel", () => {
    const raw = testRawContent();
    raw.presets = [
      testPreset({ id: "preset-officiel", allowUnpublished: false, questionCount: 3 }),
    ];

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "warning",
        code: "EXAM_POOL_INSUFFICIENT",
        path: "preset:preset-officiel",
      }),
    );
  });

  it("trie les chapitres et les leçons par ordre", () => {
    const raw = testRawContent();
    raw.chapters[0]!.lessons = [
      testLesson({ id: "ch01-l02", slug: "lecon-2", order: 2 }),
      testLesson({ id: "ch01-l01", slug: "lecon-1", order: 1 }),
    ];

    const { catalog } = buildContentCatalog(raw);
    expect(catalog.lessons.map((lesson) => lesson.slug)).toEqual(["lecon-1", "lecon-2"]);
  });

  it("signale les identifiants dupliqués et les références inconnues", () => {
    const raw = testRawContent();
    const chapter = raw.chapters[0]!;
    chapter.questions[0] = testQuestion({
      id: "ch01-q001",
      lessonIds: ["lecon-inconnue"],
      mediaId: "media-inconnu",
      options: [
        { id: "a", label: "Réponse A", mediaId: "media-option-inconnu" },
        { id: "b", label: "Réponse B" },
      ],
      sourceRefs: [{ documentId: "source-inconnue" }],
    });
    chapter.questions.push(testQuestion({ id: "ch01-q001" }));
    chapter.lessons[0] = testLesson({
      body: "![Image](https://example.com/externe.png)\n\n![Locale](/media/absente.svg)",
    });

    const { issues } = buildContentCatalog(raw);
    const codes = issues.map((issue) => issue.code);

    expect(codes).toContain("DUPLICATE_ID");
    expect(codes).toContain("UNKNOWN_LESSON");
    expect(codes).toContain("UNKNOWN_MEDIA");
    expect(codes).toContain("UNKNOWN_OPTION_MEDIA");
    expect(codes).toContain("UNKNOWN_SOURCE");
    expect(codes).toContain("EXTERNAL_IMAGE");
    expect(codes).toContain("UNKNOWN_MEDIA_FILE");
  });

  it("signale un chapitre inconnu dans un preset", () => {
    const raw = testRawContent();
    raw.presets = [testPreset({ chapterIds: ["chapitre-inconnu"] })];

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_CHAPTER", level: "error" }),
    );
  });

  it("signale un chapitre sans question", () => {
    const raw = testRawContent();
    raw.chapters[0]!.questions = [];
    raw.presets = [];

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "CHAPTER_WITHOUT_QUESTIONS", level: "warning" }),
    );
  });

  it("accepte quatre questions cœur rattachées à la leçon", () => {
    const raw = testRawContent();
    raw.chapters[0]!.questions.push(testQuestion({ id: "ch01-q004" }));
    raw.chapters[0]!.lessons[0] = testLesson({
      coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"],
    });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toEqual([]);
  });

  it("signale une question cœur inconnue", () => {
    const raw = testRawContent();
    raw.chapters[0]!.lessons[0] = testLesson({
      coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q999"],
    });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_CORE_QUESTION", level: "error" }),
    );
  });

  it("signale une question cœur qui ne référence pas la leçon", () => {
    const raw = testRawContent();
    raw.chapters[0]!.lessons = [
      testLesson({ coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"] }),
      testLesson({ id: "ch01-l02", slug: "lecon-2", order: 2 }),
    ];
    raw.chapters[0]!.questions.push(testQuestion({ id: "ch01-q004", lessonIds: ["ch01-l02"] }));

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "CORE_QUESTION_LESSON_MISMATCH", level: "error" }),
    );
  });

  it("exige des questions cœur pour publier une leçon", () => {
    const raw = testRawContent();
    raw.chapters[0]!.lessons[0] = testLesson({
      status: "published",
      reviewedBy: "Relecteur",
      reviewedAt: "2026-10-19T10:00:00.000Z",
    });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "CORE_QUESTIONS_MISSING", level: "error" }),
    );
  });
});

function lessonWithUnit(overrides: Partial<Lesson> = {}) {
  return testLesson({
    unitId: "ch01-u1",
    body: [
      "## Une première partie",
      "",
      "Texte A.",
      "",
      "## Une seconde partie",
      "",
      "Texte B.",
    ].join("\n"),
    ...overrides,
  });
}

function chapterWithUnit() {
  const raw = testRawContent();
  raw.chapters[0]!.chapter = {
    ...raw.chapters[0]!.chapter,
    units: [
      {
        id: "ch01-u1",
        slug: "unite-1",
        order: 1,
        label: "1.1",
        title: "Unité de test",
      },
    ],
  };
  raw.chapters[0]!.questions.push(testQuestion({ id: "ch01-q004" }));
  raw.chapters[0]!.lessons[0] = lessonWithUnit({
    coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"],
  });
  return raw;
}

describe("unités et vérifications de section", () => {
  it("accepte une unité et des vérifications cohérentes", () => {
    const raw = chapterWithUnit();
    raw.chapters[0]!.lessons[0] = lessonWithUnit({
      coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"],
      sectionChecks: [
        { section: "une-premiere-partie", questionIds: ["ch01-q001"] },
        { section: "une-seconde-partie", questionIds: ["ch01-q002"] },
      ],
    });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toEqual([]);
  });

  it("signale une leçon sans unité quand le chapitre en déclare", () => {
    const raw = chapterWithUnit();
    raw.chapters[0]!.lessons[0] = lessonWithUnit({ unitId: undefined });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "LESSON_UNIT_MISSING", level: "error" }),
    );
  });

  it("signale une unité inconnue", () => {
    const raw = chapterWithUnit();
    raw.chapters[0]!.lessons[0] = lessonWithUnit({ unitId: "ch01-u9" });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_UNIT", level: "error" }),
    );
  });

  it("signale une section de vérification inconnue", () => {
    const raw = chapterWithUnit();
    raw.chapters[0]!.lessons[0] = lessonWithUnit({
      coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"],
      sectionChecks: [{ section: "section-absente", questionIds: ["ch01-q001"] }],
    });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_LESSON_SECTION", level: "error" }),
    );
  });

  it("impose au moins une question cœur pour la fin de la leçon", () => {
    const raw = chapterWithUnit();
    raw.chapters[0]!.lessons[0] = lessonWithUnit({
      coreQuestionIds: ["ch01-q001", "ch01-q002", "ch01-q003", "ch01-q004"],
      sectionChecks: [
        { section: "une-premiere-partie", questionIds: ["ch01-q001", "ch01-q002"] },
        { section: "une-seconde-partie", questionIds: ["ch01-q003", "ch01-q004"] },
      ],
    });

    const { issues } = buildContentCatalog(raw);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "FINAL_QUIZ_MISSING", level: "error" }),
    );
  });
});
