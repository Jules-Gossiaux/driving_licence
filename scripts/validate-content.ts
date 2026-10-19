import { validateContent } from "../src/infrastructure/content/loader";

const { catalog, issues } = validateContent();
const errors = issues.filter((issue) => issue.level === "error");
const warnings = issues.filter((issue) => issue.level === "warning");

for (const issue of [...errors, ...warnings]) {
  const label = issue.level === "error" ? "ERREUR" : "AVERTISSEMENT";
  console.log(`${label}  ${issue.path}  ${issue.message}`);
}

const publishedQuestions = catalog.questions.filter(
  (question) => question.status === "published" && question.examEligible,
).length;

if (errors.length > 0) {
  console.error(
    `\nContenu invalide : ${errors.length} erreur(s), ${warnings.length} avertissement(s).`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `\nContenu valide : ${catalog.chapters.length} chapitre(s), ${catalog.lessons.length} leçon(s), ` +
      `${catalog.questions.length} question(s), dont ${publishedQuestions} utilisable(s) en examen officiel.`,
  );
  if (warnings.length > 0) {
    console.log(`${warnings.length} avertissement(s) à examiner.`);
  }
}
