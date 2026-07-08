import type { ELEMENTS } from './constants';

export type KineticistElement = (typeof ELEMENTS)[number];
export type ActorLike = any;
export type ItemLike = any;

export interface KineticistHelperApi {
  version: string;
  syncActorAuras: (actor: ActorLike) => Promise<void>;
  syncAllAuras: () => Promise<void>;
  getActorGates: (actor: ActorLike) => KineticistElement[];
}
