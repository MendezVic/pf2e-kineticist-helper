import { MODULE_ID } from '@/constants';
import { CHAT_BUTTON_SELECTOR, FINAL_GATE, KINETIC_AURA, KINETIC_PINNACLE } from './constants';
import { createTurnStartReminderMessage, executeChannelElements, executeElementalBlast, sendChannelElementsActivatedMessage } from './chat';
import { currentUserCanOwnReminder, isResponsibleReminderUser } from './permissions';
import type { ActorLike, CombatLike, ItemLike, ReminderState } from './types';

const sentTurnReminders = new Set<string>();

export type { ReminderState };

export function registerReminderSettings(): void {
  game.settings.register(MODULE_ID, 'turnStartReminders', {
    name: game.i18n.localize(`${MODULE_ID}.settings.turnStartReminders.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.turnStartReminders.hint`),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });
}

export function registerReminderHooks(): void {
  Hooks.on('combatStart', queueTurnStartReminder);
  Hooks.on('updateCombat', queueTurnStartReminder);
  Hooks.on('updateCombatant', (combatant: any) => queueTurnStartReminder(combatant?.combat ?? game.combat));

  Hooks.on('createItem', (item: any) => {
    const actor = item?.parent;
    if (!isCharacter(actor)) return;
    if (!currentUserCanOwnReminder(actor)) return;
    if (item?.type !== 'effect') return;
    if (!String(item.name ?? '').toLowerCase().includes(KINETIC_AURA.toLowerCase())) return;

    void sendChannelElementsActivatedMessage(actor);
  });

  document.addEventListener('click', event => {
    const target = event.target instanceof HTMLElement ? event.target.closest(CHAT_BUTTON_SELECTOR) : null;
    if (!(target instanceof HTMLElement)) return;

    event.preventDefault();
    void handleReminderButton(target);
  });
}

export async function maybeSendTurnStartReminder(combat: CombatLike = game.combat): Promise<void> {
  if (!isReminderEnabled()) return;

  const combatant = getActiveCombatant(combat);
  const actor = combatant?.actor;
  if (!isCharacter(actor)) return;
  if (!isResponsibleReminderUser(actor)) return;

  const state = getReminderState(actor);
  if (!state.hasFinalGate && !state.hasKineticPinnacle) return;

  const shouldRemindFinalGate = state.hasFinalGate && !state.hasKineticAura;
  if (!shouldRemindFinalGate && !state.hasKineticPinnacle) return;

  const key = getTurnReminderKey(combat, actor);
  if (sentTurnReminders.has(key)) return;
  sentTurnReminders.add(key);

  await createTurnStartReminderMessage(actor, state, shouldRemindFinalGate);
}

export function getReminderState(actor: ActorLike): ReminderState {
  return {
    hasFinalGate: hasItemNamed(actor, FINAL_GATE),
    hasKineticPinnacle: hasItemNamed(actor, KINETIC_PINNACLE),
    hasKineticAura: hasRealKineticAura(actor),
  };
}

export function clearSentTurnRemindersForTests(): void {
  sentTurnReminders.clear();
}

function queueTurnStartReminder(combat: CombatLike = game.combat): void {
  globalThis.setTimeout(() => {
    void maybeSendTurnStartReminder(combat);
  }, 0);
}

function isReminderEnabled(): boolean {
  try {
    return Boolean(game.settings.get(MODULE_ID, 'turnStartReminders'));
  } catch {
    return true;
  }
}

function getActiveCombatant(combat: CombatLike): any {
  const currentCombatantId = combat?.current?.combatantId;
  return combat?.combatant ?? combat?.combatants?.get?.(currentCombatantId) ?? combat?.combatants?.find?.((combatant: any) => combatant.id === currentCombatantId);
}

function getTurnReminderKey(combat: CombatLike, actor: ActorLike): string {
  const combatant = getActiveCombatant(combat);
  const combatId = String(combat?.id ?? 'combat');
  const round = String(combat?.round ?? 0);
  const turn = String(combat?.turn ?? 0);
  const combatantId = String(combatant?.id ?? combat?.current?.combatantId ?? actor.id ?? actor.uuid ?? actor.name);
  return `${combatId}:${round}:${turn}:${combatantId}`;
}

function isCharacter(actor: ActorLike): boolean {
  return Boolean(actor && actor.type === 'character');
}

function getActorItems(actor: ActorLike): ItemLike[] {
  return Array.from(actor?.items?.values?.() ?? actor?.items ?? []);
}

function hasItemNamed(actor: ActorLike, itemName: string): boolean {
  return getActorItems(actor).some(item => item?.name === itemName && ['feat', 'classfeature'].includes(item.type));
}

function hasRealKineticAura(actor: ActorLike): boolean {
  return getActorItems(actor).some(item => {
    if (item?.type !== 'effect') return false;
    if (item.getFlag?.(MODULE_ID, 'generatedByKineticAura') === true) return false;

    return String(item.name ?? '')
      .toLowerCase()
      .includes(KINETIC_AURA.toLowerCase());
  });
}

async function handleReminderButton(button: HTMLElement): Promise<void> {
  const action = button.dataset[`${datasetKey(MODULE_ID)}Action`];
  if (!['channel-elements', 'elemental-blast'].includes(String(action))) return;

  const actorUuid = button.dataset[`${datasetKey(MODULE_ID)}ActorUuid`];
  if (!actorUuid) return;
  const actor = (typeof actorUuid === 'string' ? await foundry.utils.fromUuid(actorUuid) : null) as ActorLike | null;
  if (!actor || !currentUserCanOwnReminder(actor)) return;

  if (action === 'channel-elements') {
    await executeChannelElements(actor);
    return;
  }

  const element = button.dataset[`${datasetKey(MODULE_ID)}Element`];
  if (element) await executeElementalBlast(actor, element);
}

function datasetKey(value: string): string {
  return value.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
