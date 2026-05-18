import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User,
  Users,
  Heart,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Wallet,
  MapPin,
  Lock,
  Star,
} from "lucide-react";
import WheelDatePicker from "./WheelDatePicker";
import CustomSelect from "./CustomSelect";
import { Person, Occasion } from "../types";
import {
  RELATIONS,
  PRESET_COLORS,
  PRESET_EMOJIS,
  PRESET_OCCASIONS,
  BUDGET_OPTIONS,
  MONTHS,
  calculateDaysRemaining,
  isPartnerRelation,
} from "../constants";

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (person: Person, occasions: Occasion[]) => void;
  /** Existing people (used for singleton relations like Partner/Spouse). */
  people: Person[];
  /** When set while opening, pre-selects this relation (must match RELATIONS). */
  initialRelationHint?: string | null;
  /** Keys of PRESET_OCCASIONS to attach (e.g. "Easter") when opening from a holiday chip. */
  initialPresetOccasionKeys?: string[] | null;
}

const DEFAULT_COLOR = "#C42040";
const DEFAULT_EMOJI = "💖";

const STEP_LABELS = ["INFO", "DETAILS", "PREFERENCES"] as const;

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 mt-6 mb-2">
      {[1, 2, 3].map((n, i) => (
        <div key={n} className="flex items-center">
          <div className="flex flex-col items-center gap-2 w-[76px]">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                step === n
                  ? "bg-[#DE6573] ring-[6px] ring-[#DE6573]/22 shadow-[0_2px_10px_rgba(222,101,115,0.4)] scale-110"
                  : step > n
                    ? "bg-[#DE6573]"
                    : "bg-white border-2 border-stone-300"
              }`}
            />
            <span className="text-[8px] font-black uppercase tracking-[0.14em] text-charcoal/34 text-center leading-tight">
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < 2 && (
            <div
              className={`h-[3px] w-10 rounded-full mb-5 shrink-0 transition-colors duration-300 ${
                step > n ? "bg-[#DE6573]/55" : "bg-stone-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AddPersonModal({
  isOpen,
  onClose,
  onAdd,
  people,
  initialRelationHint = null,
  initialPresetOccasionKeys = null,
}: AddPersonModalProps) {
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Partner / Spouse");
  const [interests, setInterests] = useState("");
  const [budget, setBudget] = useState("€25-50");
  const [birthday, setBirthday] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [preferences, setPreferences] = useState<"Physical gifts" | "Experiences" | "Either">("Either");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [style, setStyle] = useState("Thoughtful");
  const [giftingFear, setGiftingFear] = useState("");
  const [pastAndAvoid, setPastAndAvoid] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [extraOccasions, setExtraOccasions] = useState<string[]>([]);
  const [wizardStep, setWizardStep] = useState(1);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [birthdayError, setBirthdayError] = useState(false);
  const [isRelationPickerOpen, setIsRelationPickerOpen] = useState(false);

  const SINGLETON_RELATIONS = new Set(['Partner / Spouse', 'Mother', 'Father']);
  const isSingletonRelation = (rel: string) =>
    isPartnerRelation(rel) || SINGLETON_RELATIONS.has(rel);
  const hasSingletonAlready = (rel: string) =>
    isSingletonRelation(rel) && people.some((p) => p.relation === rel || (isPartnerRelation(rel) && isPartnerRelation(p.relation)));
  const hasPartnerAlready = hasSingletonAlready('Partner / Spouse');

  const relationMeta = (rel: string) => {
    const r = rel.toLowerCase();
    if (isPartnerRelation(rel)) return { Icon: Heart, color: '#E879A9' };
    if (r.includes('mother') || r.includes('father')) return { Icon: User, color: '#60A5FA' };
    if (r.includes('brother') || r.includes('sister') || r.includes('son') || r.includes('daughter') || r.includes('family')) return { Icon: Users, color: '#A78BFA' };
    if (r.includes('grand')) return { Icon: Users, color: '#34D399' };
    if (r.includes('best')) return { Icon: Star, color: '#F59E0B' };
    if (r.includes('friend')) return { Icon: Users, color: '#22C55E' };
    if (r.includes('colleague') || r.includes('mentor')) return { Icon: Users, color: '#64748B' };
    return { Icon: Users, color: '#94A3B8' };
  };

  useEffect(() => {
    if (!isOpen) return;
    setRelationError(null);
    if (initialRelationHint && RELATIONS.includes(initialRelationHint)) {
      if (isSingletonRelation(initialRelationHint) && hasSingletonAlready(initialRelationHint)) {
        setRelation("Friend");
      } else {
        setRelation(initialRelationHint);
      }
    } else {
      setRelation(hasPartnerAlready ? "Friend" : "Partner / Spouse");
    }
    if (initialPresetOccasionKeys?.length) {
      const valid = initialPresetOccasionKeys.filter((k) => k in PRESET_OCCASIONS);
      setExtraOccasions(valid);
    } else {
      setExtraOccasions([]);
    }
    if (isOpen) setWizardStep(1);
  }, [isOpen, initialRelationHint, initialPresetOccasionKeys]);

  // Auto-toggle Valentine's Day when relation changes to/from partner
  useEffect(() => {
    const VDAY = "Valentine's Day";
    if (isPartnerRelation(relation)) {
      setExtraOccasions((prev) => prev.includes(VDAY) ? prev : [...prev, VDAY]);
    } else {
      setExtraOccasions((prev) => prev.filter((x) => x !== VDAY));
    }
  }, [relation]);

  const reset = () => {
    setWizardStep(1);
    setName(""); setRelation("Partner / Spouse"); setInterests("");
    setBudget("€25-50"); setBirthday(""); setAnniversaryDate("");
    setPreferences("Either"); setNotes(""); setLocation("");
    setStyle("Thoughtful"); setGiftingFear(""); setPastAndAvoid("");
    setColor(DEFAULT_COLOR); setEmoji(DEFAULT_EMOJI); setExtraOccasions([]);
    setRelationError(null);
    setBirthdayError(false);
    setIsRelationPickerOpen(false);
  };

  const handleClose = () => { onClose(); reset(); };

  function goNext() {
    if (wizardStep === 1 && !name.trim()) return;
    if (wizardStep === 1 && !birthday) { setBirthdayError(true); return; }
    setBirthdayError(false);
    if (wizardStep < 3) setWizardStep((s) => s + 1);
  }

  function goBack() {
    if (wizardStep > 1) setWizardStep((s) => s - 1);
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSingletonRelation(relation) && hasSingletonAlready(relation)) {
      setRelationError(`You can only have 1 ${relation} profile.`);
      return;
    }
    const newPerson: Person = {
      id: Date.now().toString(),
      name,
      initials: name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2),
      relation,
      interests: interests.split(",").map((i) => i.trim()).filter(Boolean),
      budget,
      style,
      avatarUrl: "",
      notes,
      lastNoteUpdate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
      savedGifts: [],
      themeColor: color,
      emoji,
      birthday,
      anniversaryDate,
      preferences,
      location,
      giftingFear: giftingFear || undefined,
      fallenFlatKeywords: [],
      pastGifts: pastAndAvoid.split(',').map(i => i.trim()).filter(Boolean),
    };

    const occasionsToAdd: Occasion[] = [];
    if (birthday) {
      const [, monthNum, dayNum] = birthday.split("-").map(Number);
      occasionsToAdd.push({
        id: "o-" + Date.now() + Math.random(), personId: newPerson.id,
        title: `${name}'s Birthday`, type: "Birthday", date: birthday,
        month: MONTHS[monthNum - 1], day: dayNum,
        daysRemaining: calculateDaysRemaining(birthday), emoji: "🎂",
      });
    }
    if (anniversaryDate && isPartnerRelation(relation)) {
      const [, monthNum, dayNum] = anniversaryDate.split("-").map(Number);
      occasionsToAdd.push({
        id: "ann-" + Date.now() + Math.random(), personId: newPerson.id,
        title: `${name}'s Anniversary`, type: "Anniversary", date: anniversaryDate,
        month: MONTHS[monthNum - 1], day: dayNum,
        daysRemaining: calculateDaysRemaining(anniversaryDate), emoji: "💍",
      });
    }
    extraOccasions.forEach((occType) => {
      const preset = PRESET_OCCASIONS[occType];
      if (!preset) return;
      const [m, d] = preset.date.split("-");
      const date = `${new Date().getFullYear()}-${m}-${d}`;
      occasionsToAdd.push({
        id: `o-extra-${occType}-${Date.now()}-${Math.random()}`, personId: newPerson.id,
        title: `${name}'s ${occType}`, type: occType as any, date,
        month: MONTHS[parseInt(m, 10) - 1], day: parseInt(d, 10),
        daysRemaining: calculateDaysRemaining(date), emoji: preset.emoji,
      });
    });

    onAdd(newPerson, occasionsToAdd);
    reset();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/25 backdrop-blur-[3px]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="relative w-full bg-gradient-to-b from-[#FAFAFB] to-white rounded-t-[32px] h-[94dvh] flex flex-col shadow-[0_-12px_48px_rgba(0,0,0,0.08)] z-10 border-t border-white/80"
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-charcoal/10 rounded-full mx-auto mt-3 flex-shrink-0" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-5 w-10 h-10 rounded-full bg-white border border-stone-200/80 shadow-sm flex items-center justify-center text-charcoal/45 hover:text-charcoal hover:bg-stone-50 transition-colors z-10 cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-2 flex-shrink-0 text-center">
              <h2 className="text-[24px] font-bold text-charcoal tracking-tight leading-snug font-headline">
                Add someone special
              </h2>
              <p className="text-[13px] text-charcoal/48 mt-2 leading-relaxed px-2">
                Create a relationship profile to get more relevant gift ideas{" "}
                <span className="inline-block" aria-hidden>❤️</span>
              </p>
              <StepDots step={wizardStep} />
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar space-y-4">
              <form id="add-person-form" onSubmit={handleSubmit} className="space-y-4">

                {/* ── Step 1 · Identity & relationship ── */}
                {wizardStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="bg-white rounded-[26px] border border-stone-200/70 shadow-[0_8px_30px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden"
                >
                  <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-stone-100">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FCE7EA] to-[#EDE9FE] flex items-center justify-center flex-shrink-0 shadow-inner">
                      <User className="w-[22px] h-[22px] text-[#A85586]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[16px] font-bold text-charcoal tracking-tight">
                        Identity &amp; relationship
                      </p>
                      <p className="text-[12px] text-charcoal/42 mt-0.5 leading-snug">
                        Basics about this person
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-5 space-y-4">
                    {/* Display name */}
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/42 mb-2 flex items-center gap-1 px-0.5">
                        Display name
                        <span className="text-[#DE6573]">*</span>
                      </label>
                      <div className="flex items-center gap-3 rounded-2xl border border-stone-200/90 bg-[#FAFAFA]/90 px-4 py-3.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-[#DE6573]/35 focus-within:ring-2 focus-within:ring-[#DE6573]/12 transition-all">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9A8C8] via-[#E879A9] to-[#A78BFA] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(232,121,169,0.35)]">
                          <Heart className="w-[18px] h-[18px] text-white drop-shadow-sm" strokeWidth={2} />
                        </div>
                        <input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="flex-grow bg-transparent text-[15px] font-medium text-charcoal placeholder:text-charcoal/28 focus:outline-none min-w-0"
                          placeholder="e.g. Alex"
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    {/* Relationship */}
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/42 mb-2 block px-0.5">
                        Relationship
                      </label>
                      <div className="flex items-center gap-3 rounded-2xl border border-stone-200/90 bg-[#FAFAFA]/90 px-4 py-3.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-[#DE6573]/35 focus-within:ring-2 focus-within:ring-[#DE6573]/12 transition-all">
                        {(() => {
                          const { Icon, color } = relationMeta(relation);
                          return (
                            <div
                              className="w-10 h-10 rounded-full bg-white border border-stone-100 flex items-center justify-center flex-shrink-0 shadow-sm"
                              style={{ boxShadow: `0 10px 26px ${color}12` }}
                            >
                              <Icon className="w-[18px] h-[18px]" style={{ color }} strokeWidth={1.9} />
                            </div>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => setIsRelationPickerOpen(true)}
                          className="flex-grow text-left bg-transparent text-[15px] font-medium text-charcoal focus:outline-none cursor-pointer min-w-0 flex items-center justify-between gap-2"
                          aria-label="Choose relationship"
                        >
                          <span className="truncate">{relation}</span>
                          <ChevronDown className="w-4 h-4 text-charcoal/35 flex-shrink-0" />
                        </button>
                      </div>
                      {(hasSingletonAlready('Partner / Spouse') ||
                        hasSingletonAlready('Mother') ||
                        hasSingletonAlready('Father')) && (
                        <p className="text-[11px] text-charcoal/40 mt-2 px-1">
                          Some relationships are limited to 1 profile.
                        </p>
                      )}
                      {relationError && (
                        <p className="text-[11px] text-red-500 mt-1.5 px-1">{relationError}</p>
                      )}
                    </div>

                    {/* Relationship picker (custom dropdown) */}
                    <AnimatePresence>
                      {isRelationPickerOpen && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsRelationPickerOpen(false)}
                            className="fixed inset-0 z-[80] bg-black/15 backdrop-blur-[2px]"
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            className="fixed left-1/2 -translate-x-1/2 z-[90] w-[min(420px,calc(100vw-2.5rem))] top-[22dvh] rounded-[26px] bg-white border border-stone-200/60 shadow-[0_24px_80px_rgba(0,0,0,0.16)] overflow-hidden"
                            role="dialog"
                            aria-label="Relationship picker"
                          >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-charcoal/35">
                                Relationship
                              </p>
                              <button
                                type="button"
                                onClick={() => setIsRelationPickerOpen(false)}
                                className="w-9 h-9 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center text-charcoal/35 hover:text-charcoal/60 transition-colors"
                                aria-label="Close"
                              >
                                <X className="w-4 h-4" strokeWidth={2.5} />
                              </button>
                            </div>

                            <div className="max-h-[46dvh] overflow-auto">
                              {RELATIONS.map((rel) => {
                                const disabled = isSingletonRelation(rel) && hasSingletonAlready(rel);
                                const active = rel === relation;
                                const { Icon, color } = relationMeta(rel);
                                return (
                                  <button
                                    key={rel}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                      if (disabled) return;
                                      setRelation(rel);
                                      setRelationError(null);
                                      setIsRelationPickerOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                                      active ? 'bg-[#FFF0F3]' : 'hover:bg-stone-50'
                                    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <div className="w-9 h-9 rounded-2xl bg-white border border-stone-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                      <Icon className="w-[18px] h-[18px]" style={{ color }} strokeWidth={1.9} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[14px] font-semibold text-charcoal truncate">{rel}</p>
                                    </div>
                                    {disabled ? (
                                      <span className="text-charcoal/25 text-[14px] font-semibold">×</span>
                                    ) : active ? (
                                      <span className="text-primary/70 text-[14px] font-semibold">✓</span>
                                    ) : (
                                      <span className="text-charcoal/20 text-[14px] font-semibold"> </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Birthday */}
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/42 mb-2 flex items-center gap-1 px-0.5">
                        Birthday
                        <span className="text-[#DE6573]">*</span>
                      </label>
                      <div className={`rounded-2xl border overflow-hidden transition-all ${
                        birthdayError
                          ? 'border-[#DE6573]/60 ring-2 ring-[#DE6573]/15 bg-[#FFF5F6]'
                          : birthday
                            ? 'border-[#DE6573]/35 bg-[#FAFAFA]/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]'
                            : 'border-stone-200/90 bg-[#FAFAFA]/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]'
                      }`}>
                        <WheelDatePicker value={birthday} onChange={(v) => { setBirthday(v); setBirthdayError(false); }} defaultYear={new Date().getFullYear() - 30} />
                      </div>
                      {birthdayError && (
                        <p className="text-[11px] text-[#DE6573] mt-1.5 px-1 font-medium">Please add their birthday</p>
                      )}
                      <p className="text-[11px] text-charcoal/35 mt-1.5 px-1">We'll use this to find better gift ideas.</p>
                    </div>

                    {/* Anniversary */}
                    {isPartnerRelation(relation) && (
                      <div>
                        <label className="text-[11px] font-semibold text-charcoal/42 mb-2 flex items-center gap-1.5 px-0.5">
                          Anniversary
                          <span className="text-[10px] font-normal text-charcoal/30">(optional)</span>
                        </label>
                        <div className="rounded-2xl border border-stone-200/90 bg-[#FAFAFA]/90 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                          <WheelDatePicker value={anniversaryDate} onChange={setAnniversaryDate} defaultYear={new Date().getFullYear()} />
                        </div>
                      </div>
                    )}

                    {extraOccasions.length > 0 && (
                      <div className="rounded-2xl border border-[#EDE9FE] bg-[#F5F3FF]/90 px-4 py-3">
                        <p className="text-[11px] font-semibold text-charcoal/45 mb-2 px-0.5">
                          Occasions to track
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {extraOccasions.map((key) => {
                            const preset = PRESET_OCCASIONS[key as keyof typeof PRESET_OCCASIONS];
                            if (!preset) return null;
                            const isVday = key === "Valentine's Day" && isPartnerRelation(relation);
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] font-semibold shadow-sm border ${
                                  isVday
                                    ? 'bg-[#FFF0F3] border-[#F9C0C8] text-[#C42040]'
                                    : 'bg-white border-stone-200/80 text-charcoal'
                                }`}
                              >
                                <span>{preset.emoji}</span>
                                {key}
                                {isVday && (
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#C42040]/50 ml-0.5">auto</span>
                                )}
                                <button
                                  type="button"
                                  className="ml-0.5 rounded-full p-0.5 text-charcoal/35 hover:bg-charcoal/8 hover:text-charcoal/70 transition-colors"
                                  aria-label={`Remove ${key}`}
                                  onClick={() =>
                                    setExtraOccasions((prev) => prev.filter((x) => x !== key))
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
                )}

                {/* ── Step 2 · Their look ── */}
                {wizardStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="bg-white rounded-[26px] border border-stone-200/70 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden"
                >
                  <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-stone-100">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FFF0F4] to-[#EDE9FE] flex items-center justify-center flex-shrink-0 shadow-inner">
                      <Sparkles className="w-[22px] h-[22px] text-[#C084FC]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[16px] font-bold text-charcoal tracking-tight">Their look</p>
                      <p className="text-[12px] text-charcoal/42 mt-0.5 leading-snug">
                        Emoji &amp; accent colour
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-5 space-y-6">
                    {/* Emoji */}
                    <div>
                      <p className="text-[11px] font-semibold text-charcoal/45 mb-2.5 px-0.5">Profile emoji</p>
                      <div className="grid grid-cols-8 gap-2">
                        {PRESET_EMOJIS.map((e) => (
                          <button
                            key={e} type="button" onClick={() => setEmoji(e)}
                            className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${
                              emoji === e ? "bg-charcoal text-white scale-105 shadow-md" : "bg-surface-dim/60 hover:bg-surface-dim"
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <p className="text-[11px] font-semibold text-charcoal/45 mb-2.5 px-0.5">Accent colour</p>
                      <div className="flex flex-wrap gap-2.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c} type="button" onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              color === c ? "border-charcoal scale-110 shadow-md ring-2 ring-charcoal/20" : "border-transparent opacity-60"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <div className="relative">
                          <input type="color" ref={colorPickerRef} className="sr-only" onChange={(e) => setColor(e.target.value)} />
                          <button
                            type="button" onClick={() => colorPickerRef.current?.click()}
                            className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
                              !PRESET_COLORS.includes(color.toUpperCase())
                                ? "border-charcoal scale-110 shadow-md ring-2 ring-charcoal/20"
                                : "border-charcoal/20 opacity-60"
                            }`}
                            style={{ backgroundColor: !PRESET_COLORS.includes(color.toUpperCase()) ? color : "transparent" }}
                          >
                            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-red-400 via-green-400 to-blue-400 opacity-80" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                )}

                {wizardStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-4"
                >
                {/* ── Gift profile ── */}
                <div className="bg-white rounded-[26px] border border-stone-200/70 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden">
                  <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-stone-100">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100/80 shadow-inner">
                      <Wallet className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 pt-0.5 flex-grow">
                      <p className="text-[16px] font-bold text-charcoal tracking-tight">Gift profile</p>
                      <p className="text-[12px] text-charcoal/42 mt-0.5">Helps tailor suggestions</p>
                    </div>
                  </div>

                  <div className="px-5 py-5 space-y-4">
                    {/* Interests */}
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/45 mb-1.5 flex items-center justify-between px-1">
                        Their interests
                        <span className={`text-[10px] font-semibold tabular-nums ${interests.length >= 180 ? 'text-amber-500' : 'text-charcoal/25'}`}>{interests.length}/200</span>
                      </label>
                      <textarea
                        required
                        value={interests}
                        onChange={(e) => setInterests(e.target.value.slice(0, 200))}
                        className="w-full rounded-2xl px-4 py-3 text-[14px] font-medium text-charcoal focus:outline-none border border-stone-200/90 bg-[#FAFAFA]/90 focus:bg-white focus:border-[#DE6573]/35 focus:ring-2 focus:ring-[#DE6573]/10 transition-all min-h-[88px] resize-none placeholder:text-charcoal/28 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                        placeholder="Ceramics, coffee, modern art…"
                      />
                    </div>

                    {/* Budget + Location row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-charcoal/45 mb-1.5 block px-1">Budget</label>
                        <CustomSelect
                          value={budget}
                          onChange={setBudget}
                          options={BUDGET_OPTIONS.map(opt => ({ value: opt, label: opt }))}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-charcoal/45 mb-1.5 flex items-center gap-1 px-1">
                          <MapPin className="w-3 h-3" />
                          Location
                        </label>
                        <input
                          value={location}
                          onChange={(e) => setLocation(e.target.value.slice(0, 50))}
                          maxLength={50}
                          className="w-full bg-surface-dim/40 rounded-2xl px-3 py-3 text-[13px] font-semibold text-charcoal focus:outline-none border border-outline-variant/20 focus:border-primary/30 transition-all placeholder:text-charcoal/25"
                          placeholder="City…"
                        />
                      </div>
                    </div>

                    {/* Delivery preferences */}
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/45 mb-2 block px-1">Gift style</label>
                      <div className="flex gap-2">
                        {(["Physical gifts", "Experiences", "Either"] as const).map((pref) => (
                          <button
                            key={pref} type="button" onClick={() => setPreferences(pref)}
                            className={`flex-1 py-2.5 rounded-2xl text-[11px] font-bold transition-all border ${
                              preferences === pref
                                ? "bg-charcoal text-white border-charcoal"
                                : "bg-white text-charcoal/50 border-outline-variant/30 hover:border-charcoal/20"
                            }`}
                          >
                            {pref === "Physical gifts" ? "🎁 Things" : pref === "Experiences" ? "🎟️ Events" : "✨ Both"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Gifting fear ── */}
                <div className="bg-white rounded-[26px] border border-stone-200/70 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden">
                  <div className="px-5 py-5 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/45 px-1 block mb-0.5">Your biggest gifting worry</label>
                      <p className="text-[11px] text-charcoal/35 px-1 mb-3 leading-relaxed">We'll steer ideas away from this failure mode.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Giving something generic',
                        'Forgetting the occasion',
                        'Going over budget',
                        'They already have it',
                      ].map((opt) => (
                        <button
                          key={opt} type="button"
                          onClick={() => setGiftingFear(f => f === opt ? '' : opt)}
                          className={`py-3 px-3 rounded-2xl text-[11px] font-bold text-left border transition-all ${
                            giftingFear === opt
                              ? 'bg-dusty-rose/10 border-dusty-rose text-dusty-rose'
                              : 'bg-[#FAFAFA] border-stone-200/80 text-charcoal/55 hover:border-charcoal/20'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Past gifts & avoid ── */}
                <div className="bg-white rounded-[26px] border border-stone-200/70 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden">
                  <div className="px-5 py-5 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/45 px-1 block mb-0.5">Past gifts & things to avoid</label>
                      <p className="text-[11px] text-charcoal/35 px-1 mb-3 leading-relaxed">Comma-separated — we'll never suggest these again.</p>
                    </div>
                    <input
                      type="text"
                      value={pastAndAvoid}
                      onChange={(e) => setPastAndAvoid(e.target.value)}
                      className="w-full bg-[#FAFAFA]/90 rounded-2xl px-4 py-3 text-[14px] text-charcoal focus:outline-none border border-stone-200/90 focus:border-[#DE6573]/35 focus:ring-2 focus:ring-[#DE6573]/10 transition-all placeholder:text-charcoal/28"
                      placeholder="e.g. silk scarf, candles, generic gadgets…"
                    />
                  </div>
                </div>

                {/* ── Personal notes ── */}
                <div className="bg-white rounded-[26px] border border-stone-200/70 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden">
                  <div className="px-5 py-5">
                    <label className="text-[11px] font-semibold text-charcoal/45 mb-1.5 flex items-center justify-between px-1">
                      Anything else we should know?
                      <span className={`text-[10px] font-semibold tabular-nums ${notes.length >= 450 ? 'text-amber-500' : 'text-charcoal/25'}`}>{notes.length}/500</span>
                    </label>
                    <p className="text-[11px] text-charcoal/35 mb-3 px-1 leading-relaxed">
                      Quirks, allergies, hobbies, anything useful.
                    </p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                      className="w-full bg-[#FAFAFA]/90 rounded-2xl px-4 py-3.5 text-[14px] text-charcoal focus:outline-none border border-stone-200/90 focus:border-[#DE6573]/35 focus:ring-2 focus:ring-[#DE6573]/10 transition-all min-h-[100px] resize-none placeholder:text-charcoal/28 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                      placeholder="e.g. Obsessed with anything vintage. Already has too many books…"
                    />
                  </div>
                </div>

                </motion.div>
                )}

              </form>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 pt-4 pb-8 bg-gradient-to-t from-[#FAFAFB] to-white border-t border-stone-100/90">
              {wizardStep === 3 && (
                <div className="flex items-start gap-3 rounded-[20px] bg-[#F3EEFF]/95 border border-[#E9E0FC] px-4 py-3.5 mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <Sparkles className="w-5 h-5 text-[#8B7BC9] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <p className="text-[12px] text-charcoal/58 leading-relaxed">
                    The more you share, the better we personalize gift ideas for this person.
                  </p>
                </div>
              )}

              <div className="flex gap-3 items-stretch">
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="min-w-[88px] rounded-[22px] border border-stone-200 bg-white px-4 py-3.5 text-[13px] font-semibold text-charcoal/65 shadow-sm active:scale-[0.98] transition-all hover:bg-stone-50 cursor-pointer"
                  >
                    Back
                  </button>
                )}
                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 rounded-[26px] py-4 px-5 flex items-center justify-center gap-2 font-bold text-[13px] uppercase tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(180,100,120,0.38)] active:scale-[0.98] transition-all cursor-pointer"
                    style={{
                      background: "linear-gradient(145deg, #D4989E 0%, #C07888 50%, #A86878 100%)",
                    }}
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 opacity-95" strokeWidth={2.5} />
                  </button>
                ) : (
                  <button
                    form="add-person-form"
                    type="submit"
                    className="flex-1 rounded-[26px] py-4 px-5 flex items-center justify-between gap-3 font-bold text-[12px] uppercase tracking-[0.2em] text-white shadow-[0_8px_24px_rgba(180,100,120,0.38)] active:scale-[0.98] transition-all cursor-pointer"
                    style={{
                      background: "linear-gradient(145deg, #D4989E 0%, #C07888 50%, #A86878 100%)",
                    }}
                  >
                    <Lock className="w-[18px] h-[18px] opacity-95 shrink-0" strokeWidth={2.25} />
                    <span className="flex-1 text-center">Seal profile</span>
                    <div className="w-10 h-10 rounded-full bg-white/18 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
