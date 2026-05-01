import type { Person } from '../types';
import { batchesForGiftEvent } from './giftEventOptions';

/** True once this occasion already has a saved search batch — next run is reminder-driven. */
export function isIdeaSearchLockedForOccasion(person: Person, occasionKey: string | null): boolean {
  return batchesForGiftEvent(person, occasionKey).length > 0;
}
