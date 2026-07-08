// Strip the worked example from a module made from this template, leaving a minimal
// skeleton that still builds, type-checks, and loads. Run once, after `npm run init`, when
// you're ready to build your own app instead of learning from the demo:
//   npm run remove-example-files
// The ExampleApp window, its Svelte components, the Rune Goblin badge art, and the "Open
// Example" macro are a demonstration — not a base class to extend in place. Build your own
// ApplicationV2 modeled on what they showed (see the README + the foundry-pf2e skill). Like
// init.ts, this is a one-shot: it removes its own npm script and deletes itself when done.
import { existsSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = process.cwd();
const at = (...p: string[]): string => join(repo, ...p);
const show = (p: string): string => p.replace(`${repo}/`, '');

let changed = 0;

function remove(p: string): void {
  if (!existsSync(p)) return;
  rmSync(p, { recursive: true, force: true });
  console.log(`removed ${show(p)}`);
  changed++;
}

function pruneIfEmpty(dir: string): void {
  if (existsSync(dir) && readdirSync(dir).length === 0) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`removed ${show(dir)} (empty)`);
  }
}

// Delete by known path, not the whole dir, so anything you've already started building
// alongside the example survives.
remove(at('src', 'ui', 'ExampleApp.ts'));
remove(at('src', 'ui', 'components', 'example'));
pruneIfEmpty(at('src', 'ui', 'components'));
pruneIfEmpty(at('src', 'ui'));

// The example test specs exercise the demo itself — the e2e smoke opens the example window via
// api.open(); the unit spec is a worked example. They ride the same lifecycle as ExampleApp. The
// harness plumbing (e2e fixtures/global-setup/configs/scripts, vitest.config) stays — it's generic.
remove(at('src', 'tests', 'e2e', 'launch.spec.ts'));
remove(at('src', 'tests', 'unit', 'example.test.ts'));
pruneIfEmpty(at('src', 'tests', 'unit'));

remove(at('assets', 'runegoblin-slice-small.webp'));
remove(at('assets', 'runegoblin-title.svg'));
// Keep assets/ even when empty: deploy/release reference modules/<id>/assets/ and `zip`
// would fail on a missing path. A .gitkeep also makes the dir survive in git.
const assetsDir = at('assets');
if (existsSync(assetsDir) && readdirSync(assetsDir).length === 0) {
  writeFileSync(join(assetsDir, '.gitkeep'), '');
  console.log('kept assets/ (added .gitkeep — served path stays valid)');
}

// packs/_source/ stays (its .gitkeep keeps the pack scaffold); the build skips it when empty.
remove(at('packs', '_source', 'macros'));

// index.ts wired the example into the public api — drop just that wiring, keep the hooks and
// the version api.
const indexPath = at('src', 'index.ts');
if (existsSync(indexPath)) {
  const before = readFileSync(indexPath, 'utf8');
  const after = before
    .replace(/^import \{ ExampleApp \} from '\.\/ui\/ExampleApp';\n/m, '')
    .replace(/^\s*open: \(\) => void;\n/m, '')
    .replace(', open: () => ExampleApp.open()', '');
  if (after !== before) {
    writeFileSync(indexPath, after);
    console.log('rewrote src/index.ts (dropped the example api)');
    changed++;
  }
}

// module.json declared the macros pack — remove that entry (leaves packs: [] if it was the
// only one).
const manifestPath = at('module.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { packs?: { name?: string }[] };
  if (Array.isArray(manifest.packs)) {
    const kept = manifest.packs.filter((p) => p.name !== 'macros');
    if (kept.length !== manifest.packs.length) {
      manifest.packs = kept;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log('rewrote module.json (removed the macros pack)');
      changed++;
    }
  }
}

// lang/en.json's only string was the example window title — drop it, keep the namespace as a
// scaffold for your own strings.
const langPath = at('lang', 'en.json');
if (existsSync(langPath)) {
  const lang = JSON.parse(readFileSync(langPath, 'utf8')) as Record<string, unknown>;
  let touched = false;
  for (const ns of Object.values(lang)) {
    if (ns && typeof ns === 'object' && 'title' in ns) {
      delete (ns as Record<string, unknown>).title;
      touched = true;
    }
  }
  if (touched) {
    writeFileSync(langPath, `${JSON.stringify(lang, null, 2)}\n`);
    console.log('rewrote lang/en.json (dropped the example title string)');
    changed++;
  }
}

if (changed === 0) {
  console.error('nothing to remove — already stripped?');
  process.exit(1);
}

const pkgPath = at('package.json');
if (existsSync(pkgPath)) {
  const pkg = readFileSync(pkgPath, 'utf8');
  const stripped = pkg.replace(/^\s*"remove-example-files": "node scripts\/removeExampleFiles\.ts",\n/m, '');
  if (stripped !== pkg) writeFileSync(pkgPath, stripped);
}
rmSync(at('scripts', 'removeExampleFiles.ts'), { force: true });

console.log('\n✓ example removed. Rebuild with `npm run build`, then build your own app.');
console.log('  Heads up: the README "Layout"/UI sections still describe the example — trim them to match.');
