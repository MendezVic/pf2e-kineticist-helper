import type { ActorLike } from './types';

export function currentUserCanOwnReminder(actor: ActorLike): boolean {
  return game.user?.isGM !== true && userCanOwnActor(game.user, actor);
}

export function isResponsibleReminderUser(actor: ActorLike): boolean {
  const candidates = getPlayerOwners(actor)
    .filter((user) => user?.active !== false)
    .sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
  const responsibleUser = candidates[0];

  if (responsibleUser) return responsibleUser.id === game.user?.id;
  return false;
}

export function getPlayerOwnerIds(actor: ActorLike): string[] {
  return getPlayerOwners(actor)
    .map((user) => user?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function userCanOwnActor(user: any, actor: ActorLike): boolean {
  if (!user) return false;
  if (user.id === game.user?.id && actor?.isOwner === true) return true;

  if (typeof actor?.testUserPermission === 'function') {
    try {
      return Boolean(actor.testUserPermission(user, 'OWNER'));
    } catch {
      return false;
    }
  }

  return Boolean(user.isGM);
}

function getUsers(): any[] {
  const users = game.users as any;
  return Array.from(users?.values?.() ?? users ?? []);
}

function getPlayerOwners(actor: ActorLike): any[] {
  return getUsers().filter((user) => user?.isGM !== true && userCanOwnActor(user, actor));
}
