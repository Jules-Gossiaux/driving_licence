import { z } from "zod";

export const contentStatusSchema = z.enum(["draft", "in_review", "published"]);
export const contentOriginSchema = z.enum(["manual", "ai_assisted", "original"]);
export const questionSeveritySchema = z.enum(["normal", "severe"]);

export type QuestionSeverity = z.infer<typeof questionSeveritySchema>;

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const mediaFilePattern = /^\/media\/[a-z0-9][a-z0-9/_-]*\.(svg|png|jpg|jpeg|webp|avif)$/i;

export const contentIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(idPattern, "Identifiant attendu en kebab-case minuscule.");

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(slugPattern, "Slug attendu en kebab-case minuscule.");

export const isoUtcDateTimeSchema = z.string().refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && value.endsWith("Z");
}, "Date ISO 8601 UTC attendue (suffixe Z).");

const httpsUrlSchema = z.string().refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "URL HTTPS attendue.");

export const sourceRefSchema = z
  .strictObject({
    documentId: contentIdSchema,
    page: z.number().int().positive().optional(),
    locator: z.string().min(1).max(200).optional(),
    note: z.string().min(1).max(500).optional(),
  })
  .describe("Référence traçable vers un document source.");

export type SourceRef = z.infer<typeof sourceRefSchema>;

export const sourceDocumentSchema = z
  .strictObject({
    id: contentIdSchema,
    title: z.string().min(1).max(200),
    kind: z.enum(["manual", "official", "other"]),
    publisher: z.string().min(1).max(120).optional(),
    localPath: z.string().min(1).max(300).optional(),
    url: httpsUrlSchema.optional(),
    accessedAt: isoUtcDateTimeSchema.optional(),
    rights: z.enum(["original", "personal_use", "licensed", "public_domain", "external_reference"]),
    note: z.string().min(1).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.localPath && !value.url) {
      ctx.addIssue({
        code: "custom",
        message: "Une source doit fournir au moins un chemin local ou une URL.",
      });
    }

    if (value.localPath) {
      const normalized = value.localPath.replaceAll("\\", "/");
      if (!normalized.startsWith("data/") || normalized.includes("..")) {
        ctx.addIssue({
          code: "custom",
          path: ["localPath"],
          message: "Les documents sources locaux doivent rester sous data/ et hors de public/.",
        });
      }
    }
  });

export type SourceDocument = z.infer<typeof sourceDocumentSchema>;

export const mediaAssetSchema = z
  .strictObject({
    id: contentIdSchema,
    file: z.string().regex(mediaFilePattern, "Chemin média attendu sous /media/."),
    alt: z.string().min(1).max(500),
    caption: z.string().min(1).max(500).optional(),
    kind: z.enum(["diagram", "photo", "illustration", "scan", "sign"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    rights: z.enum(["original", "personal_use", "licensed", "public_domain"]),
    credit: z.string().min(1).max(200),
    sourceRefs: z.array(sourceRefSchema).max(10).default([]),
    generator: z
      .strictObject({
        tool: z.string().min(1).max(120),
        prompt: z.string().min(1).max(4000),
        generatedAt: isoUtcDateTimeSchema,
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.file.toLowerCase().endsWith(".svg") && value.rights !== "original") {
      ctx.addIssue({
        code: "custom",
        path: ["rights"],
        message: "Un SVG servi par l'application doit être un original du projet.",
      });
    }
  });

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

type ReviewCarrier = {
  status: z.infer<typeof contentStatusSchema>;
  reviewedBy?: string | undefined;
  reviewedAt?: string | undefined;
};

function checkReview(value: ReviewCarrier, ctx: z.RefinementCtx): void {
  if (value.status !== "published") {
    return;
  }

  if (!value.reviewedBy) {
    ctx.addIssue({
      code: "custom",
      path: ["reviewedBy"],
      message: "Une publication exige le nom de la personne qui a validé le contenu.",
    });
  }

  if (!value.reviewedAt) {
    ctx.addIssue({
      code: "custom",
      path: ["reviewedAt"],
      message: "Une publication exige une date de validation.",
    });
  }
}

function reviewedFields() {
  return {
    status: contentStatusSchema,
    origin: contentOriginSchema,
    reviewedBy: z.string().min(1).max(120).optional(),
    reviewedAt: isoUtcDateTimeSchema.optional(),
  };
}

export const chapterSchema = z
  .strictObject({
    id: contentIdSchema,
    slug: slugSchema,
    order: z.number().int().nonnegative(),
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(600),
    sourceRefs: z.array(sourceRefSchema).min(1).max(20),
    version: z.number().int().positive(),
    ...reviewedFields(),
  })
  .superRefine(checkReview);

export type Chapter = z.infer<typeof chapterSchema>;

export const lessonSchema = z
  .strictObject({
    id: contentIdSchema,
    chapterId: contentIdSchema,
    slug: slugSchema,
    order: z.number().int().nonnegative(),
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(600),
    keyPoints: z.array(z.string().min(1).max(300)).min(1).max(6),
    coreQuestionIds: z.array(contentIdSchema).max(8).optional(),
    sourceRefs: z.array(sourceRefSchema).min(1).max(20),
    version: z.number().int().positive(),
    body: z.string().min(1, "Le corps Markdown de la leçon est vide."),
    ...reviewedFields(),
  })
  .superRefine(checkReview);

export type Lesson = z.infer<typeof lessonSchema>;

export const questionOptionSchema = z.strictObject({
  id: contentIdSchema,
  label: z.string().min(1).max(300),
  mediaId: contentIdSchema.optional(),
});

export type QuestionOption = z.infer<typeof questionOptionSchema>;

export const questionSchema = z
  .strictObject({
    id: contentIdSchema,
    chapterId: contentIdSchema,
    lessonIds: z.array(contentIdSchema).min(1).max(20),
    prompt: z.string().min(1).max(1200),
    options: z.array(questionOptionSchema).min(2).max(6),
    correctOptionId: contentIdSchema,
    explanation: z.string().min(1).max(4000),
    mediaId: contentIdSchema.optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    severity: questionSeveritySchema.default("normal"),
    examEligible: z.boolean().default(true),
    tags: z.array(z.string().min(1).max(60)).max(20).default([]),
    sourceRefs: z.array(sourceRefSchema).min(1).max(20),
    version: z.number().int().positive(),
    ...reviewedFields(),
  })
  .superRefine((value, ctx) => {
    checkReview(value, ctx);

    const optionIds = new Set<string>();
    for (const option of value.options) {
      if (optionIds.has(option.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: `Identifiant d'option dupliqué : ${option.id}.`,
        });
      }
      optionIds.add(option.id);
    }

    if (!optionIds.has(value.correctOptionId)) {
      ctx.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: "La bonne réponse ne correspond à aucune option.",
      });
    }
  });

export type Question = z.infer<typeof questionSchema>;

export const examPresetSchema = z
  .strictObject({
    id: contentIdSchema,
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(1000),
    questionCount: z.number().int().positive().max(200),
    secondsPerQuestion: z.number().int().positive().max(120),
    passingScore: z.number().int().nonnegative(),
    errorPenalty: z.number().int().positive().default(1),
    severeErrorPenalty: z.number().int().positive().default(5),
    allowUnpublished: z.boolean().default(false),
    chapterIds: z.array(contentIdSchema).max(100).default([]),
    sourceRefs: z.array(sourceRefSchema).min(1).max(20),
  })
  .superRefine((value, ctx) => {
    if (value.passingScore > value.questionCount) {
      ctx.addIssue({
        code: "custom",
        path: ["passingScore"],
        message: "Le seuil de réussite ne peut pas dépasser le nombre de questions.",
      });
    }

    if (value.severeErrorPenalty < value.errorPenalty) {
      ctx.addIssue({
        code: "custom",
        path: ["severeErrorPenalty"],
        message: "La pénalité de faute grave doit être au moins égale à une erreur normale.",
      });
    }

    if (new Set(value.chapterIds).size !== value.chapterIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["chapterIds"],
        message: "Les chapitres d'un preset doivent être uniques.",
      });
    }
  });

export type ExamPreset = z.infer<typeof examPresetSchema>;
