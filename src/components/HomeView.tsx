import { useState, useRef, useEffect, type RefObject } from 'react';
import { motion } from 'motion/react';
import {
  ChevronRight, ChevronLeft, CalendarDays,
  Gift, Heart, GraduationCap, Cake, Home as HomeIcon, Baby, Ghost,
} from 'lucide-react';
import Mascot from './Mascot';
import { Occasion, Person, IdeasOccasionFocus } from '../types';
import {
  buildSystemOccasions,
  matchPersonToHoliday,
  ideasFocusFromSystemOccasion,
  presetOccasionKeyForHolidayTitle,
} from '../data/holidays';
import { isPresetAvailableForPerson } from '../utils/occasionRules';

function playWobble(el: HTMLElement | null) {
  if (!el) return;
  el.animate(
    [
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: 'translateX(-3px) rotate(-0.8deg)' },
      { transform: 'translateX(3px) rotate(0.8deg)' },
      { transform: 'translateX(-2px) rotate(-0.45deg)' },
      { transform: 'translateX(0) rotate(0deg)' },
    ],
    { duration: 720, easing: 'cubic-bezier(0.33, 0.72, 0.44, 1)' }
  );
}

function useWobbleOnTick(tick: number, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (tick <= 0) return;
    playWobble(ref.current);
  }, [tick, ref]);
}

interface HomeViewProps {
  onPersonClick: (
    id: string,
    action?: 'profile' | 'ideas',
    focus?: IdeasOccasionFocus | null
  ) => void;
  /** When a system holiday has no matched contact — open Add Person with presets */
  onAddFromHoliday: (holidayTitle: string) => void;
  occasions: Occasion[];
  people: Person[];
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function getEventDotColor(type: string, isSystem: boolean, themeColor?: string): string {
  if (isSystem) return '#F59E0B';
  const t = (type || '').toLowerCase();
  if (t.includes('birthday'))    return '#8B5CF6';
  if (t.includes('anniversary')) return '#C42040';
  return themeColor || '#60A5FA';
}

const DAYS_LABEL = ['S','M','T','W','T','F','S'];

const LEGEND = [
  { label: 'Event',    color: '#C42040' },
  { label: 'Birthday', color: '#8B5CF6' },
  { label: 'Holiday',  color: '#F59E0B' },
  { label: 'Other',    color: '#60A5FA' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Header mascot pose. Priority: active season window > late-night > default idle.
 * Seasonal windows:
 *   xmas: Dec 1–26
 *   ny:   Dec 27–Jan 2
 *   vday: Feb 7–14
 */
function headerMascotPose(today: Date): import('./Mascot').MascotPose {
  const m = today.getMonth(); // 0–11
  const d = today.getDate();
  const h = today.getHours();
  if (m === 11 && d >= 1 && d <= 26) return 'seasonal-xmas';
  if ((m === 11 && d >= 27) || (m === 0 && d <= 2)) return 'seasonal-ny';
  if (m === 1 && d >= 7 && d <= 14) return 'seasonal-vday';
  if (h >= 23 || h < 5) return 'sleep';
  return 'idle';
}

function buildMerged(occasions: Occasion[], year: number, today: Date) {
  const sys = buildSystemOccasions(year, today);
  const result = [...occasions] as any[];
  sys.forEach(s => {
    const [, sm, sd] = s.date.split('-').map(Number);
    const exists = occasions.some(u => {
      const [, um, ud] = u.date.split('-').map(Number);
      return um === sm && ud === sd && u.type.toLowerCase() === s.title.toLowerCase();
    });
    if (!exists) result.push(s);
  });
  return result;
}

function buildCalendarCells(year: number, monthIdx: number) {
  const daysInMonth  = new Date(year, monthIdx + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIdx, 1).getDay();
  const prevDays     = new Date(year, monthIdx, 0).getDate();
  const cells: { day: number; current: boolean; mIdx: number }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, current: false, mIdx: monthIdx - 1 });
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ day: i, current: true, mIdx: monthIdx });
  const trailing = 42 - cells.length;
  for (let i = 1; i <= trailing; i++)
    cells.push({ day: i, current: false, mIdx: monthIdx + 1 });
  return cells;
}

function contextIconFor(type: string, isSystem: boolean) {
  const t = (type || '').toLowerCase();
  if (isSystem) return Gift;
  if (t === 'birthday')     return Cake;
  if (t === 'anniversary')  return Heart;
  if (t === 'wedding')      return Heart;
  if (t === 'engagement')   return Heart;
  if (t === 'graduation')   return GraduationCap;
  if (t === 'new baby')     return Baby;
  if (t === 'housewarming') return HomeIcon;
  if (t === 'halloween')    return Ghost;
  return Gift;
}

function personalBadgeColor(type: string, themeColor: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'birthday')     return '#8B5CF6';
  if (t === 'anniversary')  return '#C42040';
  if (t === 'wedding')      return '#E06B8A';
  if (t === 'engagement')   return '#7C3AED';
  if (t === 'graduation')   return '#3B82F6';
  if (t === 'new baby')     return '#22C55E';
  if (t === 'housewarming') return '#D97706';
  if (t === 'halloween')    return '#EA580C';
  return themeColor || '#60A5FA';
}

// ── Spotlight card (soonest event) ────────────────────────────────────────────
function SpotlightCard({ occ, person, year, onClick, wobbleTick = 0 }: {
  occ: any; person?: Person; year: number; onClick?: () => void;
  /** Increment to replay wobble when tap is rejected */
  wobbleTick?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useWobbleOnTick(wobbleTick, rootRef);

  const themeColor = person?.themeColor || '#C42040';
  const badge      = occ.badge as { label: string; text: string } | undefined;

  // Personal events have no system badge — derive one from the occasion type
  const effectiveBadge: { label: string; text: string } = badge ?? {
    label: occ.type || 'Event',
    text:  personalBadgeColor(occ.type, themeColor),
  };

  const [, m, d] = occ.date.split('-').map(Number);
  const dateLabel = new Date(year, m - 1, d)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const daysAbs = Math.abs(occ.daysRemaining);
  const daysText =
    occ.daysRemaining === 0 ? 'Today!'
    : occ.daysRemaining < 0 ? `${daysAbs} day${daysAbs !== 1 ? 's' : ''} ago`
    : `${occ.daysRemaining} day${occ.daysRemaining !== 1 ? 's' : ''} left`;
  const daysColor =
    occ.daysRemaining === 0 ? '#8B5CF6'
    : occ.daysRemaining < 0 ? '#EF4444'
    : '#C42040';

  const subtitle = person
    ? person.relation
    : (occ.desc || occ.type);

  const isPast = occ.daysRemaining < 0;

  const CtxIcon = contextIconFor(occ.type, occ.isSystem === true);
  const ctxColor = effectiveBadge.text;

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      className={`glass-card relative rounded-[22px] py-2.5 px-3.5 transition-all mx-auto w-[92%] overflow-hidden ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${isPast ? 'opacity-65' : ''}`}
    >
      {isPast && (
        <div className="absolute top-2 right-3 bg-black/[0.08] rounded-full px-2 py-0.5 pointer-events-none">
          <span className="text-[9px] font-black uppercase tracking-widest text-charcoal/45">Passed</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        {/* Circular emoji tile */}
        <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-[22px] flex-shrink-0 bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)]">
          {person?.emoji || occ.emoji || '🎁'}
        </div>

        {/* Body */}
        <div className="flex-grow min-w-0">
          <p className="text-[14.5px] font-bold text-charcoal tracking-tight leading-tight truncate">
            {person ? person.name : occ.title}
          </p>
          <span
            className="text-[9.5px] font-black uppercase tracking-widest"
            style={{ color: effectiveBadge.text }}
          >
            {effectiveBadge.label}
          </span>
          <p className="text-[11.5px] text-charcoal/55 leading-tight mt-0.5 truncate">
            {dateLabel} <span className="text-charcoal/30">•</span>{' '}
            <span style={{ color: daysColor }} className="font-semibold">{daysText}</span>
          </p>
        </div>

        {/* Right-side context icon — tappable hint */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/70"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <CtxIcon className="w-4 h-4" strokeWidth={1.8} style={{ color: ctxColor }} />
        </div>
      </div>
    </div>
  );
}

// ── Mini chip for horizontal scroll strip ─────────────────────────────────────
function MiniDateChip({ occ, person, year, onClick, wobbleTick = 0 }: {
  occ: any; person?: Person; year: number; onClick?: () => void;
  wobbleTick?: number;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useWobbleOnTick(wobbleTick, btnRef);

  const themeColor = person?.themeColor || '#C42040';
  const isSystem   = occ.isSystem === true;
  const calColor   = occ.dotColor || getEventDotColor(occ.type, isSystem, themeColor);
  const emoji      = person?.emoji || occ.emoji || '🎁';
  const isPast     = occ.daysRemaining < 0;

  const [, m, d] = occ.date.split('-').map(Number);
  const monthLabel = new Date(year, m - 1, d)
    .toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  const title = (person ? `${person.name.split(' ')[0]}'s ${occ.type}` : occ.title) || occ.title;

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 flex-shrink-0 transition-all ${isPast ? 'opacity-50' : ''} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : 'cursor-default'}`}
    >
      {/* Calendar tile with floating emoji badge */}
      <div className="relative w-[62px]">
        <div className="rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.09)] border border-black/[0.06]">
          {/* Month header */}
          <div
            className="w-full py-1 text-center"
            style={{ backgroundColor: isPast ? '#B0B0B0' : calColor }}
          >
            <p className="text-[8px] font-black tracking-widest text-white leading-none">{monthLabel}</p>
          </div>
          {/* Day */}
          <div className={`py-2 text-center ${isPast ? 'bg-gray-50' : 'bg-white'}`}>
            <p className={`text-[22px] font-black leading-none ${isPast ? 'text-charcoal/40' : 'text-charcoal'}`}>{d}</p>
          </div>
        </div>

        {/* Past: diagonal slash across the whole tile (outside overflow-hidden) */}
        {isPast && (
          <div className="absolute inset-0 rounded-[14px] pointer-events-none overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>
          </div>
        )}

        {/* Emoji badge — floats outside top-right, with white pill background */}
        <div
          className="absolute -top-3 -right-3 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[15px] leading-none select-none"
          style={{
            background: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.16), 0 0 0 1.5px rgba(0,0,0,0.04)',
          }}
        >
          {emoji}
        </div>
      </div>

      {/* Event name — 2-line max */}
      <span className={`text-[10px] font-semibold leading-tight text-center w-[66px] line-clamp-2 ${isPast ? 'text-charcoal/35 line-through decoration-charcoal/20' : 'text-charcoal/60'}`}>
        {title}
      </span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomeView({
  onPersonClick,
  onAddFromHoliday,
  occasions,
  people,
  currentDate,
  onPrevMonth,
  onNextMonth,
}: HomeViewProps) {
  const [showAll, setShowAll] = useState(false);
  const [wobble, setWobble] = useState<{ id: string; tick: number } | null>(null);

  function rejectTap(occId: string) {
    setWobble((prev) =>
      prev?.id === occId
        ? { id: occId, tick: prev.tick + 1 }
        : { id: occId, tick: 1 }
    );
  }

  function wobbleTickFor(occId: string) {
    return wobble?.id === occId ? wobble.tick : 0;
  }

  function activateOccasion(occ: any) {
    if (occ.daysRemaining < 0) {
      rejectTap(occ.id);
      return;
    }

    if (occ.personId && occ.isSystem !== true) {
      onPersonClick(occ.personId);
      return;
    }

    if (occ.isSystem === true) {
      const matched = matchPersonToHoliday(occ.title, people);
      if (matched) {
        const presetKey = presetOccasionKeyForHolidayTitle(occ.title);
        if (presetKey && !isPresetAvailableForPerson(presetKey, matched.id, occasions)) {
          rejectTap(occ.id);
          return;
        }
        onPersonClick(matched.id, 'ideas', ideasFocusFromSystemOccasion(occ, matched.id));
      } else {
        onAddFromHoliday(occ.title);
      }
    }
  }

  const today    = new Date();
  const monthIdx = currentDate.getMonth();
  const year     = currentDate.getFullYear();

  const merged     = buildMerged(occasions, year, today);
  const mergedNext = buildMerged(occasions, year + 1, today);
  const cells      = buildCalendarCells(year, monthIdx);

  // Future events first, then today, then past events (most recent past last)
  const thisMonth = merged
    .filter((o: any) => { const [, mo] = o.date.split('-').map(Number); return mo - 1 === monthIdx; })
    .sort((a: any, b: any) => {
      if (a.daysRemaining >= 0 && b.daysRemaining < 0) return -1;
      if (a.daysRemaining < 0 && b.daysRemaining >= 0) return 1;
      if (a.daysRemaining >= 0) return a.daysRemaining - b.daysRemaining;
      return b.daysRemaining - a.daysRemaining;
    });

  const nextMonthIdx  = (monthIdx + 1) % 12;
  const nextYear      = monthIdx === 11 ? year + 1 : year;
  const nextMonthSrc  = monthIdx === 11 ? mergedNext : merged;
  const nextMonth     = nextMonthSrc
    .filter((o: any) => { const [, mo] = o.date.split('-').map(Number); return mo - 1 === nextMonthIdx; })
    .sort((a: any, b: any) => {
      const [,,ad] = a.date.split('-').map(Number);
      const [,,bd] = b.date.split('-').map(Number);
      return ad - bd;
    })
    .slice(0, 6);

  const month2Idx  = (monthIdx + 2) % 12;
  const month2Year = monthIdx >= 10 ? year + 1 : year;
  const month2Src  = monthIdx >= 10 ? mergedNext : merged;
  const month2     = month2Src
    .filter((o: any) => { const [, mo] = o.date.split('-').map(Number); return mo - 1 === month2Idx; })
    .sort((a: any, b: any) => {
      const [,,ad] = a.date.split('-').map(Number);
      const [,,bd] = b.date.split('-').map(Number);
      return ad - bd;
    })
    .slice(0, 6);

  // Split this month into linked (personal + matched system) vs unlinked system
  const linkedThisMonth   = thisMonth.filter((o: any) => !o.isSystem || !!matchPersonToHoliday(o.title, people));
  const unlinkedThisMonth = thisMonth.filter((o: any) =>  o.isSystem && !matchPersonToHoliday(o.title, people));

  // Spotlight: first future linked event, fallback to most-recent past linked
  const futureLinked = linkedThisMonth.filter((o: any) => o.daysRemaining >= 0);
  const pastLinked   = linkedThisMonth.filter((o: any) => o.daysRemaining < 0);

  const spotlight  = futureLinked[0] ?? pastLinked[0] ?? null;
  const restEvents = spotlight
    ? linkedThisMonth.filter((o: any) => o.id !== spotlight.id)
    : [];

  const laterStrip = [
    ...nextMonth.map((o: any) => ({ occ: o, yr: nextYear })),
    ...month2.map((o: any) => ({ occ: o, yr: month2Year })),
  ];

  const linkedLaterStrip   = laterStrip.filter(({ occ }) => !occ.isSystem || !!matchPersonToHoliday(occ.title, people));
  const unlinkedLaterStrip = laterStrip.filter(({ occ }) =>  occ.isSystem && !matchPersonToHoliday(occ.title, people));

  const laterStripVisible         = showAll ? linkedLaterStrip   : linkedLaterStrip.slice(0, 6);
  const unlinkedLaterStripVisible = showAll ? unlinkedLaterStrip : unlinkedLaterStrip.slice(0, 4);

  function devResetOnboarding() {
    if (!confirm('Reset onboarding + wipe local data?')) return;
    localStorage.clear();
    location.reload();
  }

  return (
    <div className="pt-6 px-5 max-w-lg mx-auto pb-32 animate-in fade-in duration-500 relative">

      {/* DEV: reset onboarding */}
      {import.meta.env.DEV && (
        <button
          onClick={devResetOnboarding}
          className="fixed top-3 left-3 z-[90] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/70 text-white/90 hover:bg-black active:scale-95 transition"
        >
          ↻ Onboarding
        </button>
      )}

      {/* ── Greeting ── */}
      <header className="mb-5 px-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-charcoal">
            {greeting()}
          </h1>
          <p className="text-[13px] text-charcoal/60 mt-1 font-medium">
            Here's what's coming up
          </p>
        </div>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: [0, -3, 0] }}
          transition={{
            scale: { type: 'spring', stiffness: 280, damping: 20, delay: 0.1 },
            opacity: { duration: 0.4, delay: 0.1 },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="flex-shrink-0 -mt-1"
          style={{ filter: 'drop-shadow(0 6px 14px rgba(152,88,176,0.18))' }}
          aria-hidden
        >
          <Mascot pose={headerMascotPose(currentDate)} size={64} />
        </motion.div>
      </header>

      {/* ── Calendar ── */}
      <section
        className="glass-card rounded-[28px] mb-5 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.82)' }}
      >
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={onPrevMonth}
            className="w-8 h-8 rounded-full hover:bg-surface-dim flex items-center justify-center transition-colors cursor-pointer active:scale-90">
            <ChevronLeft className="w-4 h-4 text-charcoal/40" strokeWidth={2.5} />
          </button>
          <h2 className="text-[15px] font-bold text-charcoal">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={onNextMonth}
            className="w-8 h-8 rounded-full hover:bg-surface-dim flex items-center justify-center transition-colors cursor-pointer active:scale-90">
            <ChevronRight className="w-4 h-4 text-charcoal/40" strokeWidth={2.5} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 px-3 pb-1">
          {DAYS_LABEL.map((d, i) => (
            <div key={i} className="h-6 flex items-center justify-center text-[11px] font-bold text-charcoal/25">{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 px-3 pb-3">
          {cells.map((c, idx) => {
            const isToday = c.current
              && c.day === today.getDate()
              && monthIdx === today.getMonth()
              && year === today.getFullYear();

            const topEvent = c.current ? merged.find((o: any) => {
              const [, om, od] = o.date.split('-').map(Number);
              return od === c.day && (om - 1) === monthIdx;
            }) : null;

            const dotColor = topEvent
              ? (topEvent.dotColor || getEventDotColor(
                  topEvent.type,
                  topEvent.isSystem === true,
                  people.find((p: Person) => p.id === topEvent.personId)?.themeColor,
                ))
              : null;

            return (
              <div key={idx} className="h-10 flex items-center justify-center relative">
                {isToday && (
                  <div className="absolute w-8 h-8 rounded-full bg-[#8B5CF6]/25 shadow-[0_0_14px_rgba(139,92,246,0.50)]" />
                )}
                <span
                  className="relative z-10 text-[13px] select-none"
                  style={{
                    color: !c.current ? 'rgba(28,28,30,0.18)' : 'rgba(28,28,30,0.82)',
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {c.day}
                </span>
                {dotColor && (
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 px-4 py-3 border-t border-white/40">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-[10px] font-semibold text-charcoal/40">{l.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Upcoming header ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
          <p className="text-[15px] font-bold text-charcoal">
            Upcoming{' '}
            <span className="text-charcoal/40 font-semibold">
              ({(spotlight ? 1 : 0) + restEvents.length + linkedLaterStrip.length})
            </span>
          </p>
        </div>
        {((spotlight ? 1 : 0) + restEvents.length + linkedLaterStrip.length) > 3 && (
          <button
            onClick={() => setShowAll(p => !p)}
            className="flex items-center gap-1 text-[12px] font-semibold text-[#8B5CF6] cursor-pointer hover:opacity-70 transition-opacity"
          >
            {showAll ? 'Show less' : 'See all'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Same-month occasions — repeated full-width cards (same layout as the hero row) */}
      {spotlight ? (
        <div className="space-y-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SpotlightCard
              occ={spotlight}
              person={people.find(p => p.id === spotlight.personId)}
              year={year}
              wobbleTick={wobbleTickFor(spotlight.id)}
              onClick={() => activateOccasion(spotlight)}
            />
          </motion.div>
          {restEvents.map((occ: any, i: number) => (
            <motion.div
              key={occ.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.06 * (i + 1) }}
            >
              <SpotlightCard
                occ={occ}
                person={people.find(p => p.id === occ.personId)}
                year={year}
                wobbleTick={wobbleTickFor(occ.id)}
                onClick={() => activateOccasion(occ)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card relative rounded-[24px] py-3 px-4 mx-auto w-[92%] mb-4">
          <div className="flex items-center gap-4">
            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0 bg-white/60">
              <CalendarDays className="w-5 h-5 text-charcoal/40" strokeWidth={1.5} />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-[15px] font-bold text-charcoal tracking-tight leading-tight">All clear</p>
              <p className="text-[12px] text-on-surface-variant mt-0.5">No events this month — enjoy the breather</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Next months (linked events) ── */}
      {laterStripVisible.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/50 mb-2.5 px-1">
            Coming later
          </p>
          <div className="glass-card rounded-[24px] overflow-hidden">
            <div className="flex items-center gap-7 px-5 pt-7 pb-4 overflow-x-auto no-scrollbar">
              {laterStripVisible.map(({ occ, yr }) => {
                const person = people.find(p => p.id === occ.personId);
                return (
                  <MiniDateChip
                    key={occ.id}
                    occ={occ}
                    person={person}
                    year={yr}
                    wobbleTick={wobbleTickFor(occ.id)}
                    onClick={() => activateOccasion(occ)}
                  />
                );
              })}
              {linkedLaterStrip.length > 6 && (
                <button
                  onClick={() => setShowAll(p => !p)}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer hover:bg-outline-variant/20"
                  aria-label={showAll ? 'Show less' : 'View all later events'}
                >
                  <ChevronRight
                    className={`w-4 h-4 text-charcoal/50 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
                    strokeWidth={2.5}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── No profile — unlinked system holidays ── */}
      {(unlinkedThisMonth.length > 0 || unlinkedLaterStripVisible.length > 0) && (
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/35 mb-2.5 px-1">
            No profile linked
          </p>
          <div className="space-y-2.5">
            {[...unlinkedThisMonth, ...unlinkedLaterStripVisible.map(({ occ }) => occ)].map((occ: any) => (
              <SpotlightCard
                key={occ.id}
                occ={occ}
                person={undefined}
                year={year}
                wobbleTick={wobbleTickFor(occ.id)}
                onClick={() => activateOccasion(occ)}
              />
            ))}
          </div>
        </div>
      )}

      {linkedThisMonth.length === 0 && linkedLaterStrip.length === 0 && unlinkedThisMonth.length === 0 && unlinkedLaterStripVisible.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="py-12 flex flex-col items-center text-center"
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 10px 22px rgba(152,88,176,0.18))' }}
          >
            <Mascot pose="sleep" size={140} />
          </motion.div>
          <p className="mt-3 text-[13px] font-semibold text-charcoal/55">Nothing brewing right now.</p>
          <p className="mt-1 text-[12px] text-charcoal/40">Add someone to start watching dates.</p>
        </motion.div>
      )}
    </div>
  );
}
