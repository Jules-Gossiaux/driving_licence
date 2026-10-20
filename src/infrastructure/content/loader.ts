import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import type { ZodType } from "zod";
import {
  buildContentCatalog,
  type CatalogBuildResult,
  type ChapterContent,
  type ContentIssue,
} from "@/domain/content/catalog";
import { ContentValidationError } from "@/domain/content/errors";
import {
  chapterSchema,
  examPresetSchema,
  lessonSchema,
  mediaAssetSchema,
  questionSchema,
  sourceDocumentSchema,
  type ExamPreset,
  type Lesson,
  type MediaAsset,
  type SourceDocument,
} from "@/domain/content/schemas";

type LoadOptions = {
  contentRoot?: string;
  publicRoot?: string;
};

type LabelledValue<T> = {
  label: string;
  value: T;
};

type ParsedCollection<T> = {
  values: T[];
  issues: ContentIssue[];
};

function toDisplayPath(path: string): string {
  return relative(process.cwd(), path).replaceAll("\\", "/");
}

function readTextFile(path: string, label: string, issues: ContentIssue[]): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    issues.push({
      level: "error",
      code: "FILE_READ_ERROR",
      path: label,
      message: error instanceof Error ? error.message : "Lecture impossible.",
    });
    return null;
  }
}

function parseYamlText(text: string, label: string, issues: ContentIssue[]): unknown | null {
  try {
    const data = parseYaml(text);
    if (data === null || data === undefined) {
      issues.push({
        level: "error",
        code: "YAML_EMPTY",
        path: label,
        message: "Le fichier YAML est vide.",
      });
      return null;
    }
    return data;
  } catch (error) {
    issues.push({
      level: "error",
      code: "YAML_PARSE_ERROR",
      path: label,
      message: error instanceof Error ? error.message : "YAML invalide.",
    });
    return null;
  }
}

function formatSchemaIssues(
  label: string,
  error: { issues: Array<{ path: PropertyKey[]; message: string }> },
): ContentIssue[] {
  return error.issues.map((issue) => ({
    level: "error" as const,
    code: "SCHEMA_ERROR",
    path: [label, ...issue.path.map(String)].join("."),
    message: issue.message,
  }));
}

function readYamlListFile<T>(
  root: string,
  fileName: string,
  schema: ZodType<T>,
): ParsedCollection<T> {
  const issues: ContentIssue[] = [];
  const values: T[] = [];
  const fullPath = resolve(root, fileName);
  const label = toDisplayPath(fullPath);

  if (!existsSync(fullPath)) {
    issues.push({
      level: "error",
      code: "FILE_MISSING",
      path: label,
      message: "Fichier requis absent.",
    });
    return { values, issues };
  }

  const text = readTextFile(fullPath, label, issues);
  if (text === null) {
    return { values, issues };
  }

  const data = parseYamlText(text, label, issues);
  if (data === null) {
    return { values, issues };
  }

  if (!Array.isArray(data)) {
    issues.push({
      level: "error",
      code: "SCHEMA_ERROR",
      path: label,
      message: "Une liste YAML est attendue.",
    });
    return { values, issues };
  }

  data.forEach((entry, index) => {
    const parsed = schema.safeParse(entry);
    if (parsed.success) {
      values.push(parsed.data);
    } else {
      issues.push(...formatSchemaIssues(`${label}[${index}]`, parsed.error));
    }
  });

  return { values, issues };
}

function readYamlDirectory<T>(
  directory: string,
  schema: ZodType<T>,
  expectedId: (value: T) => string,
): ParsedCollection<LabelledValue<T>> {
  const issues: ContentIssue[] = [];
  const values: LabelledValue<T>[] = [];

  if (!existsSync(directory)) {
    issues.push({
      level: "error",
      code: "DIRECTORY_MISSING",
      path: toDisplayPath(directory),
      message: "Répertoire requis absent.",
    });
    return { values, issues };
  }

  const entries = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    const label = toDisplayPath(fullPath);
    const text = readTextFile(fullPath, label, issues);
    if (text === null) {
      continue;
    }

    const data = parseYamlText(text, label, issues);
    if (data === null) {
      continue;
    }

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      issues.push(...formatSchemaIssues(label, parsed.error));
      continue;
    }

    const expectedFileName = `${expectedId(parsed.data)}.yaml`;
    if (entry.name !== expectedFileName) {
      issues.push({
        level: "error",
        code: "FILE_NAME_MISMATCH",
        path: label,
        message: `Le fichier doit être nommé ${expectedFileName} pour rester aligné avec son identifiant.`,
      });
    }

    values.push({ label, value: parsed.data });
  }

  return { values, issues };
}

function readLessonFiles(directory: string): ParsedCollection<LabelledValue<Lesson>> {
  const issues: ContentIssue[] = [];
  const values: LabelledValue<Lesson>[] = [];

  if (!existsSync(directory)) {
    issues.push({
      level: "error",
      code: "DIRECTORY_MISSING",
      path: toDisplayPath(directory),
      message: "Répertoire de leçons absent.",
    });
    return { values, issues };
  }

  const entries = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    const label = toDisplayPath(fullPath);
    const text = readTextFile(fullPath, label, issues);
    if (text === null) {
      continue;
    }

    const parsedFile = matter(text);
    const parsed = lessonSchema.safeParse({
      ...parsedFile.data,
      body: parsedFile.content.trim(),
    });

    if (!parsed.success) {
      issues.push(...formatSchemaIssues(label, parsed.error));
      continue;
    }

    const expectedFileName = `${parsed.data.slug}.md`;
    if (entry.name !== expectedFileName) {
      issues.push({
        level: "error",
        code: "FILE_NAME_MISMATCH",
        path: label,
        message: `Le fichier doit être nommé ${expectedFileName} pour rester aligné avec son slug.`,
      });
    }

    values.push({ label, value: parsed.data });
  }

  return { values, issues };
}

function validateMediaFiles(
  assets: MediaAsset[],
  publicRoot: string,
  issues: ContentIssue[],
): void {
  for (const asset of assets) {
    const path = resolve(publicRoot, asset.file.replace(/^\//, ""));
    if (!existsSync(path)) {
      issues.push({
        level: "error",
        code: "MEDIA_FILE_MISSING",
        path: `media:${asset.id}`,
        message: `Fichier absent : ${asset.file}.`,
      });
      continue;
    }

    if (!statSync(path).isFile()) {
      issues.push({
        level: "error",
        code: "MEDIA_NOT_A_FILE",
        path: `media:${asset.id}`,
        message: `Le chemin ne désigne pas un fichier : ${asset.file}.`,
      });
    }
  }
}

export function validateContent(options: LoadOptions = {}): {
  catalog: CatalogBuildResult["catalog"];
  issues: ContentIssue[];
} {
  const contentRoot = options.contentRoot ?? resolve(process.cwd(), "content");
  const publicRoot = options.publicRoot ?? resolve(process.cwd(), "public");
  const issues: ContentIssue[] = [];

  if (!existsSync(contentRoot)) {
    const empty = buildContentCatalog({
      sources: [],
      media: [],
      chapters: [],
      presets: [],
    });
    return {
      catalog: empty.catalog,
      issues: [
        {
          level: "error",
          code: "CONTENT_ROOT_MISSING",
          path: toDisplayPath(contentRoot),
          message: "Répertoire content/ absent.",
        },
      ],
    };
  }

  const sourcesResult = readYamlListFile(contentRoot, "sources.yaml", sourceDocumentSchema);
  const mediaResult = readYamlListFile(contentRoot, "media.yaml", mediaAssetSchema);
  issues.push(...sourcesResult.issues, ...mediaResult.issues);

  const sources: SourceDocument[] = sourcesResult.values;
  const media: MediaAsset[] = mediaResult.values;
  const presets: ExamPreset[] = [];

  const presetsDirectory = resolve(contentRoot, "exam-presets");
  const presetResult = readYamlDirectory(presetsDirectory, examPresetSchema, (preset) => preset.id);
  issues.push(...presetResult.issues);
  presets.push(...presetResult.values.map((entry) => entry.value));

  const chaptersDirectory = resolve(contentRoot, "chapters");
  const chapters: ChapterContent[] = [];

  if (!existsSync(chaptersDirectory)) {
    issues.push({
      level: "error",
      code: "DIRECTORY_MISSING",
      path: toDisplayPath(chaptersDirectory),
      message: "Répertoire chapters/ absent.",
    });
  } else {
    const chapterEntries = readdirSync(chaptersDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));

    if (chapterEntries.length === 0) {
      issues.push({
        level: "error",
        code: "NO_CHAPTER",
        path: toDisplayPath(chaptersDirectory),
        message: "Aucun chapitre trouvé.",
      });
    }

    for (const entry of chapterEntries) {
      const chapterDirectory = resolve(chaptersDirectory, entry.name);
      const chapterFile = resolve(chapterDirectory, "chapter.yaml");
      const chapterLabel = toDisplayPath(chapterFile);
      const chapterIssues: ContentIssue[] = [];

      const chapterText = readTextFile(chapterFile, chapterLabel, chapterIssues);
      let chapter: ChapterContent["chapter"] | null = null;

      if (chapterText !== null) {
        const data = parseYamlText(chapterText, chapterLabel, chapterIssues);
        if (data !== null) {
          const parsed = chapterSchema.safeParse(data);
          if (parsed.success) {
            chapter = parsed.data;
            if (entry.name !== parsed.data.slug) {
              chapterIssues.push({
                level: "error",
                code: "DIRECTORY_NAME_MISMATCH",
                path: chapterLabel,
                message: `Le répertoire doit être nommé ${parsed.data.slug}.`,
              });
            }
          } else {
            chapterIssues.push(...formatSchemaIssues(chapterLabel, parsed.error));
          }
        }
      }

      issues.push(...chapterIssues);

      if (chapter === null) {
        continue;
      }

      const chapterMediaFile = resolve(chapterDirectory, "media.yaml");
      if (existsSync(chapterMediaFile)) {
        const chapterMediaResult = readYamlListFile(
          chapterDirectory,
          "media.yaml",
          mediaAssetSchema,
        );
        issues.push(...chapterMediaResult.issues);
        media.push(...chapterMediaResult.values);
      }

      const lessonsResult = readLessonFiles(resolve(chapterDirectory, "lessons"));
      const questionsResult = readYamlDirectory(
        resolve(chapterDirectory, "questions"),
        questionSchema,
        (question) => question.id,
      );

      issues.push(...lessonsResult.issues, ...questionsResult.issues);

      chapters.push({
        chapter,
        lessons: lessonsResult.values.map((lesson) => lesson.value),
        questions: questionsResult.values.map((question) => question.value),
      });
    }
  }

  validateMediaFiles(media, publicRoot, issues);

  const built = buildContentCatalog({ sources, media, chapters, presets });
  issues.push(...built.issues);

  return { catalog: built.catalog, issues };
}

export function loadContentCatalog(options: LoadOptions = {}): CatalogBuildResult["catalog"] {
  const { catalog, issues } = validateContent(options);
  if (issues.some((issue) => issue.level === "error")) {
    throw new ContentValidationError(issues);
  }
  return catalog;
}
