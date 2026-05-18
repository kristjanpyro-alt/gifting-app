import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CalendarDays, MessageSquare, Sparkles, ChevronRight, Gift, Tag } from "lucide-react";
import { Occasion, Person } from "../types";
import {
  MILESTONE_TYPES,
  MILESTONE_EMOJIS,
  MONTHS,
  calculateDaysRemaining,
} from "../constants";
import WheelDatePicker from "./WheelDatePicker";
import CustomSelect from "./CustomSelect";

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (occasion: Occasion) => void;
  people: Person[];
  existingOccasions: Occasion[];
}

const MILESTONE_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  Wedding:      { bg: "#FFF0F3", text: "#E06B8A", border: "#FFC5D5" },
  Engagement:   { bg: "#F5F0FF", text: "#7C3AED", border: "#DDD6FE" },
  Graduation:   { bg: "#EEF3FF", text: "#3B82F6", border: "#BFDBFE" },
  "New Baby":   { bg: "#F0FDF4", text: "#22C55E", border: "#BBF7D0" },
  Housewarming: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  Custom:       { bg: "#F5F5F5", text: "#6B7280", border: "#E5E7EB" },
};

export default function MilestoneModal({
  isOpen, onClose, onAdd, people, existingOccasions,
}: MilestoneModalProps) {
  const [milestoneTitle, setMilestoneTitle]       = useState("");
  const [milestoneType, setMilestoneType]         = useState<string>("Wedding");
  const [milestoneDate, setMilestoneDate]         = useState("");
  const [milestonePersonId, setMilestonePersonId] = useState("");
  const [customMilestoneType, setCustomMilestoneType] = useState("");

  const reset = () => {
    setMilestoneTitle(""); setMilestoneType("Wedding");
    setMilestoneDate(""); setMilestonePersonId(""); setCustomMilestoneType("");
  };

  const handleClose = () => { onClose(); reset(); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!milestoneDate) return;

    const d = new Date(milestoneDate);
    const m = d.getMonth();
    const y = d.getFullYear();
    const milestoneTypeKeys = Object.keys(MILESTONE_EMOJIS);
    const count = existingOccasions.filter((o) => {
      const od = new Date(o.date);
      return od.getMonth() === m && od.getFullYear() === y && milestoneTypeKeys.includes(o.type as string);
    }).length;

    if (count >= 3) {
      alert("Maximum 3 milestones allowed per month to keep your archive meaningful.");
      return;
    }

    const type = milestoneType === "Custom" ? customMilestoneType : milestoneType;
    const [, monthNum, dayNum] = milestoneDate.split("-").map(Number);
    const assignedPerson = people.find((p) => p.id === milestonePersonId);

    const newOccasion: Occasion = {
      id: "m-" + Date.now(),
      personId: milestonePersonId || "general",
      title: milestoneTitle || (assignedPerson ? `${assignedPerson.name}'s ${type}` : type),
      type: type as any,
      date: milestoneDate,
      month: MONTHS[monthNum - 1],
      day: dayNum,
      daysRemaining: calculateDaysRemaining(milestoneDate),
      emoji: MILESTONE_EMOJIS[type] || "✨",
    };

    onAdd(newOccasion);
    reset();
  };

  const selectedPerson = people.find((p) => p.id === milestonePersonId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end">
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
            className="relative w-full bg-white rounded-t-[36px] max-h-[94dvh] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.1)] z-10"
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-charcoal/12 rounded-full mx-auto mt-3 flex-shrink-0" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-5 w-9 h-9 rounded-full bg-surface-dim flex items-center justify-center text-charcoal/40 hover:text-charcoal/70 transition-colors z-10 cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/12 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-[22px] font-bold text-charcoal tracking-tight leading-tight">
                    Log Milestone
                  </h2>
                  <p className="text-[13px] text-on-surface-variant mt-0.5">
                    Capture life's meaningful moments ✨
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
              <form id="milestone-form" onSubmit={handleSubmit} className="space-y-6">

                {/* ── 1. Occasion type ── */}
                <div>
                  <p className="text-[14px] font-bold text-charcoal mb-3">1. What's the occasion?</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(MILESTONE_TYPES as readonly string[]).map((type) => {
                      const cfg = MILESTONE_CONFIG[type] ?? MILESTONE_CONFIG.Custom;
                      const isSelected = milestoneType === type;
                      const emoji = type === "Custom" ? null : MILESTONE_EMOJIS[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setMilestoneType(type)}
                          className="relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-[20px] border-[1.5px] transition-all active:scale-[0.97] cursor-pointer"
                          style={{
                            backgroundColor: isSelected ? cfg.bg : "#FAFAFA",
                            borderColor: isSelected ? cfg.border : "#F0F0F0",
                          }}
                        >
                          {/* Selected checkmark */}
                          {isSelected && (
                            <div
                              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: cfg.text }}
                            >
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}

                          {emoji ? (
                            <span className="text-[32px] leading-none">{emoji}</span>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] font-black"
                              style={{ backgroundColor: cfg.bg, color: cfg.text }}
                            >
                              ···
                            </div>
                          )}
                          <span
                            className="text-[11px] font-bold leading-tight text-center"
                            style={{ color: isSelected ? cfg.text : "#9CA3AF" }}
                          >
                            {type}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom type input */}
                  {milestoneType === "Custom" && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3"
                    >
                      <div className="flex items-center gap-3 bg-surface-dim/50 rounded-2xl px-4 py-3 border border-outline-variant/20">
                        <Tag className="w-4 h-4 text-charcoal/40 flex-shrink-0" strokeWidth={1.75} />
                        <input
                          required
                          value={customMilestoneType}
                          onChange={(e) => setCustomMilestoneType(e.target.value)}
                          placeholder="Event name (e.g. Retirement)"
                          className="flex-grow bg-transparent text-[14px] font-medium text-charcoal focus:outline-none placeholder:text-charcoal/25"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── 2. Who is this for? ── */}
                <div>
                  <p className="text-[14px] font-bold text-charcoal mb-3">2. Who is this for?</p>
                  <CustomSelect
                    variant="rich"
                    value={milestonePersonId}
                    onChange={setMilestonePersonId}
                    options={[
                      { value: "", label: "No specific person", sublabel: "Optional — leave blank for a general event" },
                      ...people.map((p) => ({
                        value: p.id,
                        label: p.name,
                        sublabel: p.relation,
                        emoji: p.emoji,
                      })),
                    ]}
                  />
                </div>

                {milestonePersonId === '' && (
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200/70 rounded-2xl">
                    <span className="text-base leading-none mt-0.5">⚠️</span>
                    <p className="text-[12px] text-amber-800/80 leading-snug">
                      Without a linked profile, gift ideas won't be available for this event. Link a person above to enable AI suggestions.
                    </p>
                  </div>
                )}

                {/* ── 3. Add the details ── */}
                <div>
                  <p className="text-[14px] font-bold text-charcoal mb-3">3. Add the details</p>
                  <div className="space-y-3">
                    {/* Date */}
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/45 mb-1.5 flex items-center gap-1.5 px-1">
                        <CalendarDays className="w-3 h-3 text-primary/60" strokeWidth={2} />
                        Date
                      </label>
                      <div className="bg-rose-50/50 rounded-2xl border border-rose-100/50 overflow-hidden">
                        <WheelDatePicker value={milestoneDate} onChange={setMilestoneDate} defaultYear={new Date().getFullYear()} />
                      </div>
                    </div>

                    {/* Context */}
                    <div>
                      <label className="text-[11px] font-semibold text-charcoal/45 mb-1.5 flex items-center gap-1.5 px-1">
                        <MessageSquare className="w-3 h-3 text-charcoal/40" strokeWidth={2} />
                        Context
                        <span className="text-charcoal/30 font-normal">(optional)</span>
                      </label>
                      <div className="relative bg-surface-dim/50 rounded-2xl border border-outline-variant/20 focus-within:border-primary/30 transition-all">
                        <textarea
                          value={milestoneTitle}
                          onChange={(e) => setMilestoneTitle(e.target.value.slice(0, 160))}
                          placeholder="Who is it for, what's happening, why it's special…"
                          rows={3}
                          className="w-full bg-transparent px-4 pt-3 pb-7 text-[14px] font-medium text-charcoal focus:outline-none resize-none placeholder:text-charcoal/25"
                        />
                        <span className="absolute bottom-2.5 right-3.5 text-[11px] text-charcoal/30 font-semibold pointer-events-none">
                          {milestoneTitle.length}/160
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 pt-3 pb-8 border-t border-outline-variant/10 bg-white">
              {/* Tip banner */}
              <div className="flex items-center gap-3 bg-rose-50/80 rounded-[18px] px-4 py-3 mb-3">
                <Gift className="w-4 h-4 text-primary/50 flex-shrink-0" strokeWidth={1.5} />
                <p className="text-[12px] text-charcoal/55 leading-snug flex-grow">
                  The more details you add, the better gift ideas we can suggest.
                </p>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-primary/40" strokeWidth={1.5} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/25" />
                </div>
              </div>

              {/* Save button */}
              <button
                form="milestone-form"
                type="submit"
                className="w-full rounded-[28px] py-4 px-5 flex items-center active:scale-[0.98] transition-all cursor-pointer shadow-[0_8px_24px_rgba(180,100,120,0.38)]"
                style={{ background: "linear-gradient(145deg, #D4989E 0%, #C07888 50%, #A86878 100%)" }}
              >
                <CalendarDays className="w-5 h-5 text-white/80 flex-shrink-0 ml-1" strokeWidth={1.75} />
                <span className="flex-grow text-center text-[13px] font-bold uppercase tracking-[0.22em] text-white">
                  Save Milestone
                </span>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
