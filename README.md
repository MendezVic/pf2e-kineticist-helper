# PF2e Module Template

A starting point for **Pathfinder 2e Foundry VTT** modules. Ship compendium content
(`packs/`) and a scripted esmodule (`src/`) — a **Svelte 5** UI in an **ApplicationV2**
shell — from one repo.

- System: `pf2e`
- Foundry: v14 minimum, verified on v14
- Build: TypeScript + Svelte 5 + Vite

## What you get

- **FoundryVTT v14 Stack.** TypeScript runs source and tooling alike: `vite.config.ts`,
  `svelte.config.ts`, and `scripts/*.ts` run on Node ≥ 22.18, with no
  `tsx` or `ts-node`. No v1 Foundry APIs — ApplicationV2, DialogV2, and DataModel only.

- **Svelte 5 in ApplicationV2, wired up.** A working window (`src/ui/ExampleApp.ts`)
  `mount()`s a runes component and `unmount()`s it on close. Open it from the console:
  `game.modules.get('pf2e-module-template').api.open()`.

- **Vite Hot Module Reload.** `src/index.ts` compiles to `dist/<id>.{js,css}`, the artifacts
  `module.json` loads. `npm run dev` serves with hot module reload (HMR); `npm run check` runs `svelte-check` and `tsc`.

- **Compendium packs.** `packs/_source/` JSON sources (tracked) compile to LevelDB on
  `npm run build` (gitignored, like `dist/`), via the bundled `fvtt` CLI. Ships an example
  "Open Example" macro that opens the demo window.

- **One-command rename.** `npm run init -- <new-id> [--title "..."]` rewrites the id and
  title across the manifest, sources, flags, socket channel, and pack names, then deletes
  itself.

- **Dev setup that finds Foundry.** `npm run setup` detects your Foundry data dir from
  `options.json`, scaffolds the module into it (a real dir whose `module.json`/`dist`/`lang`/
  `packs`/`assets` symlink back to the repo — not a whole-repo symlink), and pulls reference
  sources. It prompts only when it cannot resolve a path itself. `npm run deploy` instead
  **copies** a clean, self-contained module (assets and packs included) — the same shape the
  release zip ships, for testing the artifact or installing without the repo.

- **Release on tag.** Push `vX.Y.Z`; `release.yml` stamps the version, type-checks, builds,
  and publishes a GitHub release with `module.json` and the module zip.

- **AI authoring built in.** A bundled `foundry-pf2e` Claude Code skill (`.claude/skills/`)
  carries the Foundry/PF2e API, packs, Svelte-in-ApplicationV2, build, and sync rules into
  every module you make from this template.

- **Sensible defaults.** Localization (`lang/en.json`), a public `api` surface, the
  `module.<id>` socket channel, and license and author metadata all key off the module id.

<!-- TEMPLATE:START -->

## Starting with Claude Code

Install and authenticate the [GitHub CLI](https://cli.github.com) (`gh auth login`)
before you start. This is optional. The UI flow works without it, but the CLI lets
Claude create and clone your repo with no browser steps.

In a new session, fill in the blanks and paste this:

```text
Smoothest Path: Set up a new Foundry VTT PF2e module from this template, following its
README's "Use this template manually" section:
https://github.com/rune-goblin/runegoblin-foundrytemplate

GitHub repo:  https://github.com/<account>, or "local only"
local path:   <containing folder, e.g. ~/repos/>
module id:    <my-module>   (lowercase + hyphens; usually the repo name)
title:        <My Module>

Default to the GitHub CLI flow; with no gh, fall back to the README's UI flow. If
Foundry is installed locally, also run npm run setup. Then tell me how to open the
example window.
```

## Use this template manually

This is a GitHub **template repository**, and like the prompt above you pick one of two
paths: create **a GitHub repo** (recommended — `npm run init` auto-fills your owner and
author from the repo's `origin`) or go **local only**. Either way, `npm run init` renames
the module.

**GitHub repo — CLI (recommended)** — needs the [GitHub CLI](https://cli.github.com), authed once via `gh auth login`. Creates, clones, and detaches history in one step (no `gh`? use the UI flow below):

```bash
gh repo create <your-org>/pf2e-my-module \
  --template rune-goblin/runegoblin-foundrytemplate \
  --private --clone
cd pf2e-my-module
npm run init -- pf2e-my-module --title "PF2e My Module"
npm install && npm run build && npm run check
```

**GitHub repo — UI (no `gh` needed)** — **Use this template → Create a new repository**, then:

```bash
git clone git@github.com:<your-org>/pf2e-my-module.git
cd pf2e-my-module
npm run init -- pf2e-my-module --title "PF2e My Module"
npm install && npm run build && npm run check
```

**Local only** — no GitHub repo yet, so pass your owner with `--org` (or add it later —
`npm run setup` offers to, once an `origin` exists):

```bash
git clone git@github.com:rune-goblin/runegoblin-foundrytemplate.git pf2e-my-module
cd pf2e-my-module
rm -rf .git && git init -b main                                         # detach template history first
npm run init -- pf2e-my-module --title "PF2e My Module" --org <your-org>
npm install && npm run build && npm run check
```

`npm run init -- <id> [--title "..."] [--org <github-owner>] [--author "Name"]` rewrites the
id and title across the repo, then removes itself and the template's `CHANGELOG.md` (your
module starts its own history). It fills the `module.json` author and `url`/`manifest`/`download`
URLs from your GitHub owner (auto-detected from the repo's `origin` remote) and `git config
user.name`; pass `--org`/`--author` to override, or when there's no `origin` yet (the local-only
clone above detaches it). It leaves `.claude/` (the bundled skill) alone and derives the title
from the id when omitted.

Then `npm run setup` links the module into Foundry for local development — see [Develop](#develop).

<!-- TEMPLATE:END -->
## Layout

```
module.json          manifest (esmodules, styles, packs, pf2e relationship)
src/                 TypeScript + Svelte source (entry: src/index.ts)
  index.ts           registers hooks, exposes game.modules.get(id).api
  constants.ts       MODULE_ID (used to build modules/<id>/… asset paths)
  ui/ExampleApp.ts                       ApplicationV2 shell that mounts a Svelte component
  ui/components/example/Example.svelte         sample Svelte 5 component (runes)
  ui/components/example/RuneGoblinBadge.svelte example: art referenced by served path (img + fetched SVG)
  styles.css         global styles → dist/pf2e-module-template.css
  app.d.ts           ambient *.svelte declaration
assets/              module art — one source, one output, served at modules/<id>/assets/…
dist/                build output (gitignored) — what module.json loads
lang/en.json         localization
src/adventure.ts     adventure install prompt (no-op unless an Adventure pack is registered)
packs/               compendium packs — built from _source by `npm run build` (gitignored)
  _source/macros/    JSON pack sources (tracked) — e.g. the "Open Example" macro
  _source/_library/  pack sources kept as compendia, never folded into an Adventure (optional)
scripts/setup.ts     dev install (real dir + symlinks back to the repo)
scripts/deploy.ts    build + copy a clean self-contained module into Foundry
scripts/pack.ts      build the packs module.json registers (compendia + any Adventure); run by build
scripts/build-adventure.ts     derive one Adventure document from the per-type sources (keepId import)
scripts/normalize-refs.ts      rewrite world UUIDs back to compendium UUIDs after an unpack
scripts/removeExampleFiles.ts  strip the example for a clean slate (one-shot; self-deletes)
```

## Remove the example

The template ships a **worked example** — the demo window (`src/ui/`), the Rune Goblin badge,
and the *Open Example* macro — so you can see the patterns (Svelte in ApplicationV2, art by
served path, a compendium pack) in action. It's a demonstration to learn from, **not** a base
class to extend in place: build your own ApplicationV2 alongside it, modeled on what it shows.

Once you've taken what you need, strip it:

```bash
npm run remove-example-files
```

It deletes the example files and trims `src/index.ts`, `module.json`, and `lang/en.json` back
to a minimal skeleton that still builds and loads, then removes itself. Until you add your
first `.svelte` file, `npm run check` prints a harmless "no svelte input files" warning.

## Develop

Set up once — needs Node ≥ 22.18 (for native `.ts` config/tooling) and a local Foundry install. The
[`fvtt`](https://github.com/foundryvtt/foundryvtt-cli) CLI (for packs) ships as a dev
dependency, so `npm install` brings it:

```bash
npm install
npm run setup      # scaffold this module into Foundry (see below)
npm run build      # emit dist/, then enable the module in a world
```

Then:

```bash
npm run dev        # HMR dev server (Vite reverse-proxies Foundry)
npm run watch      # vite build --watch (rebuild dist/ on save, no HMR)
npm run check      # svelte-check + tsc --noEmit
npm test           # vitest unit specs (zero-setup; the CI tier)
npm run test:e2e   # Playwright vs. a real headless Foundry (opt-in — see src/tests/e2e/README.md)
npm run deploy     # build + copy a clean, self-contained module into Foundry
```

**HMR** runs Vite on `:30001` as a reverse proxy *in front of* a running Foundry. Foundry
must already be running, and the esmodule loads only inside an **active world** — so
there's nothing to hot-swap until you launch one:

1. Start Foundry, then **Launch World** (Setup → a world with this module enabled). First
   time only: launch the world once on `:30000`, enable the module under *Manage Modules*,
   and reload — after that it stays on.
2. `npm run dev` (leave Foundry running).
3. Open **http://localhost:30001/game** — *not* `:30000` — and log in.

Now editing a `.svelte` component hot-swaps in place, keeping state. Editing
`src/index.ts` (hooks/bootstrap) triggers a full page reload instead — that's expected.

Prefer the plain bundle? `npm run watch` keeps the old flow: it rebuilds `dist/` on
save; browse `:30000` and reload the browser after a `.js`/`.svelte` rebuild (Foundry
hot-reloads `.hbs`/`.css`/`.json` in place, but not esmodules).

### `npm run setup`

Installs the module into Foundry for live dev and pulls reference sources in. It resolves
three things, prompting only when it can't detect them:

- **Foundry data dir** — from Foundry's `Config/options.json` (`dataPath`) in the
  default user-data folder (macOS `~/Library/Application Support/FoundryVTT*`, Windows
  `%LOCALAPPDATA%\FoundryVTT*`, Linux `~/.local/share/FoundryVTT*`); `FOUNDRY_DATA`
  overrides. It links an existing dir, never creates one.
- **PF2e source** (optional — types also come from the `foundry-pf2e` dep) — clone
  `foundryvtt/pf2e`, point at a checkout, or skip.
- **Links** — confirms before writing them.

The Foundry module dir (`<FoundryData>/Data/modules/<id>`) is a **real directory** whose
entries symlink back to the repo — `module.json`, `dist/`, `lang/`, `packs/`, and `assets/`.
This keeps edits and Vite HMR live without exposing the whole repo (`node_modules`, `.git`)
to Foundry, and `assets/` resolves at the same `modules/<id>/assets/…` path content
references. For a clean, link-free copy (assets and packs included), use `npm run deploy`.

Resolved paths cache to `.dev-paths.json` (gitignored). Flags: `--reconfigure` (re-ask),
`--no-link` (paths only), `--yes` (non-interactive). The gitignored links it creates:

| In-repo link       | Points at                  |
|--------------------|----------------------------|
| `_pf2e-source`     | your `pf2e` checkout       |
| `_foundry-data`    | `<FoundryData>/Data`       |
| `_foundry-modules` | `<FoundryData>/Data/modules` |

## AI tooling

A project skill at `.claude/skills/foundry-pf2e/` holds the Foundry/PF2e authoring rules
and reference (API, packs, Svelte-in-ApplicationV2, the Vite build, sync). Claude Code
loads it here automatically, and `npm run init` carries it into new modules.

It defers the Svelte language to `@sveltejs/mcp`. Run it on demand —
`npx -y @sveltejs/mcp svelte-autofixer src/ui/Foo.svelte` — or register it once:

```bash
claude mcp add -s user svelte -- npx -y @sveltejs/mcp     # all your projects
claude mcp add -s project svelte -- npx -y @sveltejs/mcp  # or commit for collaborators
```

## UI: Svelte 5 in ApplicationV2

The window is a thin `ApplicationV2` subclass; Svelte renders. `_renderHTML` calls
`mount()` into a detached element, `_replaceHTML` inserts it, `_preClose` calls
`unmount()`. See `src/ui/ExampleApp.ts`. Open the sample from the console:
`game.modules.get('pf2e-module-template').api.open()`.

## Compendium packs (fvtt CLI)

Pack **sources** live in `packs/_source/<name>/*.json` (tracked). `npm run build` compiles
every one into a LevelDB at `packs/<name>` via `scripts/pack.ts` — the built packs are
gitignored, like `dist/`, so the shipped LevelDB always matches the sources and the current
module id. The starter example is the `macros` pack with an **Open Example** script macro
(`game.modules.get('<id>')?.api?.open()`), which opens the example window from the macro bar.

Edit the JSON sources, then rebuild. The `fvtt` CLI (a dev dependency) is wrapped for manual
single-pack work — close Foundry first, as it locks the LevelDB while it runs (the `build`
step skips a locked pack with a warning):

```bash
npm run pack   -- <pack-name> --in packs/_source/<pack-name> --out packs
npm run unpack -- <pack-name> --in packs --out packs/_source/<pack-name>
```

To add a pack: create `packs/_source/<name>/`, register it under `module.json` `"packs"`
(Actor/Item packs also need `"system": "pf2e"`), and `npm run build`.

## Ship as an Adventure (vs. compendia)

A module can distribute its content two ways, off the **same** `packs/_source/` tree:

- **Compendia** (the default) — browseable packs the GM drags from piecemeal. Right for a
  *bag of content*: a bestiary, a token/item/spell collection, a rules library. They stay live —
  update the module and users see the new content.
- **One Adventure** — a single document the GM imports in a click, populating the world. Right
  for *a world to run*: scenes with placed tokens, encounters, journals/macros that cross-reference
  each other or specific actors, or esmodule features bound to a document id.

The Adventure importer creates world documents with **keepId**, so every `_id` is preserved on
every install — that's what keeps hardcoded ids and `@UUID` cross-links valid. Loose per-pack
import mints new ids and silently breaks them.

**Don't reach for an Adventure by default.** Imported documents are *copies*: a later module update
won't touch them, and re-importing risks clobbering the GM's edits. Anything you expect to keep
improving belongs in a compendium, not an Adventure.

The model is **derived, not a mode** — there's nothing to switch and no migration. The capability is
always present; you opt in by what you register:

1. **Register an `Adventure` pack** in `module.json` `"packs"` — that registration is the trigger:
   ```json
   { "name": "<name>", "label": "Your Adventure", "path": "packs/<name>", "type": "Adventure", "system": "pf2e" }
   ```
2. **Put runtime libraries under `packs/_source/_library/<name>/`.** Anything a rule element grants
   in place by compendium UUID (e.g. a PF2e `Aura`'s effects) must stay compendium-resident — never
   imported. The `_library/` subtree marks those packs to ship as compendia and stay *out* of the
   Adventure. Register them too (as normal `Item`/etc. packs).
3. **`npm run build`** — `scripts/build-adventure.ts` derives the Adventure from every `_source/<dir>`
   outside `_library/`, rewrites `@UUID`/rule-`uuid` refs that point at bundled packs into **world**
   UUIDs (refs to `_library` packs stay compendium UUIDs), drops scene tokens whose actor isn't
   bundled and links the rest, and compiles it. Run it alone with `npm run build:adventure`.
4. **Prompt the import at runtime** — call `promptAdventureImport()` (from `src/adventure.ts`) in your
   `ready` hook. It discovers the module's Adventure pack and prompts the GM once (gated by Foundry's
   `core.adventureImports`); it's a no-op when no Adventure pack is registered, so it self-deactivates.
   For a worked example see netherworld.

Drop the Adventure registration and you're back to plain compendia — nothing in the sources changed.

**Keep sources canonical.** Author refs as compendium UUIDs (`Compendium.<id>.<pack>.<Type>.<id>`);
the build does the world-UUID rewrite. If you import the Adventure, edit in Foundry, and unpack the
result, refs come back as world UUIDs — run `npm run normalize` (`scripts/normalize-refs.ts`) to
rewrite them back to the canonical compendium form so the sources don't drift.

## Release

Push a tag `vX.Y.Z`; `release.yml` stamps the version, type-checks, builds, and
publishes a GitHub release with `module.json` + `pf2e-module-template.zip`.

## License

This template's own code is [MIT](LICENSE) — use, modify, and build on it freely.

The MIT license covers **only the template**. It does not grant any rights to Paizo
intellectual property. Pathfinder rules text, names, and other Paizo content require
their own license — see <https://paizo.com/licenses>.

If you include any code from the PF2e system, that code is distributed under Apache 2.0;
comply with its terms — see
<https://github.com/foundryvtt/pf2e/blob/v14-dev/LICENSE>.
