// Example unit spec — paired with the ExampleApp demo and removed by
// `npm run remove-example-files`. It shows the vitest tier: pure Node, no Foundry, no browser,
// so `npm test` is green on a fresh clone. Model your own specs on it, then delete this one.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODULE_ID } from '@/constants';

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../module.json', import.meta.url)), 'utf8'),
) as { id: string };

describe('module identity', () => {
  it('MODULE_ID is the id the manifest ships', () => {
    expect(MODULE_ID).toBe(manifest.id);
  });
});
