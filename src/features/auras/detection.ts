import { MODULE_ID } from '@/constants';
import { COSMETIC_AURA_PREFIX, ELEMENTS, GATE_PATTERNS } from './constants';
import type { ActorLike, ItemLike, KineticistElement } from './types';

export function isCharacter(actor: ActorLike): boolean {
  return Boolean(actor && actor.type === 'character');
}

export function getActorItems(actor: ActorLike): ItemLike[] {
  return Array.from(actor?.items?.values?.() ?? actor?.items ?? []);
}

export function isActorInActiveCombat(actor: ActorLike): boolean {
  return Boolean(game.combat?.combatants?.some((combatant: any) => combatant.actorId === actor.id));
}

export function getActorGates(actor: ActorLike): KineticistElement[] {
  const found = new Set<KineticistElement>();

  for (const item of getActorItems(actor)) {
    if (!['feat', 'classfeature'].includes(item.type)) continue;

    const itemName = String(item.name ?? '');
    const description = String(item.system?.description?.value ?? '');

    for (const [element, pattern] of Object.entries(GATE_PATTERNS) as [KineticistElement, RegExp][]) {
      if (pattern.test(itemName) || pattern.test(description)) found.add(element);
    }
  }

  return Array.from(found);
}

export function parseElementFromAuraName(name: unknown): KineticistElement | null {
  const match = String(name ?? '').match(new RegExp(`^${COSMETIC_AURA_PREFIX}:\\s*(Air|Earth|Fire|Metal|Water|Wood)$`, 'i'));
  if (!match) return null;

  const normalized = `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}`;
  return ELEMENTS.includes(normalized as KineticistElement) ? (normalized as KineticistElement) : null;
}

export function isRealKineticAuraItem(item: ItemLike): boolean {
  if (item?.type !== 'effect') return false;
  if (isModuleAuraItem(item)) return false;

  const name = String(item.name ?? '').toLowerCase();
  return name.includes('kinetic aura');
}

/** PF2e kineticist stances are effects with both the impulse and stance traits. */
export function isKineticistStanceItem(item: ItemLike): boolean {
  if (item?.type !== 'effect' || isModuleAuraItem(item)) return false;

  const traits = getItemTraits(item);
  return traits.includes('stance') && traits.includes('impulse');
}

export function actorHasRealKineticAura(actor: ActorLike): boolean {
  return getActorItems(actor).some((item) => isRealKineticAuraItem(item));
}

export function isModuleAuraItem(item: ItemLike): boolean {
  if (item?.type !== 'effect') return false;

  return getAuraFlag(item, 'generatedByKineticAura') === true;
}

export function getModuleAuraItems(actor: ActorLike): ItemLike[] {
  return getActorItems(actor).filter((item) => isModuleAuraItem(item));
}

export function hasModuleAuras(actor: ActorLike): boolean {
  return getModuleAuraItems(actor).length > 0;
}

export function getAuraElement(item: ItemLike): KineticistElement | null {
  return normalizeElement(getAuraFlag(item, 'element')) ?? parseElementFromAuraName(item.name);
}

export function getAuraFlag(item: ItemLike, key: string): unknown {
  if (typeof item?.getFlag === 'function') {
    try {
      return item.getFlag(MODULE_ID, key);
    } catch {
      // Fall back to raw flag data below.
    }
  }

  return item?.flags?.[MODULE_ID]?.[key] ?? item?._source?.flags?.[MODULE_ID]?.[key];
}

function getItemTraits(item: ItemLike): string[] {
  const traits = item?.system?.traits?.value ?? item?.system?.traits ?? item?.traits ?? [];
  return Array.from(traits as Iterable<unknown>).map((trait) => String(trait).toLowerCase());
}

export function normalizeElement(value: unknown): KineticistElement | null {
  if (typeof value !== 'string') return null;

  const match = ELEMENTS.find((element) => element.toLowerCase() === value.toLowerCase());
  return match ?? null;
}
