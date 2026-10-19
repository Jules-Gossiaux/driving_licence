import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("parcourt une leçon et met à jour sa progression", async ({ page }) => {
  await page.goto("/chapitres/chapitre-1-permis-b/lecons/le-permis-b-et-ses-limites");

  await expect(
    page.getByRole("heading", { level: 1, name: "Le permis B et ses limites" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Marquer comme lue" }).click();
  await expect(page.getByRole("button", { name: "Marquer comme non lue" })).toBeVisible();
  await expect(page.getByText(/^Lue le /)).toBeVisible();

  await page.getByRole("button", { name: "Marquer comme non lue" }).click();
  await expect(page.getByRole("button", { name: "Marquer comme lue" })).toBeVisible();
});

test("termine un entraînement et affiche la correction", async ({ page }) => {
  await page.goto("/entrainement");
  await expect(
    page.getByRole("heading", { level: 1, name: "Vérifier ce que vous avez retenu" }),
  ).toBeVisible();

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

test("termine un examen chronométré et alimente la révision", async ({ page }) => {
  await page.goto("/examen");
  await expect(
    page.getByRole("heading", { level: 1, name: "Se mesurer au format de l'examen" }),
  ).toBeVisible();
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
