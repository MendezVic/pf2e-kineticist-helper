import { MODULE_ID } from '@/constants';
import { getActorGates } from '@/features/auras';
import { getPlayerOwnerIds } from './permissions';
import type { ActorLike, ReminderState } from './types';

type KineticElementTrait = 'air' | 'earth' | 'fire' | 'metal' | 'water' | 'wood';

export async function createTurnStartReminderMessage(actor: ActorLike, state: ReminderState, shouldRemindFinalGate: boolean): Promise<void> {
  const whisper = getPlayerOwnerIds(actor);
  if (!whisper.length) return;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: game.i18n.localize(`${MODULE_ID}.chat.turnStart.title`),
    content: renderTurnStartReminder(actor, state, shouldRemindFinalGate),
    whisper,
    flags: {
      [MODULE_ID]: {
        reminder: 'turn-start',
        actorUuid: actor.uuid,
      },
    },
  });
}

export async function executeChannelElements(actor: ActorLike): Promise<void> {
  if (hasKineticAura(actor)) {
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.chat.channelElements.alreadyActive`));
    return;
  }

  const action = Array.from(actor?.items?.values?.() ?? actor?.items ?? []).find(
    (item: any) => item?.type === 'action' && (item.slug === 'channel-elements' || item.system?.slug === 'channel-elements'),
  ) as any;
  if (!action?.uuid && !action?.id) {
    await sendChannelElementsActivatedMessage(actor);
    return;
  }

  const message = await game.pf2e.rollItemMacro(action.uuid ?? action.id);
  await message?.delete();
}

export async function executeElementalBlast(actor: ActorLike, element: string): Promise<void> {
  if (!hasKineticAura(actor)) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.chat.elementalBlast.auraRequired`));
    return;
  }

  await deleteChannelActivatedMessage(actor);

  await game.pf2e.rollActionMacro({
    actorUUID: actor.uuid,
    type: 'blast',
    elementTrait: element.toLowerCase() as KineticElementTrait,
  });
}

export async function sendChannelElementsActivatedMessage(actor: ActorLike): Promise<void> {
  const sections: string[] = [];
  sections.push('<div class="kineticist-reminder">');
  sections.push(`<div class="kineticist-reminder__section">${game.i18n.localize(`${MODULE_ID}.chat.channelElementsActivated.message`)}</div>`);
  sections.push(renderBlastOnlyButtons(actor));
  sections.push('</div>');

  const result = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: game.i18n.localize(`${MODULE_ID}.chat.channelElementsActivated.title`),
    content: sections.join(''),
    flags: {
      [MODULE_ID]: {
        reminder: 'channel-activated',
        actorUuid: actor.uuid,
      },
    },
  });

  const message = Array.isArray(result) ? result[0] : result;
  if (message && actor.setFlag) {
    await actor.setFlag(MODULE_ID, 'activatedMessageId', message.id);
  }
}

export async function deleteChannelActivatedMessage(actor: ActorLike): Promise<void> {
  if (!actor.getFlag) return;

  const messageId = actor.getFlag(MODULE_ID, 'activatedMessageId');
  if (!messageId) return;

  try {
    const message = game.messages?.get(messageId);
    if (message) {
      await message.delete();
      await actor.unsetFlag(MODULE_ID, 'activatedMessageId');
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Failed to delete activated message:`, error);
  }
}

function renderTurnStartReminder(actor: ActorLike, state: ReminderState, shouldRemindFinalGate: boolean): string {
  const sections: string[] = [];
  sections.push('<div class="kineticist-reminder">');

  if (shouldRemindFinalGate && state.hasFinalGate) {
    sections.push(`<div class="kineticist-reminder__section">${game.i18n.localize(`${MODULE_ID}.chat.turnStart.finalGate`)}</div>`);
  }

  if (state.hasKineticPinnacle) {
    sections.push(`<div class="kineticist-reminder__section">${game.i18n.localize(`${MODULE_ID}.chat.turnStart.kineticPinnacle`)}</div>`);
  }

  sections.push(renderActionButtons(actor));
  sections.push('</div>');

  return sections.join('');
}

function renderActionButtons(actor: ActorLike): string {
  const actorUuid = escapeHtml(actor.uuid ?? '');
  const gates = getActorGates(actor);
  const blastButtons = gates.map(element => `<button type="button" class="kineticist-reminder__blast-button" data-${MODULE_ID}-action="elemental-blast" data-${MODULE_ID}-actor-uuid="${actorUuid}" data-${MODULE_ID}-element="${escapeHtml(element)}">${game.i18n.format(`${MODULE_ID}.chat.actions.elementalBlast`, { element })}</button>`);

  const sections = ['<div class="kineticist-reminder__actions">', `<button type="button" class="kineticist-reminder__button" data-${MODULE_ID}-action="channel-elements" data-${MODULE_ID}-actor-uuid="${actorUuid}"> ${game.i18n.localize(`${MODULE_ID}.chat.actions.channelElements`)}</button>`];

  if (blastButtons.length > 0) {
    sections.push('<div class="kineticist-reminder__blasts">');
    sections.push(...blastButtons);
    sections.push('</div>');
  }

  sections.push(`<p style="margin: 0.5rem 0 0; font-style: italic; font-size: 0.9em;">${game.i18n.localize(`${MODULE_ID}.chat.actions.stanceImpulse`)}</p>`);
  sections.push('</div>');

  return sections.join('');
}

function renderBlastOnlyButtons(actor: ActorLike): string {
  const actorUuid = escapeHtml(actor.uuid ?? '');
  const gates = getActorGates(actor);
  const blastButtons = gates.map(element => `<button type="button" class="kineticist-reminder__blast-button" data-${MODULE_ID}-action="elemental-blast" data-${MODULE_ID}-actor-uuid="${actorUuid}" data-${MODULE_ID}-element="${escapeHtml(element)}">${game.i18n.format(`${MODULE_ID}.chat.actions.elementalBlast`, { element })}</button>`);

  const sections = ['<div class="kineticist-reminder__actions">'];

  if (blastButtons.length > 0) {
    sections.push('<div class="kineticist-reminder__blasts">');
    sections.push(...blastButtons);
    sections.push('</div>');
  }

  sections.push(`<p style="margin: 0.5rem 0 0; font-style: italic; font-size: 0.9em;">${game.i18n.localize(`${MODULE_ID}.chat.actions.stanceImpulse`)}</p>`);
  sections.push('</div>');

  return sections.join('');
}

function hasKineticAura(actor: ActorLike): boolean {
  const items = Array.from(actor?.items?.values?.() ?? actor?.items ?? []) as any[];
  return items.some(
    item =>
      item?.type === 'effect' &&
      String(item.name ?? '')
        .toLowerCase()
        .includes('kinetic aura'),
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
