import { describe, expect, it } from "vitest";
import {
  examPresetSchema,
  isoUtcDateTimeSchema,
  mediaAssetSchema,
  questionSchema,
  sourceDocumentSchema,
} from "@/domain/content/schemas";
import { testPreset, testQuestion, testSource } from "../../helpers/fixtures";

describe("sourceDocumentSchema", () => {
  it("accepte une source officielle avec une URL HTTPS", () => {
    expect(sourceDocumentSchema.safeParse(testSource).success).toBe(true);
  });

  it("accepte un chemin local sous data/", () => {
    expect(
      sourceDocumentSchema.safeParse({
        ...testSource,
        localPath: "data/manual/page-1.pdf",
        url: undefined,
      }).success,
    ).toBe(true);
  });

  it("refuse un chemin local hors de data/ ou avec une traversée", () => {
    expect(
      sourceDocumentSchema.safeParse({ ...testSource, localPath: "public/manual.pdf" }).success,
    ).toBe(false);
    expect(
      sourceDocumentSchema.safeParse({ ...testSource, localPath: "data/../secret.pdf" }).success,
    ).toBe(false);
  });

  it("exige un chemin local ou une URL", () => {
    expect(sourceDocumentSchema.safeParse({ ...testSource, url: undefined }).success).toBe(false);
  });
});

describe("isoUtcDateTimeSchema", () => {
  it("exige le suffixe UTC", () => {
    expect(isoUtcDateTimeSchema.safeParse("2026-10-19T10:00:00.000Z").success).toBe(true);
    expect(isoUtcDateTimeSchema.safeParse("2026-10-19T10:00:00.000+02:00").success).toBe(false);
    expect(isoUtcDateTimeSchema.safeParse("pas une date").success).toBe(false);
  });
});

describe("mediaAssetSchema", () => {
  const asset = {
    id: "media-1",
    file: "/media/test/image.png",
    alt: "Illustration de test",
    kind: "photo",
    width: 800,
    height: 600,
    rights: "original",
    credit: "Projet",
  };

  it("accepte une image déclarée sous /media/", () => {
    expect(mediaAssetSchema.safeParse(asset).success).toBe(true);
  });

  it("refuse un SVG qui n'est pas original", () => {
    expect(
      mediaAssetSchema.safeParse({
        ...asset,
        file: "/media/test/image.svg",
        rights: "licensed",
      }).success,
    ).toBe(false);
  });
});

describe("questionSchema", () => {
  it("accepte une question complète", () => {
    expect(questionSchema.safeParse(testQuestion({ id: "ch01-q001" })).success).toBe(true);
  });

  it("refuse une bonne réponse absente des options", () => {
    const result = questionSchema.safeParse(
      testQuestion({ id: "ch01-q001", correctOptionId: "z" }),
    );

    expect(result.success).toBe(false);
  });

  it("refuse des identifiants d'option dupliqués", () => {
    const result = questionSchema.safeParse(
      testQuestion({
        id: "ch01-q001",
        options: [
          { id: "a", label: "A" },
          { id: "a", label: "B" },
        ],
      }),
    );

    expect(result.success).toBe(false);
  });

  it("exige une relecture avant publication", () => {
    const draft = questionSchema.safeParse(testQuestion({ id: "ch01-q001", status: "published" }));
    const reviewed = questionSchema.safeParse(
      testQuestion({
        id: "ch01-q001",
        status: "published",
        reviewedBy: "Relecteur",
        reviewedAt: "2026-10-19T10:00:00.000Z",
      }),
    );

    expect(draft.success).toBe(false);
    expect(reviewed.success).toBe(true);
  });
});

describe("examPresetSchema", () => {
  it("accepte un preset cohérent", () => {
    expect(examPresetSchema.safeParse(testPreset()).success).toBe(true);
  });

  it("refuse un seuil supérieur au nombre de questions", () => {
    expect(examPresetSchema.safeParse({ ...testPreset(), passingScore: 4 }).success).toBe(false);
  });

  it("refuse une faute grave moins pénalisante qu'une erreur normale", () => {
    expect(
      examPresetSchema.safeParse({
        ...testPreset(),
        errorPenalty: 2,
        severeErrorPenalty: 1,
      }).success,
    ).toBe(false);
  });

  it("refuse des chapitres dupliqués", () => {
    expect(
      examPresetSchema.safeParse({ ...testPreset(), chapterIds: ["ch01", "ch01"] }).success,
    ).toBe(false);
  });
});
