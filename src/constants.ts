import { Person, Occasion, GiftIdea } from './types';

// ---------------------------------------------------------------------------
// Legacy mock arrays (unused — kept to avoid breaking any future imports)
// ---------------------------------------------------------------------------
export const MOCK_PEOPLE: Person[] = [];
export const MOCK_OCCASIONS: Occasion[] = [];
export const MOCK_GIFT_IDEAS: GiftIdea[] = [];
export const CURATED_SUGGESTIONS: GiftIdea[] = [];

// ---------------------------------------------------------------------------
// Shared lookup data
// ---------------------------------------------------------------------------
export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const RELATIONS = [
  'Mother',
  'Father',
  'Partner',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Grandparent',
  'Best Friend',
  'Friend',
  'Family member',
  'Colleague',
  'Mentor',
];

export const BUDGET_OPTIONS = [
  'Under €25',
  '€25-50',
  '€50-100',
  '€100-200',
  '€200+',
];

export const PRESET_COLORS = [
  '#C42040', '#7BA8A4', '#8D9ED1', '#D1B98D', '#8DD193',
  '#B18DD1', '#D18DBC', '#F29F05', '#444444', '#E63946', '#1D3557',
];

export const PRESET_EMOJIS = [
  '💖', '🎁', '⭐', '🌿', '🎈', '🍀', '🧁', '🎨',
  '💩', '🐱', '🍷', '✈️', '📚', '⚡', '🎮',
];

/** Fixed-date holiday occasions available when adding a person. */
export const PRESET_OCCASIONS: Record<string, { date: string; emoji: string }> = {
  Christmas:        { date: '12-25', emoji: '🎄' },
  "Valentine's Day": { date: '02-14', emoji: '💝' },
  "Mother's Day":   { date: '05-10', emoji: '👩' },
  "Father's Day":   { date: '06-21', emoji: '👨' },
  "Women's Day":    { date: '03-08', emoji: '💐' },
  "Men's Day":      { date: '11-19', emoji: '🕺' },
  Easter:           { date: '04-05', emoji: '🐣' },
  Halloween:        { date: '10-31', emoji: '🎃' },
};

export const MILESTONE_TYPES = [
  'Wedding',
  'Engagement',
  'Graduation',
  'New Baby',
  'Housewarming',
  'Custom',
] as const;

export const MILESTONE_EMOJIS: Record<string, string> = {
  Wedding:     '👰',
  Engagement:  '💎',
  Graduation:  '🎓',
  'New Baby':  '👶',
  Housewarming:'🏡',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the number of days until the next occurrence of an annual date.
 * The year component of `dateStr` is ignored — only month and day matter.
 */
export function calculateDaysRemaining(dateStr: string): number {
  if (!dateStr) return 0;
  const today = new Date();
  const [, month, day] = dateStr.split('-').map(Number);
  const next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Checks whether a relation string represents a romantic partner. */
export function isPartnerRelation(relation: string): boolean {
  const lower = relation.toLowerCase();
  return lower.includes('partner') || lower.includes('spouse');
}
