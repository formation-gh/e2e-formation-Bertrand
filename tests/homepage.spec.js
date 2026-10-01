// @ts-check
const { test, expect } = require('@playwright/test');

// Problèmes connus et volontairement ignorés par ce test, car jugés non bloquants.
// Chaque entrée doit rester aussi spécifique que possible pour ne pas masquer d'autres erreurs.
const IGNORED_URL_PATTERNS = [
  /FormationGhApi\.Web\.styles\.css/, // 404 connu sur la feuille de style, ignoré à la demande
];

function isIgnoredUrl(url) {
  return IGNORED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function observeErrors(page) {
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/^Failed to load resource:/.test(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  page.on('response', (response) => {
    if (response.status() >= 400 && !isIgnoredUrl(response.url())) {
      failedRequests.push(`${response.url()} - HTTP ${response.status()}`);
    }
  });

  page.on('requestfailed', (request) => {
    if (!isIgnoredUrl(request.url())) {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    }
  });

  return { consoleErrors, failedRequests };
}

async function connect(page) {
  const response = await page.goto('');

  expect(response).not.toBeNull();
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBeLessThan(400);
  await page.waitForLoadState('networkidle');

  const password = process.env.E2E_PASSWORD;
  expect(password, 'La variable E2E_PASSWORD doit être configurée.').toBeTruthy();
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Les utilisateurs' })).toBeVisible();
}

function prochainJourOuvre(offset = 1) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

function jourOuvreSuivant(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

async function expectNoErrors(errors) {
  expect(errors.consoleErrors, `Erreurs console détectées: ${errors.consoleErrors.join(', ')}`).toHaveLength(0);
  expect(errors.failedRequests, `Requêtes échouées: ${errors.failedRequests.join(', ')}`).toHaveLength(0);
}

test.describe('formation-gh-api site', () => {
  test('la page se charge sans erreur', async ({ page }) => {
    const errors = observeErrors(page);
    await connect(page);
    await expectNoErrors(errors);
  });

  test('affiche la liste des utilisateurs et leur solde de congés', async ({ page }) => {
    const errors = observeErrors(page);
    await connect(page);

    const utilisateur = page.getByRole('link', { name: /Jean Dupont/i });
    await expect(utilisateur).toBeVisible();
    await utilisateur.click();
    await expect(page.getByRole('heading', { name: 'Jean Dupont' })).toBeVisible();
    await expect(page.getByText('Solde disponible')).toBeVisible();
    await expect(page.getByText('Jours acquis')).toBeVisible();
    await expect(page.getByText('Jours pris')).toBeVisible();
    await expectNoErrors(errors);
  });

  test('valide une période de congé avant de permettre sa création', async ({ page }) => {
    const errors = observeErrors(page);
    await connect(page);
    await page.getByRole('link', { name: /Jean Dupont/i }).click();

    const debut = page.getByLabel('Date de début');
    const fin = page.getByLabel('Date de fin');
    const poser = page.getByRole('button', { name: 'Poser le congé' });

    await debut.fill(prochainJourOuvre());
    await fin.fill(prochainJourOuvre(-1));
    await expect(poser).toBeDisabled();
    await expect(page.getByText('Choisissez une période contenant au moins un jour ouvré.')).toBeVisible();
    await expectNoErrors(errors);
  });

  test('crée puis supprime une demande de congé', async ({ page }) => {
    const errors = observeErrors(page);
    await connect(page);
    await page.getByRole('link', { name: /Jean Dupont/i }).click();

    const debut = prochainJourOuvre(7);
    const fin = jourOuvreSuivant(debut);
    await page.getByLabel('Date de début').fill(debut);
    await page.getByLabel('Date de fin').fill(fin);
    await page.getByRole('button', { name: 'Poser le congé' }).click();

    await expect(page.getByRole('heading', { name: /Congés posés 1/ })).toBeVisible();
    const supprimer = page.getByRole('button', { name: /Supprimer le congé du/ });
    await expect(supprimer).toBeVisible();
    await supprimer.click();
    await expect(page.getByText('Aucun congé n’a été posé pour le moment.')).toBeVisible();
    await expectNoErrors(errors);
  });
});
