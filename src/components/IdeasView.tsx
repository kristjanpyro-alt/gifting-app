import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Sparkles,
  Loader2,
  Lightbulb,
  Gift,
  History,
  Plus,
  Heart,
  ThumbsDown,
  ShoppingBag,
  Sprout,
  MapPin,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { GiftIdea, Person, Occasion, IdeasOccasionFocus } from '../types';
import { curateGiftIdeas } from '../services/geminiService';
import { upcomingSystemOccasions } from '../data/holidays';
import {
  buildUpcomingGiftEventsForPerson,
  batchesForGiftEvent,
  latestIdeasForGiftEvent,
} from '../utils/giftEventOptions';

function ideaOneLiner(i: GiftIdea): string {
  const d = (i.description || "").replace(/\s+/g, " ").trim().slice(0, 160);
  const t = i.title.trim();
  return d ? `${t}: ${d}` : t;
}

function collectSeenForEvent(
  person: Person,
  onScreen: GiftIdea[],
  occasionKey: string | null
): { seenIdeaTitles: string[]; seenIdeaBriefs: string[] } {
  const batches = batchesForGiftEvent(person, occasionKey);
  const fromHistoryTitles = batches.flatMap((b) => b.ideas.map((i) => i.title.trim())).filter(Boolean);
  const fromHistoryBriefs = batches.flatMap((b) => b.ideas.map(ideaOneLiner)).filter(Boolean);
  const fromUiTitles = onScreen.map((i) => i.title.trim()).filter(Boolean);
  const fromUiBriefs = onScreen.map(ideaOneLiner).filter(Boolean);
  return {
    seenIdeaTitles: [...new Set([...fromHistoryTitles, ...fromUiTitles])],
    seenIdeaBriefs: [...new Set([...fromHistoryBriefs, ...fromUiBriefs])],
  };
}

/** All briefs from prior batches for OTHER occasions for this person. */
function collectCrossOccasionBriefs(person: Person, currentOccasionKey: string | null): string[] {
  const history = person.generationHistory || [];
  const others = history.filter((b) => b.occasionKey && b.occasionKey !== currentOccasionKey);
  const briefs = others.flatMap((b) => {
    const label = b.occasionKey ? `[${b.occasionKey}] ` : '';
    return b.ideas.map((i) => `${label}${ideaOneLiner(i)}`);
  }).filter(Boolean);
  return [...new Set(briefs)];
}

interface IdeasViewProps {
  onBack: () => void;
  personId: string | null;
  /** System holiday row (e.g. Mother's Day) -- not stored in occasions. */
  occasionFocus: IdeasOccasionFocus | null;
  people: Person[];
  occasions: Occasion[];
  onUpdatePerson: (person: Person) => void;
  onRecordIdeaGeneration: (
    personId: string,
    batch: NonNullable<Person['generationHistory']>[number],
    latestIdeas: GiftIdea[]
  ) => void;
  onSelectPerson: (id: string) => void;
  /** Opens add-person flow (e.g. dashed ADD chip on profile strip) */
  onRequestAddPerson?: () => void;
  /** Pre-select a specific personal occasion by ID when navigating from ProfileView. */
  initialOccasionId?: string | null;
}

function EventCalTile({
  month,
  day,
  accent,
}: {
  month: string;
  day: number;
  accent: string;
}) {
  const safeDay = day > 0 ? day : 1;
  return (
    <div className="flex-shrink-0 w-[46px] rounded-xl overflow-hidden border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div
        className="py-1 text-center"
        style={{ backgroundColor: accent }}
      >
        <p className="text-[8px] font-black uppercase tracking-wider text-white leading-none">
          {month}
        </p>
      </div>
      <div className="bg-white py-1.5 text-center">
        <p className="text-[17px] font-black text-charcoal leading-none tabular-nums">{safeDay}</p>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source?: string }) {
  const s = source?.toLowerCase() || '';
  let label = source || 'Unknown';
  let Icon: typeof ShoppingBag = ShoppingBag;
  let bg = '#F3F4F6';
  let fg = '#6B7280';

  if (s.includes('amazon'))                                  { Icon = ShoppingBag; bg = '#FFF4E0'; fg = '#B45309'; label = 'Amazon'; }
  else if (s.includes('etsy'))                               { Icon = Sprout;      bg = '#FFE8DD'; fg = '#C2410C'; label = 'Etsy'; }
  else if (s.includes('local'))                              { Icon = MapPin;      bg = '#E0F2FE'; fg = '#0369A1'; label = 'Local'; }
  else if (s.includes('subscription'))                       { Icon = RefreshCw;   bg = '#EDE9FE'; fg = '#6D28D9'; label = 'Subscription'; }
  else if (s.includes('trending') || s.includes('boutique')){ Icon = Flame;       bg = '#FEE2E2'; fg = '#B91C1C'; label = 'Trending'; }

  return (
    <span
      className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full"
      style={{ backgroundColor: bg }}
    >
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center"
        style={{ backgroundColor: fg }}
      >
        <Icon className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
      </span>
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: fg }}>{label}</span>
    </span>
  );
}

interface SuggestionCardProps {
  key?: string | number;
  suggestion: GiftIdea;
  person: Person;
  onSave: (gift: GiftIdea) => void;
  isLiked: boolean;
  isDisliked: boolean;
  onLike: () => void;
  onDislike: () => void;
}

function SuggestionCard({ suggestion, person, onSave, isLiked, isDisliked, onLike, onDislike }: SuggestionCardProps) {
  const isSaved = person.savedGifts.some(g => g.title === suggestion.title);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgOk = !!suggestion.imageUrl && !imgError && imgLoaded;
  const shopUrl = suggestion.productUrl || `https://www.google.com/search?q=${encodeURIComponent(suggestion.title + ' buy')}`;
  const themeColor = person.themeColor || '#C42040';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white rounded-[28px] border border-black/[0.05] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.05)]">

        {/* 1. "Why this gift" -- hero section, warm tinted */}
        {suggestion.rationale && (
          <div className="px-5 pt-5 pb-5" style={{ backgroundColor: `${themeColor}09` }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: themeColor }} strokeWidth={2} />
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: themeColor }}>
                Why {person.name.split(' ')[0]} will love this
              </p>
            </div>
            <p className="text-[14px] text-charcoal/80 leading-relaxed font-medium">
              {suggestion.rationale}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-black/[0.05]" />

        {/* 2. Title + product visual */}
        <div className="px-5 pt-4 pb-2">
          <h4 className="text-[18px] font-bold text-charcoal leading-snug tracking-tight">
            {suggestion.title}
          </h4>
        </div>

        {/* Image with floating like/dislike overlay */}
        <div className="relative mx-5 mb-4">
          <div className="flex justify-center items-center py-7 bg-stone-50/60 rounded-2xl">
            {imgOk ? (
              <img
                src={suggestion.imageUrl}
                alt={suggestion.title}
                className="w-32 h-32 object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[72px] leading-none select-none">{suggestion.emoji || '🎁'}</span>
            )}
            {/* Hidden preloader — only renders the URL once to detect load/error */}
            {suggestion.imageUrl && !imgError && !imgLoaded && (
              <img
                src={suggestion.imageUrl}
                alt=""
                aria-hidden
                className="hidden"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    setImgError(true);
                  } else {
                    setImgLoaded(true);
                  }
                }}
              />
            )}
          </div>

          {/* Love it — bottom left (saves the gift, clears dislike) */}
          <button
            type="button"
            onClick={() => {
              const willBeSaved = !isSaved;
              onSave(suggestion);
              if (willBeSaved !== isLiked) onLike();
            }}
            aria-label={isSaved ? 'Remove from saved' : 'Love and save this idea'}
            className={`absolute bottom-3 left-3 flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all active:scale-95 ${
              isSaved
                ? 'bg-rose-500 border-rose-500 text-white shadow-[0_8px_24px_rgba(244,63,94,0.45)]'
                : 'bg-white border-rose-200 text-rose-500 shadow-[0_6px_18px_rgba(0,0,0,0.10)] hover:border-rose-300 hover:bg-rose-50'
            }`}
          >
            <Heart className="w-4 h-4" strokeWidth={2.5} fill={isSaved ? 'currentColor' : 'none'} />
            <span>{isSaved ? 'Loved' : 'Love it'}</span>
          </button>

          {/* Not quite — bottom right (clears save) */}
          <button
            type="button"
            onClick={() => {
              if (isSaved) onSave(suggestion);
              onDislike();
            }}
            aria-label="Dislike this idea"
            className={`absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all active:scale-95 ${
              isDisliked
                ? 'bg-charcoal border-charcoal text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
                : 'bg-white border-stone-200 text-charcoal/55 shadow-[0_6px_18px_rgba(0,0,0,0.10)] hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <ThumbsDown className="w-4 h-4" strokeWidth={2.5} fill={isDisliked ? 'currentColor' : 'none'} />
            <span>{isDisliked ? 'Passed' : 'Not quite'}</span>
          </button>
        </div>

        {/* 3. Product description */}
        {suggestion.description && (
          <>
            <div className="mx-5 h-px bg-black/[0.05]" />
            <div className="px-5 py-4">
              <p className="text-[12px] text-charcoal/45 leading-relaxed">
                {suggestion.description}
              </p>
            </div>
          </>
        )}

        {/* Divider */}
        <div className="mx-5 h-px bg-black/[0.05]" />

        {/* 4. Footer -- price, source, buy action */}
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[26px] font-black text-charcoal tracking-tight leading-none">{suggestion.price}</span>
            <SourceBadge source={suggestion.source} />
          </div>

          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-14 px-7 bg-charcoal text-white rounded-full text-[15px] font-extrabold tracking-tight flex items-center gap-2.5 hover:bg-charcoal/85 active:scale-[0.97] transition-all cursor-pointer shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
          >
            Buy it
            <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
          </a>
        </div>

      </div>
    </div>
  );
}

export default function IdeasView({
  onBack,
  personId,
  occasionFocus,
  people,
  occasions,
  onUpdatePerson,
  onRecordIdeaGeneration,
  onSelectPerson,
  onRequestAddPerson,
  initialOccasionId,
}: IdeasViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(personId || (people.length > 0 ? people[0].id : null));
  /** Increments when this profile is newly picked -- drives one full emoji "roll" */
  const [spinVersion, setSpinVersion] = useState<Record<string, number>>({});
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const appliedNavFocusRef = useRef(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GiftIdea[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const [historyMenuPos, setHistoryMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());

  const toggleLike = (id: string, suggestion?: GiftIdea) => {
    setLikedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    setDislikedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    // Clear from persisted dislikes when becoming liked
    if (person && suggestion?.title) {
      const lower = suggestion.title.trim().toLowerCase();
      const current = person.dislikedGiftTitles || [];
      if (current.some(t => t.toLowerCase() === lower)) {
        onUpdatePerson({ ...person, dislikedGiftTitles: current.filter(t => t.toLowerCase() !== lower) });
      }
    }
  };
  const toggleDislike = (suggestion: GiftIdea) => {
    const id = suggestion.id ?? '';
    const title = suggestion.title.trim();
    setDislikedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    setLikedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    if (person && title) {
      const current = person.dislikedGiftTitles || [];
      const lower = title.toLowerCase();
      const has = current.some(t => t.toLowerCase() === lower);
      const next = has ? current.filter(t => t.toLowerCase() !== lower) : [...current, title];
      onUpdatePerson({ ...person, dislikedGiftTitles: next });
    }
  };

  const person = people.find((p) => p.id === selectedId);

  const systemOccasions = useMemo(() => upcomingSystemOccasions(new Date(), 180), [occasions]);

  const giftEventOptions = useMemo(
    () => (person ? buildUpcomingGiftEventsForPerson(person, occasions, systemOccasions) : []),
    [person, occasions, systemOccasions]
  );

  const orderedPeople = useMemo(() => {
    const sel = people.find((p) => p.id === selectedId);
    if (!sel) return people;
    return [sel, ...people.filter((p) => p.id !== selectedId)];
  }, [people, selectedId]);

  const nextOccasion = useMemo((): Occasion | undefined => {
    const row = giftEventOptions.find((o) => o.key === selectedEventKey);
    return row?.occasion;
  }, [giftEventOptions, selectedEventKey]);

  const eventBatches = useMemo(
    () => (person ? batchesForGiftEvent(person, selectedEventKey) : []),
    [person, selectedEventKey, person?.generationHistory]
  );

  // Keep the Past searches dropdown within the viewport (mobile-safe).
  useEffect(() => {
    if (!showHistoryDropdown) return;

    const place = () => {
      const btn = historyButtonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();

      const menuW = 272; // matches w-64-ish visual size
      const gap = 8;
      const estMenuH = 320;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const left = Math.min(Math.max(gap, r.right - menuW), vw - menuW - gap);
      const openUp = r.bottom + gap + estMenuH > vh && r.top - gap - estMenuH > 0;
      const top = openUp ? Math.max(gap, r.top - gap - estMenuH) : Math.min(vh - estMenuH - gap, r.bottom + gap);

      setHistoryMenuPos({ top, left });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place);
    };
  }, [showHistoryDropdown]);

  useEffect(() => {
    if (personId) setSelectedId(personId);
  }, [personId]);

  useEffect(() => {
    appliedNavFocusRef.current = false;
  }, [selectedId, initialOccasionId]);

  useEffect(() => {
    if (!person) return;
    if (giftEventOptions.length === 0) {
      setSelectedEventKey(null);
      return;
    }
    // Pre-select a specific personal occasion navigated from ProfileView
    if (initialOccasionId && !appliedNavFocusRef.current) {
      const targetKey = `p:${initialOccasionId}`;
      if (giftEventOptions.some((o) => o.key === targetKey)) {
        setSelectedEventKey(targetKey);
        appliedNavFocusRef.current = true;
        return;
      }
    }
    if (occasionFocus && occasionFocus.personId === person.id && !appliedNavFocusRef.current) {
      const y = parseInt(occasionFocus.date.split("-")[0], 10);
      const sysId = `sys-${occasionFocus.title}-${y}`;
      const k = `s:${person.id}:${sysId}`;
      if (giftEventOptions.some((o) => o.key === k)) {
        setSelectedEventKey(k);
        appliedNavFocusRef.current = true;
        return;
      }
      appliedNavFocusRef.current = true;
    }
    setSelectedEventKey((prev) =>
      prev && giftEventOptions.some((o) => o.key === prev) ? prev : giftEventOptions[0].key
    );
  }, [person?.id, giftEventOptions, occasionFocus, initialOccasionId]);

  useEffect(() => {
    if (!person) {
      setGeneratedIdeas([]);
      return;
    }
    setGeneratedIdeas(latestIdeasForGiftEvent(person, selectedEventKey));
  }, [person, selectedEventKey, person?.generationHistory]);

  // Only reset view state when switching person or event (not on every save)
  useEffect(() => {
    setActiveIndex(0);
    setViewMode("single");
  }, [person?.id, selectedEventKey]);

  const handleGenerateIdeas = async () => {
    if (!person || !selectedEventKey) return;
    const { seenIdeaTitles, seenIdeaBriefs } = collectSeenForEvent(person, generatedIdeas, selectedEventKey);
    const crossOccasionBriefs = collectCrossOccasionBriefs(person, selectedEventKey);
    const lovedTitles = (person.savedGifts || []).map((g) => g.title.trim()).filter(Boolean);
    const dislikedTitles = (person.dislikedGiftTitles || []).map((t) => t.trim()).filter(Boolean);
    setIsGenerating(true);
    setGeneratedIdeas([]);
    setError(null);

    try {
      const mappedIdeas = await curateGiftIdeas(person, nextOccasion, {
        seenIdeaTitles,
        seenIdeaBriefs,
        crossOccasionBriefs,
        lovedTitles,
        dislikedTitles,
      });

      setGeneratedIdeas(mappedIdeas);

      const batchId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `h-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      onRecordIdeaGeneration(person.id, {
        id: batchId,
        date: new Date().toISOString(),
        ideas: mappedIdeas,
        occasionKey: selectedEventKey,
      }, mappedIdeas);
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong. tap to try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualAdd = () => {
    if (!person || !manualTitle.trim()) return;
    const manualGift: GiftIdea = {
      id: 'g-' + Date.now(),
      title: manualTitle.trim(),
      price: manualPrice.trim() || 'Unknown',
      imageUrl: '',
      emoji: '🎁',
      category: 'Saved',
      source: 'Online',
      description: 'Manually added to GIFTIN.',
    };
    onUpdatePerson({ ...person, savedGifts: [...person.savedGifts, manualGift] });
    setSaveMessage(`Saved "${manualGift.title}".`);
    setTimeout(() => setSaveMessage(null), 3000);
    setManualTitle('');
    setManualPrice('');
    setShowManualAdd(false);
  };

  const handleSaveGift = (gift: GiftIdea) => {
    if (!person) return;
    const isAlreadySaved = person.savedGifts.some(g => g.title === gift.title);
    if (isAlreadySaved) {
      // Remove if already saved (toggle behavior)
      const updatedPerson: Person = {
        ...person,
        savedGifts: person.savedGifts.filter(g => g.title !== gift.title)
      };
      onUpdatePerson(updatedPerson);
      setSaveMessage(`Removed from saved ideas.`);
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    const updatedPerson: Person = {
      ...person,
      savedGifts: [...person.savedGifts, { ...gift, id: 'g-' + Date.now(), category: 'Saved' }]
    };
    onUpdatePerson(updatedPerson);
    setSaveMessage(`Saved for ${person.name.split(' ')[0]} ✓`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Sync selectedId when people list changes and nothing is selected
  useEffect(() => {
    if (!selectedId && people.length > 0) {
      setSelectedId(people[0].id);
    }
  }, [people, selectedId]);

  const allSuggestions = [...generatedIdeas];

  if (people.length === 0) {
    return (
      <div className="pt-24 px-6 text-center">
        <div className="text-5xl mb-4">🎁</div>
        <h2 className="font-headline text-xl font-bold text-charcoal">No one to shop for yet</h2>
        <p className="text-charcoal/45 text-sm mt-2 leading-relaxed">Add someone from the People tab and we'll find gift ideas tailored to them.</p>
      </div>
    );
  }

  if (!person) return null;

  const searchBlurb = !selectedEventKey
    ? "Select an occasion above to unlock tailored gift ideas."
    : "We'll match their style and budget — tap below to search.";
  const firstName = person.name.split(' ')[0];

  return (
    <div className="pt-4 pb-48 px-4 sm:px-6 max-w-2xl mx-auto overflow-x-hidden bg-[linear-gradient(180deg,#fffdfc_0%,#faf7f8_48%,#f5f2f3_100%)]">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-charcoal tracking-tight leading-snug font-headline">
          Gift ideas for
        </h1>
        <p className="text-[12px] text-charcoal/38 mt-1.5 mb-5 leading-snug">
          Curated picks &amp; reminders for everyone you shop for
        </p>

        {/* Profiles + optional ADD */}
        <LayoutGroup id="ideas-profile-strip">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 py-3 items-start">
            {orderedPeople.map((p) => {
              const isSel = selectedId === p.id;
              const spins = spinVersion[p.id] ?? 0;
              const accent = p.themeColor || '#C42040';
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  layout
                  transition={{
                    layout: {
                      type: 'spring',
                      stiffness: 420,
                      damping: 32,
                      mass: 0.85,
                    },
                  }}
                  onClick={() => {
                    if (p.id !== selectedId) {
                      setSpinVersion((v) => ({ ...v, [p.id]: (v[p.id] ?? 0) + 1 }));
                    }
                    setSelectedId(p.id);
                    onSelectPerson(p.id);
                    setError(null);
                  }}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 group outline-none ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                >
                  <motion.div
                    layout
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center font-headline font-extrabold text-lg overflow-hidden transition-transform duration-300 ease-out ${
                      isSel
                        ? 'text-white ring-4 scale-110 shadow-[0_14px_40px_rgba(196,32,64,0.18)]'
                        : 'bg-white/80 backdrop-blur-md text-charcoal/60 border group-hover:bg-white group-hover:scale-[1.06] shadow-[0_8px_26px_rgba(15,23,42,0.06)]'
                    }`}
                    style={{
                      borderColor: isSel ? `${accent}33` : `${accent}22`,
                      boxShadow: isSel
                        ? `0 14px 40px ${accent}26`
                        : `0 8px 26px rgba(15,23,42,0.06)`,
                      background: isSel
                        ? `radial-gradient(140% 140% at 30% 22%, ${accent} 0%, ${accent}CC 52%, ${accent}AA 100%)`
                        : undefined,
                    }}
                    transition={{
                      layout: {
                        type: 'spring',
                        stiffness: 440,
                        damping: 34,
                        mass: 0.8,
                      },
                    }}
                  >
                    <motion.span
                      className="inline-flex items-center justify-center select-none leading-none font-headline font-extrabold text-lg"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: spins * 360 }}
                      transition={{
                        rotate: {
                          duration: spins > 0 ? 0.62 : 0,
                          ease: [0.34, 1.15, 0.52, 1],
                        },
                      }}
                    >
                      {p.emoji || p.initials}
                    </motion.span>
                    {isSel && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                        style={{
                          backgroundColor: '#fff',
                          boxShadow: `0 6px 14px ${accent}33`,
                        }}
                        aria-hidden
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                      </span>
                    )}
                  </motion.div>
                  <motion.span
                    layout
                    className={`text-[10px] uppercase tracking-widest font-bold ${isSel ? 'text-charcoal' : 'text-charcoal/40'}`}
                  >
                    {p.name.split(' ')[0]}
                  </motion.span>
                </motion.button>
              );
            })}
            {onRequestAddPerson && (
              <motion.button
                type="button"
                layout
                transition={{
                  layout: {
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                    mass: 0.85,
                  },
                }}
                onClick={onRequestAddPerson}
                className="flex-shrink-0 flex flex-col items-center gap-2 group outline-none opacity-85 hover:opacity-100 active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#E8D5D9] bg-white/90 flex items-center justify-center text-charcoal/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Plus className="w-6 h-6" strokeWidth={2.25} />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-charcoal/38">
                  Add
                </span>
              </motion.button>
            )}
          </div>
        </LayoutGroup>

        {giftEventOptions.length > 0 ? (
          <div className="mt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/32 mb-3 px-1">
              Next up
            </p>

            {(() => {
              const [first] = giftEventOptions;
              const accent = person.themeColor || '#C42040';
              const validSelected =
                selectedEventKey && giftEventOptions.some((o) => o.key === selectedEventKey)
                  ? selectedEventKey
                  : first.key;
              const selectedIsNextUp = validSelected === first.key;
              const rest = giftEventOptions.filter((o) => o.key !== first.key);

              const firstBatches = person ? batchesForGiftEvent(person, first.key) : [];
              const firstHasSaved = firstBatches.length > 0;
              return (
                <div className="space-y-3">
                  {/* Featured (always the first upcoming). If another is selected, this visually downsizes. */}
                  <button
                    type="button"
                    onClick={() => setSelectedEventKey(first.key)}
                    className={`w-full flex items-center gap-3 rounded-[24px] border px-3 text-left transition-all cursor-pointer ${
                      selectedIsNextUp
                        ? 'py-3.5 border-[#F0C9CF] bg-white/95 ring-2 ring-primary/10 shadow-[0_16px_54px_rgba(196,32,64,0.16)]'
                        : 'py-2.5 border-black/[0.04] bg-white/70 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.06)] opacity-[0.92]'
                    }`}
                    style={{
                      boxShadow: selectedIsNextUp
                        ? `0 18px 58px ${accent}22`
                        : `0 10px 30px rgba(15,23,42,0.06)`,
                    }}
                  >
                    <div className={`transition-transform duration-200 ${selectedIsNextUp ? 'scale-100' : 'scale-[0.94]'}`}>
                      <EventCalTile month={first.occasion.month} day={first.occasion.day} accent={accent} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/65 mb-0.5">
                        Next up
                      </p>
                      <p className={`font-bold leading-snug text-charcoal truncate transition-all ${selectedIsNextUp ? 'text-[15px]' : 'text-[14px]'}`}>
                        {person.name.split(' ')[0]}&apos;s {first.occasion.type}
                      </p>
                      <p className="text-[11px] text-charcoal/42 font-medium mt-1">
                        {first.occasion.daysRemaining === 0
                          ? 'Reminder today'
                          : first.occasion.daysRemaining === 1
                            ? 'Reminder tomorrow with new gift ideas'
                            : `Reminder with new gift ideas in ${first.occasion.daysRemaining} days`}
                        <span className={firstHasSaved ? ' text-emerald-600/90' : ' text-charcoal/35'}>
                          {firstHasSaved ? ' · Ideas saved' : ' · No ideas yet'}
                        </span>
                      </p>
                    </div>
                    <div
                      className={`h-10 w-10 rounded-full bg-white border border-black/[0.04] shadow-sm flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                        selectedIsNextUp ? 'scale-100' : 'scale-[0.95]'
                      }`}
                      style={{ boxShadow: selectedIsNextUp ? `0 10px 22px ${accent}1f` : '0 8px 18px rgba(15,23,42,0.06)' }}
                    >
                      <ChevronRight className="w-4 h-4 text-charcoal/30" />
                    </div>
                  </button>

                  {/* Smaller future events (still styled + clearly selectable) */}
                  {rest.length > 0 && (
                    <div className="rounded-[18px] bg-white/55 backdrop-blur-md border border-black/[0.04] overflow-hidden shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                      {rest.map((row, idx) => {
                        const sel = row.key === validSelected;
                        const rowBatches = person ? batchesForGiftEvent(person, row.key) : [];
                        const rowHasSaved = rowBatches.length > 0;
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => setSelectedEventKey(row.key)}
                            className={`w-full flex items-center gap-3 px-3 text-left transition-all cursor-pointer ${
                              idx > 0 ? 'border-t border-black/[0.04]' : ''
                            } ${
                              sel
                                ? 'bg-white/95 py-3.5 shadow-[inset_0_0_0_1px_rgba(240,201,207,0.9)]'
                                : 'py-3 hover:bg-white/70'
                            }`}
                            style={{
                              boxShadow: sel ? `0 14px 46px ${accent}18` : undefined,
                            }}
                          >
                            <div className={`rounded-2xl bg-white border border-black/[0.04] flex items-center justify-center shadow-sm overflow-hidden transition-transform duration-200 ${
                              sel ? 'w-10 h-10 scale-[1.03]' : 'w-9 h-9'
                            }`}>
                              <div className="w-full h-full flex flex-col">
                                <div className="h-[14px] flex items-center justify-center" style={{ backgroundColor: accent }}>
                                  <span className="text-[7px] font-black uppercase tracking-wider text-white">
                                    {row.occasion.month}
                                  </span>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                  <span className="text-[11px] font-black text-charcoal tabular-nums">
                                    {row.occasion.day}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-bold truncate transition-all ${sel ? 'text-charcoal text-[13px]' : 'text-charcoal/80 text-[12px]'}`}>
                                {person.name.split(' ')[0]}&apos;s {row.occasion.type}
                              </p>
                              <p className="text-[10px] font-semibold text-charcoal/35 mt-0.5">
                                {row.occasion.daysRemaining === 0
                                  ? 'Reminder today'
                                  : row.occasion.daysRemaining === 1
                                    ? 'Reminder tomorrow'
                                    : `Reminder in ${row.occasion.daysRemaining} days`}
                                <span className={rowHasSaved ? ' text-emerald-600/90' : ''}>
                                  {rowHasSaved ? ' · Ideas saved' : ''}
                                </span>
                              </p>
                            </div>
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${sel ? 'text-primary/60' : 'text-charcoal/15'}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="text-[12px] text-charcoal/38 mt-4 px-1 leading-relaxed">
            No upcoming personal or matched holidays in the next several months.
          </p>
        )}

      </div>

        {/* Generate trigger -- top position (only if no suggestions) */}
        {allSuggestions.length === 0 && (
          <section className="mb-12">
            <div className="bg-white/90 rounded-[28px] p-7 border border-[#F5E6EA]/90 shadow-[0_10px_32px_rgba(196,32,64,0.08)] flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-white rounded-full shadow-sm text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-charcoal leading-snug">
                  What should you get {person.name.split(' ')[0]}?
                </h3>
                <p className="text-[13px] text-charcoal/50 max-w-[260px] mt-2 leading-relaxed">
                  {searchBlurb}
                </p>
              </div>
              <button
                type="button"
                disabled={isGenerating || !selectedEventKey}
                onClick={handleGenerateIdeas}
                className="w-full max-w-xs px-8 py-4 bg-charcoal text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Looking for ideas…' : `Find ideas for ${person.name.split(' ')[0]}`}
              </button>
              {error && (
                <p className="text-red-400 text-[12px] font-medium mt-2">
                  Something went wrong. tap above to try again.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Main Suggestion Stack */}
        <section className="space-y-8 relative">
          {/* Gift tiles row + Past searches controls (spaced, not mixed) */}
          <div className="flex flex-col gap-3 mb-7">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
              {allSuggestions.length > 0 && allSuggestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveIndex(i);
                    setViewMode('single');
                  }}
                  className={`relative flex-shrink-0 w-[42px] h-[40px] sm:w-[46px] sm:h-[44px] rounded-2xl border transition-all duration-200 ${
                    activeIndex === i && viewMode === 'single'
                      ? 'bg-white border-[#F0C9CF] shadow-[0_12px_28px_rgba(196,32,64,0.14)]'
                      : 'bg-white/70 backdrop-blur-md border-black/[0.04] hover:bg-white/90 hover:border-black/[0.06] shadow-[0_8px_22px_rgba(15,23,42,0.06)]'
                  }`}
                  aria-label={`View gift ${i + 1}`}
                >
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/60 blur-xl opacity-70" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`relative w-[26px] h-[26px] sm:w-[28px] sm:h-[28px] rounded-[10px] flex items-center justify-center transition-all ${
                        activeIndex === i && viewMode === 'single'
                          ? 'bg-primary/10'
                          : 'bg-white/60 border border-black/[0.04]'
                      }`}
                      style={{
                        boxShadow:
                          activeIndex === i && viewMode === 'single'
                            ? '0 10px 22px rgba(224,62,82,0.16)'
                            : '0 8px 18px rgba(15,23,42,0.08)',
                      }}
                    >
                      <Gift
                        className={`w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] ${activeIndex === i && viewMode === 'single' ? 'text-primary fill-primary/10' : 'text-charcoal/25'}`}
                        strokeWidth={activeIndex === i && viewMode === 'single' ? 2.25 : 2}
                      />
                      <span
                        className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-white border border-black/[0.04]"
                        style={{
                          boxShadow:
                            activeIndex === i && viewMode === 'single'
                              ? '0 8px 18px rgba(224,62,82,0.12)'
                              : '0 8px 18px rgba(15,23,42,0.08)',
                        }}
                        aria-hidden
                      />
                    </div>
                  </div>
                  {activeIndex === i && viewMode === 'single' && (
                    <motion.div
                      layoutId="open-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_6px_12px_rgba(224,62,82,0.35)]"
                    />
                  )}
                </button>
              ))}
              {allSuggestions.length === 0 && (
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">Ideas</h3>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
              {eventBatches.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowHistoryDropdown((prev) => !prev)}
                    ref={historyButtonRef}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-all cursor-pointer max-w-full ${
                      showHistoryDropdown
                        ? 'bg-white border-[#F0C9CF] text-charcoal shadow-[0_10px_22px_rgba(196,32,64,0.12)]'
                        : 'bg-white/60 backdrop-blur-md border-black/[0.04] text-charcoal/55 hover:bg-white/85 hover:border-black/[0.06] shadow-[0_8px_16px_rgba(15,23,42,0.06)]'
                    }`}
                    title="Past searches for this event"
                  >
                    <History className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] truncate">
                      Past searches
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />
                  </button>

                  <AnimatePresence>
                    {showHistoryDropdown && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-40"
                          onClick={() => setShowHistoryDropdown(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          className="fixed w-[272px] bg-white rounded-3xl shadow-2xl border border-outline-variant/10 p-4 z-50"
                          style={{ top: historyMenuPos.top, left: historyMenuPos.left }}
                        >
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-charcoal/40 mb-3 px-2">This event</h4>
                          <div className="space-y-2">
                            {eventBatches.map((batch, bid) => (
                              <button
                                key={batch.id ?? `${batch.date}-${bid}`}
                                type="button"
                                onClick={() => {
                                  setGeneratedIdeas(batch.ideas);
                                  setActiveIndex(0);
                                  setViewMode('single');
                                  setShowHistoryDropdown(false);
                                }}
                                className="w-full text-left p-3 hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/10 cursor-pointer"
                              >
                                <div className="text-[10px] font-bold text-charcoal">
                                  {new Date(batch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-primary/60 mt-1">
                                  {batch.ideas.length} idea{batch.ideas.length !== 1 ? 's' : ''}
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {allSuggestions.length > 0 && (
                <button
                  onClick={() => setViewMode(prev => prev === 'single' ? 'all' : 'single')}
                  className="text-[10px] font-black uppercase tracking-[0.22em] text-primary hover:opacity-70 transition-opacity px-2 py-2"
                >
                  {viewMode === 'single' ? 'See all' : 'One at a time'}
                </button>
              )}
            </div>
          </div>
          
          <AnimatePresence>
            {saveMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-charcoal text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl border border-white/10 text-center whitespace-nowrap"
              >
                {saveMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            {allSuggestions.length > 0 ? (
              <div className="space-y-8">
                {viewMode === 'single' ? (
                  <div>
                    <SuggestionCard
                      suggestion={allSuggestions[activeIndex]}
                      person={person}
                      onSave={handleSaveGift}
                      isLiked={likedIds.has(allSuggestions[activeIndex]?.id ?? '')}
                      isDisliked={dislikedIds.has(allSuggestions[activeIndex]?.id ?? '')}
                      onLike={() => toggleLike(allSuggestions[activeIndex]?.id ?? '', allSuggestions[activeIndex])}
                      onDislike={() => toggleDislike(allSuggestions[activeIndex])}
                    />
                    {allSuggestions.length > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-5">
                        <button
                          type="button"
                          onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                          disabled={activeIndex === 0}
                          className="w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm disabled:opacity-25 hover:bg-stone-50 transition-all active:scale-95 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4 text-charcoal/60" strokeWidth={2.5} />
                        </button>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal/35 tabular-nums">
                          {activeIndex + 1} / {allSuggestions.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveIndex(i => Math.min(allSuggestions.length - 1, i + 1))}
                          disabled={activeIndex === allSuggestions.length - 1}
                          className="w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm disabled:opacity-25 hover:bg-stone-50 transition-all active:scale-95 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4 text-charcoal/60" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  allSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      person={person}
                      onSave={handleSaveGift}
                      isLiked={likedIds.has(suggestion.id ?? '')}
                      isDisliked={dislikedIds.has(suggestion.id ?? '')}
                      onLike={() => toggleLike(suggestion.id ?? '', suggestion)}
                      onDislike={() => toggleDislike(suggestion)}
                    />
                  ))
                )}
              </div>
            ) : !isGenerating && (
              <div className="py-20 text-center bg-stone-50/50 rounded-[40px] border-2 border-dashed border-stone-100">
                <p className="text-charcoal/35 text-[13px] font-medium">Tap above to find your first idea.</p>
              </div>
            )}
          </div>
        </section>

        {/* Post-generation info card */}
        {allSuggestions.length > 0 && (
          <section className="mt-12">
            <div className="bg-primary/5 rounded-[32px] p-6 border border-primary/10 text-center space-y-3">
              {nextOccasion ? (
                <>
                  <p className="text-[15px] font-bold text-charcoal">
                    New ideas arriving in {nextOccasion.daysRemaining} day{nextOccasion.daysRemaining === 1 ? '' : 's'}
                  </p>
                  <p className="text-[13px] text-charcoal/45 leading-relaxed max-w-[270px] mx-auto">
                    Refine {firstName}'s profile for more personal picks, or use{' '}
                    <Heart className="inline w-3.5 h-3.5 relative -top-px text-rose-400" strokeWidth={2} />
                    {' '}and{' '}
                    <ThumbsDown className="inline w-3.5 h-3.5 relative -top-px text-charcoal/35" strokeWidth={2} />
                    {' '}on the ideas above to shape what we send.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-bold text-charcoal">Refine your ideas</p>
                  <p className="text-[13px] text-charcoal/45 leading-relaxed max-w-[270px] mx-auto">
                    Update {firstName}'s profile for more personal picks, or use{' '}
                    <Heart className="inline w-3.5 h-3.5 relative -top-px text-rose-400" strokeWidth={2} />
                    {' '}and{' '}
                    <ThumbsDown className="inline w-3.5 h-3.5 relative -top-px text-charcoal/35" strokeWidth={2} />
                    {' '}on the ideas above to improve the next batch.
                  </p>
                </>
              )}
              <button
                type="button"
                disabled={isGenerating || !selectedEventKey}
                onClick={handleGenerateIdeas}
                className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/25 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />}
                {isGenerating ? 'Looking…' : 'Find new ideas'}
              </button>
            </div>
          </section>
        )}

        <div className="mt-12 border-t border-outline-variant/10 pt-8">
          <AnimatePresence mode="wait">
            {!showManualAdd ? (
              <motion.button
                key="trigger"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowManualAdd(true)}
                className="w-full bg-white text-charcoal/40 py-5 px-6 rounded-[24px] text-[11px] font-semibold border-2 border-dashed border-charcoal/10 hover:border-primary/30 hover:text-primary active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                I found something. add it manually
              </motion.button>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="bg-white rounded-[24px] border border-black/[0.05] p-5 space-y-3"
              >
                <p className="text-[13px] font-semibold text-charcoal/60">What did you find?</p>
                <input
                  autoFocus
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value.slice(0, 80))}
                  onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                  placeholder="Name of the gift"
                  className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-black/[0.06] text-[13px] font-medium text-charcoal focus:outline-none focus:border-charcoal/20 placeholder:text-charcoal/25"
                />
                <input
                  value={manualPrice}
                  onChange={e => setManualPrice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                  placeholder="Price (e.g. €40)"
                  className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-black/[0.06] text-[13px] font-medium text-charcoal focus:outline-none focus:border-charcoal/20 placeholder:text-charcoal/25"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleManualAdd}
                    disabled={!manualTitle.trim()}
                    className="flex-1 h-10 bg-charcoal text-white rounded-full text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 transition-all cursor-pointer hover:bg-black active:scale-95"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowManualAdd(false); setManualTitle(''); setManualPrice(''); }}
                    className="flex-1 h-10 bg-stone-100 text-charcoal/50 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-stone-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </div>
  );
}
