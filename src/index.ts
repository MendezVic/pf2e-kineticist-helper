import './styles.css';
import { MODULE_ID } from './constants';
import {
  ensureModuleAuras,
  getActorGates,
  registerAuraHooks,
  registerAuraSettings,
  syncAuraStateForAllActors,
  type KineticistHelperApi,
} from './features/auras';
import { registerReminderHooks, registerReminderSettings } from './features/reminders';

let initialized = false;
let readied = false;

function initializeModule(): void {
  if (initialized) return;
  initialized = true;

  registerAuraSettings();
  registerReminderSettings();
  registerAuraHooks();
  registerReminderHooks();
  console.log(`${MODULE_ID} | init`);
}

function readyModule(): void {
  if (readied) return;
  readied = true;

  const module = game.modules.get(MODULE_ID);
  const version = module?.version ?? '0.0.0';
  const api: KineticistHelperApi = {
    version,
    syncActorAuras: ensureModuleAuras,
    syncAllAuras: syncAuraStateForAllActors,
    getActorGates,
  };
  // `api` is the Foundry convention for a public API, but isn't a typed field on Module.
  if (module) (module as { api?: KineticistHelperApi }).api = api;
  console.log(`${MODULE_ID} | ready (v${version})`);
}

if (game.ready === true) {
  initializeModule();
  readyModule();
} else {
  Hooks.once('init', initializeModule);
  Hooks.once('ready', () => {
    initializeModule();
    readyModule();
  });
}
