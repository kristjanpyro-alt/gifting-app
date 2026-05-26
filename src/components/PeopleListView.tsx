import { useState } from 'react';
import { ChevronRight, Cake, Heart, Bell, Gift as GiftIcon, Lightbulb, User, Plus, Star, CalendarDays } from 'lucide-react';
import { Person, Occasion, IdeasOccasionFocus } from '../types';
import {
  upcomingSystemOccasions,
  SystemOccasion,
  matchPersonToHoliday,
  ideasFocusFromSystemOccasion,
} from '../data/holidays';

interface PeopleListViewProps {
  people: Person[];
  occasions: Occasion[];
  onPersonClick: (
    id: string,
    action?: 'profile' | 'ideas',
    focus?: IdeasOccasionFocus | null
  ) => void;
  onAddClick: (context?: { holidayTitle?: string }) => void;
}

const SHOW_LIMIT = 3;

/** Color per event type — personal events inherit the person's theme color */
function getEventColor(type: string, themeColor: string): string {
  const t = type.toLowerCase();
  if (t.includes('christmas'))   return '#16A34A';
  if (t.includes('new year'))    return '#6366F1';
  if (t.includes('valentine'))   return '#EF4444';
  if (t.includes('easter'))      return '#A855F7';
  if (t.includes('halloween'))   return '#EA580C';
  return themeColor;
}

function titleCaseWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** One clean headline for personal occasions — avoids repeating stored title + type. */
function personalEventHeadline(person: Person, occ: Occasion): string {
  const raw = person.name.trim().split(/\s+/)[0] || person.name;
  const first = titleCaseWord(raw);
  if ((occ.type || '').toLowerCase() === 'custom') {
    return occ.title?.trim() || 'Custom event';
  }
  return `${first}'s ${titleCaseWord(occ.type)}`;
}

function EventIcon({ type, color }: { type: string; color: string }) {
  const t = type.toLowerCase();
  const cls = "w-4 h-4";
  let icon = <Bell className={cls} strokeWidth={2} />;
  if (t.includes('birthday'))    icon = <Cake className={cls} strokeWidth={2} />;
  if (t.includes('anniversary')) icon = <Heart className={cls} strokeWidth={2} />;
  if (t.includes('christmas'))   icon = <Star className={cls} strokeWidth={2} />;
  if (t.includes('gift'))        icon = <GiftIcon className={cls} strokeWidth={2} />;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {icon}
    </div>
  );
}

/** Small calendar chip used in the "overflow" row */
function MiniChip({ occ, color }: { occ: Occasion; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl overflow-hidden border border-black/[0.06] shadow-sm min-w-[38px]">
      <div className="w-full py-0.5 text-center" style={{ backgroundColor: color }}>
        <p className="text-[7px] font-black uppercase tracking-wider text-white leading-none py-0.5">{occ.month}</p>
      </div>
      <div className="bg-white px-1.5 py-1 text-center">
        <p className="text-[13px] font-black text-charcoal leading-none">{occ.day}</p>
      </div>
    </div>
  );
}

export default function PeopleListView({ people, occasions, onPersonClick, onAddClick }: PeopleListViewProps) {
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [heroId, setHeroId] = useState<string | null>(null);

  const today = new Date();

  const sorted = [...occasions]
    .filter(o => o.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const sysOccasions: SystemOccasion[] = upcomingSystemOccasions(today, 62);

  // Split system holidays into matched (show big) and unmatched (show pill)
  const matchedHolidays = sysOccasions
    .map(occ => ({ occ, person: matchPersonToHoliday(occ.title, people) }))
    .filter((x): x is { occ: SystemOccasion; person: Person } => x.person !== undefined);

  const unmatchedHolidays = sysOccasions.filter(
    occ => !matchedHolidays.some(m => m.occ.id === occ.id)
  );

  // Merge personal events + matched holidays into one sorted list
  type BigRow =
    | { kind: 'personal'; occ: Occasion; person: Person; color: string }
    | { kind: 'holiday'; occ: SystemOccasion; person: Person };

  const bigRows: BigRow[] = [
    ...sorted.flatMap(occ => {
      const person = people.find(p => p.id === occ.personId);
      if (!person) return [];
      return [{ kind: 'personal' as const, occ, person, color: getEventColor(occ.type, person.themeColor || '#C42040') }];
    }),
    ...matchedHolidays.map(({ occ, person }) => ({ kind: 'holiday' as const, occ, person })),
  ].sort((a, b) => a.occ.daysRemaining - b.occ.daysRemaining);

  // Hero: whichever was last tapped, else the first item
  const effectiveHeroId = heroId ?? bigRows[0]?.occ.id ?? null;
  const heroRow = bigRows.find(r => r.occ.id === effectiveHeroId) ?? bigRows[0] ?? null;
  const restRows = bigRows.filter(r => r.occ.id !== heroRow?.occ.id);

  const visibleRest = showAllEvents ? restRows : restRows.slice(0, SHOW_LIMIT - 1);
  const overflow = restRows.slice(SHOW_LIMIT - 1);
  const hasOverflow = !showAllEvents && restRows.length > SHOW_LIMIT - 1;

  return (
    <div className="pt-6 px-5 max-w-lg mx-auto pb-32 animate-in fade-in duration-500 relative">
      <header className="mb-5 px-1">
        <h1 className="text-[24px] font-bold tracking-tight text-charcoal">People</h1>
        <p className="text-[13px] text-charcoal/60 mt-1 font-medium">
          Your inner circle
        </p>
      </header>

      {/* Upcoming Events Section */}
      {(bigRows.length > 0 || unmatchedHolidays.length > 0) && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-charcoal/65">Upcoming</h3>
          </div>

          <div className="glass-card rounded-[28px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.78)' }}>
            {/* ── Hero card (soonest / selected event) ── */}
            {heroRow && (() => {
              const isPersonal = heroRow.kind === 'personal';
              const person = heroRow.person;
              const occ = heroRow.occ;
              const color = isPersonal
                ? (heroRow as any).color
                : (occ as any).dotColor || '#C42040';
              const themeColor = person.themeColor || '#C42040';
              const title = isPersonal
                ? personalEventHeadline(person, occ as any)
                : (occ as any).title;
              const subtitle = isPersonal
                ? person.relation
                : (occ as any).desc || (occ as any).badge?.label || '';
              const typeLabel = isPersonal
                ? (occ as any).type
                : (occ as any).badge?.label || 'Holiday';
              const daysText = occ.daysRemaining === 0 ? 'Today!'
                : occ.daysRemaining === 1 ? 'Tomorrow'
                : `${occ.daysRemaining} days left`;
              const [, m, d] = occ.date.split('-').map(Number);
              const dateLabel = new Date(new Date().getFullYear(), m - 1, d)
                .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const handleClick = () => isPersonal
                ? onPersonClick(person.id, 'ideas')
                : onPersonClick(person.id, 'ideas', ideasFocusFromSystemOccasion(occ as any, person.id));
              return (
                <button
                  type="button"
                  onClick={handleClick}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-50/60 active:bg-stone-100/60 transition-colors cursor-pointer text-left"
                >
                  {/* Emoji circle */}
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[26px] flex-shrink-0 ring-2 ring-white shadow-md"
                    style={{ background: `linear-gradient(135deg, ${themeColor}30 0%, ${themeColor}90 100%)` }}
                  >
                    {person.emoji || person.initials[0]}
                  </div>
                  {/* Body */}
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-[17px] text-charcoal leading-snug tracking-tight">{title}</p>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{typeLabel}</span>
                    {subtitle ? <p className="text-[12px] text-charcoal/45 mt-0.5 leading-snug">{subtitle}</p> : null}
                  </div>
                  {/* Date */}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                      <span className="text-[13px] font-bold text-charcoal">{dateLabel}</span>
                    </div>
                    <span className="text-[11px] font-bold" style={{ color }}>{daysText}</span>
                  </div>
                </button>
              );
            })()}

            {/* ── Compact rows for the rest ── */}
            {visibleRest.map((row, idx) => {
              const isPersonal = row.kind === 'personal';
              const { person, occ } = row;
              const color = isPersonal
                ? (row as any).color
                : (occ as any).dotColor || '#C42040';
              const title = isPersonal
                ? personalEventHeadline(person, occ as any)
                : (occ as any).title;
              const handleClick = () => {
                setHeroId(occ.id);
              };
              return (
                <div key={occ.id}>
                  <div className="mx-5 h-px bg-gradient-to-r from-transparent via-stone-200/80 to-transparent" />
                  <button
                    type="button"
                    onClick={handleClick}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50/90 active:bg-stone-100/80 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex flex-col items-center rounded-2xl overflow-hidden ring-1 ring-black/[0.05] shadow-[0_3px_12px_rgba(0,0,0,0.07)] flex-shrink-0 min-w-[42px]">
                      <div className="w-full py-0.5 text-center" style={{ backgroundColor: color }}>
                        <p className="text-[7px] font-bold uppercase tracking-widest text-white/95 leading-none py-0.5">{occ.month}</p>
                      </div>
                      <div className="bg-white px-2 py-1.5 text-center w-full">
                        <p className="text-[15px] font-black text-charcoal leading-none tabular-nums">{occ.day}</p>
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-[14px] text-charcoal leading-snug tracking-tight">{title}</p>
                      <p className="text-[11px] font-medium mt-0.5 text-charcoal/40 tabular-nums">
                        {occ.daysRemaining === 0 ? 'Today' : occ.daysRemaining === 1 ? 'Tomorrow' : `${occ.daysRemaining} days away`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-charcoal/20 flex-shrink-0" strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}

            {/* Overflow row — mini chips + View all */}
            {hasOverflow && (
              <>
                <div className="mx-5 h-px bg-gradient-to-r from-transparent via-stone-200/80 to-transparent" />
                <div className="px-5 py-3.5 flex items-center gap-2.5 bg-stone-50/30">
                  {overflow.slice(0, 3).map(row => {
                    const occ = row.occ;
                    const color = row.kind === 'personal'
                      ? getEventColor(occ.type, row.person.themeColor || '#C42040')
                      : (row as { kind: 'holiday'; occ: SystemOccasion; person: Person }).occ.dotColor;
                    return <MiniChip key={occ.id} occ={occ as Occasion} color={color} />;
                  })}
                  {overflow.length > 3 && (
                    <span className="text-[11px] font-bold text-charcoal/40 ml-0.5">
                      +{overflow.length - 3} more
                    </span>
                  )}
                  <button
                    onClick={() => setShowAllEvents(true)}
                    className="ml-auto flex items-center gap-1 text-[11px] font-bold text-charcoal/50 hover:text-charcoal transition-colors cursor-pointer"
                  >
                    View all
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Collapse button when expanded */}
            {showAllEvents && restRows.length > SHOW_LIMIT - 1 && (
              <>
                <div className="mx-5 h-px bg-gradient-to-r from-transparent via-stone-200/80 to-transparent" />
                <button
                  onClick={() => setShowAllEvents(false)}
                  className="w-full px-4 py-3 text-[11px] font-bold text-charcoal/40 hover:text-charcoal transition-colors text-center cursor-pointer"
                >
                  Show less
                </button>
              </>
            )}
          </div>

          {/* Unmatched system holidays — compact pill rows */}
          {unmatchedHolidays.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {unmatchedHolidays.map((occ: SystemOccasion) => (
                <div
                  key={occ.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
                >
                  <span className="text-[22px] leading-none flex-shrink-0">{occ.emoji}</span>
                  <div className="flex-grow min-w-0">
                    <span className="text-[13px] font-semibold text-charcoal leading-tight block truncate">{occ.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddClick({ holidayTitle: occ.title });
                    }}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-charcoal text-white text-[10px] font-bold hover:bg-charcoal/90 active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                  >
                    <Plus className="w-3 h-3" strokeWidth={2.5} />
                    Add
                  </button>
                  <span className="text-[11px] font-semibold text-charcoal/38 flex-shrink-0 tabular-nums min-w-[2rem] text-right">
                    {occ.daysRemaining === 0
                      ? 'Today'
                      : occ.daysRemaining === 1
                      ? '1d'
                      : `${occ.daysRemaining}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Circle Section */}
      <section>
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-charcoal/30" />
          </div>
          <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-charcoal/50">The Inner Circle</h3>
        </div>
        
        <div className="flex flex-col gap-4">
          {people.map(person => {
            const color = person.themeColor || '#C42040';
            return (
              <div
                key={person.id}
                className="bg-white rounded-[36px] overflow-hidden"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)" }}
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-5 px-6 pt-6 pb-5 cursor-pointer active:bg-stone-50/60 transition-colors"
                  onClick={() => onPersonClick(person.id, 'profile')}
                >
                  {/* Avatar */}
                  <div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[34px] flex-shrink-0 border-[3.5px] border-white"
                    style={{
                      background: `linear-gradient(140deg, ${color}28 0%, ${color}90 100%)`,
                      boxShadow: `0 8px 24px ${color}35, 0 2px 8px ${color}20`,
                    }}
                  >
                    {person.emoji || person.initials[0]}
                  </div>

                  {/* Name + relation */}
                  <div className="flex-grow min-w-0">
                    <h4 className="text-[28px] font-black text-charcoal leading-none tracking-tight">
                      {person.name}
                    </h4>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-charcoal/38 mt-2">
                      {person.relation}
                    </p>
                  </div>

                  {/* Chevron */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border border-stone-100"
                    style={{ background: `${color}12` }}
                  >
                    <ChevronRight className="w-4 h-4" style={{ color }} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-stone-100" />

                {/* Action tiles */}
                <div className="flex gap-2.5 px-4 pb-4 pt-3">
                  {/* Ideas */}
                  <button
                    type="button"
                    onClick={() => onPersonClick(person.id, 'ideas')}
                    className="flex-1 rounded-[20px] p-4 flex flex-col gap-2.5 text-left active:scale-[0.97] transition-transform"
                    style={{ background: `linear-gradient(150deg, ${color}0C 0%, ${color}1C 100%)` }}
                  >
                    <div
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
                      style={{ boxShadow: `0 3px 10px ${color}20` }}
                    >
                      <Lightbulb className="w-[18px] h-[18px]" style={{ color }} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-charcoal leading-tight">Ideas</p>
                      <p className="text-[11px] text-charcoal/40 leading-snug mt-0.5">Find &amp; review gifts</p>
                    </div>
                    <ChevronRight className="w-4 h-4 self-end" style={{ color, opacity: 0.6 }} strokeWidth={2.5} />
                  </button>

                  {/* Profile */}
                  <button
                    type="button"
                    onClick={() => onPersonClick(person.id, 'profile')}
                    className="flex-1 rounded-[20px] p-4 flex flex-col gap-2.5 text-left active:scale-[0.97] transition-transform bg-[#EEE9FF]"
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(139,92,246,0.12)]">
                      <User className="w-[18px] h-[18px] text-violet-400" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-charcoal leading-tight">Profile</p>
                      <p className="text-[11px] text-charcoal/40 leading-snug mt-0.5">Details &amp; prefs</p>
                    </div>
                    <ChevronRight className="w-4 h-4 self-end text-violet-300" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {people.length === 0 && (
          <div className="flex flex-col items-center text-center pt-6 pb-12">
            {/* Illustration */}
            <div className="relative mb-8">
              {/* Glow */}
              <div className="absolute inset-0 rounded-full blur-3xl opacity-30 scale-150 pointer-events-none" style={{ background: "radial-gradient(circle, #C42040 0%, transparent 70%)" }} />
              {/* Box */}
              <div className="relative w-40 h-36 flex items-end justify-center">
                {/* Box body */}
                <div
                  className="w-32 h-24 rounded-[20px] flex items-center justify-center relative"
                  style={{ background: "linear-gradient(160deg, #D43A58 0%, #C42040 100%)", boxShadow: "0 12px 40px rgba(196,32,64,0.35)" }}
                >
                  {/* Box lid */}
                  <div
                    className="absolute -top-5 left-0 right-0 h-10 rounded-[14px]"
                    style={{ background: "linear-gradient(160deg, #F2C8C8 0%, #D9A0A0 100%)" }}
                  />
                  {/* Ribbon vertical */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 bg-white/25 rounded-full" />
                  {/* Ribbon horizontal on lid */}
                  <div className="absolute -top-5 left-0 right-0 h-10 flex items-center justify-center">
                    <div className="w-full h-5 bg-white/25 rounded-full" />
                  </div>
                  {/* G letter */}
                  <span className="relative z-10 text-white/40 font-black text-3xl mt-4 select-none">G</span>
                </div>
                {/* Floating heart */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl animate-bounce" style={{ animationDuration: "2.4s" }}>
                  💝
                </div>
                {/* Sparkles */}
                <span className="absolute top-2 right-4 text-[10px] text-dusty-rose/60 font-black select-none">✦</span>
                <span className="absolute top-6 left-5 text-[8px] text-dusty-rose/40 font-black select-none">✦</span>
              </div>
            </div>

            <h3 className="text-[22px] font-bold text-charcoal tracking-tight mb-2 leading-snug">
              Your inner circle<br />is waiting
            </h3>
            <p className="text-[13px] text-charcoal/40 leading-relaxed max-w-[240px] mb-8">
              Add the people who matter most and we'll help you find the perfect gifts.
            </p>

            <button
              onClick={() => onAddClick()}
              className="flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-[12px] uppercase tracking-[0.18em] text-white transition-all active:scale-95"
              style={{
                background: "linear-gradient(145deg, #D43A58 0%, #C42040 48%, #A81838 100%)",
                boxShadow: "0 8px 24px rgba(196,32,64,0.40), 0 2px 8px rgba(196,32,64,0.22)",
              }}
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add someone special
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
