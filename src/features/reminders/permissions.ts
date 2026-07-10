import type { ActorLike } from './types';

export function currentUserCanOwnReminder(actor: ActorLike): boolean {
  return isCurrentReminderController(actor);
}

export function isResponsibleReminderUser(actor: ActorLike): boolean {
  return isCurrentReminderController(actor);
}

export function getPlayerOwnerIds(actor: ActorLike): string[] {
  return isCurrentReminderController(actor) && typeof game.user?.id === 'string' ? [game.user.id] : [];
}

function isCurrentReminderController(actor: ActorLike): boolean {
  if (!actor || !game.user?.active) return false;

  if (canvas.tokens?.controlled?.some((token: any) => token.actor?.uuid === actor.uuid)) return true;

  if (!game.modules.get('pf2e-hud')?.active) return false;

  const selection = game.settings.get('pf2e-hud', 'persistent.selection');
  if (selection === 'combat') return game.combat?.combatant?.actor?.uuid === actor.uuid;
  if (selection !== 'manual') return false;

  return game.settings.get('pf2e-hud', 'persistent.savedActor') === actor.uuid;
}
