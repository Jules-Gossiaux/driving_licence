export type LessonSection = {
  id: string;
  title: string;
  body: string;
};

export function sectionIdFromTitle(title: string): string {
  const id = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return id.length > 0 ? id : "section";
}

export function splitLessonSections(markdown: string): LessonSection[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const draftSections: Array<{ title: string; lines: string[] }> = [];
  const preamble: string[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let fence: "```" | "~~~" | null = null;

  for (const line of lines) {
    const trimmed = line.trimStart();

    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      const marker = trimmed.startsWith("```") ? "```" : "~~~";
      if (fence === null) {
        fence = marker;
      } else if (fence === marker) {
        fence = null;
      }
    }

    const heading = fence === null ? line.match(/^##[ \t]+(.+?)\s*#*\s*$/) : null;

    if (heading?.[1]) {
      if (current) {
        draftSections.push(current);
      }
      current = { title: heading[1].trim(), lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }

  if (current) {
    draftSections.push(current);
  }

  if (preamble.join("\n").trim().length > 0) {
    draftSections.unshift({ title: "Introduction", lines: preamble });
  }

  const usedIds = new Map<string, number>();

  return draftSections.map((section) => {
    const baseId = sectionIdFromTitle(section.title);
    const count = (usedIds.get(baseId) ?? 0) + 1;
    usedIds.set(baseId, count);

    return {
      id: count === 1 ? baseId : `${baseId}-${count}`,
      title: section.title,
      body: section.lines.join("\n").trim(),
    };
  });
}
