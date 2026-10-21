import { describe, expect, it } from "vitest";
import { validateContent } from "@/infrastructure/content/loader";

describe("contenu du projet", () => {
  it("charge le catalogue sans erreur", () => {
    const { catalog, issues } = validateContent();

    expect(issues.filter((issue) => issue.level === "error")).toEqual([]);
    expect(catalog.chapters).toHaveLength(2);
    expect(catalog.lessons).toHaveLength(34);
    expect(catalog.questions).toHaveLength(275);

    const chapterOne = catalog.chapterBySlug.get("chapitre-1-permis-b");
    expect(chapterOne?.chapter.id).toBe("ch01");
    expect(chapterOne?.chapter.units).toHaveLength(2);
    expect(chapterOne?.lessons).toHaveLength(6);
    expect(chapterOne?.questions).toHaveLength(50);

    expect(catalog.chapterBySlug.get("chapitre-2-la-reglementation")?.chapter.id).toBe("ch02");
  });

  it("signale que le preset officiel n'a pas encore assez de questions publiées", () => {
    const { catalog, issues } = validateContent();
    const officialPreset = catalog.presets.find((preset) => !preset.allowUnpublished);

    expect(officialPreset).toBeDefined();
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "warning",
        code: "EXAM_POOL_INSUFFICIENT",
        path: `preset:${officialPreset?.id}`,
      }),
    );
  });

  it("déclare tous les médias sous /media/", () => {
    const { catalog } = validateContent();

    expect(catalog.media.size).toBeGreaterThan(0);
    for (const asset of catalog.media.values()) {
      expect(asset.file.startsWith("/media/")).toBe(true);
    }
  });
});
