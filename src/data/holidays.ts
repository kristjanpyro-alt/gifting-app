import { PRESET_OCCASIONS, RELATIONS } from "../constants";
import type { IdeasOccasionFocus, Person } from "../types";

export interface SystemHoliday {
  title: string;
  date: string; // "MM-DD"
  emoji: string;
  badge: { label: string; bg: string; text: string };
  dotColor: string;
  desc: string;
  helperText: string;
}

export const SYSTEM_HOLIDAYS: SystemHoliday[] = [
  { title: "New Year's Day",  date: "01-01", emoji: "🎊", badge: { label: "Holiday",  bg: "#F3F4F6", text: "#6B7280" }, dotColor: "#F59E0B", desc: "Ring in the new year",           helperText: "A fresh start — great time to plan ahead" },
  { title: "Valentine's Day", date: "02-14", emoji: "💝", badge: { label: "Romantic", bg: "#FFF0F0", text: "#E57373" }, dotColor: "#F472B6", desc: "A day to celebrate love",         helperText: "Perfect excuse to gift someone special" },
  { title: "Women's Day",     date: "03-08", emoji: "💐", badge: { label: "Cultural", bg: "#EFF6FF", text: "#60A5FA" }, dotColor: "#60A5FA", desc: "Celebrating women everywhere",    helperText: "Honour the women in your life" },
  { title: "Easter",          date: "04-05", emoji: "🐣", badge: { label: "Holiday",  bg: "#FCF3FF", text: "#A855F7" }, dotColor: "#F59E0B", desc: "A joyful spring celebration",     helperText: "Spread some Easter cheer" },
  { title: "Mother's Day",    date: "05-10", emoji: "👩", badge: { label: "Family",   bg: "#FFF7ED", text: "#F97316" }, dotColor: "#FB923C", desc: "Honouring moms everywhere",       helperText: "Plan something thoughtful for her" },
  { title: "Father's Day",    date: "06-21", emoji: "👨", badge: { label: "Family",   bg: "#FFF7ED", text: "#F97316" }, dotColor: "#FB923C", desc: "Honouring dads everywhere",       helperText: "Plan something thoughtful for him" },
  { title: "Halloween",       date: "10-31", emoji: "🎃", badge: { label: "Seasonal", bg: "#FFF7ED", text: "#EA580C" }, dotColor: "#EA580C", desc: "Tricks, treats & spooky fun",     helperText: "Get the costumes and candy ready" },
  { title: "Men's Day",       date: "11-19", emoji: "🕺", badge: { label: "Cultural", bg: "#EFF6FF", text: "#60A5FA" }, dotColor: "#60A5FA", desc: "Celebrating men everywhere",      helperText: "Honour the men in your life" },
  { title: "Christmas",       date: "12-25", emoji: "🎄", badge: { label: "Holiday",  bg: "#F0FDF4", text: "#16A34A" }, dotColor: "#F59E0B", desc: "The most wonderful time of year", helperText: "Start your gift list early" },
];

export interface SystemOccasion {
  id: string;
  title: string;
  type: string;
  date: string;
  month: string;
  day: number;
  daysRemaining: number;
  emoji: string;
  isSystem: true;
  badge: SystemHoliday['badge'];
  dotColor: string;
  desc: string;
  helperText: string;
}

export function buildSystemOccasions(year: number, today: Date): SystemOccasion[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  return SYSTEM_HOLIDAYS.map(h => {
    const [m, d] = h.date.split('-').map(Number);
    const dateStr = `${year}-${pad(m)}-${pad(d)}`;
    const ms = new Date(year, m - 1, d).getTime() - today.getTime();
    return {
      id: `sys-${h.title}-${year}`,
      title: h.title,
      type: 'Holiday',
      date: dateStr,
      month: new Date(year, m - 1, d).toLocaleString('default', { month: 'short' }),
      day: d,
      daysRemaining: Math.ceil(ms / 86_400_000),
      emoji: h.emoji,
      isSystem: true as const,
      badge: h.badge,
      dotColor: h.dotColor,
      desc: h.desc,
      helperText: h.helperText,
    };
  });
}

/** Focus payload when opening Ideas from a system holiday row (calendar month view uses same shape). */
export function ideasFocusFromSystemOccasion(
  occ: SystemOccasion,
  personId: string
): IdeasOccasionFocus {
  return {
    personId,
    title: occ.title,
    type: occ.title,
    date: occ.date,
    month: occ.month,
    day: occ.day,
    daysRemaining: occ.daysRemaining,
    emoji: occ.emoji,
  };
}

/** PRESET_OCCASIONS key for this system holiday title, if any (exact title match). */
export function presetOccasionKeyForHolidayTitle(title: string): string | null {
  const keys = Object.keys(PRESET_OCCASIONS);
  return keys.includes(title) ? title : null;
}

/** Match a system holiday title to someone in the circle (same rules as People tab). */
export function matchPersonToHoliday(title: string, people: Person[]): Person | undefined {
  const t = title.toLowerCase();
  if (t.includes("mother")) return people.find((p) => /mom|mother|mum/i.test(p.relation));
  if (t.includes("father")) return people.find((p) => /dad|father|papa/i.test(p.relation));
  if (t.includes("valentine"))
    return people.find((p) => /partner|spouse|girlfriend|boyfriend|wife|husband/i.test(p.relation));
  if (t.includes("women"))
    return people.find((p) => /sister|wife|girlfriend|mom|mother|mum|daughter/i.test(p.relation));
  if (t.includes("men's"))
    return people.find((p) => /brother|husband|boyfriend|dad|father|son/i.test(p.relation));
  return undefined;
}

/** Returns system occasions within the next `days` days (default 62 ≈ 2 months) */
/** When adding someone from a holiday row, pick a relation that exists in the add-person dropdown. */
export function suggestedRelationForHolidayTitle(title: string): string | null {
  const t = title.toLowerCase();
  const pick = (r: string) => (RELATIONS.includes(r) ? r : null);

  if (t.includes("mother")) return pick("Mother");
  if (t.includes("father")) return pick("Father");
  if (t.includes("valentine")) return pick("Partner / Spouse");
  if (t.includes("women")) return pick("Family member");
  if (t.includes("men")) return pick("Family member");
  if (t.includes("christmas") || t.includes("easter") || t.includes("halloween") || t.includes("new year"))
    return pick("Family member");
  return null;
}

export function upcomingSystemOccasions(today: Date, days = 62): SystemOccasion[] {
  const year = today.getFullYear();
  const all = [
    ...buildSystemOccasions(year, today),
    ...buildSystemOccasions(year + 1, today),
  ];
  return all
    .filter(o => o.daysRemaining >= 0 && o.daysRemaining <= days)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
