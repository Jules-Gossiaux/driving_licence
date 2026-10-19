import type { AppDependencies } from "@/application/content-views";
import {
  buildContentCatalog,
  type ContentCatalog,
  type RawContent,
} from "@/domain/content/catalog";
import type {
  Chapter,
  ExamPreset,
  Lesson,
  Question,
  SourceDocument,
} from "@/domain/content/schemas";
import type { Clock } from "@/domain/clock";
import type { RandomFn } from "@/application/ports";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "@/infrastructure/db/open";
import { SqliteLearningRepository } from "@/infrastructure/db/repository";

export const TEST_STARTED_AT = "2026-10-19T10:00:00.000Z";

export const testSource: SourceDocument = {
  id: "official-source",
  title: "Source officielle de test",
  kind: "official",
  url: "https://example.com/source",
  rights: "external_reference",
};

export function testQuestion(overrides: Partial<Question> & Pick<Question, "id">): Question {
  const { id, ...rest } = overrides;

  return {
    id,
    chapterId: "ch01",
    lessonIds: ["ch01-l01"],
    prompt: `Question ${id}`,
    options: [
      { id: "a", label: "Réponse A" },
      { id: "b", label: "Réponse B" },
      { id: "c", label: "Réponse C" },
    ],
    correctOptionId: "a",
    explanation: "Explication de test.",
    difficulty: "easy",
    severity: "normal",
    examEligible: true,
    tags: [],
    sourceRefs: [{ documentId: testSource.id }],
    version: 1,
    status: "draft",
    origin: "original",
    ...rest,
  };
}

export function testChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: "ch01",
    slug: "chapitre-1",
    order: 1,
    title: "Chapitre de test",
    summary: "Résumé du chapitre de test.",
    sourceRefs: [{ documentId: testSource.id }],
    version: 1,
    status: "draft",
    origin: "original",
    ...overrides,
  };
}

export function testLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "ch01-l01",
    chapterId: "ch01",
    slug: "lecon-1",
    order: 1,
    title: "Leçon de test",
    summary: "Résumé de la leçon de test.",
    keyPoints: ["Point clé de test."],
    sourceRefs: [{ documentId: testSource.id }],
    version: 1,
    body: "# Leçon de test\n\nContenu de test.",
    status: "draft",
    origin: "original",
    ...overrides,
  };
}

export function testPreset(overrides: Partial<ExamPreset> = {}): ExamPreset {
  return {
    id: "preset-demo",
    title: "Examen de test",
    description: "Preset de test.",
    questionCount: 3,
    secondsPerQuestion: 15,
    passingScore: 2,
    errorPenalty: 1,
    severeErrorPenalty: 5,
    allowUnpublished: true,
    chapterIds: ["ch01"],
    sourceRefs: [{ documentId: testSource.id }],
    ...overrides,
  };
}

export function testRawContent(): RawContent {
  return {
    sources: [testSource],
    media: [],
    chapters: [
      {
        chapter: testChapter(),
        lessons: [testLesson()],
        questions: [
          testQuestion({ id: "ch01-q001" }),
          testQuestion({ id: "ch01-q002", severity: "severe", correctOptionId: "b" }),
          testQuestion({ id: "ch01-q003", correctOptionId: "c" }),
        ],
      },
    ],
    presets: [testPreset()],
  };
}

export function testCatalog(raw: RawContent = testRawContent()): ContentCatalog {
  return buildContentCatalog(raw).catalog;
}

export type TestClock = Clock & {
  advance(milliseconds: number): void;
  set(isoDateTime: string): void;
};

export function createTestClock(start: Date = new Date(TEST_STARTED_AT)): TestClock {
  let current = new Date(start);

  return {
    now: () => new Date(current),
    advance(milliseconds) {
      current = new Date(current.getTime() + milliseconds);
    },
    set(isoDateTime) {
      current = new Date(isoDateTime);
    },
  };
}

export function seededRandom(seed = 1): RandomFn {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export type TestDependencies = {
  deps: AppDependencies;
  db: DatabaseSync;
  clock: TestClock;
  close(): void;
};

export function createTestDependencies(
  options: {
    catalog?: ContentCatalog;
    seed?: number;
  } = {},
): TestDependencies {
  const opened = openDatabase(":memory:");
  const clock = createTestClock();
  let nextId = 0;

  const deps: AppDependencies = {
    catalog: options.catalog ?? testCatalog(),
    repository: new SqliteLearningRepository(opened.db),
    clock,
    newId: () => `attempt-${(nextId += 1)}`,
    random: seededRandom(options.seed ?? 7),
  };

  return {
    deps,
    db: opened.db,
    clock,
    close: () => opened.db.close(),
  };
}
