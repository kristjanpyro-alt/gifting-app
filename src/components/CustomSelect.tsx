import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, User } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  emoji?: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  /** 'simple' = text-only single-line; 'rich' = avatar + label + sublabel */
  variant?: 'simple' | 'rich';
  /** Tailwind classes for the trigger button (so it can match input styles) */
  triggerClassName?: string;
}

export default function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  variant = 'simple',
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const selected = options.find(o => o.value === value);

  const triggerBase =
    variant === 'rich'
      ? 'flex items-center gap-3 bg-rose-50/60 rounded-2xl px-4 py-3.5 border border-rose-100/50 w-full text-left active:scale-[0.99] transition-transform cursor-pointer'
      : 'w-full bg-white px-4 py-3 rounded-2xl border border-black/[0.07] text-[13px] font-medium text-charcoal flex items-center justify-between gap-2 active:scale-[0.99] transition-all cursor-pointer hover:border-charcoal/20';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={triggerClassName ?? triggerBase}
      >
        {variant === 'rich' ? (
          <>
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-xl">
              {selected?.emoji
                ? <span>{selected.emoji}</span>
                : <User className="w-5 h-5 text-primary/60" strokeWidth={1.5} />}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-[14px] font-semibold text-charcoal truncate">
                {selected?.label ?? placeholder}
              </p>
              {(selected?.sublabel || !selected) && (
                <p className="text-[11px] text-on-surface-variant truncate">
                  {selected?.sublabel ?? 'Optional — leave blank for a general event'}
                </p>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-charcoal/35 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </>
        ) : (
          <>
            <span className={selected ? 'text-charcoal' : 'text-charcoal/30'}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-charcoal/40 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-[20px] border border-black/[0.06] shadow-[0_18px_48px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden max-h-[280px] overflow-y-auto"
          >
            {options.map((opt) => {
              const isSel = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSel ? 'bg-rose-50/60' : 'hover:bg-stone-50'
                  }`}
                >
                  {variant === 'rich' && (
                    <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center flex-shrink-0 text-base">
                      {opt.emoji
                        ? <span>{opt.emoji}</span>
                        : <User className="w-4 h-4 text-primary/55" strokeWidth={1.5} />}
                    </div>
                  )}
                  <div className="flex-grow min-w-0">
                    <p className={`text-[13px] truncate ${isSel ? 'font-bold text-charcoal' : 'font-medium text-charcoal/85'}`}>
                      {opt.label}
                    </p>
                    {opt.sublabel && (
                      <p className="text-[11px] text-charcoal/45 truncate">{opt.sublabel}</p>
                    )}
                  </div>
                  {isSel && <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
