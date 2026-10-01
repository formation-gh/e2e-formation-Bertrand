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

test.describe('formation-gh-api site', () => {
  test('la page se charge sans erreur', async ({ page }) => {
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      // Les échecs de chargement de ressource (HTTP 4xx/5xx) sont déjà détectés
      // et filtrés précisément via l'événement 'response' ci-dessous, qui connaît
      // l'URL concernée (contrairement au message console, trop générique).
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

    // Ne pas utiliser '/' ici : avec une baseURL contenant un sous-chemin
    // (ex. https://aouzgaga.github.io/formation-gh-api/), '/' serait résolu
    // vers la racine du domaine et non vers ce sous-chemin.
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

    expect(consoleErrors, `Erreurs console détectées: ${consoleErrors.join(', ')}`).toHaveLength(0);
    expect(failedRequests, `Requêtes échouées: ${failedRequests.join(', ')}`).toHaveLength(0);
  });
});
