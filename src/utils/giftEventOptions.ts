import type { GiftIdea, Occasion, Person } from "../types";
import type { SystemOccasion } from "../data/holidays";
import { matchPersonToHoliday } from "../data/holidays";

export type GiftEventRow = { key: string; occasion: Occasion };

/** Stable key for a saved personal occasion. */
export function personalGiftEventKey(occ: Occasion): string {
  return `p:${occ.id}`;
}

/** Stable key for a system holiday row for this person. */
export function systemGiftEventKey(personId: string, sys: SystemOccasion): string {
  return `s:${personId}:${sys.id}`;
}

export function systemOccasionToOccasion(sys: SystemOccasion, personId: string): Occasion {
  return {
    id: sys.id,
    personId,
    title: sys.title,
    type: sys.title,
    date: sys.date,
    month: sys.month,
    day: sys.day,
    daysRemaining: sys.daysRemaining,
    emoji: sys.emoji,
    isSystem: true,
  };
}

/** Personal + matched system holidays, soonest first. */
export function buildUpcomingGiftEventsForPerson(
  person: Person,
  personalOccasions: Occasion[],
  systemOccasions: SystemOccasion[]
): GiftEventRow[] {
  const rows: GiftEventRow[] = [];
  const personal = personalOccasions.filter(
    (o) => o.personId === person.id && o.daysRemaining >= 0
  );
  for (const o of personal) {
    rows.push({ key: personalGiftEventKey(o), occasion: o });
  }
  for (const sys of systemOccasions) {
    const matched = matchPersonToHoliday(sys.title, [person]);
    if (matched?.id === person.id) {
      rows.push({
        key: systemGiftEventKey(person.id, sys),
        occasion: systemOccasionToOccasion(sys, person.id),
      });
    }
  }
  rows.sort((a, b) => a.occasion.daysRemaining - b.occasion.daysRemaining);
  return rows;
}

/** Batches to use for anti-repeat + history UI for this event key. */
export function batchesForGiftEvent(
  person: Person | undefined,
  occasionKey: string | null
): NonNullable<Person["generationHistory"]> {
  const hist = person?.generationHistory ?? [];
  if (!occasionKey) return [];
  const keyed = hist.filter((b) => b.occasionKey === occasionKey);
  if (keyed.length) return keyed;
  if (hist.length > 0 && hist.every((b) => !b.occasionKey)) return hist;
  return [];
}

export function latestIdeasForGiftEvent(
  person: Person | undefined,
  occasionKey: string | null
): GiftIdea[] {
  const batches = batchesForGiftEvent(person, occasionKey);
  return batches[0]?.ideas ?? [];
}
