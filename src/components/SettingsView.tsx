import { useState } from "react";
import { Check, Download, Trash2, Bell } from "lucide-react";
import { Person, Occasion } from "../types";
import { StorageService } from "../services/StorageService";

interface SettingsViewProps {
  people: Person[];
  occasions: Occasion[];
}

const TIMING_OPTIONS = [
  { days: 30, label: "1 month before",  sub: "Plan way ahead",    emoji: "📅" },
  { days: 7,  label: "1 week before",   sub: "Sweet spot",        emoji: "🎯" },
  { days: 3,  label: "3 days before",   sub: "Last-minute me",    emoji: "⚡" },
];

export default function SettingsView({ people, occasions }: SettingsViewProps) {
  const [timings, setTimings] = useState<number[]>(() => StorageService.getNotificationTimings());
  const [toast, setToast] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  const toggleTiming = (days: number) => {
    const next = timings.includes(days) ? timings.filter(d => d !== days) : [...timings, days];
    if (next.length === 0) return; // always keep at least one
    setTimings(next);
    StorageService.setNotificationTimings(next);
    showToast("Reminder timing saved.");
  };

  const handleBackup = () => {
    const data = JSON.stringify({ people, occasions }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `giftin-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded.");
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="pt-20 px-5 pb-32 max-w-lg mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] bg-charcoal text-white text-[12px] font-semibold px-5 py-2.5 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h2 className="font-headline text-3xl font-extrabold italic text-charcoal tracking-tight">Settings</h2>
        <p className="text-charcoal/40 text-sm mt-1">{people.length} {people.length === 1 ? 'person' : 'people'} · {occasions.length} events tracked</p>
      </div>

      {/* Reminder timing */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Bell className="w-3.5 h-3.5 text-dusty-rose" strokeWidth={2} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-charcoal/50">When to remind you</h3>
        </div>
        <div className="bg-white rounded-[24px] border border-black/[0.05] overflow-hidden">
          {TIMING_OPTIONS.map((opt, i) => {
            const active = timings.includes(opt.days);
            return (
              <div key={opt.days}>
                {i > 0 && <div className="mx-4 h-px bg-black/[0.04]" />}
                <button
                  onClick={() => toggleTiming(opt.days)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50/70 active:bg-stone-100/70 transition-colors text-left"
                >
                  <span className="text-xl flex-shrink-0">{opt.emoji}</span>
                  <div className="flex-grow min-w-0">
                    <p className="text-[13px] font-semibold text-charcoal">{opt.label}</p>
                    <p className="text-[11px] text-charcoal/40 mt-0.5">{opt.sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    active ? 'border-dusty-rose bg-dusty-rose' : 'border-charcoal/20'
                  }`}>
                    {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-charcoal/30 mt-2 px-1">
          We'll remind you before each upcoming event so you're never scrambling last second.
        </p>
      </section>

      {/* Data */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Download className="w-3.5 h-3.5 text-charcoal/40" strokeWidth={2} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-charcoal/50">Your data</h3>
        </div>
        <div className="bg-white rounded-[24px] border border-black/[0.05] overflow-hidden">
          <button
            onClick={handleBackup}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-stone-50/70 active:bg-stone-100/70 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center flex-shrink-0">
              <Download className="w-4 h-4 text-charcoal/50" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-charcoal">Download backup</p>
              <p className="text-[11px] text-charcoal/40 mt-0.5">Save your people and ideas as a .json file</p>
            </div>
          </button>

          <div className="mx-4 h-px bg-black/[0.04]" />

          <button
            onClick={handleClearAll}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-50/50 active:bg-red-50 transition-colors text-left"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${confirmClear ? 'bg-red-100' : 'bg-stone-50'}`}>
              <Trash2 className={`w-4 h-4 transition-colors ${confirmClear ? 'text-red-500' : 'text-charcoal/50'}`} strokeWidth={1.75} />
            </div>
            <div>
              <p className={`text-[13px] font-semibold transition-colors ${confirmClear ? 'text-red-500' : 'text-charcoal'}`}>
                {confirmClear ? 'Tap again to confirm — this cannot be undone' : 'Clear all data'}
              </p>
              <p className="text-[11px] text-charcoal/40 mt-0.5">Removes all people, events and saved ideas</p>
            </div>
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-charcoal/20 font-black text-[9px] uppercase tracking-[0.3em] pt-4 border-t border-outline-variant/10">
        GIFTIN v1.0.5 · All data stored locally on this device
      </div>
    </div>
  );
}
