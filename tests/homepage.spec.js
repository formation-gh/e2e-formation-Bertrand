// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('formation-gh-api site', () => {
  test('la page se charge sans erreur', async ({ page }) => {
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    const response = await page.goto('/');

    expect(response).not.toBeNull();
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBeLessThan(400);

    await page.waitForLoadState('networkidle');

    expect(consoleErrors, `Erreurs console détectées: ${consoleErrors.join(', ')}`).toHaveLength(0);
    expect(failedRequests, `Requêtes échouées: ${failedRequests.join(', ')}`).toHaveLength(0);
  });
});
