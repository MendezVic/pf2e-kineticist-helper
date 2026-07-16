import { MODULE_ID } from '@/constants';
import {
  actorHasRealKineticAura,
  getActorItems,
  getActorGates,
  getAuraElement,
  getModuleAuraItems,
  hasModuleAuras,
  isActorInActiveCombat,
  isCharacter,
  isKineticistStanceItem,
  isRealKineticAuraItem,
  parseElementFromAuraName,
} from './detection';
import { makeElementAuraEffect } from './effects';
import { removeAuraForOverflowDamageRoll } from './overflow';
import type { ActorLike, ItemLike, KineticistElement, KineticistHelperApi } from './types';

const pendingAuraCreates = new Set<string>();

export type { KineticistElement, KineticistHelperApi };
export { getActorGates, parseElementFromAuraName };

export async function removeKineticistStances(actor: ActorLike): Promise<void> {
  if (!canModifyActor(actor)) return;

  const stanceIds = getActorItems(actor)
    .filter((item) => isKineticistStanceItem(item))
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string');

  if (!stanceIds.length) return;

  try {
    await actor.deleteEmbeddedDocuments('Item', stanceIds);
  } catch (error) {
    console.warn(`[${MODULE_ID}] Unable to remove Kineticist stances from actor "${actor.name}".`, error);
  }
}

export function registerAuraSettings(): void {
  game.settings.register(MODULE_ID, 'debugLogging', {
    name: game.i18n.localize(`${MODULE_ID}.settings.debugLogging.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.debugLogging.hint`),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });
}

export function registerAuraHooks(): void {
  Hooks.on('createChatMessage', async (message: any) => {
    if (!isResponsibleGM()) return;

    try {
      await removeAuraForOverflowDamageRoll(message);
    } catch (error) {
      console.warn(`[${MODULE_ID}] Unable to remove Kinetic Aura after an overflow damage roll.`, error);
    }
  });

  Hooks.on('createItem', async (item: ItemLike) => {
    if (!isResponsibleGM()) return;
    if (!isRealKineticAuraItem(item)) return;

    const actor = item.parent;
    if (!isCharacter(actor)) return;

    debugLog('Kinetic Aura effect added to actor', actor.name, {
      effectName: item.name,
      effectId: item.id,
    });

    if (!isActorInActiveCombat(actor)) {
      debugLog('Actor is not in active combat; skipping aura tag creation for now.', actor.name);
      return;
    }

    await ensureModuleAuras(actor);
  });

  Hooks.on('deleteItem', async (item: ItemLike) => {
    if (!isResponsibleGM()) return;
    if (!isRealKineticAuraItem(item)) return;

    const actor = item.parent;
    if (!isCharacter(actor)) return;

    debugLog('Kinetic Aura effect removed from actor', actor.name, {
      effectName: item.name,
      effectId: item.id,
    });

    if (actorHasRealKineticAura(actor)) {
      debugLog('At least one PF2e aura remains; keeping module VFX tags active.', actor.name);
      return;
    }

    await removeKineticistStances(actor);
    await cleanupModuleAuras(actor);
  });

  Hooks.on('combatStart', syncAurasFromCombatHook);
  Hooks.on('createCombat', syncAurasFromCombatHook);
  Hooks.on('deleteCombat', syncAurasFromCombatHook);
  Hooks.on('updateCombat', syncAurasFromCombatHook);
  Hooks.on('createCombatant', syncAurasFromCombatHook);
  Hooks.on('deleteCombatant', syncAurasFromCombatHook);
  Hooks.on('updateCombatant', syncAurasFromCombatHook);
}

export async function ensureModuleAuras(actor: ActorLike): Promise<void> {
  if (!isCharacter(actor)) return;
  if (!actorHasRealKineticAura(actor)) return;
  if (!isActorInActiveCombat(actor)) return;
  if (!canModifyActor(actor)) {
    debugLog('Current user cannot modify actor; skipping aura tag creation.', actor.name);
    return;
  }

  const actorKey = String(actor.uuid ?? actor.id ?? actor.name);
  if (pendingAuraCreates.has(actorKey)) {
    debugLog('Aura tag creation already pending for actor; skipping duplicate request.', actor.name);
    return;
  }

  pendingAuraCreates.add(actorKey);

  try {
    await dedupeModuleAuras(actor);

    const elements = getActorGates(actor);
    debugLog('Detected gates for actor', actor.name, elements);

    if (!elements.length) {
      await cleanupModuleAuras(actor);
      return;
    }

    await cleanupStaleModuleAuras(actor, elements);

    const existingElements = new Set(
      getModuleAuraItems(actor)
        .map((item) => getAuraElement(item))
        .filter((element): element is KineticistElement => Boolean(element)),
    );
    const missingElements = elements.filter((element) => !existingElements.has(element));

    if (!missingElements.length) {
      debugLog('Aura tag effects already present on actor', actor.name);
      return;
    }

    const newEffectsData = await Promise.all(missingElements.map((element) => makeElementAuraEffect(element)));
    debugLog('Creating aura tag effects', newEffectsData);

    try {
      await actor.createEmbeddedDocuments('Item', newEffectsData);
    } catch (error) {
      console.warn(`[${MODULE_ID}] Unable to create aura tag effects on actor "${actor.name}".`, error);
    }
  } finally {
    pendingAuraCreates.delete(actorKey);
  }
}

export async function syncAuraStateForAllActors(): Promise<void> {
  const actors = (Array.from(game.actors ?? []) as ActorLike[]).filter((actor) => isCharacter(actor));

  for (const actor of actors) {
    const inCombat = isActorInActiveCombat(actor);
    const hasRealAura = actorHasRealKineticAura(actor);
    const hasCosmeticAura = hasModuleAuras(actor);

    debugLog('syncAuraStateForAllActors()', actor.name, {
      inCombat,
      hasRealAura,
      hasCosmeticAura,
    });

    if (inCombat && hasRealAura) {
      await ensureModuleAuras(actor);
      continue;
    }

    if (hasCosmeticAura) {
      await cleanupModuleAuras(actor);
    }
  }
}

async function syncAurasFromCombatHook(): Promise<void> {
  if (!isResponsibleGM()) return;
  await syncAuraStateForAllActors();
}

function isDebugEnabled(): boolean {
  try {
    return Boolean(game.settings.get(MODULE_ID, 'debugLogging'));
  } catch {
    return false;
  }
}

function debugLog(...args: unknown[]): void {
  if (!isDebugEnabled()) return;
  console.log(`[${MODULE_ID}]`, ...args);
}

function isResponsibleGM(): boolean {
  if (!game.user?.isGM) return false;

  const activeGM = game.users?.activeGM;
  return !activeGM || activeGM.id === game.user.id;
}

function canModifyActor(actor: ActorLike): boolean {
  if (!actor) return false;

  if (typeof actor.canUserModify === 'function') {
    try {
      return Boolean(actor.canUserModify(game.user, 'update'));
    } catch {
      // Fall back to ownership checks below.
    }
  }

  return Boolean(game.user?.isGM || actor.isOwner === true);
}

async function cleanupModuleAuras(actor: ActorLike): Promise<void> {
  if (!canModifyActor(actor)) {
    debugLog('Current user cannot modify actor; skipping aura tag cleanup.', actor.name);
    return;
  }

  const ids = getModuleAuraItems(actor)
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string');

  if (!ids.length) return;

  try {
    await actor.deleteEmbeddedDocuments('Item', ids);
  } catch (error) {
    console.warn(`[${MODULE_ID}] Unable to remove aura tag effects from actor "${actor.name}".`, error);
  }
}

async function cleanupStaleModuleAuras(actor: ActorLike, activeElements: KineticistElement[]): Promise<void> {
  if (!canModifyActor(actor)) {
    debugLog('Current user cannot modify actor; skipping stale aura tag cleanup.', actor.name);
    return;
  }

  const active = new Set(activeElements);
  const staleIds = getModuleAuraItems(actor)
    .filter((item) => {
      const element = getAuraElement(item);
      return element !== null && !active.has(element);
    })
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string');

  if (!staleIds.length) return;

  try {
    await actor.deleteEmbeddedDocuments('Item', staleIds);
  } catch (error) {
    console.warn(`[${MODULE_ID}] Unable to remove stale aura tag effects from actor "${actor.name}".`, error);
  }
}

async function dedupeModuleAuras(actor: ActorLike): Promise<void> {
  if (!canModifyActor(actor)) {
    debugLog('Current user cannot modify actor; skipping aura tag dedupe.', actor.name);
    return;
  }

  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const item of getModuleAuraItems(actor)) {
    const element = getAuraElement(item) ?? String(item.name ?? item.id);
    if (seen.has(element)) {
      if (typeof item.id === 'string') duplicateIds.push(item.id);
      continue;
    }

    seen.add(element);
  }

  if (!duplicateIds.length) return;

  try {
    await actor.deleteEmbeddedDocuments('Item', duplicateIds);
  } catch (error) {
    console.warn(`[${MODULE_ID}] Unable to remove duplicate aura tag effects from actor "${actor.name}".`, error);
  }
}
