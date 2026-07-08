import { test, expect, MODULE_ID } from './fixtures/foundry-clients';

// Example smoke spec — paired with the ExampleApp demo and removed by
// `npm run remove-example-files`. It proves the whole e2e path end to end: a real Foundry, the
// module's public API, and the built Svelte window rendering. Model your own specs on it; see
// README.md for the conventions.
test.describe('Module launches', () => {
  test('the public API opens the example window', async ({ gmPage }) => {
    await gmPage.evaluate((id) => (window as any).game.modules.get(id).api.open(), MODULE_ID);
    const win = gmPage.locator(`#${MODULE_ID}-example`);
    await expect(win).toBeVisible();
  });
});
