import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "@playwright/test";
import matter from "gray-matter";

test.describe.configure({ mode: "serial" });

function seedChapterTwoProgress(): void {
  const configuredPath = process.env.E2E_DATABASE_PATH;
  if (!configuredPath) {
    throw new Error("E2E_DATABASE_PATH est absent.");
  }

  const lessonsDirectory = resolve(
    process.cwd(),
    "content/chapters/chapitre-2-la-reglementation/lessons",
  );
  const lessonIds = readdirSync(lessonsDirectory).flatMap((file) => {
    const id = matter(readFileSync(resolve(lessonsDirectory, file), "utf8")).data.id;
    return typeof id === "string" ? [id] : [];
  });

  const db = new DatabaseSync(resolve(process.cwd(), configuredPath));
  let transactionOpen = false;

  try {
    db.exec("PRAGMA busy_timeout = 5000");
    const now = new Date().toISOString();
    const insert = db.prepare(
      "INSERT INTO lesson_progress (profile_id, lesson_id, read_at, updated_at) " +
        "VALUES ('local', ?, ?, ?) " +
        "ON CONFLICT(profile_id, lesson_id) DO UPDATE SET updated_at = excluded.updated_at",
    );

    db.exec("BEGIN IMMEDIATE");
    transactionOpen = true;
    for (const lessonId of lessonIds) {
      insert.run(lessonId, now, now);
    }
    db.exec("COMMIT");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      db.exec("ROLLBACK");
    }
    throw error;
  } finally {
    db.close();
  }
}

test("parcourt une leçon et met à jour sa progression", async ({ page }) => {
  await page.goto("/chapitres/chapitre-1-permis-b/lecons/le-permis-b-et-ses-limites");

  await expect(
    page.getByRole("heading", { level: 1, name: "Le permis B et ses limites" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Marquer comme lue" }).click();
  await expect(page.getByRole("button", { name: "Marquer comme non lue" })).toBeVisible();
  await expect(page.getByText(/^Terminée le /)).toBeVisible();

  await page.getByRole("button", { name: "Marquer comme non lue" }).click();
  await expect(page.getByRole("button", { name: "Marquer comme lue" })).toBeVisible();

  await page.getByRole("button", { name: /Leçon suivante/ }).click();
  await expect(page).toHaveURL(/lecons\/tracter-une-remorque$/);
  await page.goto("/chapitres/chapitre-1-permis-b/lecons/le-permis-b-et-ses-limites");
  await expect(page.getByText(/^Terminée le /)).toBeVisible();
});

test("termine un entraînement et affiche la correction", async ({ page }) => {
  await page.goto("/entrainement");
  await expect(page.getByRole("heading", { level: 1, name: "Entraînement" })).toBeVisible();

  await page.getByRole("button", { name: /S'entraîner \(5\)/ }).click();
  await expect(page).toHaveURL(/\/entrainement\/.+/);
  await expect(page.getByRole("heading", { name: "Question 1 sur 5" })).toBeVisible();

  for (let position = 1; position <= 5; position += 1) {
    await page.locator("fieldset button").first().click();
    await page.getByRole("button", { name: "Valider la réponse" }).click();
    await expect(page.getByText(/^(Bonne réponse|Réponse incorrecte)$/)).toBeVisible();

    if (position < 5) {
      await page.getByRole("button", { name: "Question suivante" }).click();
      await expect(
        page.getByRole("heading", { name: `Question ${position + 1} sur 5` }),
      ).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Voir le résultat" }).click();
    }
  }

  await expect(page).toHaveURL(/\/resultats\/.+/);
  await expect(page.getByRole("heading", { level: 1, name: "Session terminée" })).toBeVisible();
  await expect(page.getByText(/réponses? correctes? sur 5/)).toBeVisible();
});

test("parcourt une micro-leçon du chapitre 2 et débloque la suivante", async ({ page }) => {
  await page.goto("/chapitres/chapitre-2-la-reglementation");
  await expect(
    page.getByRole("heading", { name: /Les usagers et la réglementation/ }),
  ).toBeVisible();

  const firstLesson = page.locator("li").filter({ hasText: "Qui doit respecter les règles ?" });
  const secondLesson = page.locator("li").filter({ hasText: "Où s'appliquent les règles ?" });
  await expect(firstLesson.getByText("Commencer")).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(secondLesson.getByText("Verrouillée")).toBeVisible();

  await page.getByRole("link", { name: /Qui doit respecter les règles/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Qui doit respecter les règles ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Commencer" }).click();
  await expect(page).toHaveURL(/\/parcours\/.+/);

  async function continueContent(title: string) {
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();
  }

  async function answerQuestion() {
    await page.locator("fieldset button").first().click();
    await page.getByRole("button", { name: "Valider la réponse" }).click();
    await expect(page.getByText(/^(Bonne réponse|Réponse incorrecte)$/)).toBeVisible();
  }

  await continueContent("La route ne se résume pas aux voitures");
  await continueContent("Les conducteurs");
  await continueContent("Les passagers");

  await answerQuestion();
  await page.getByRole("button", { name: "Continuer" }).click();

  await continueContent("Les piétons");
  await answerQuestion();
  await page.getByRole("button", { name: "Continuer" }).click();

  await continueContent("Le cas particulier du tram");
  await continueContent("À retenir");

  await answerQuestion();
  await page.getByRole("button", { name: "Continuer" }).click();
  await answerQuestion();
  await page.getByRole("button", { name: "Terminer la leçon" }).click();

  await expect(page.getByRole("heading", { name: "Leçon terminée" })).toBeVisible();
  await expect(page.getByText(/réponses? correctes? sur 4/)).toBeVisible();

  await page.getByRole("link", { name: "Leçon suivante" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Où s'appliquent les règles ?" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Commencer" })).toBeVisible();

  await page.goto("/chapitres/chapitre-2-la-reglementation");
  await expect(firstLesson.getByText("Revoir")).toBeVisible();
  await expect(firstLesson.getByRole("link")).toBeVisible();
  await expect(secondLesson.getByText("Verrouillée")).toHaveCount(0);
  await expect(secondLesson.getByRole("link")).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Où s'appliquent les règles ?");

  await firstLesson.getByRole("link").click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Qui doit respecter les règles ?" }),
  ).toBeVisible();
});

test("termine un examen chronométré et alimente la révision", async ({ page }) => {
  await page.goto("/examen");
  await expect(page.getByRole("heading", { level: 1, name: "Examen blanc" })).toBeVisible();
  await expect(page.getByText("Verrouillé", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Démarrer l'examen" }).click();
  await expect(page).toHaveURL(/\/examen\/.+/);
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Question 1 sur 5" })).toBeVisible();

  // La première question expire volontairement : le runner doit envoyer
  // automatiquement une non-réponse et passer à la suivante.
  await expect(page.getByRole("heading", { name: "Question 2 sur 5" })).toBeVisible({
    timeout: 30_000,
  });

  for (let position = 2; position <= 5; position += 1) {
    await page.locator("fieldset button").first().click();
    await page.getByRole("button", { name: "Valider la réponse" }).click();

    if (position < 5) {
      await expect(
        page.getByRole("heading", { name: `Question ${position + 1} sur 5` }),
      ).toBeVisible({ timeout: 20_000 });
    }
  }

  await expect(page).toHaveURL(/\/resultats\/.+/);
  await expect(page.getByRole("heading", { name: /Examen (réussi|échoué)/ })).toBeVisible();
  await expect(page.getByText("Temps écoulé").first()).toBeVisible();
  await expect(page.getByText(/point(s)? de pénalité au total/)).toBeVisible();

  await page.getByRole("link", { name: "Revoir mes erreurs" }).click();
  await expect(page).toHaveURL(/\/revision$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Vos dernières erreurs" }),
  ).toBeVisible();
  await expect(page.getByText("Bonne réponse").first()).toBeVisible();
});

test("débloque le défi d'unité puis l'examen du chapitre 2", async ({ page }) => {
  await page.goto("/chapitres/chapitre-2-la-reglementation");
  await expect(page.getByRole("button", { name: "Défi verrouillé" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Examen verrouillé" })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('[aria-current="step"]')).toContainText("Où s'appliquent les règles ?");

  // Le parcours complet des sept leçons est déjà couvert par le test précédent et
  // par les tests d'intégration ; ici, on prépare l'état débloqué dans la base E2E.
  seedChapterTwoProgress();

  await page.reload();
  await expect(page.getByRole("button", { name: "Lancer le défi" })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(page.locator('[aria-current="step"]')).toContainText("Lancer le défi");
  await page.getByRole("button", { name: "Lancer le défi" }).click();

  await expect(page).toHaveURL(/\/entrainement\/.+/);
  await expect(page.getByText(/Défi · 2\.1/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Question 1 sur 20" })).toBeVisible();

  for (let position = 1; position <= 20; position += 1) {
    await page.locator("fieldset button").first().click();
    await page.getByRole("button", { name: "Valider la réponse" }).click();
    await expect(page.getByText(/^(Bonne réponse|Réponse incorrecte)$/)).toBeVisible();

    if (position < 20) {
      await page.getByRole("button", { name: "Question suivante" }).click();
      await expect(
        page.getByRole("heading", { name: `Question ${position + 1} sur 20` }),
      ).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Voir le résultat" }).click();
    }
  }

  await expect(page).toHaveURL(/\/resultats\/.+/);
  await expect(page.getByRole("heading", { level: 1, name: "Défi terminé" })).toBeVisible();
  await expect(page.getByText(/réponses? correctes? sur 20/)).toBeVisible();

  await page.goto("/chapitres/chapitre-2-la-reglementation");
  await expect(page.getByRole("button", { name: "Refaire le défi" })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Passer l'examen" })).toBeVisible();
  await page.getByRole("button", { name: "Passer l'examen" }).click();

  await expect(page).toHaveURL(/\/examen\/.+/);
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByText(/Examen · Chapitre 2/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Question 1 sur 50" })).toBeVisible();
});
