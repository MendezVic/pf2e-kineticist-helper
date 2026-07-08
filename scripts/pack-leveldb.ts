// Compile one compendium pack from its JSON source into the LevelDB the manifest registers.
//
// `fvtt package pack` opens the *destination* to clear it before writing, so a destination left
// in a bad state — an uncompacted write-ahead log from a Foundry session, a half-written DB —
// makes it throw `LEVEL_ITERATOR_NOT_OPEN`. That is the same error a genuine Foundry lock raises,
// so the two are indistinguishable; naively catching it silently keeps a stale pack.
//
// So we never pack into the live pack dir: compile into a fresh temp dir (always clean → never
// chokes) and swap it into place only once it's complete. If the swap can't happen because
// Foundry actually holds the pack open (a real file lock), the existing build is left intact and
// we return false — the caller warns and the author closes Foundry to refresh.
import { existsSync, rmSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

export function packCompendium(name: string, inDir: string, packsDir: string): boolean {
  const staging = join(packsDir, '.pack-staging'); // gitignored (packs/* except _source/)
  const tmpOut = join(staging, name);
  const dest = join(packsDir, name);
  const localFvtt = join(process.cwd(), 'node_modules', '@foundryvtt', 'foundryvtt-cli', 'fvtt.mjs');
  const command = existsSync(localFvtt) ? process.execPath : 'fvtt';
  const args = existsSync(localFvtt)
    ? [localFvtt, 'package', 'pack', name, '--in', inDir, '--out', staging]
    : ['package', 'pack', name, '--in', inDir, '--out', staging];
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  try {
    execFileSync(command, args, {
      stdio: 'inherit',
      cwd: dirname(packsDir),
    });
    rmSync(dest, { recursive: true, force: true }); // throws on Windows if Foundry holds it open
    renameSync(tmpOut, dest);
    return true;
  } catch (error) {
    console.warn(`Unable to pack "${name}": ${(error as Error).message}`);
    return false;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
