# e2e-formation-Bertrand

Application de tests end-to-end (E2E) basée sur [Playwright](https://playwright.dev/).

## Objectif

Vérifier que l'URL [https://aouzgaga.github.io/formation-gh-api/](https://aouzgaga.github.io/formation-gh-api/) se charge correctement, c'est-à-dire :

- la page répond avec un code HTTP de succès (< 400) ;
- aucune erreur n'est levée dans la console du navigateur ;
- aucune requête réseau n'échoue lors du chargement de la page.

## Installation

```bash
npm install
npx playwright install --with-deps chromium
```

## Exécution des tests

Définissez la variable d’environnement `E2E_PASSWORD` avant d’exécuter les tests. Dans GitHub Actions, configurez-la comme secret du dépôt portant ce nom.

```bash
npm test
```
