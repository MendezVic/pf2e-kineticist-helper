import { MODULE_ID } from '@/constants';
import type { KineticistElement } from './types';

export const COSMETIC_AURA_PREFIX = 'Kineticist Element';
export const AURA_EFFECTS_PACK = `${MODULE_ID}.aura-effects`;

export const ELEMENTS = ['Air', 'Earth', 'Fire', 'Metal', 'Water', 'Wood'] as const;

export const GATE_PATTERNS: Record<KineticistElement, RegExp> = {
  Air: /(^|\b)air\s*gate(\b|$)|gate[:\s]*air/i,
  Earth: /(^|\b)earth\s*gate(\b|$)|gate[:\s]*earth/i,
  Fire: /(^|\b)fire\s*gate(\b|$)|gate[:\s]*fire/i,
  Metal: /(^|\b)metal\s*gate(\b|$)|gate[:\s]*metal/i,
  Water: /(^|\b)water\s*gate(\b|$)|gate[:\s]*water|(^|\b)ice\s*gate(\b|$)/i,
  Wood: /(^|\b)wood\s*gate(\b|$)|gate[:\s]*wood|(^|\b)plant\s*gate(\b|$)/i,
};
