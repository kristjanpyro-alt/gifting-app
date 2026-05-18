import type { Person } from '../types';

/** Always false — refresh is unlimited; anti-repeat diversity is handled by geminiService. */
export function isIdeaSearchLockedForOccasion(_person: Person, _occasionKey: string | null): boolean {
  return false;
}
