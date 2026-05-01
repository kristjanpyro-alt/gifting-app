import { Occasion } from "../types";

/**
 * Event types where multiple dated entries per person are expected.
 * All other types are treated as at most one per person (case-insensitive).
 */
export const MULTI_INSTANCE_EVENT_TYPES = new Set(["new baby", "promotion"]);

export function normalizeOccasionType(t: string): string {
  return t.trim().toLowerCase();
}

/** Whether this person can add another occasion of this type (singleton enforcement). */
export function isOccasionTypeAvailableForPerson(
  type: string,
  personId: string,
  occasions: Occasion[]
): boolean {
  if (!personId || personId === "general") return true;
  const n = normalizeOccasionType(type);
  if (!n) return false;
  if (MULTI_INSTANCE_EVENT_TYPES.has(n)) return true;
  return !occasions.some(
    (o) =>
      o.personId === personId && normalizeOccasionType(o.type) === n
  );
}

export function isPresetAvailableForPerson(
  presetType: string,
  personId: string,
  occasions: Occasion[]
): boolean {
  if (presetType === "Custom") return true;
  return isOccasionTypeAvailableForPerson(presetType, personId, occasions);
}
