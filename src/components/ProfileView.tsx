import { useState, useEffect, useMemo, type ElementType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowLeft,
  Check,
  Calendar,
  Trash2,
  Plus,
  Edit3,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Bell,
  Cake,
  Heart,
  Bookmark,
  Lightbulb,
  User,
  Wallet,
  Star,
} from 'lucide-react';
import { Person, Occasion, GiftIdea } from '../types';
import {
  RELATIONS,
  BUDGET_OPTIONS,
  MONTHS,
  PRESET_OCCASIONS,
  calculateDaysRemaining,
  isPartnerRelation,
} from '../constants';
import WheelDatePicker from './WheelDatePicker';
import CustomSelect from './CustomSelect';
import {
  isOccasionTypeAvailableForPerson,
  isPresetAvailableForPerson,
} from '../utils/occasionRules';

const EVENT_PRESETS = [
  { type: 'Birthday',       emoji: '🎂' },
  { type: 'Anniversary',    emoji: '💍' },
  { type: 'Graduation',     emoji: '🎓' },
  { type: 'Wedding',        emoji: '👰' },
  { type: 'Engagement',     emoji: '💎' },
  { type: 'New Baby',       emoji: '👶' },
  { type: 'Housewarming',   emoji: '🏡' },
  { type: 'Promotion',      emoji: '💼' },
  { type: "Valentine's Day",emoji: '💝' },
  { type: 'Christmas',      emoji: '🎄' },
  { type: 'Custom',         emoji: '✨' },
];

interface ProfileViewProps {
  personId: string;
  onBack: () => void;
  people: Person[];
  occasions: Occasion[];
  onUpdatePerson: (person: Person) => void;
  onDeletePerson: (id: string) => void;
  onDeleteOccasion: (id: string) => void;
  onAddOccasion: (occasion: Occasion) => void;
  onViewIdeas: (id: string) => void;
  notificationTimings?: number[];
  onEditReminderSettings?: () => void;
}

function formatReminderDaysBefore(timings: number[]): string {
  const u = [...new Set(timings)].filter((d) => d > 0).sort((a, b) => b - a);
  if (u.length === 0) return '';
  if (u.length === 1) return `${u[0]} day${u[0] === 1 ? '' : 's'}`;
  const parts = u.map((d) => `${d} day${d === 1 ? '' : 's'}`);
  const last = parts.pop()!;
  return `${parts.join(', ')}, and ${last}`;
}

type Tab = 'ideas' | 'saved' | 'profile';

const STYLES = ['Thoughtful', 'Minimalist', 'Fun / Playful', 'Trendy', 'Practical', 'Luxury'];
const PREVIEW_COUNT = 2;

// ─── Small helpers ────────────────────────────────────────────────────────────

function EventIcon({ type, color }: { type: string; color: string }) {
  const t = type.toLowerCase();
  const cls = "w-3.5 h-3.5";
  let icon = <Bell className={cls} strokeWidth={2} />;
  if (t.includes('birthday'))    icon = <Cake className={cls} strokeWidth={2} />;
  if (t.includes('anniversary')) icon = <Heart className={cls} strokeWidth={2} />;
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}18`, color }}>
      {icon}
    </div>
  );
}

function IdeaCard({
  idea, isSaved, onToggleSave, themeColor,
}: {
  idea: GiftIdea; isSaved: boolean; onToggleSave: () => void; themeColor: string;
}) {
  const [imgError, setImgError] = useState(false);
  const shopUrl = idea.productUrl || `https://www.google.com/search?q=${encodeURIComponent(idea.title + ' buy')}`;

  return (
    <div className="bg-white rounded-[20px] border border-black/[0.05] overflow-hidden">
      {/* Visual */}
      <div className="h-32 flex items-center justify-center relative" style={{ backgroundColor: `${themeColor}0D` }}>
        {idea.imageUrl && !imgError ? (
          <img
            src={idea.imageUrl} alt={idea.title}
            className="h-full w-full object-contain p-3"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-5xl select-none">{idea.emoji || '🎁'}</span>
        )}
        <button
          onClick={onToggleSave}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm ${
            isSaved ? 'text-white' : 'bg-white text-charcoal/30 hover:text-dusty-rose'
          }`}
          style={isSaved ? { backgroundColor: themeColor } : {}}
        >
          <Heart className="w-3.5 h-3.5" strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? 'white' : 'none'} />
        </button>
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3 space-y-2">
        <p className="text-[13px] font-bold text-charcoal leading-snug tracking-tight line-clamp-2">{idea.title}</p>

        {/* Rationale chip */}
        {idea.rationale && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full w-fit" style={{ backgroundColor: `${themeColor}12` }}>
            <Sparkles className="w-2.5 h-2.5 flex-shrink-0" style={{ color: themeColor }} />
            <span className="text-[9px] font-semibold leading-none line-clamp-1" style={{ color: themeColor }}>
              {idea.rationale.split('.')[0].substring(0, 32)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[13px] font-bold text-charcoal">{idea.price}</span>
          <a
            href={shopUrl} target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-semibold text-charcoal/35 hover:text-charcoal flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            Shop <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function GeneratedIdeasSection({
  ideas, savedIdeas, onToggleSave, onViewIdeas, themeColor,
}: {
  ideas: GiftIdea[]; savedIdeas: GiftIdea[]; onToggleSave: (idea: GiftIdea) => void;
  onViewIdeas: () => void; themeColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? ideas : ideas.slice(0, PREVIEW_COUNT);
  const hidden = ideas.length - PREVIEW_COUNT;

  if (ideas.length === 0) {
    return (
      <section>
        <p className="text-[17px] font-bold text-charcoal tracking-tight mb-4">Recent Ideas</p>
        <button
          onClick={onViewIdeas}
          className="w-full py-10 rounded-[24px] bg-stone-50 border-2 border-dashed border-stone-200 flex flex-col items-center gap-3 hover:border-charcoal/20 transition-colors cursor-pointer group"
        >
          <Sparkles className="w-6 h-6 text-charcoal/20 group-hover:text-dusty-rose transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30">No ideas yet — tap to generate</span>
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[17px] font-bold text-charcoal tracking-tight">Recent Ideas</p>
        <button
          onClick={onViewIdeas}
          className="flex items-center gap-1 text-[12px] font-semibold cursor-pointer"
          style={{ color: themeColor }}
        >
          View all ({ideas.length}) <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map(idea => (
          <IdeaCard
            key={idea.id} idea={idea} themeColor={themeColor}
            isSaved={savedIdeas.some(g => g.title === idea.title)}
            onToggleSave={() => onToggleSave(idea)}
          />
        ))}
      </div>

      {ideas.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="mt-3 w-full py-3.5 rounded-[20px] border text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          style={{
            borderColor: `${themeColor}30`,
            backgroundColor: `${themeColor}06`,
            color: themeColor,
          }}
        >
          {expanded ? 'Show less' : `+ ${hidden} more ideas`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfileView({
  personId, onBack, onViewIdeas, people, occasions,
  onUpdatePerson, onDeletePerson, onDeleteOccasion, onAddOccasion,
  notificationTimings = [],
  onEditReminderSettings,
}: ProfileViewProps) {
  const person = people.find(p => p.id === personId) || people[0];
  const personOccasions = useMemo(
    () => occasions.filter((o) => o.personId === personId),
    [occasions, personId]
  );
  const savedIdeas = person?.savedGifts || [];
  const generatedIdeas = person?.generatedIdeas || [];

  const [activeTab, setActiveTab] = useState<Tab>('ideas');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [customEventType, setCustomEventType] = useState('');
  const [newEventIdeaContext, setNewEventIdeaContext] = useState('');

  useEffect(() => {
    if (!person) return;
    if (!showAddEvent || !newEventType || newEventType === 'Custom') return;
    if (!isPresetAvailableForPerson(newEventType, person.id, personOccasions)) {
      setNewEventType('');
      setNewEventDate('');
    }
  }, [showAddEvent, newEventType, person, personOccasions]);

  const [editName, setEditName] = useState(person?.name || '');
  const [editRelation, setEditRelation] = useState(person?.relation || '');
  const [editBudget, setEditBudget] = useState(person?.budget || '');
  const [editInterests, setEditInterests] = useState(person?.interests.join(', ') || '');
  const [editBirthday, setEditBirthday] = useState(person?.birthday || '');
  const [editAnniversaryDate, setEditAnniversaryDate] = useState(person?.anniversaryDate || '');
  const [editPreferences, setEditPreferences] = useState<'Physical gifts' | 'Experiences' | 'Either'>(person?.preferences || 'Either');
  const [editLocation, setEditLocation] = useState(person?.location || '');
  const [editStyle, setEditStyle] = useState(person?.style || 'Thoughtful');
  const [editFallenFlat, setEditFallenFlat] = useState(person?.fallenFlatKeywords?.join(', ') || '');
  const [editPastGifts, setEditPastGifts] = useState(person?.pastGifts?.join(', ') || '');
  const [editColor, setEditColor] = useState(person?.themeColor || '#C42040');
  const [editEmoji, setEditEmoji] = useState(person?.emoji || '💖');
  const [editNotes, setEditNotes] = useState(person?.notes || '');

  if (!person) return null;

  const themeColor = person.themeColor || '#C42040';
  const sortedOccasions = [...personOccasions].sort((a, b) => a.daysRemaining - b.daysRemaining);
  const nextOccasion = sortedOccasions.find(o => o.daysRemaining >= 0);

  const handleUpdateProfile = () => {
    onUpdatePerson({
      ...person,
      name: editName, relation: editRelation, budget: editBudget,
      interests: editInterests.split(',').map(i => i.trim()).filter(Boolean),
      birthday: editBirthday, anniversaryDate: editAnniversaryDate,
      preferences: editPreferences, location: editLocation, style: editStyle,
      fallenFlatKeywords: editFallenFlat.split(',').map(i => i.trim()).filter(Boolean),
      pastGifts: editPastGifts.split(',').map(i => i.trim()).filter(Boolean),
      notes: editNotes,
      initials: editName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      themeColor: editColor, emoji: editEmoji,
    });
  };

  const EVENT_IDEA_CONTEXT_MAX = 240;

  const handleQuickAddOccasion = (type: string, date: string, ideaContext: string) => {
    if (!date) return;
    if (!isOccasionTypeAvailableForPerson(type, person.id, personOccasions)) return;
    const [, m, d] = date.split('-').map(Number);
    const emojiMap: Record<string, string> = {
      Birthday: '🎂', Anniversary: '💍', Graduation: '🎓',
      'New Baby': '👶', Christmas: '🎄', "Valentine's Day": '💖',
    };
    const trimmed = ideaContext.trim().slice(0, EVENT_IDEA_CONTEXT_MAX);
    onAddOccasion({
      id: 'o-' + Date.now(), personId: person.id,
      title: `${person.name}'s ${type}`, type, date,
      month: MONTHS[m - 1], day: d,
      daysRemaining: calculateDaysRemaining(date),
      emoji: emojiMap[type] || '✨',
      ...(trimmed ? { ideaContext: trimmed } : {}),
    });
  };

  const toggleGiftStatus = (giftId: string) => {
    onUpdatePerson({
      ...person,
      savedGifts: person.savedGifts.map(g =>
        g.id === giftId ? { ...g, category: (g.category === 'Bought' ? 'Saved' : 'Bought') as any } : g
      ),
    });
  };

  const toggleSaveGenerated = (idea: GiftIdea) => {
    const already = person.savedGifts.some(g => g.title === idea.title);
    onUpdatePerson({
      ...person,
      savedGifts: already
        ? person.savedGifts.filter(g => g.title !== idea.title)
        : [...person.savedGifts, { ...idea, id: 'g-' + Date.now(), category: 'Saved' }],
    });
  };

  const inputCls = "w-full bg-white px-4 py-3 rounded-2xl border border-black/[0.07] text-[13px] font-medium text-charcoal focus:outline-none focus:border-charcoal/30 transition-colors placeholder:text-charcoal/25";
  const labelCls = "block text-[9px] font-black uppercase tracking-[0.2em] text-charcoal/30 mb-2";

  const tabs: { id: Tab; label: string; icon: ElementType }[] = [
    { id: 'ideas',   label: 'Ideas',            icon: Lightbulb },
    { id: 'saved',   label: 'Saved',             icon: Bookmark },
    { id: 'profile', label: 'Profile & Events',  icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Back */}
      <button
        onClick={onBack}
        className="fixed top-6 left-6 z-50 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-black/[0.06] text-charcoal/60 hover:text-charcoal flex items-center justify-center transition-all active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
      </button>

      {/* ── HERO ── */}
      <div className="pt-16 pb-6 px-5 flex flex-col items-center text-center max-w-lg mx-auto">
        {/* Avatar */}
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg ring-4 ring-white"
            style={{ background: `linear-gradient(135deg, ${themeColor}30 0%, ${themeColor} 100%)` }}
          >
            {person.emoji || person.initials}
          </div>
          <button
            onClick={() => setActiveTab('profile')}
            className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full shadow-md border border-black/[0.07] flex items-center justify-center text-charcoal/40 hover:text-charcoal transition-colors cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>

        {/* Name */}
        <h1 className="text-[26px] font-bold tracking-tight text-charcoal">{person.name}</h1>

        {/* Relation + next occasion inline */}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap justify-center">
          <span className="text-[12px] font-semibold text-charcoal/45">{person.relation}</span>
          {nextOccasion && (
            <>
              <span className="text-charcoal/20 text-[10px]">·</span>
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${themeColor}18`, color: themeColor }}
              >
                <Calendar className="w-3 h-3" />
                {nextOccasion.type} in {nextOccasion.daysRemaining}d
              </div>
            </>
          )}
        </div>

        {/* Interest tags */}
        {person.interests && person.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {person.interests.slice(0, 5).map((interest, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: `${themeColor}12`, color: themeColor }}
              >
                {interest.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Stats row — budget + style only (relation moved above) */}
        <div className="mt-4 w-full bg-white rounded-[20px] border border-black/[0.05] flex divide-x divide-black/[0.05]">
          {[
            { icon: Wallet, label: 'Budget per gift', value: person.budget,         color: '#10B981' },
            { icon: Star,   label: 'Gift style',      value: person.style || 'N/A', color: '#F59E0B' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 py-3.5 px-2 flex flex-col items-center gap-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-charcoal/30">{stat.label}</p>
              <p className="text-[11px] font-bold text-charcoal text-center leading-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {notificationTimings.length > 0 && onEditReminderSettings && (
          <div className="mt-4 w-full flex items-start gap-3 rounded-[20px] border border-black/[0.06] bg-white px-4 py-3.5 text-left shadow-sm">
            <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-charcoal/45" strokeWidth={2} />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-[12px] text-charcoal/65 leading-relaxed">
                We&apos;ll send you reminders{' '}
                <span className="font-semibold text-charcoal">{formatReminderDaysBefore(notificationTimings)}</span>{' '}
                before each occasion.
              </p>
            </div>
            <button
              type="button"
              onClick={onEditReminderSettings}
              className="flex-shrink-0 text-[11px] font-bold text-dusty-rose hover:opacity-80 pt-0.5 cursor-pointer"
            >
              Edit
            </button>
          </div>
        )}

        {/* CTA banner */}
        <button
          onClick={() => onViewIdeas(person.id)}
          className="mt-4 w-full h-16 rounded-[20px] flex items-center px-5 gap-4 text-white active:scale-[0.98] transition-all cursor-pointer"
          style={{ background: `linear-gradient(135deg, ${themeColor}BB 0%, ${themeColor} 100%)` }}
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-grow text-left">
            <p className="text-[14px] font-bold leading-tight">Find gift ideas</p>
            <p className="text-[11px] font-medium opacity-75 mt-0.5">
              {person.interests?.length
                ? `Based on their interests & ${person.budget} budget`
                : 'Personalised to their taste & budget'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>

      {/* ── TABS ── */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-xl border-b border-black/[0.05]">
        <div className="flex max-w-lg mx-auto px-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[9px] font-black uppercase tracking-[0.2em] transition-colors relative cursor-pointer ${
                activeTab === tab.id ? 'text-charcoal' : 'text-charcoal/25 hover:text-charcoal/50'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                  style={{ backgroundColor: themeColor }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="max-w-lg mx-auto px-5 pt-6">

        {/* ════ IDEAS ════ */}
        {activeTab === 'ideas' && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
            <GeneratedIdeasSection
              ideas={generatedIdeas}
              savedIdeas={savedIdeas}
              onToggleSave={toggleSaveGenerated}
              onViewIdeas={() => onViewIdeas(person.id)}
              themeColor={themeColor}
            />
          </div>
        )}

        {/* ════ SAVED ════ */}
        {activeTab === 'saved' && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-bold text-charcoal tracking-tight">Saved Ideas</p>
              <span className="text-[11px] font-semibold text-charcoal/30">{savedIdeas.length} items</span>
            </div>

            {savedIdeas.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {savedIdeas.map(idea => (
                  <div key={idea.id} className="bg-white rounded-[20px] border border-black/[0.05] overflow-hidden">
                    <div className="h-32 flex items-center justify-center relative" style={{ backgroundColor: `${themeColor}0D` }}>
                      {idea.imageUrl ? (
                        <img src={idea.imageUrl} alt={idea.title} className="h-full w-full object-contain p-3" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-5xl">{idea.emoji || '🎁'}</span>
                      )}
                      <button
                        onClick={() => toggleGiftStatus(idea.id)}
                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm ${
                          idea.category === 'Bought' ? 'bg-charcoal text-white' : 'bg-white text-charcoal/30'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[13px] font-bold text-charcoal leading-snug tracking-tight line-clamp-2">{idea.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[13px] font-bold text-charcoal/50">{idea.price}</span>
                        {idea.category === 'Bought'
                          ? <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Bought</span>
                          : <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor }}>Saved</span>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center rounded-[24px] bg-stone-50/60">
                <Bookmark className="w-6 h-6 text-stone-300 mx-auto mb-3" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/25">Nothing saved yet</p>
                <p className="text-[11px] text-charcoal/30 mt-1">Star ideas from the Ideas tab</p>
              </div>
            )}
          </div>
        )}

        {/* ════ PROFILE & EVENTS ════ */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 space-y-8 pb-24">

            {/* Events */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[17px] font-bold text-charcoal tracking-tight">Events</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEvent((p) => {
                      const open = !p;
                      if (open) {
                        setNewEventType('');
                        setNewEventDate('');
                        setCustomEventType('');
                        setNewEventIdeaContext('');
                      }
                      return open;
                    });
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${showAddEvent ? 'text-white' : 'bg-stone-100 text-charcoal/40 hover:bg-stone-200 hover:text-charcoal'}`}
                  style={showAddEvent ? { backgroundColor: themeColor } : {}}
                >
                  <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${showAddEvent ? 'rotate-45' : ''}`} />
                </button>
              </div>

              {sortedOccasions.length > 0 ? (
                <div className="bg-white rounded-[20px] border border-black/[0.05] overflow-hidden">
                  {sortedOccasions.map((occ, idx) => (
                    <div key={occ.id}>
                      {idx > 0 && <div className="mx-4 h-px bg-black/[0.04]" />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <EventIcon type={occ.type} color={themeColor} />
                        <div className="flex-grow min-w-0">
                          <p className="text-[13px] font-bold text-charcoal tracking-tight">{occ.type}</p>
                          <p className="text-[10px] text-charcoal/35 font-semibold mt-0.5">
                            {occ.month} {occ.day} · {occ.daysRemaining === 0 ? 'Today' : occ.daysRemaining < 0 ? `${Math.abs(occ.daysRemaining)}d ago` : `${occ.daysRemaining} days`}
                          </p>
                          {occ.ideaContext?.trim() && (
                            <p className="text-[10px] text-charcoal/45 mt-1 leading-snug line-clamp-2">
                              {occ.ideaContext.trim()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onDeleteOccasion(occ.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-charcoal/15 hover:bg-red-50 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center rounded-[20px] bg-stone-50/60">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/25">No events yet</p>
                </div>
              )}

              {/* Inline add-event form */}
              <AnimatePresence>
                {showAddEvent && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-3 bg-white rounded-[20px] border border-black/[0.05] p-4 space-y-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">Choose Event Type</p>

                    {/* Type grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {EVENT_PRESETS.filter((preset) => {
                        // Valentine's Day only for partner/spouse
                        if (preset.type === "Valentine's Day" && !isPartnerRelation(person.relation)) return false;
                        return true;
                      }).map((preset) => {
                        const taken =
                          preset.type !== 'Custom' &&
                          !isPresetAvailableForPerson(preset.type, person.id, personOccasions);
                        return (
                          <button
                            key={preset.type}
                            type="button"
                            disabled={taken}
                            title={taken ? 'Already on their calendar' : undefined}
                            onClick={() => {
                              if (taken) return;
                              setNewEventType(preset.type);
                              setCustomEventType('');
                              const fixed = PRESET_OCCASIONS[preset.type];
                              if (fixed) {
                                const [mm, dd] = fixed.date.split('-');
                                setNewEventDate(`${new Date().getFullYear()}-${mm}-${dd}`);
                              } else {
                                setNewEventDate('');
                              }
                            }}
                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                              taken
                                ? 'border-black/[0.04] bg-stone-50/50 text-charcoal/25 cursor-not-allowed'
                                : newEventType === preset.type
                                  ? 'border-transparent text-white cursor-pointer'
                                  : 'border-black/[0.06] bg-stone-50 text-charcoal/60 hover:bg-stone-100 cursor-pointer'
                            }`}
                            style={
                              !taken && newEventType === preset.type
                                ? { backgroundColor: themeColor }
                                : {}
                            }
                          >
                            <span className="text-lg">{preset.emoji}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wide leading-tight text-center line-clamp-2">
                              {preset.type}
                            </span>
                            {taken && (
                              <span className="text-[7px] font-bold uppercase text-charcoal/30">Added</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom type input */}
                    {newEventType === 'Custom' && (
                      <input
                        autoFocus
                        value={customEventType}
                        onChange={e => setCustomEventType(e.target.value)}
                        placeholder="Event name (e.g. Retirement)"
                        className="w-full bg-stone-50 px-4 py-2.5 rounded-xl border border-black/[0.06] text-[13px] font-medium text-charcoal focus:outline-none focus:border-charcoal/20 placeholder:text-charcoal/25"
                      />
                    )}

                    {/* Date picker — hidden for fixed-date holidays (Valentine's, Christmas, etc.) */}
                    {newEventType && !PRESET_OCCASIONS[newEventType] && (
                      <WheelDatePicker
                        label="Date"
                        value={newEventDate}
                        onChange={setNewEventDate}
                      />
                    )}

                    {newEventType && (
                      <div>
                        <label className={labelCls}>
                          Gift focus <span className="font-semibold normal-case tracking-normal text-charcoal/35">(optional)</span>
                          <span className="float-right text-charcoal/30 tabular-nums">
                            {newEventIdeaContext.length}/{EVENT_IDEA_CONTEXT_MAX}
                          </span>
                        </label>
                        <textarea
                          value={newEventIdeaContext}
                          onChange={(e) =>
                            setNewEventIdeaContext(e.target.value.slice(0, EVENT_IDEA_CONTEXT_MAX))
                          }
                          maxLength={EVENT_IDEA_CONTEXT_MAX}
                          rows={3}
                          placeholder="e.g. Small gathering at home — nothing huge. She’s picky about scents."
                          className={`${inputCls} min-h-[72px] resize-none text-[12px] leading-relaxed`}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const finalType =
                            newEventType === 'Custom' ? customEventType.trim() : newEventType;
                          if (
                            finalType &&
                            newEventDate &&
                            isOccasionTypeAvailableForPerson(finalType, person.id, personOccasions)
                          ) {
                            handleQuickAddOccasion(finalType, newEventDate, newEventIdeaContext);
                            setNewEventType('');
                            setNewEventDate('');
                            setCustomEventType('');
                            setNewEventIdeaContext('');
                            setShowAddEvent(false);
                          }
                        }}
                        disabled={(() => {
                          const finalType =
                            newEventType === 'Custom' ? customEventType.trim() : newEventType;
                          if (!newEventType || !newEventDate) return true;
                          if (newEventType === 'Custom' && !customEventType.trim()) return true;
                          if (!finalType) return true;
                          return !isOccasionTypeAvailableForPerson(
                            finalType,
                            person.id,
                            personOccasions
                          );
                        })()}
                        className="flex-1 h-10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-30 transition-all cursor-pointer"
                        style={{ backgroundColor: themeColor }}
                      >
                        Add Event
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddEvent(false);
                          setNewEventType('');
                          setNewEventDate('');
                          setCustomEventType('');
                          setNewEventIdeaContext('');
                        }}
                        className="flex-1 h-10 rounded-full text-[10px] font-bold uppercase tracking-widest bg-stone-100 text-charcoal/50 hover:bg-stone-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Personal Details */}
            <section className="space-y-4">
              <p className="text-[17px] font-bold text-charcoal tracking-tight">Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Name</label><input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Relation</label>
                  <CustomSelect
                    value={editRelation}
                    onChange={setEditRelation}
                    options={RELATIONS.map(r => ({ value: r, label: r }))}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <WheelDatePicker label="Birthday" value={editBirthday} onChange={setEditBirthday} />
                </div>
                {isPartnerRelation(editRelation) && (
                  <div className="col-span-2 sm:col-span-1">
                    <WheelDatePicker label="Anniversary" value={editAnniversaryDate} onChange={setEditAnniversaryDate} />
                  </div>
                )}
              </div>
              <div><label className={labelCls}>Location</label><input value={editLocation} onChange={e => setEditLocation(e.target.value)} className={inputCls} placeholder="City, Country" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>Theme Color</label><input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-full h-11 rounded-2xl border border-black/[0.07] p-1 cursor-pointer bg-white" /></div>
                <div><label className={labelCls}>Emoji</label><input value={editEmoji} onChange={e => setEditEmoji(e.target.value)} className={`${inputCls} text-center text-xl`} /></div>
              </div>
            </section>

            {/* Gift Preferences */}
            <section className="space-y-4">
              <p className="text-[17px] font-bold text-charcoal tracking-tight">Gift Preferences</p>
              <div><label className={labelCls}>Interests</label><textarea value={editInterests} onChange={e => setEditInterests(e.target.value)} className={`${inputCls} min-h-[80px] resize-none`} placeholder="Gaming, cooking, hiking..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Budget per gift</label>
                  <CustomSelect
                    value={editBudget}
                    onChange={setEditBudget}
                    options={BUDGET_OPTIONS.map(b => ({ value: b, label: b }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Style</label>
                  <CustomSelect
                    value={editStyle}
                    onChange={setEditStyle}
                    options={STYLES.map(s => ({ value: s, label: s }))}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Gift Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Physical gifts', 'Experiences', 'Either'] as const).map(pref => (
                    <button
                      key={pref} type="button" onClick={() => setEditPreferences(pref)}
                      className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                        editPreferences === pref ? 'bg-charcoal text-white border-charcoal' : 'bg-white border-black/[0.07] text-charcoal/40 hover:border-charcoal/20'
                      }`}
                    >
                      {pref === 'Physical gifts' ? 'Material' : pref === 'Experiences' ? 'Events' : 'Mixed'}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={labelCls}>What's fallen flat before</label><input value={editFallenFlat} onChange={e => setEditFallenFlat(e.target.value)} className={inputCls} placeholder="e.g. scented candles, socks..." /></div>
            </section>

            {/* Memory */}
            <section className="space-y-4">
              <p className="text-[17px] font-bold text-charcoal tracking-tight">Memory</p>
              <div><label className={labelCls}>Past gifts that landed well</label><textarea value={editPastGifts} onChange={e => setEditPastGifts(e.target.value)} className={`${inputCls} min-h-[80px] resize-none`} placeholder="e.g. book on photography, silk scarf..." /></div>
              <div><label className={labelCls}>Notes & observations</label><textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className={`${inputCls} min-h-[100px] resize-none`} placeholder="Anything useful to remember about them..." /></div>
            </section>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleUpdateProfile}
                className="w-full h-12 rounded-full font-bold text-[11px] uppercase tracking-[0.25em] text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                style={{ backgroundColor: themeColor }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full h-12 text-[10px] font-bold uppercase tracking-widest text-charcoal/30 hover:text-red-400 transition-colors cursor-pointer"
              >
                Remove {person.name.split(' ')[0]} from circle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] p-8 text-center"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-charcoal">Remove {person.name.split(' ')[0]}?</h3>
              <p className="text-[13px] text-charcoal/40 mt-2 leading-relaxed">
                This permanently removes their profile and all saved ideas from your circle.
              </p>
              <div className="space-y-2 mt-6">
                <button onClick={() => { onDeletePerson(person.id); onBack(); }}
                  className="w-full h-12 bg-red-400 text-white rounded-full font-bold text-[11px] uppercase tracking-widest active:scale-95 transition-all cursor-pointer">
                  Yes, Remove
                </button>
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="w-full h-12 text-charcoal/40 font-bold text-[11px] uppercase tracking-widest hover:text-charcoal transition-colors cursor-pointer">
                  Keep
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
