import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const ITEM_H = 38;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CUR_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CUR_YEAR - 1939 + 11 }, (_, i) => String(1940 + i));

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Single scroll-wheel column ──────────────────────────────────────────────
function WheelCol({
  items, selectedIdx, onSelect, width = 'flex-1',
}: {
  items: string[]; selectedIdx: number; onSelect: (i: number) => void; width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fromCode = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Programmatically scroll when selectedIdx changes from outside
  useEffect(() => {
    if (!ref.current) return;
    fromCode.current = true;
    ref.current.scrollTo({ top: selectedIdx * ITEM_H, behavior: 'smooth' });
    const t = setTimeout(() => { fromCode.current = false; }, 500);
    return () => clearTimeout(t);
  }, [selectedIdx]);

  // Non-passive wheel handler — moves exactly 1 item per tick instead of ~3
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.deltaY > 0 ? 1 : -1;
      const cur = Math.round(el.scrollTop / ITEM_H);
      const next = Math.max(0, Math.min(cur + dir, items.length - 1));
      fromCode.current = true;
      el.scrollTo({ top: next * ITEM_H, behavior: 'smooth' });
      onSelect(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [items.length, onSelect]);

  const handleScroll = useCallback(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (!ref.current || fromCode.current) return;
      const raw = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(raw, items.length - 1));
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
      onSelect(clamped);
    }, 80);
  }, [items.length, onSelect]);

  return (
    <div className={`relative overflow-hidden ${width}`} style={{ height: ITEM_H * 5 }}>
      {/* Selection highlight band */}
      <div
        className="absolute inset-x-0 z-10 pointer-events-none border-y border-black/[0.07]"
        style={{ top: ITEM_H * 2, height: ITEM_H, backgroundColor: 'rgba(0,0,0,0.025)' }}
      />
      {/* Fade top */}
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: ITEM_H * 2, background: 'linear-gradient(to bottom, white 10%, transparent)' }} />
      {/* Fade bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: ITEM_H * 2, background: 'linear-gradient(to top, white 10%, transparent)' }} />

      {/* Scroll container */}
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{ height: ITEM_H * 5, overflowY: 'scroll', scrollSnapType: 'y mandatory' }}
        className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((item, i) => (
          <div
            key={i}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className={`flex items-center justify-center select-none transition-all duration-100 ${
              i === selectedIdx
                ? 'font-semibold text-[15px] text-charcoal'
                : Math.abs(i - selectedIdx) === 1
                  ? 'text-[13px] text-charcoal/35'
                  : 'text-[12px] text-charcoal/15'
            }`}
          >
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
interface Props {
  value: string;       // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  label?: string;
  labelClassName?: string;
}

export default function WheelDatePicker({ value, onChange, label, labelClassName }: Props) {
  const [open, setOpen] = useState(false);
  const touched = useRef(false);

  // Parse stored YYYY-MM-DD
  const parse = (v: string) => {
    if (!v) return { d: 0, m: 0, yIdx: YEARS.indexOf(String(CUR_YEAR - 20)) };
    const [y, mo, da] = v.split('-').map(Number);
    return { d: da - 1, m: mo - 1, yIdx: Math.max(0, YEARS.indexOf(String(y))) };
  };

  const initial = parse(value);
  const [dayIdx, setDayIdx]     = useState(initial.d);
  const [monthIdx, setMonthIdx] = useState(initial.m);
  const [yearIdx, setYearIdx]   = useState(initial.yIdx >= 0 ? initial.yIdx : YEARS.length - 21);

  // Reparse if value changes from outside (e.g. reset)
  useEffect(() => {
    const p = parse(value);
    setDayIdx(p.d);
    setMonthIdx(p.m);
    setYearIdx(p.yIdx >= 0 ? p.yIdx : YEARS.length - 21);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const year = Number(YEARS[yearIdx]);
  const maxDays = daysInMonth(monthIdx, year);
  const clampedDay = Math.min(dayIdx, maxDays - 1);
  const dayItems = Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, '0'));

  // Build ISO string from current wheel state
  const buildValue = useCallback(() => {
    const y = YEARS[yearIdx];
    const m = String(monthIdx + 1).padStart(2, '0');
    const d = String(clampedDay + 1).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [yearIdx, monthIdx, clampedDay]);

  // Emit onChange live whenever wheels move
  const handleDayChange = useCallback((i: number) => {
    touched.current = true;
    setDayIdx(i);
  }, []);
  const handleMonthChange = useCallback((i: number) => {
    touched.current = true;
    setMonthIdx(i);
  }, []);
  const handleYearChange = useCallback((i: number) => {
    touched.current = true;
    setYearIdx(i);
  }, []);

  // Fire onChange after each change (debounced so it doesn't spam on fast scroll)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!touched.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onChange(buildValue());
    }, 150);
    return () => clearTimeout(saveTimer.current);
  }, [dayIdx, monthIdx, yearIdx, buildValue, onChange]);

  // When closing without CONFIRM, flush any pending save immediately
  const handleClose = () => {
    clearTimeout(saveTimer.current);
    if (touched.current) onChange(buildValue());
    setOpen(false);
  };

  // Display uses live internal state — placeholder only if never touched and no value
  const hasValue = !!value || touched.current;
  const displayValue = hasValue
    ? `${String(clampedDay + 1).padStart(2, '0')} / ${MONTH_NAMES[monthIdx]} / ${YEARS[yearIdx]}`
    : 'DD / MM / YYYY';

  const lCls = labelClassName ?? 'block text-[9px] font-black uppercase tracking-[0.2em] text-charcoal/30 mb-2';

  return (
    <div>
      {label && <label className={lCls}>{label}</label>}

      <button
        type="button"
        onClick={() => open ? handleClose() : setOpen(true)}
        className={`w-full bg-white px-4 py-3 rounded-2xl border text-[13px] font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
          open ? 'border-charcoal/30 shadow-sm' : 'border-black/[0.07]'
        }`}
      >
        <span className={hasValue ? 'text-charcoal' : 'text-charcoal/25'}>{displayValue}</span>
        <span className={`text-[10px] transition-transform duration-200 text-charcoal/30 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
              {/* Column labels */}
              <div className="flex border-b border-black/[0.05] px-1">
                {['Day', 'Month', 'Year'].map(l => (
                  <div key={l} className="flex-1 py-2 text-center text-[9px] font-black uppercase tracking-widest text-charcoal/25">{l}</div>
                ))}
              </div>

              {/* Wheel columns */}
              <div className="flex divide-x divide-black/[0.04]">
                <WheelCol items={dayItems}   selectedIdx={clampedDay} onSelect={handleDayChange} />
                <WheelCol items={MONTH_FULL} selectedIdx={monthIdx}   onSelect={handleMonthChange} />
                <WheelCol items={YEARS}      selectedIdx={yearIdx}    onSelect={handleYearChange} />
              </div>

              {/* Done — closes and flushes save */}
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 text-[11px] font-bold uppercase tracking-widest border-t border-black/[0.05] text-charcoal/50 hover:text-charcoal hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Done — {String(clampedDay + 1).padStart(2, '0')} / {MONTH_NAMES[monthIdx]} / {YEARS[yearIdx]}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
