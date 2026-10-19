import type { ContentIssue } from "./catalog";

export class ContentValidationError extends Error {
  readonly issues: ContentIssue[];

  constructor(issues: ContentIssue[]) {
    const errors = issues.filter((issue) => issue.level === "error");
    super(
      [
        `Le contenu est invalide (${errors.length} erreur${errors.length > 1 ? "s" : ""}).`,
        ...errors.slice(0, 5).map((issue) => `- ${issue.path}: ${issue.message}`),
      ].join("\n"),
    );
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}
