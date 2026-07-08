import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureModuleAuras, getActorGates, parseElementFromAuraName } from '@/features/auras';
import { MODULE_ID } from '@/constants';

function makeItem(data: any): any {
  return {
    id: data.id ?? data._id,
    _id: data._id,
    name: data.name,
    type: data.type,
    img: data.img,
    system: data.system ?? {},
    flags: data.flags ?? {},
    getFlag: data.getFlag ?? ((scope: string, key: string) => data.flags?.[scope]?.[key]),
  };
}

function makeActor(items: any[]): any {
  const actor = {
    id: 'actor-1',
    uuid: 'Actor.actor-1',
    name: 'Test Kineticist',
    type: 'character',
    items: items.map(makeItem),
    deletedIds: [] as string[],
    createdItems: [] as any[],
    canUserModify: vi.fn(() => true),
    createEmbeddedDocuments: vi.fn(async (_type: string, documents: any[]) => {
      actor.createdItems.push(...documents);
      actor.items.push(
        ...documents.map((document, index) =>
          makeItem({
            ...document,
            _id: document._id ?? `created-${actor.createdItems.length + index}`,
            id: document.id ?? `created-${actor.createdItems.length + index}`,
          }),
        ),
      );
      return documents;
    }),
    deleteEmbeddedDocuments: vi.fn(async (_type: string, ids: string[]) => {
      actor.deletedIds.push(...ids);
      actor.items = actor.items.filter((item: any) => !ids.includes(item.id));
      return ids;
    }),
  };

  return actor;
}

function moduleAura(id: string, element: string): any {
  return {
    id,
    name: `Kineticist Element: ${element}`,
    type: 'effect',
    flags: {
      [MODULE_ID]: {
        generatedByKineticAura: true,
        element,
      },
    },
  };
}

describe('kineticist aura helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('game', {
      user: { id: 'gm', isGM: true },
      settings: { get: vi.fn(() => false) },
      combat: { combatants: [{ actorId: 'actor-1' }] },
      packs: new Map([
        [
          `${MODULE_ID}.aura-effects`,
          {
            getIndex: vi.fn(async () => [
              {
                _id: 'fire-effect',
                name: 'Kineticist Element: Fire',
                flags: { [MODULE_ID]: { element: 'Fire' } },
              },
            ]),
            getDocument: vi.fn(async () => ({
              uuid: `Compendium.${MODULE_ID}.aura-effects.Item.fire-effect`,
              toObject: () => ({
                _id: 'fire-effect',
                name: 'Kineticist Element: Fire',
                type: 'effect',
                img: 'icons/magic/fire/beam-jet-stream-spiral-yellow.webp',
                system: { rules: [], duration: { unit: 'unlimited', value: -1 } },
                flags: { [MODULE_ID]: { element: 'Fire' } },
                _stats: {},
              }),
            })),
          },
        ],
      ]),
    });
  });

  it('parses current aura tag names', () => {
    expect(parseElementFromAuraName('Kineticist Element: Fire')).toBe('Fire');
    expect(parseElementFromAuraName('Kinetic Aura: water')).toBeNull();
    expect(parseElementFromAuraName('Effect: Kinetic Aura')).toBeNull();
  });

  it('detects elemental gates from item names and descriptions', () => {
    const actor = {
      items: [
        { type: 'feat', name: 'Fire Gate', system: { description: { value: '' } } },
        { type: 'classfeature', name: 'Dual Gate', system: { description: { value: 'Gate: Wood' } } },
        { type: 'spell', name: 'Air Gate', system: { description: { value: '' } } },
      ],
    };

    expect(getActorGates(actor)).toEqual(['Fire', 'Wood']);
  });

  it('creates one compendium-backed aura tag for a detected gate', async () => {
    const actor = makeActor([
      { id: 'real-aura', type: 'effect', name: 'Effect: Kinetic Aura' },
      { id: 'fire-gate', type: 'feat', name: 'Fire Gate' },
    ]);

    await ensureModuleAuras(actor);
    await ensureModuleAuras(actor);

    expect(actor.createEmbeddedDocuments).toHaveBeenCalledTimes(1);
    expect(actor.createdItems).toHaveLength(1);
    expect(actor.createdItems[0]).toMatchObject({
      name: 'Kineticist Element: Fire',
      type: 'effect',
      flags: { [MODULE_ID]: { generatedByKineticAura: true, element: 'Fire' } },
      _stats: {
        compendiumSource: `Compendium.${MODULE_ID}.aura-effects.Item.fire-effect`,
        duplicateSource: `Compendium.${MODULE_ID}.aura-effects.Item.fire-effect`,
      },
    });
    expect(actor.createdItems[0]._id).toBeUndefined();
  });

  it('removes duplicate and stale aura tags before creating missing tags', async () => {
    const actor = makeActor([
      { id: 'real-aura', type: 'effect', name: 'Effect: Kinetic Aura' },
      { id: 'fire-gate', type: 'feat', name: 'Fire Gate' },
      moduleAura('fire-keep', 'Fire'),
      moduleAura('fire-duplicate', 'Fire'),
      moduleAura('water-stale', 'Water'),
    ]);

    await ensureModuleAuras(actor);

    expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled();
    expect(actor.deletedIds).toEqual(expect.arrayContaining(['fire-duplicate', 'water-stale']));
    expect(actor.items.map((item: any) => item.id)).toContain('fire-keep');
    expect(actor.items.map((item: any) => item.id)).not.toEqual(expect.arrayContaining(['water-stale']));
  });
});
