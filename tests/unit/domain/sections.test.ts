import { describe, expect, it } from "vitest";
import { sectionIdFromTitle, splitLessonSections } from "@/domain/content/sections";

describe("sectionIdFromTitle", () => {
  it("normalise accents, ponctuation et espaces", () => {
    expect(sectionIdFromTitle("L'alcool et l'éthylotest antidémarrage")).toBe(
      "l-alcool-et-l-ethylotest-antidemarrage",
    );
    expect(sectionIdFromTitle("1. La perception immédiate")).toBe("1-la-perception-immediate");
    expect(sectionIdFromTitle("3e degré — infractions graves")).toBe("3e-degre-infractions-graves");
  });

  it("retombe sur un identifiant stable pour un titre vide de contenu utile", () => {
    expect(sectionIdFromTitle("— ? —")).toBe("section");
  });
});

describe("splitLessonSections", () => {
  it("découpe sur les titres de niveau 2 et ignore les niveaux 3", () => {
    const sections = splitLessonSections(
      [
        "## Première partie",
        "",
        "Texte A.",
        "",
        "### Détail",
        "",
        "Suite A.",
        "",
        "## Deuxième partie",
        "",
        "Texte B.",
      ].join("\n"),
    );

    expect(sections).toEqual([
      {
        id: "premiere-partie",
        title: "Première partie",
        body: "Texte A.\n\n### Détail\n\nSuite A.",
      },
      { id: "deuxieme-partie", title: "Deuxième partie", body: "Texte B." },
    ]);
  });

  it("transforme le contenu initial en introduction", () => {
    const sections = splitLessonSections("Un chapeau introductif.\n\n## Les bases\n\nContenu.");

    expect(sections.map((section) => section.id)).toEqual(["introduction", "les-bases"]);
    expect(sections[0]?.body).toBe("Un chapeau introductif.");
  });

  it("ne crée pas d'introduction sans contenu initial", () => {
    const sections = splitLessonSections("## Les bases\n\nContenu.");

    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe("les-bases");
  });

  it("ignore les titres placés dans un bloc de code", () => {
    const sections = splitLessonSections(
      ["## Vraie section", "", "```md", "## Faux titre", "```", "", "Texte."].join("\n"),
    );

    expect(sections).toHaveLength(1);
    expect(sections[0]?.body).toContain("## Faux titre");
  });

  it("désambiguïse les titres identiques", () => {
    const sections = splitLessonSections(
      ["## À retenir", "", "Un.", "", "## À retenir", "", "Deux."].join("\n"),
    );

    expect(sections.map((section) => section.id)).toEqual(["a-retenir", "a-retenir-2"]);
  });
});
