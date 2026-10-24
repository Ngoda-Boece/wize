import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function enterDemoAndOnboard(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrer dans la démo" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Comment veux-tu qu'on t'appelle ? (facultatif)").fill("Camille");
  await page.getByRole("button", { name: "Économie" }).click();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByRole("button", { name: /Passer/ }).click(); // familiarity skipped
  await page.getByText("Améliorer mon raisonnement").click();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByRole("button", { name: /Passer et terminer/ }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("landing page renders and has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Challenge tes idées.");
  await expect(page.getByRole("link", { name: /Commencer à réfléchir/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Flex avec Wize/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("login and signup pages render (demo mode)", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bon retour" })).toBeVisible();
  await expect(page.getByText("Mode démo.")).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Commence à réfléchir" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("private pages redirect unauthenticated visitors to login", async ({ page }) => {
  for (const path of ["/app", "/app/history", "/app/progress", "/app/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  const res = await page.request.post("/api/chat", {
    data: { conversationId: "8f0b6a3e-2f7c-4a8e-9d55-3f1b2c4d5e6f", message: "x", clientMessageId: "x" },
    headers: { origin: page.url().replace(/\/login.*/, "") },
  });
  expect(res.status()).toBe(401);
});

test("new user sees honest empty states", async ({ page }) => {
  await enterDemoAndOnboard(page);
  await expect(page.getByRole("heading", { name: "Prêt à faire travailler tes idées ?" })).toBeVisible();
  await expect(page.getByText("Bonjour Camille,")).toBeVisible();
  await expect(page.getByText("Aucune session pour l'instant")).toBeVisible();
  await expect(page.getByText(/Rien à mesurer pour l'instant/)).toBeVisible();
  await page.goto("/app/progress");
  await expect(page.getByText("Ta progression commence avec ta première session")).toBeVisible();
  await page.goto("/app/history");
  await expect(page.getByText("Ton historique est vide")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("full session: start, stream, persist, summarize, history, delete", async ({ page, browser }) => {
  await enterDemoAndOnboard(page);

  // Start a session from the dashboard in Socratic mode.
  await page.getByLabel("Sur quoi veux-tu réfléchir aujourd'hui ?").fill("Comment fonctionne la persuasion ?");
  await page.getByText("Socratique", { exact: true }).click();
  await page.getByRole("button", { name: /Commencer la session/ }).click();
  await expect(page).toHaveURL(/\/app\/chat\/[0-9a-f-]{36}/);
  const chatUrl = page.url();

  // The subject is sent automatically and the simulated reply streams in.
  const messages = page.getByRole("list", { name: "Messages de la session" });
  await expect(messages.getByText("Comment fonctionne la persuasion ?")).toBeVisible();
  await expect(messages.getByText(/Partons de ta propre intuition/)).toBeVisible({ timeout: 15_000 });
  await expect(messages.getByText("Réponse simulée").first()).toBeVisible();

  // Sending is blocked while a reply streams (the button is "Stop"); wait for the end.
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeVisible({ timeout: 15_000 });

  // Follow-up message with Enter.
  const composer = page.getByLabel("Ton message");
  await composer.fill("Je pense que la répétition rend une idée crédible.");
  await composer.press("Enter");
  await expect(messages.getByText(/Qu'est-ce qui te fait penser/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeVisible();

  // Switch mode within the session.
  await page.getByLabel("Mode d'interaction").selectOption("sparring");
  await expect(page.getByText("La prochaine réponse sera en mode Sparring.")).toBeVisible();

  // Persistence across reloads (no duplicated initial message).
  await page.reload();
  await expect(messages.getByText("Toi : Comment fonctionne la persuasion ?", { exact: true })).toHaveCount(1);
  await expect(messages.getByText("Je pense que la répétition rend une idée crédible.")).toBeVisible();
  await expect(page.getByLabel("Mode d'interaction")).toHaveValue("sparring");

  // Generate, review and save a summary.
  await page.getByRole("button", { name: "Synthèse" }).click();
  const dialog = page.getByRole("dialog", { name: "Synthèse de la session" });
  await dialog.getByRole("button", { name: "Générer la synthèse" }).click();
  await expect(dialog.getByText("Brouillon non enregistré")).toBeVisible();
  await expect(dialog.getByText("La répétition rend une idée crédible.").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog.getByText(/Synthèse enregistrée/)).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).click();

  // Progress reflects real data.
  await page.goto("/app/progress");
  await expect(page.getByText("Concepts revus récemment")).toBeVisible();
  await expect(page.getByRole("link", { name: "répétition" })).toBeVisible();

  // Another user cannot open this conversation.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await enterDemoAndOnboard(otherPage);
  await otherPage.goto(chatUrl);
  await expect(otherPage.getByText("Session introuvable")).toBeVisible();
  await other.close();

  // History: search, rename, delete.
  await page.goto("/app/history");
  await page.getByLabel("Rechercher par titre ou sujet").fill("persuasion");
  const row = page.getByRole("listitem").filter({ hasText: "Comment fonctionne la persuasion ?" });
  await expect(row).toBeVisible();
  await page.getByLabel("Rechercher par titre ou sujet").fill("zzz introuvable");
  await expect(page.getByText("Aucun résultat")).toBeVisible();
  await page.getByLabel("Rechercher par titre ou sujet").fill("");
  await row.getByRole("button", { name: /Renommer/ }).click();
  await page.getByLabel("Nouveau titre").fill("Mécanismes de la persuasion");
  await page.getByLabel("Nouveau titre").press("Enter");
  await expect(page.getByRole("link", { name: "Mécanismes de la persuasion" })).toBeVisible();
  await page.getByRole("button", { name: /Supprimer « Mécanismes de la persuasion »/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("link", { name: "Mécanismes de la persuasion" })).toHaveCount(0);
  await page.goto(chatUrl);
  await expect(page.getByText("Session introuvable")).toBeVisible();
});

test("main navigation works and pages fit the viewport", async ({ page, isMobile }) => {
  await enterDemoAndOnboard(page);
  const targets = [
    { name: "Explorer", url: /\/app\/explore/, heading: "Nouvelle session" },
    { name: "Historique", url: /\/app\/history/, heading: "Historique" },
    { name: "Progression", url: /\/app\/progress/, heading: "Progression" },
    { name: "Paramètres", url: /\/app\/settings/, heading: "Paramètres" },
    { name: "Tableau de bord", url: /\/app$/, heading: "Prêt à faire travailler tes idées ?" },
  ];
  for (const t of targets) {
    if (isMobile) await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("navigation", { name: "Navigation de l'application" }).getByRole("link", { name: t.name }).click();
    await expect(page).toHaveURL(t.url);
    await expect(page.getByRole("heading", { level: 1, name: t.heading })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("settings save preferences and personalization toggle", async ({ page }) => {
  await enterDemoAndOnboard(page);
  await page.goto("/app/settings");
  await page.getByLabel("Prénom ou pseudo").fill("Sam");
  await page.getByLabel(/Personnalisation/).uncheck();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Préférences enregistrées.")).toBeVisible();
  await page.goto("/app");
  // With personalization off, the greeting no longer uses the name.
  await expect(page.getByText("Bonjour,", { exact: true })).toBeVisible();
});
