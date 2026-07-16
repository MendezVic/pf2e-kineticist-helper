import { isRealKineticAuraItem } from './detection';
import type { ActorLike, ItemLike } from './types';

type DamageMessageLike = any;

/** Remove Kinetic Aura as soon as an overflow damage roll is created. */
export async function removeAuraForOverflowDamageRoll(message: DamageMessageLike): Promise<void> {
  const flags = message?.flags?.pf2e;
  if (!flags?.damageRoll?.traits?.includes('overflow')) return;

  const source = await getActor(flags?.context?.actor);
  if (!source) return;

  const auraIds = Array.from(source.items ?? [])
    .filter((item: ItemLike) => isRealKineticAuraItem(item))
    .map((item: ItemLike) => item.id)
    .filter((id: unknown): id is string => typeof id === 'string');

  if (auraIds.length) await source.deleteEmbeddedDocuments('Item', auraIds);
}

async function getActor(uuid: unknown): Promise<ActorLike | null> {
  if (typeof uuid !== 'string' || !uuid) return null;

  const document = await fromUuid(uuid);
  if (!document) return null;
  if (document.documentName === 'Actor') return document;
  return (document as any).actor ?? null;
}
