import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSentTurnRemindersForTests, getReminderState, maybeSendTurnStartReminder } from '@/features/reminders';
import { MODULE_ID } from '@/constants';

function makeItem(data: any): any {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    flags: data.flags ?? {},
    getFlag: (scope: string, key: string) => data.flags?.[scope]?.[key],
  };
}

function makeActor(items: any[]): any {
  return {
    id: 'actor-1',
    uuid: 'Actor.actor-1',
    name: 'Kinetic Tester',
    type: 'character',
    isOwner: true,
    items: items.map(makeItem),
  };
}

function makeCombat(actor: any, turn = 0): any {
  vi.stubGlobal('canvas', { tokens: { controlled: [{ actor }] } });
  return {
    id: 'combat-1',
    round: 1,
    turn,
    combatant: {
      id: `combatant-${turn}`,
      actor,
    },
  };
}

describe('kineticist turn reminders', () => {
  beforeEach(() => {
    clearSentTurnRemindersForTests();

    vi.stubGlobal('game', {
      user: { id: 'user-1', isGM: false, active: true },
      users: [{ id: 'user-1', isGM: false, active: true }],
      settings: { get: vi.fn(() => true) },
      modules: { get: vi.fn(() => ({ active: false })) },
      i18n: {
        localize: vi.fn((key: string) => key),
        format: vi.fn((key: string, data: Record<string, string>) => {
          return key.replace(`${MODULE_ID}.`, '').replace('{actor}', data.actor ?? '').replace('{element}', data.element ?? '');
        }),
      },
    });

    vi.stubGlobal('ChatMessage', {
      getSpeaker: vi.fn(({ actor }: any) => ({ actor: actor.id, alias: actor.name })),
      create: vi.fn(async (data: any) => data),
    });

    vi.stubGlobal('foundry', { utils: { fromUuid: vi.fn() } });
  });

  it('detects Final Gate, Kinetic Pinnacle, and real kinetic aura state', () => {
    const actor = makeActor([
      { id: 'final-gate', name: 'Final Gate', type: 'feat' },
      { id: 'kinetic-pinnacle', name: 'Kinetic Pinnacle', type: 'feat' },
      { id: 'real-aura', name: 'Effect: Kinetic Aura', type: 'effect' },
      {
        id: 'module-aura',
        name: 'Kineticist Element: Fire',
        type: 'effect',
        flags: { [MODULE_ID]: { generatedByKineticAura: true } },
      },
    ]);

    expect(getReminderState(actor)).toEqual({
      hasFinalGate: true,
      hasKineticPinnacle: true,
      hasKineticAura: true,
    });
  });

  it('posts one Final Gate reminder per combat turn when the aura is inactive', async () => {
    const actor = makeActor([{ id: 'final-gate', name: 'Final Gate', type: 'feat' }]);
    const combat = makeCombat(actor);

    await maybeSendTurnStartReminder(combat);
    await maybeSendTurnStartReminder(combat);

    expect(ChatMessage.create).toHaveBeenCalledTimes(1);
    expect(ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        speaker: { actor: 'actor-1', alias: 'Kinetic Tester' },
        content: expect.stringContaining('channel-elements'),
        whisper: ['user-1'],
      }),
    );
  });

  it('skips a Final Gate reminder when the kinetic aura is already active', async () => {
    const actor = makeActor([
      { id: 'final-gate', name: 'Final Gate', type: 'feat' },
      { id: 'real-aura', name: 'Effect: Kinetic Aura', type: 'effect' },
    ]);

    await maybeSendTurnStartReminder(makeCombat(actor));

    expect(ChatMessage.create).not.toHaveBeenCalled();
  });

  it('still posts a Kinetic Pinnacle reminder while the aura is active', async () => {
    const actor = makeActor([
      { id: 'kinetic-pinnacle', name: 'Kinetic Pinnacle', type: 'feat' },
      { id: 'real-aura', name: 'Effect: Kinetic Aura', type: 'effect' },
    ]);

    await maybeSendTurnStartReminder(makeCombat(actor));

    expect(ChatMessage.create).toHaveBeenCalledTimes(1);
    expect(ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('kineticPinnacle'),
        whisper: ['user-1'],
      }),
    );
  });

  it('lets an active Assistant GM controlling the token create a private reminder', async () => {
    const actor = makeActor([{ id: 'final-gate', name: 'Final Gate', type: 'feat' }]);
    actor.isOwner = false;
    const mockGame = game as unknown as { user: any; users: any[] };
    mockGame.users = [{ id: 'gm', isGM: true, active: true }];
    mockGame.user = { id: 'gm', isGM: true, active: true };

    await maybeSendTurnStartReminder(makeCombat(actor));

    expect(ChatMessage.create).toHaveBeenCalledTimes(1);
    expect(ChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        whisper: ['gm'],
      }),
    );
  });

  it('does not notify a user who is not controlling the kineticist', async () => {
    const actor = makeActor([{ id: 'final-gate', name: 'Final Gate', type: 'feat' }]);
    actor.isOwner = false;
    const mockGame = game as unknown as { user: any; users: any[] };
    mockGame.users = [{ id: 'gm', isGM: true, active: true }];
    mockGame.user = { id: 'gm', isGM: true, active: true };

    const combat = makeCombat(actor);
    vi.stubGlobal('canvas', { tokens: { controlled: [] } });
    await maybeSendTurnStartReminder(combat);

    expect(ChatMessage.create).not.toHaveBeenCalled();
  });
});
