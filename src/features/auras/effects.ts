import { MODULE_ID } from '@/constants';
import { AURA_EFFECTS_PACK, COSMETIC_AURA_PREFIX } from './constants';
import { normalizeElement, parseElementFromAuraName } from './detection';
import type { KineticistElement } from './types';

export async function makeElementAuraEffect(elementType: KineticistElement): Promise<object> {
  const compendiumEffect = await getCompendiumAuraEffect(elementType);
  if (compendiumEffect) return compendiumEffect;

  return {
    name: `${COSMETIC_AURA_PREFIX}: ${elementType}`,
    type: 'effect',
    img: pickIconForElement(elementType),
    system: {
      tokenIcon: { show: false },
      duration: {
        unit: 'unlimited',
        value: null,
        sustained: false,
      },
      rules: [],
    },
    flags: {
      [MODULE_ID]: {
        generatedByKineticAura: true,
        element: elementType,
      },
    },
  };
}

async function getCompendiumAuraEffect(elementType: KineticistElement): Promise<any | null> {
  const pack = game.packs.get(AURA_EFFECTS_PACK);
  if (!pack) return null;

  try {
    const index = await pack.getIndex({ fields: ['name', 'flags'] });
    const entry = index.find((item: any) => {
      const element = normalizeElement(item.flags?.[MODULE_ID]?.element) ?? parseElementFromAuraName(item.name);
      return element === elementType;
    });
    if (!entry?._id) return null;

    const source = await pack.getDocument(entry._id);
    if (!source) return null;

    const sourceData = source.toObject();

    const { _id, ...data } = sourceData;
    data._stats = {
      ...(data._stats ?? {}),
      compendiumSource: source.uuid,
      duplicateSource: source.uuid,
    };
    data.flags = {
      ...(data.flags ?? {}),
      [MODULE_ID]: {
        ...(data.flags?.[MODULE_ID] ?? {}),
        generatedByKineticAura: true,
        element: elementType,
      },
    };
    return data;
  } catch (error) {
    console.warn(`[${MODULE_ID}] Unable to load ${elementType} aura effect from "${AURA_EFFECTS_PACK}".`, error);
    return null;
  }
}

function pickIconForElement(elementType: KineticistElement): string {
  switch (elementType) {
    case 'Air':
      return 'icons/magic/air/wind-vortex-swirl-blue-purple.webp';
    case 'Earth':
      return 'icons/magic/earth/barrier-stone-brown-green.webp';
    case 'Fire':
      return 'icons/magic/fire/beam-jet-stream-spiral-yellow.webp';
    case 'Metal':
      return 'icons/commodities/metal/mail-chain-steel.webp';
    case 'Water':
      return 'icons/magic/water/pseudopod-swirl-blue.webp';
    case 'Wood':
      return 'icons/magic/nature/root-vine-barrier-wall-brown.webp';
  }
}
