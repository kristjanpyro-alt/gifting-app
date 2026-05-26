import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Sparkles, Heart, Bell, Gift, Lightbulb, ListChecks } from 'lucide-react';
import WheelDatePicker from './WheelDatePicker';
import CustomSelect from './CustomSelect';
import Mascot from './Mascot';
import {
  Person, Occasion, UserProfile, UserIntent, GiftVibe, BudgetBand,
} from '../types';
import { deriveArchetype } from '../utils/archetype';
import { sampleGiftsFor } from '../utils/sampleGifts';
import { RELATIONS } from '../constants';

interface OnboardingV2ViewProps {
  onComplete: (
    person: Person,
    occasions: Occasion[],
    userCity: string,
    timings: number[],
    profile: UserProfile,
  ) => void;
  onSkip: () => void;
}

const PURPLE = '#8B5CF6';
const TOTAL_SCREENS = 10;

function isPartnerRel(rel: string): boolean {
  const r = rel.toLowerCase();
  return r.includes('partner') || r.includes('spouse');
}

const GIFT_PREF_OPTIONS = [
  { value: 'Physical gifts', label: 'Things',     emoji: '🎁' },
  { value: 'Experiences',    label: 'Experiences', emoji: '🎟️' },
  { value: 'Either',         label: 'Both',        emoji: '✨' },
] as const;

const REMINDER_OPTIONS = [
  { days: 7,  label: '1 week ahead',  sub: 'Sweet spot for most people' },
  { days: 14, label: '2 weeks ahead', sub: 'I like to think it through' },
  { days: 30, label: '1 month ahead', sub: 'I plan way in advance' },
];

// Catalog tile colors — used on sample gift cards as illustrated "product" backgrounds.
const GIFT_TILE_BG = [
  { from: '#E9D5FF', to: '#C4B5FD' }, // lavender
  { from: '#FECDD3', to: '#FDA4AF' }, // rose
  { from: '#FED7AA', to: '#FDBA74' }, // peach
];

// ── Floating clouds (decorative parallax layer) ─────────────────────────────
function FloatingClouds() {
  // Each cloud: starting position, scale, drift speed, drift distance.
  // Drift uses motion's repeat + repeatType: 'reverse' for natural back-and-forth.
  const clouds = [
    { top: '6%',  left: '-12%', scale: 1.0,  duration: 38, drift: 110, opacity: 0.55, blur: 12 },
    { top: '18%', left: '55%',  scale: 0.75, duration: 52, drift: -80, opacity: 0.42, blur: 14 },
    { top: '34%', left: '-8%',  scale: 0.6,  duration: 46, drift: 95,  opacity: 0.38, blur: 10 },
    { top: '62%', left: '60%',  scale: 0.9,  duration: 60, drift: -120,opacity: 0.32, blur: 16 },
    { top: '78%', left: '-15%', scale: 0.55, duration: 50, drift: 130, opacity: 0.30, blur: 12 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {clouds.map((c, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0 }}
          animate={{
            x: [0, c.drift, 0],
            y: [0, c.drift > 0 ? -6 : 6, 0],
          }}
          transition={{
            duration: c.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.2,
          }}
          style={{
            position: 'absolute',
            top: c.top,
            left: c.left,
            transform: `scale(${c.scale})`,
            opacity: c.opacity,
            filter: `blur(${c.blur}px)`,
          }}
        >
          <Cloud />
        </motion.div>
      ))}
    </div>
  );
}

function Cloud() {
  return (
    <svg width="180" height="90" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="55" rx="42" ry="28" fill="white" />
      <ellipse cx="95" cy="42" rx="38" ry="32" fill="white" />
      <ellipse cx="135" cy="55" rx="36" ry="26" fill="white" />
      <ellipse cx="78" cy="62" rx="28" ry="20" fill="white" />
      <ellipse cx="118" cy="64" rx="24" ry="18" fill="white" />
    </svg>
  );
}

// ── Tiny haptic helper ──────────────────────────────────────────────────────
function tapHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(8); } catch {}
  }
}

// ── Reusable CTA ────────────────────────────────────────────────────────────
function PrimaryCTA({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => { if (!disabled) { tapHaptic(); onClick(); } }}
      disabled={disabled}
      className="w-full py-4 rounded-2xl font-bold text-[15px] transition-all"
      style={
        disabled
          ? {
              background: 'rgba(255,255,255,0.4)',
              color: 'rgba(28,28,30,0.30)',
              border: '1px solid rgba(28,28,30,0.08)',
              boxShadow: 'none',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            }
          : {
              background: 'linear-gradient(145deg, #C490D1 0%, #B070C0 50%, #9858B0 100%)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(152,88,176,0.40), inset 0 1.5px 0 rgba(255,255,255,0.35)',
              border: 'none',
            }
      }
    >
      {children}
    </motion.button>
  );
}

// ── Reusable Chip ───────────────────────────────────────────────────────────
function Chip({
  label, selected, onClick, fullWidth,
}: { label: string; selected: boolean; onClick: () => void; fullWidth?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={() => { tapHaptic(); onClick(); }}
      className={`py-2.5 px-4 rounded-full font-semibold transition-all text-[12.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/40 ${fullWidth ? 'w-full' : ''}`}
      style={{
        background: selected ? PURPLE : 'rgba(255,255,255,0.62)',
        color: selected ? '#fff' : 'rgba(28,28,30,0.75)',
        border: selected ? `1.5px solid ${PURPLE}` : '1px solid rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        boxShadow: selected
          ? '0 6px 18px rgba(139,92,246,0.32)'
          : '0 2px 8px rgba(139,92,168,0.08)',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      {label}
    </motion.button>
  );
}

// ── Progress pip with layoutId morph ───────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  // Segmented bar — each step = a pill. Done/active = purple, future = gray.
  return (
    <div className="flex items-center gap-1">
      {[...Array(total)].map((_, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <motion.div
            key={i}
            initial={false}
            animate={{
              background: done || active ? PURPLE : 'rgba(28,28,30,0.14)',
              opacity: active ? 1 : done ? 0.9 : 1,
            }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="h-[3px] w-4 rounded-full"
          />
        );
      })}
    </div>
  );
}

// ── Static Shell (sky bg, progress, back). Never remounts. ──────────────────
function Shell({
  children, step, total, onBack, showProgress = true, clouds = false,
}: {
  children: React.ReactNode;
  step: number;
  total: number;
  onBack?: () => void;
  showProgress?: boolean;
  clouds?: boolean;
}) {
  return (
    <div
      className="min-h-screen w-full font-body text-charcoal antialiased selection:bg-[#8B5CF6]/20 relative overflow-hidden"
      style={{
        backgroundImage: "url('/gifting-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#F8D8C8',
      }}
    >
      {clouds && <FloatingClouds />}
      <div className="max-w-md mx-auto min-h-screen flex flex-col px-5 pt-12 pb-8 relative z-10">
        {showProgress && (
          <div className="flex items-center justify-between mb-8">
            {onBack ? (
              <button
                onClick={() => { tapHaptic(); onBack(); }}
                className="flex items-center gap-1 text-[12px] font-bold text-charcoal/55 hover:text-charcoal transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> back
              </button>
            ) : <span className="w-12" />}
            <ProgressBar step={step} total={total} />
            <span className="text-[10px] text-charcoal/45 font-bold uppercase tracking-widest">
              {step + 1}/{total}
            </span>
          </div>
        )}
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Static option lists ─────────────────────────────────────────────────────
const PAIN_OPTIONS: { id: UserIntent; label: string; emoji: string }[] = [
  { id: 'forgetful',       label: 'I forget important dates',  emoji: '⏳' },
  { id: 'never-know',      label: 'I never know what to buy',  emoji: '🤷' },
  { id: 'feel-generic',    label: 'My gifts feel generic',     emoji: '🪄' },
  { id: 'last-minute',     label: 'I always leave it last minute', emoji: '⚡' },
  { id: 'more-thoughtful', label: 'I want to be more thoughtful', emoji: '🌿' },
];

const CIRCLE_OPTIONS: { id: string; emoji: string }[] = [
  { id: 'Partner',      emoji: '💑' },
  { id: 'Parents',      emoji: '👨‍👩‍👦' },
  { id: 'Grandparents', emoji: '🧓' },
  { id: 'Siblings',     emoji: '👫' },
  { id: 'Kids',         emoji: '👶' },
  { id: 'Friends',      emoji: '🫂' },
  { id: 'Coworkers',    emoji: '💼' },
  { id: 'In-laws',      emoji: '💍' },
];

const VIBE_OPTIONS: { id: GiftVibe; label: string; emoji: string }[] = [
  { id: 'practical',      label: 'Practical',     emoji: '🎯' },
  { id: 'sentimental',    label: 'Sentimental',   emoji: '💗' },
  { id: 'experiential',   label: 'Experiential',  emoji: '🎟️' },
  { id: 'surprising',     label: 'Surprising',    emoji: '🎆' },
  { id: 'luxury',         label: 'Luxury',        emoji: '💎' },
  { id: 'handmade-feel',  label: 'Handmade-feel', emoji: '🌿' },
];

const BUDGET_OPTIONS: { id: BudgetBand; label: string }[] = [
  { id: 'under-25',   label: 'Under $25' },
  { id: '25-50',      label: '$25–50' },
  { id: '50-100',     label: '$50–100' },
  { id: '100-plus',   label: '$100+' },
  { id: 'depends',    label: 'Depends on the person' },
];

// Default emoji per relation type (used on Person basics avatar).
function emojiForRelation(rel: string): string {
  const r = rel.toLowerCase();
  if (r.includes('partner') || r.includes('spouse')) return '💑';
  if (r.includes('mother')) return '👩';
  if (r.includes('father')) return '👨';
  if (r.includes('brother')) return '🧑';
  if (r.includes('sister')) return '👧';
  if (r.includes('son')) return '👦';
  if (r.includes('daughter')) return '👧';
  if (r.includes('grand')) return '🧓';
  if (r.includes('best')) return '⭐';
  if (r.includes('friend')) return '🫂';
  if (r.includes('family')) return '👨‍👩‍👦';
  if (r.includes('colleague')) return '💼';
  if (r.includes('mentor')) return '🧑‍🏫';
  return '💗';
}

const COLOR_SWATCHES = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
const EMOJI_PRESETS  = ['💗', '🎁', '⭐', '🌿', '🎈', '🧁', '🍷', '📚'];

// ── Staggered item wrapper ──────────────────────────────────────────────────
function StaggerItem({
  i, dir, children,
}: { i: number; dir: 1 | -1; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: dir * 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + i * 0.04, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function OnboardingV2View({ onComplete, onSkip }: OnboardingV2ViewProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1); // 1 = forward, -1 = back

  // Profile
  const [intent, setIntent] = useState<UserIntent | null>(null);
  const [relationCircle, setRelationCircle] = useState<string[]>([]);
  const [vibes, setVibes] = useState<GiftVibe[]>([]);
  const [budgetBand, setBudgetBand] = useState<BudgetBand | null>(null);

  // First person
  const [personName, setPersonName] = useState('');
  const [personRelation, setPersonRelation] = useState('Mother');
  const [personBirthday, setPersonBirthday] = useState('');
  const [personInterest, setPersonInterest] = useState('');

  // Anniversary (only relevant for Partner/Spouse, auto-enabled)
  const [anniversaryEnabled, setAnniversaryEnabled] = useState(true);
  const [anniversaryDate, setAnniversaryDate] = useState('');

  // Person details (screen 5)
  const [giftPreference, setGiftPreference] = useState<'Physical gifts' | 'Experiences' | 'Either'>('Either');
  const [avoidList, setAvoidList] = useState('');
  const [reminderDays, setReminderDays] = useState<number>(7);
  const [personCity, setPersonCity] = useState('');

  // Personalization (screen 4)
  const [personColor, setPersonColor] = useState<string>(PURPLE);
  const [personEmoji, setPersonEmoji] = useState<string>('');  // empty = use relation default

  // When relation switches away from partner, drop anniversary
  useEffect(() => {
    if (!isPartnerRel(personRelation)) {
      setAnniversaryEnabled(false);
      setAnniversaryDate('');
    } else {
      setAnniversaryEnabled(true);
    }
  }, [personRelation]);

  // Reveal
  const [revealPhase, setRevealPhase] = useState<'loading' | 'card'>('loading');
  const [loadingLine, setLoadingLine] = useState(0);
  const revealStartedRef = useRef(false);

  const LOADING_LINES = useMemo(() => [
    'Reading your gifting style…',
    `Finding ideas for ${personName || 'them'}…`,
    'Building your reminder timeline…',
    'Reducing last-minute stress…',
  ], [personName]);

  useEffect(() => {
    if (step !== 7) { revealStartedRef.current = false; return; }
    if (revealStartedRef.current) return;
    revealStartedRef.current = true;
    setRevealPhase('loading');
    setLoadingLine(0);
    const interval = setInterval(() => {
      setLoadingLine(prev => (prev >= LOADING_LINES.length - 1 ? prev : prev + 1));
    }, 450);
    const flipTimer = setTimeout(() => setRevealPhase('card'), 1900);
    return () => { clearInterval(interval); clearTimeout(flipTimer); };
  }, [step, LOADING_LINES]);

  const profile: UserProfile = useMemo(() => ({
    intent, relationCircle, vibes, budgetBand, subscriptionStatus: 'none',
  }), [intent, relationCircle, vibes, budgetBand]);

  const archetype = useMemo(() => deriveArchetype(profile), [profile]);

  const next = () => { tapHaptic(); setDir(1);  setStep(s => Math.min(s + 1, TOTAL_SCREENS - 1)); };
  const back = () => { tapHaptic(); setDir(-1); setStep(s => Math.max(s - 1, 0)); };

  function toggleArray<T>(arr: T[], item: T, max?: number): T[] {
    if (arr.includes(item)) return arr.filter(x => x !== item);
    if (max && arr.length >= max) return arr;
    return [...arr, item];
  }

  function finish() {
    const personId = 'p-' + Date.now();

    // Synthesize giftingFear from intent so Gemini's fear block fires meaningfully.
    const INTENT_TO_FEAR: Record<string, string> = {
      'forgetful':       'forgetting the occasion',
      'never-know':      'picking something they won\'t use',
      'feel-generic':    'giving something generic',
      'last-minute':     'running out of time',
      'more-thoughtful': 'the gift not feeling thoughtful enough',
    };

    const newPerson: Person = {
      id: personId,
      name: personName,
      initials: personName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      relation: personRelation,
      interests: personInterest
        ? personInterest.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
        : [],
      notes: personInterest || '',
      budget: budgetBand === 'under-25'  ? 'Under $25'
            : budgetBand === '25-50'     ? '$25-50'
            : budgetBand === '50-100'    ? '$50-100'
            : budgetBand === '100-plus'  ? '$100-200'
            : '$25-50',
      style: vibes.join(', ') || 'Flexible',
      avatarUrl: '',
      lastNoteUpdate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      savedGifts: [],
      themeColor: personColor,
      emoji: personEmoji || emojiForRelation(personRelation),
      location: personCity || undefined,
      birthday: personBirthday || undefined,
      anniversaryDate: (isPartnerRel(personRelation) && anniversaryEnabled && anniversaryDate) ? anniversaryDate : undefined,
      preferences: giftPreference,
      fallenFlatKeywords: avoidList
        ? avoidList.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
        : undefined,
      giftingFear: intent ? INTENT_TO_FEAR[intent] : undefined,
    };

    const occasions: Occasion[] = [];
    const now = new Date();
    const buildOccasion = (type: string, date: string, emoji: string): Occasion => {
      const [, m, d] = date.split('-').map(Number);
      let nextDate = new Date(now.getFullYear(), m - 1, d);
      if (nextDate < now) nextDate = new Date(now.getFullYear() + 1, m - 1, d);
      const daysRemaining = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: `o-onboard-${type}-${Date.now()}`,
        personId,
        title: `${personName}'s ${type}`,
        type,
        date,
        month: nextDate.toLocaleString('default', { month: 'short' }),
        day: d,
        daysRemaining,
        emoji,
      };
    };
    if (personBirthday) occasions.push(buildOccasion('Birthday', personBirthday, '🎂'));
    if (isPartnerRel(personRelation) && anniversaryEnabled && anniversaryDate) {
      occasions.push(buildOccasion('Anniversary', anniversaryDate, '💍'));
    }

    const finalProfile: UserProfile = {
      ...profile,
      archetype: archetype.label,
      trialStartedAt: new Date().toISOString(),
      subscriptionStatus: 'trial',
    };

    // notificationTimings: send 5 ideas at user-chosen lead, plus extra 7-day reminder
    const timings = reminderDays === 7 ? [7] : [reminderDays, 7];

    onComplete(newPerson, occasions, '', timings, finalProfile);
  }

  // ── Render content per step (no Shell wrap) ──────────────────────────────
  function renderContent() {
    switch (step) {
      case 0:
        return (
          <div className="flex-1 flex flex-col items-center text-center px-4 pt-2 pb-8">
            {/* Wordmark */}
            <motion.img
              src="/giftin-wordmark.png"
              alt="Giftin"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="h-7 mb-2 mt-2 object-contain"
              draggable={false}
            />

            {/* Mascot hero — gentle hover bob */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
              transition={{
                scale:   { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                y:       { duration: 4.2, ease: 'easeInOut', repeat: Infinity, delay: 0.4 },
              }}
              className="mb-4"
            >
              <Mascot pose="idle" size={200} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="text-[30px] font-bold tracking-tight text-charcoal leading-[1.1] mb-3"
            >
              Be the person<br />who always remembers.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.55 }}
              className="text-[14px] text-charcoal/60 leading-relaxed max-w-[280px] mb-6"
            >
              Gift ideas that actually feel personal.
            </motion.p>

            {/* Promise stat list */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.55 }}
              className="w-full max-w-xs space-y-2.5 mb-8"
            >
              {[
                { Icon: Bell,        text: 'Never miss an important date' },
                { Icon: Lightbulb,   text: 'AI ideas tuned to your people' },
                { Icon: Heart,       text: 'Be the thoughtful one, always' },
              ].map(({ Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 text-left">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.18)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: PURPLE }} strokeWidth={2.4} />
                  </div>
                  <span className="text-[14px] text-charcoal/85 font-semibold">{text}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.55 }}
              className="w-full max-w-xs space-y-2"
            >
              <PrimaryCTA onClick={next}>Let's make gifting easier</PrimaryCTA>
              <button
                onClick={onSkip}
                className="w-full py-2 text-[11px] font-bold text-charcoal/35 uppercase tracking-widest hover:text-charcoal/55 transition-colors"
              >
                Skip onboarding
              </button>
            </motion.div>
          </div>
        );

      case 1:
        return (
          <>
            <h2 className="text-[26px] font-bold tracking-tight text-charcoal leading-tight mb-2">
              What makes gifting hard for you?
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6">Pick the one that hits hardest.</p>

            <div className="space-y-3 mb-8 flex-grow">
              {PAIN_OPTIONS.map((opt, i) => {
                const selected = intent === opt.id;
                return (
                  <StaggerItem key={opt.id} i={i} dir={dir}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { tapHaptic(); setIntent(opt.id); }}
                      className="w-full flex items-center gap-4 p-4 rounded-[22px] text-left transition-all border"
                      style={{
                        background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.62)',
                        borderColor: selected ? PURPLE : 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(20px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                        boxShadow: selected
                          ? '0 6px 20px rgba(139,92,246,0.20)'
                          : '0 2px 10px rgba(139,92,168,0.08)',
                      }}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className={`text-[14px] font-semibold flex-grow ${selected ? 'text-[#6D28D9]' : 'text-charcoal/80'}`}>
                        {opt.label}
                      </span>
                      {selected && <Check className="w-4 h-4" style={{ color: PURPLE }} strokeWidth={3} />}
                    </motion.button>
                  </StaggerItem>
                );
              })}
            </div>

            <PrimaryCTA onClick={next} disabled={!intent}>Continue</PrimaryCTA>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-[26px] font-bold tracking-tight text-charcoal leading-tight mb-2 text-center">
              Who do you gift for?
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6 text-center">Tap everyone that comes to mind.</p>

            {/* Orb stays centered — counter floats absolute, doesn't shift orb */}
            <div className="relative h-24 mb-5 flex items-center justify-center">
              <motion.div
                animate={{ scale: 1 + Math.min(relationCircle.length, 8) * 0.035 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="w-[68px] h-[68px] rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #C490D1, #9858B0)',
                  boxShadow: `0 ${8 + relationCircle.length * 1.5}px ${22 + relationCircle.length * 3}px rgba(152,88,176,${0.35 + relationCircle.length * 0.035})`,
                }}
              >
                <Heart className="w-7 h-7 text-white" strokeWidth={1.8} fill="white" />
              </motion.div>
              <AnimatePresence>
                {relationCircle.length > 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-1/2 translate-x-12 text-[11px] font-bold text-charcoal/65 whitespace-nowrap"
                  >
                    {relationCircle.length} {relationCircle.length === 1 ? 'person' : 'people'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Grid 2×4: emoji + label + check */}
            <div className="grid grid-cols-2 gap-2 mb-8 flex-grow content-start">
              {CIRCLE_OPTIONS.map((opt, i) => {
                const selected = relationCircle.includes(opt.id);
                return (
                  <StaggerItem key={opt.id} i={i} dir={dir}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { tapHaptic(); setRelationCircle(toggleArray(relationCircle, opt.id)); }}
                      className="w-full flex items-center gap-2.5 py-3 px-3.5 rounded-[18px] text-left transition-all focus:outline-none"
                      style={{
                        background: selected ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.62)',
                        border: selected ? `1.5px solid ${PURPLE}` : '1px solid rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(20px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                        boxShadow: selected
                          ? '0 6px 18px rgba(139,92,246,0.22)'
                          : '0 2px 8px rgba(139,92,168,0.08)',
                        WebkitTapHighlightColor: 'transparent',
                        outline: 'none',
                      }}
                    >
                      <span className="text-[20px] leading-none flex-shrink-0">{opt.emoji}</span>
                      <span className={`text-[13px] font-semibold flex-grow ${selected ? 'text-[#6D28D9]' : 'text-charcoal/80'}`}>
                        {opt.id}
                      </span>
                      {selected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: PURPLE }}
                        >
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                        </motion.div>
                      )}
                    </motion.button>
                  </StaggerItem>
                );
              })}
            </div>

            <PrimaryCTA onClick={next} disabled={relationCircle.length === 0}>Continue</PrimaryCTA>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-[26px] font-bold tracking-tight text-charcoal leading-tight mb-2">
              Your gifting style
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6">
              Pick a few that feel like you (up to 3), then your comfort range.
            </p>

            <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-3">Vibes</p>
            <div className="flex flex-wrap gap-2 mb-7">
              {VIBE_OPTIONS.map((v, i) => (
                <StaggerItem key={v.id} i={i} dir={dir}>
                  <Chip
                    label={`${v.emoji} ${v.label}`}
                    selected={vibes.includes(v.id)}
                    onClick={() => setVibes(toggleArray(vibes, v.id, 3))}
                  />
                </StaggerItem>
              ))}
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-3">
              What feels comfortable per gift?
            </p>
            <div className="flex flex-col gap-2 mb-8 flex-grow">
              {BUDGET_OPTIONS.map((b, i) => {
                const selected = budgetBand === b.id;
                return (
                  <StaggerItem key={b.id} i={i + VIBE_OPTIONS.length} dir={dir}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { tapHaptic(); setBudgetBand(b.id); }}
                      className="w-full py-3.5 px-4 rounded-[18px] text-left text-[14px] font-semibold transition-all"
                      style={{
                        background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.62)',
                        border: selected ? `1.5px solid ${PURPLE}` : '1px solid rgba(255,255,255,0.7)',
                        color: selected ? '#6D28D9' : 'rgba(28,28,30,0.78)',
                        backdropFilter: 'blur(20px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                        boxShadow: selected ? '0 6px 20px rgba(139,92,246,0.18)' : 'none',
                      }}
                    >
                      {b.label}
                    </motion.button>
                  </StaggerItem>
                );
              })}
            </div>

            <PrimaryCTA onClick={next} disabled={vibes.length === 0 || !budgetBand}>Continue</PrimaryCTA>
          </>
        );

      case 4:
        // ── Person basics ──────────────────────────────────────────
        return (
          <>
            <h2 className="text-[26px] font-bold tracking-tight text-charcoal leading-tight mb-2 text-center">
              Who's first on your list?
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6 text-center">
              Just one for now. You can add more later.
            </p>

            {/* Avatar bubble — relation emoji default, color-tinted */}
            <div className="flex flex-col items-center mb-5">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[34px]"
                style={{
                  background: `${personColor}20`,
                  border: `2px solid ${personColor}40`,
                  boxShadow: `0 6px 20px ${personColor}28`,
                }}
              >
                {personEmoji || emojiForRelation(personRelation)}
              </motion.div>
              {personName && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[12px] font-bold text-charcoal/65 mt-2"
                >
                  {personName}
                </motion.p>
              )}
            </div>

            <div className="space-y-4 flex-grow">
              <StaggerItem i={0} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">Name</p>
                <input
                  value={personName}
                  onChange={e => setPersonName(e.target.value)}
                  placeholder="Anna, Mom, James…"
                  className="w-full p-4 rounded-[18px] text-[15px] font-medium focus:outline-none border"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    borderColor: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  }}
                />
              </StaggerItem>

              <StaggerItem i={1} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">Relationship</p>
                <CustomSelect
                  value={personRelation}
                  onChange={setPersonRelation}
                  options={RELATIONS.map(r => ({ value: r, label: r }))}
                  triggerClassName="w-full p-4 rounded-[18px] text-[15px] font-medium text-charcoal flex items-center justify-between gap-2 cursor-pointer border bg-white/72 backdrop-blur-xl border-white/70 hover:bg-white/85 active:scale-[0.99] transition-all"
                />
              </StaggerItem>

              <StaggerItem i={2} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">Birthday</p>
                <div
                  className="rounded-[18px] overflow-hidden border"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    borderColor: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  }}
                >
                  <WheelDatePicker
                    label=""
                    value={personBirthday}
                    onChange={setPersonBirthday}
                    defaultYear={new Date().getFullYear() - 30}
                  />
                </div>
              </StaggerItem>

              {/* Anniversary — auto-shown for partner/spouse */}
              {isPartnerRel(personRelation) && (
                <StaggerItem i={3} dir={dir}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={anniversaryEnabled}
                        onChange={e => setAnniversaryEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#8B5CF6]"
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-charcoal/60">
                        Anniversary
                      </span>
                    </label>
                    <span className="text-[10px] text-charcoal/35">
                      {anniversaryEnabled ? 'We\'ll remind you for this too' : 'Off'}
                    </span>
                  </div>
                  {anniversaryEnabled && (
                    <div
                      className="rounded-[18px] overflow-hidden border"
                      style={{
                        background: 'rgba(255,255,255,0.72)',
                        borderColor: 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(20px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                      }}
                    >
                      <WheelDatePicker
                        label=""
                        value={anniversaryDate}
                        onChange={setAnniversaryDate}
                        defaultYear={new Date().getFullYear() - 2}
                      />
                    </div>
                  )}
                </StaggerItem>
              )}

              {/* Color + emoji picker */}
              <StaggerItem i={4} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">Theme</p>
                <div className="flex gap-2 mb-3">
                  {COLOR_SWATCHES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { tapHaptic(); setPersonColor(c); }}
                      className="w-8 h-8 rounded-full transition-all focus:outline-none"
                      style={{
                        background: c,
                        border: personColor === c ? '2px solid white' : '2px solid transparent',
                        boxShadow: personColor === c ? `0 0 0 2px ${c}, 0 4px 12px ${c}55` : '0 2px 6px rgba(0,0,0,0.08)',
                      }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">Icon</p>
                <div className="grid grid-cols-8 gap-1.5">
                  {EMOJI_PRESETS.map(e => {
                    const active = personEmoji === e;
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { tapHaptic(); setPersonEmoji(active ? '' : e); }}
                        className="aspect-square rounded-[12px] flex items-center justify-center text-[18px] transition-all focus:outline-none"
                        style={{
                          background: active ? `${personColor}22` : 'rgba(255,255,255,0.55)',
                          border: active ? `1.5px solid ${personColor}` : '1px solid rgba(255,255,255,0.7)',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
              </StaggerItem>
            </div>

            <div className="pt-6">
              <PrimaryCTA onClick={next} disabled={!personName || !personBirthday}>
                Continue
              </PrimaryCTA>
            </div>
          </>
        );

      case 5:
        // ── Person details ─────────────────────────────────────────
        return (
          <>
            <h2 className="text-[26px] font-bold tracking-tight text-charcoal leading-tight mb-2">
              Tell us about {personName || 'them'}
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6">
              The more we know, the sharper the ideas.
            </p>

            <div className="space-y-5 flex-grow">

              {/* Interests blob */}
              <StaggerItem i={0} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1 flex items-center justify-between">
                  <span>Habits, hobbies, what they love</span>
                  <span className={`font-semibold tabular-nums normal-case ${personInterest.length >= 220 ? 'text-amber-500' : 'text-charcoal/30'}`}>
                    {personInterest.length}/250
                  </span>
                </p>
                <textarea
                  value={personInterest}
                  onChange={e => setPersonInterest(e.target.value.slice(0, 250))}
                  placeholder="Coffee every morning, loves cozy things, always traveling, obsessed with gardening, hates clutter..."
                  rows={4}
                  className="w-full p-4 rounded-[18px] text-[14px] font-medium focus:outline-none border resize-none leading-relaxed"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    borderColor: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  }}
                />
              </StaggerItem>

              {/* Gift preference */}
              <StaggerItem i={1} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">
                  Do they prefer things or experiences?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {GIFT_PREF_OPTIONS.map(opt => {
                    const selected = giftPreference === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { tapHaptic(); setGiftPreference(opt.value); }}
                        className="py-3 rounded-[14px] text-[12.5px] font-semibold flex flex-col items-center gap-0.5 transition-all"
                        style={{
                          background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.62)',
                          border: selected ? `1.5px solid ${PURPLE}` : '1px solid rgba(255,255,255,0.7)',
                          color: selected ? '#6D28D9' : 'rgba(28,28,30,0.78)',
                          backdropFilter: 'blur(20px) saturate(140%)',
                          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                        }}
                      >
                        <span className="text-[18px]">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </StaggerItem>

              {/* Avoid list */}
              <StaggerItem i={2} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">
                  Past gifts or things to avoid <span className="normal-case text-charcoal/35">(optional)</span>
                </p>
                <input
                  value={avoidList}
                  onChange={e => setAvoidList(e.target.value)}
                  placeholder="Candles, silk scarf last year, perfume…"
                  className="w-full p-3.5 rounded-[16px] text-[13.5px] font-medium focus:outline-none border"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    borderColor: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  }}
                />
              </StaggerItem>

              {/* City — helps Gemini surface real local gift options */}
              <StaggerItem i={3} dir={dir}>
                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/60 mb-2 px-1">
                  Where do they live? <span className="normal-case text-charcoal/35">(optional)</span>
                </p>
                <input
                  value={personCity}
                  onChange={e => setPersonCity(e.target.value)}
                  placeholder="Tallinn, Estonia"
                  className="w-full p-3.5 rounded-[16px] text-[13.5px] font-medium focus:outline-none border"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    borderColor: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  }}
                />
                <p className="text-[10.5px] text-charcoal/45 mt-1.5 px-1 leading-snug">
                  Helps us find local-shop and experience gift ideas near them.
                </p>
              </StaggerItem>

            </div>

            <div className="pt-6">
              <PrimaryCTA onClick={next}>Continue</PrimaryCTA>
            </div>
          </>
        );

      case 6:
        // ── Reminder cadence (own screen) ──────────────────────────
        return (
          <>
            <h2 className="text-[26px] font-bold tracking-tight text-charcoal leading-tight mb-2 text-center">
              When do you want<br />a heads-up?
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6 leading-relaxed text-center">
              5 gift ideas ahead of every date, then 5 more 1 week before. You pick how early.
            </p>

            <div className="flex justify-center mb-6">
              <Mascot pose="thinking" size={140} />
            </div>

            <div className="space-y-2.5 flex-grow">
              {REMINDER_OPTIONS.map((opt, i) => {
                const selected = reminderDays === opt.days;
                return (
                  <StaggerItem key={opt.days} i={i} dir={dir}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { tapHaptic(); setReminderDays(opt.days); }}
                      className="w-full flex items-center gap-3 p-4 rounded-[18px] text-left transition-all focus:outline-none"
                      style={{
                        background: selected ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.62)',
                        border: selected ? `1.5px solid ${PURPLE}` : '1px solid rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(20px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                        boxShadow: selected ? '0 6px 18px rgba(139,92,246,0.18)' : 'none',
                        WebkitTapHighlightColor: 'transparent',
                        outline: 'none',
                      }}
                    >
                      <div className="flex-grow">
                        <p className={`text-[14.5px] font-bold ${selected ? 'text-[#6D28D9]' : 'text-charcoal/85'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[11.5px] text-charcoal/55 mt-0.5">{opt.sub}</p>
                      </div>
                      {selected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: PURPLE }}
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                        </motion.div>
                      )}
                    </motion.button>
                  </StaggerItem>
                );
              })}
            </div>

            <div className="pt-6">
              <PrimaryCTA onClick={next}>See my profile</PrimaryCTA>
            </div>
          </>
        );

      case 7:
        // ── Reveal (loader → archetype card) ───────────────────────
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <AnimatePresence mode="wait">
              {revealPhase === 'loading' ? (
                <motion.div
                  key="loading"
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="mb-8"
                  >
                    <Sparkles className="w-12 h-12" style={{ color: PURPLE }} strokeWidth={1.4} />
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingLine}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="text-[15px] font-semibold text-charcoal/75"
                    >
                      {LOADING_LINES[loadingLine]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="card"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-sm"
                >
                  <div
                    className="rounded-[32px] p-7 mb-7 relative overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.78)',
                      backdropFilter: 'blur(24px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                      border: '1px solid rgba(255,255,255,0.7)',
                      boxShadow: '0 12px 40px rgba(139,92,168,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
                    }}
                  >
                    {/* Ribbon corner decoration top-right */}
                    <svg
                      className="absolute top-0 right-0 pointer-events-none"
                      width="80" height="80" viewBox="0 0 80 80" aria-hidden
                    >
                      <path d="M0 0 L80 0 L80 80 Z" fill="rgba(196,32,64,0.10)" />
                      <path d="M55 0 L80 0 L80 25 Z" fill="#C42040" />
                      <path d="M52 28 L80 28 M52 28 L52 0" stroke="#C42040" strokeWidth="2" strokeLinecap="round" opacity="0.4" fill="none" />
                    </svg>

                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 relative" style={{ color: PURPLE }}>
                      Your Gift Profile
                    </p>
                    <div className="flex items-center gap-3 mb-5 relative">
                      <Mascot pose="sparkle" size={64} />
                      <h3 className="text-[22px] font-bold text-charcoal leading-tight tracking-tight">
                        {archetype.label}
                      </h3>
                    </div>
                    <p className="text-[14px] text-charcoal/75 leading-relaxed mb-6 relative">
                      {archetype.tagline}
                    </p>

                    <div className="space-y-2 pt-5 border-t border-white/40">
                      <Stat label="Gifting for" value={`${relationCircle.length} ${relationCircle.length === 1 ? 'person type' : 'circles'}`} />
                      <Stat label="Style" value={vibes.slice(0, 3).map(v => VIBE_OPTIONS.find(x => x.id === v)?.label).filter(Boolean).join(', ')} />
                      <Stat label="Comfort" value={BUDGET_OPTIONS.find(b => b.id === budgetBand)?.label ?? '—'} />
                      {personName && <Stat label="First up" value={personName} />}
                    </div>
                  </div>

                  <PrimaryCTA onClick={next}>Show me what's next →</PrimaryCTA>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case 8:
        // ── What you'll get (soft launch before paywall) ────────────────
        return (
          <div className="flex-1 flex flex-col">
            <h2 className="text-[26px] font-bold tracking-tight text-charcoal leading-tight mb-2 text-center">
              Here's what's<br />unlocked for you.
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6 text-center">
              A quick tour before your free trial begins.
            </p>

            <div className="flex justify-center mb-5">
              <Mascot pose="carrying" size={160} />
            </div>

            <div className="space-y-3 mb-7 flex-grow">
              {[
                {
                  Icon: Heart,
                  title: `${personName || 'Your first person'}'s profile is saved`,
                  sub: 'With their birthday and what they love.',
                },
                {
                  Icon: Bell,
                  title: 'Quiet reminders before every date',
                  sub: 'No spam, no anxiety, just a gentle heads-up.',
                },
                {
                  Icon: Gift,
                  title: 'AI gift ideas tuned to your style',
                  sub: 'Fresh picks, on demand, in your budget.',
                },
                {
                  Icon: ListChecks,
                  title: 'Track who you gifted and when',
                  sub: 'Never repeat the same gift by accident.',
                },
              ].map(({ Icon, title, sub }, i) => (
                <StaggerItem key={i} i={i} dir={dir}>
                  <div
                    className="flex items-start gap-3 p-3.5 rounded-[18px]"
                    style={{
                      background: 'rgba(255,255,255,0.62)',
                      backdropFilter: 'blur(20px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                      border: '1px solid rgba(255,255,255,0.7)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(139,92,246,0.15)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: PURPLE }} strokeWidth={2.2} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[13.5px] font-bold text-charcoal leading-tight">{title}</p>
                      <p className="text-[11.5px] text-charcoal/55 leading-snug mt-0.5">{sub}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </div>

            <PrimaryCTA onClick={next}>Try it free for 7 days</PrimaryCTA>
          </div>
        );

      case 9:
        // ── Sample gifts + paywall ─────────────────────────────────
        return (
          <>
            <h2 className="text-[24px] font-bold tracking-tight text-charcoal leading-tight mb-2">
              3 ideas for {personName || 'your first person'}
            </h2>
            <p className="text-[13px] text-charcoal/60 mb-6">
              Picks we'd make for {personName || 'them'}.
            </p>

            <div className="space-y-2.5 mb-6">
              {sampleGiftsFor(vibes, budgetBand).map((g, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                  className="rounded-[22px] p-3 flex items-center gap-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.72)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                    border: '1px solid rgba(255,255,255,0.75)',
                    boxShadow: '0 6px 18px rgba(139,92,168,0.12)',
                  }}
                >
                  {/* Catalog-style tile */}
                  <div
                    className="w-[68px] h-[68px] rounded-[16px] flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(145deg, ${GIFT_TILE_BG[i % GIFT_TILE_BG.length].from}, ${GIFT_TILE_BG[i % GIFT_TILE_BG.length].to})`,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Decorative ribbon cross */}
                    <svg width="68" height="68" viewBox="0 0 68 68" className="absolute inset-0 opacity-25">
                      <rect x="30" y="0" width="8" height="68" fill="white" />
                      <rect x="0" y="30" width="68" height="8" fill="white" />
                    </svg>
                    <span className="text-[32px] relative z-10" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }}>
                      {g.emoji}
                    </span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[13.5px] font-bold text-charcoal leading-tight mb-1">{g.title}</p>
                    <p className="text-[11.5px] text-charcoal/55 leading-snug">{g.why}</p>
                    {g.priceLabel && (
                      <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.14)', color: '#6D28D9' }}>
                        {g.priceLabel}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div
              className="rounded-[28px] p-6"
              style={{
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.75)',
                boxShadow: '0 12px 40px rgba(139,92,168,0.18)',
              }}
            >
              <h3 className="text-[20px] font-bold text-charcoal leading-tight mb-1">
                Become the person<br />everyone remembers.
              </h3>
              <p className="text-[12px] text-charcoal/60 mb-4 leading-relaxed">
                Unlimited gift ideas tuned to your people. Quiet reminders. Never a generic present again.
              </p>

              {/* What you get next */}
              <div className="space-y-1.5 mb-5">
                {[
                  `${personName || 'Your first person'} is saved with their birthday`,
                  'Quiet reminders before every important date',
                  'Fresh gift ideas tuned to your style, on demand',
                ].map((line, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: PURPLE }}>
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                    </div>
                    <p className="text-[12px] text-charcoal/75 leading-snug">{line}</p>
                  </div>
                ))}
              </div>

              <PlanRow title="Annual"  price="$39.99/yr" sub="$0.77/wk · Save 84%" recommended />
              <div className="h-2" />
              <PlanRow title="Weekly"  price="$4.99/wk"  sub="Try without commitment" />

              <div className="h-5" />
              <PrimaryCTA onClick={finish}>Start 7-Day Free Trial</PrimaryCTA>
              <p className="text-[10.5px] text-charcoal/45 text-center mt-3 leading-snug">
                Free for 7 days, then $39.99/yr. Cancel anytime in Settings.
              </p>

              <div className="flex items-center justify-center gap-4 mt-3">
                <button className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Restore</button>
                <button className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Terms</button>
                <button className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Privacy</button>
              </div>
            </div>
          </>
        );
    }
  }

  // Step 0 (hook) + 7 (reveal) hide progress chrome
  const showProgress = step !== 0 && step !== 7;
  const showBack     = step > 0 && step !== 7;

  return (
    <Shell
      step={step}
      total={TOTAL_SCREENS}
      onBack={showBack ? back : undefined}
      showProgress={showProgress}
      clouds={step === 0}
    >
      <AnimatePresence mode="popLayout" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          initial={{ opacity: 0, y: dir * 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: dir * -8 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col min-h-0"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-charcoal/45 font-semibold uppercase tracking-widest">{label}</span>
      <span className="text-[13px] font-bold text-charcoal">{value || '—'}</span>
    </div>
  );
}

function PlanRow({
  title, price, sub, recommended,
}: { title: string; price: string; sub: string; recommended?: boolean }) {
  return (
    <div
      className="flex items-center justify-between rounded-[20px] px-4 py-3"
      style={{
        background: recommended ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.55)',
        border: recommended ? `1.5px solid ${PURPLE}` : '1px solid rgba(28,28,30,0.08)',
      }}
    >
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-bold text-charcoal">{title}</span>
          {recommended && (
            <span className="text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ background: PURPLE }}>
              Best value
            </span>
          )}
        </div>
        <p className="text-[11px] text-charcoal/55">{sub}</p>
      </div>
      <p className="text-[15px] font-bold" style={{ color: recommended ? PURPLE : '#1c1c1e' }}>
        {price}
      </p>
    </div>
  );
}
