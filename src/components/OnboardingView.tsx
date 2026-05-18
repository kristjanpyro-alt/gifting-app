import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Sparkles, Check, ArrowRight, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Person, Occasion } from '../types';
import WheelDatePicker from './WheelDatePicker';
import CustomSelect from './CustomSelect';
import {
  RELATIONS,
  PRESET_COLORS,
  PRESET_EMOJIS,
  BUDGET_OPTIONS,
  isPartnerRelation,
} from '../constants';

interface OnboardingViewProps {
  onComplete: (person: Person, occasions: Occasion[], userCity: string, timings: number[]) => void;
  onSkip: () => void;
}

export default function OnboardingView({ onComplete, onSkip }: OnboardingViewProps) {
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0); 
  const [word, setWord] = useState('day');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [notifTimings, setNotifTimings] = useState<number[]>([7]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  
  // Total steps for UI display (Introduction to Notifications)
  const TOTAL_STEPS = 9; 
  
  // States for onboarding data
  const [questionsData, setQuestionsData] = useState({
    style: '',
    fear: '',
  });
  
  const [personData, setPersonData] = useState({
    name: '',
    relation: 'Partner / Spouse',
    birthday: '',
    interests: '',
    fallenFlat: '',
    preferences: 'Either' as 'Physical gifts' | 'Experiences' | 'Either',
    budget: '€25-50',
    anniversaryDate: '',
    color: '#C42040',
    emoji: '💖'
  });

  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(['Birthday']);
  const [customOccasion, setCustomOccasion] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [userCity, setUserCity] = useState('');
  const [showCityInput, setShowCityInput] = useState(false);
  const [manualCityValue, setManualCityValue] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const PRESET_DATA: Record<string, { date?: string, emoji: string }> = {
    'Birthday': { emoji: '🎂' },
    'Anniversary': { emoji: '💍' },
    'Christmas': { date: '12-25', emoji: '🎄' },
    'Valentine\'s Day': { date: '02-14', emoji: '💝' },
    'Mother\'s Day': { date: '05-10', emoji: '👩' },
    'Father\'s Day': { date: '06-21', emoji: '👨' },
    'Women\'s Day': { date: '03-08', emoji: '💐' },
    'Men\'s Day': { date: '11-19', emoji: '🕺' },
    'Easter': { date: '04-05', emoji: '🐣' },
    'Graduation': { emoji: '🎓' },
    'New Baby': { emoji: '👶' },
    'Wedding': { emoji: '👰' },
    'Engagement': { emoji: '💎' },
    'Housewarming': { emoji: '🏡' },
    'Promotion': { emoji: '📈' },
    'Retirement': { emoji: '🏖️' },
    'Halloween': { date: '10-31', emoji: '🎃' },
  };

  const OCCASION_GROUPS = [
    {
      name: 'Core Days',
      items: ['Birthday', 'Anniversary']
    },
    {
      name: 'Cultural & Seasonal',
      items: ['Christmas', 'Valentine\'s Day', 'Mother\'s Day', 'Father\'s Day', 'Easter', 'Women\'s Day', 'Men\'s Day', 'Halloween']
    },
    {
      name: 'Life Milestones',
      items: ['Graduation', 'New Baby', 'Wedding', 'Engagement', 'Housewarming'],
      disabled: true,
      note: 'Added later from Dashboard'
    }
  ];

  // Word loop for step 0
  useEffect(() => {
    if (step === 0) {
      const interval = setInterval(() => {
        setWord(prev => prev === 'day' ? 'gift' : 'day');
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Scroll to top when step changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [step]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const finishOnboarding = () => {
    const newPerson: Person = {
      id: 'p-' + Date.now(),
      name: personData.name,
      initials: personData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      relation: personData.relation,
      interests: personData.interests.split(',').map(i => i.trim()).filter(i => i),
      budget: personData.budget,
      style: questionsData.style || 'Flexible',
      avatarUrl: '',
      notes: '',
      lastNoteUpdate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      savedGifts: [],
      themeColor: personData.color,
      emoji: personData.emoji,
      birthday: personData.birthday || undefined,
      anniversaryDate: personData.anniversaryDate || undefined,
      preferences: personData.preferences,
      giftingFear: questionsData.fear || undefined,
      fallenFlatKeywords: personData.fallenFlat
        ? personData.fallenFlat.split(',').map(i => i.trim()).filter(Boolean)
        : undefined,
    };

    const combinedOccasions = [...selectedOccasions].filter(
      (type) => type !== 'Birthday' || !!personData.birthday
    );
    if (customOccasion.trim()) {
      combinedOccasions.push(customOccasion.trim());
    }

    const newOccasions: Occasion[] = combinedOccasions.map((type, idx) => {
      let date = '';
      const normalizedType = Object.keys(PRESET_DATA).find(k => k.toLowerCase() === type.toLowerCase()) || type;
      const preset = PRESET_DATA[normalizedType];
      
      if (type === 'Birthday') {
        date = personData.birthday;
      } else if (type === 'Anniversary' && personData.anniversaryDate) {
        date = personData.anniversaryDate;
      } else if (preset && preset.date) {
        const [m, d] = preset.date.split('-');
        date = `${new Date().getFullYear()}-${m}-${d}`;
      } else {
        // Double check common holiday names even if not in exact preset
        const holidayMatch = Object.entries(PRESET_DATA).find(([key, val]) => 
          val.date && type.toLowerCase().includes(key.toLowerCase())
        );

        if (holidayMatch) {
          const [m, d] = holidayMatch[1].date!.split('-');
          date = `${new Date().getFullYear()}-${m}-${d}`;
        } else {
          // For others, mock dates starting from next month to spread them out
          const today = new Date();
          const mockMonth = (today.getMonth() + (idx % 8) + 1) % 12;
          const mockYear = today.getFullYear() + (today.getMonth() + (idx % 8) + 1 >= 12 ? 1 : 0);
          const mockDate = new Date(mockYear, mockMonth, 15 + (idx % 10));
          date = mockDate.toISOString().split('T')[0];
        }
      }
      
      const occasionDate = new Date(date);
      const today = new Date();
      let nextOccasionDate = new Date(today.getFullYear(), occasionDate.getMonth(), occasionDate.getDate());
      if (nextOccasionDate < today) {
        nextOccasionDate.setFullYear(today.getFullYear() + 1);
      }
      const daysRemaining = Math.ceil((nextOccasionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: `o-onboard-${idx}-${Date.now()}`,
        personId: newPerson.id,
        title: type === 'Birthday' ? `${personData.name}'s Birthday` : `${personData.name}'s ${type}`,
        type: type as any,
        date: date,
        month: nextOccasionDate.toLocaleString('default', { month: 'short' }),
        day: nextOccasionDate.getDate(),
        daysRemaining: daysRemaining,
        emoji: preset?.emoji
      };
    });

    onComplete(newPerson, newOccasions, userCity, notifTimings);
  };
  const renderStep = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-10 py-12">
            <div className="flex gap-1.5 mb-20">
              <div className="w-8 h-1.5 bg-dusty-rose rounded-full"></div>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-charcoal/10 rounded-full"></div>
              ))}
            </div>
            
            <h1 className="font-headline text-[32px] md:text-5xl font-bold leading-tight mb-8 uppercase tracking-tighter">
              GIFTIN
            </h1>
            
            <h1 className="font-headline text-[24px] md:text-3xl font-bold leading-tight mb-10 text-charcoal/80">
              Never forget an <br />
              important <span className="inline-grid grid-cols-1 grid-rows-1 place-items-center">
                <span className="invisible col-start-1 row-start-1 text-dusty-rose italic px-0.5">gift</span>
                <span className="invisible col-start-1 row-start-1 text-dusty-rose italic px-0.5">day</span>
                <AnimatePresence>
                  <motion.span
                    key={word}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="text-dusty-rose italic col-start-1 row-start-1"
                  >
                    {word}
                  </motion.span>
                </AnimatePresence>
              </span>&nbsp;again.
            </h1>
            
            <p className="text-charcoal/40 text-base md:text-lg mb-16 leading-relaxed">
              The app that remembers<br />so you can just show up.
            </p>
            
            <div className="w-full space-y-4 max-w-xs mx-auto">
              <button 
                onClick={handleNext}
                className="w-full py-4.5 bg-transparent border border-charcoal/20 rounded-2xl font-bold text-charcoal active:scale-[0.98] transition-all hover:bg-charcoal/5"
              >
                Get started
              </button>
              <button 
                onClick={() => alert("Authentication (Google & Apple) is currently being integrated. Please use 'Get started' to set up your local archive for now.")}
                className="w-full py-4 text-charcoal/40 font-bold hover:text-charcoal/60 transition-colors"
              >
                I already have an account
              </button>
              <button 
                onClick={onSkip}
                className="w-full py-2 text-charcoal/30 font-bold text-xs uppercase tracking-widest hover:text-charcoal/40 transition-colors"
              >
                Skip Onboarding
              </button>
            </div>
          </div>
        );

      case 1: // Short Introduction
        return (
          <div className="p-6 pt-12">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-charcoal/60 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <div className="space-y-12">
              <div>
                <h2 className="text-[32px] font-headline font-bold mb-6 leading-tight text-charcoal">Gift giving,<br />simplified.</h2>
                <p className="text-charcoal/60 text-base leading-relaxed mb-8">
                  Finding the perfect gift shouldn't feel like a chore. The mental load of "what to get" ends here.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex gap-4 p-5 bg-surface-container-low rounded-[28px] border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-full bg-dusty-rose/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-dusty-rose" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Our Solution</h4>
                    <p className="text-xs text-charcoal/40 leading-relaxed">GIFTIN automates the thinking part. We provide the nudge and the perfect idea, tailored specifically to them.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-surface-container-low rounded-[28px] border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-tertiary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">How it works</h4>
                    <p className="text-xs text-charcoal/40 leading-relaxed">We need just a few details about your Inner Circle. We'll turn that into a calibrated reminder system and a personalized gift catalog.</p>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <p className="text-[10px] text-charcoal/30 font-bold uppercase tracking-[0.05em] text-center mb-6">
                   Your data stays private & strictly local.
                </p>
                <button 
                  onClick={handleNext}
                  className="w-full py-4.5 bg-charcoal text-white rounded-2xl font-bold shadow-lg shadow-charcoal/10 active:scale-[0.98] transition-all"
                >
                  Let's Curate
                </button>
              </div>
            </div>
          </div>
        );

      case 2: // Who's first? - NAME & RELATION
        return (
          <div className="p-6 pt-12">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <h2 className="text-[32px] font-headline font-bold mb-3 leading-tight tracking-tight">Who's first?</h2>
            <p className="text-charcoal/60 mb-10 text-sm">Add someone important. Someone you want to celebrate without the stress.</p>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 px-1">Their Name</label>
                <input 
                  value={personData.name}
                  onChange={e => setPersonData({...personData, name: e.target.value})}
                  className="w-full p-5 bg-charcoal/5 rounded-[22px] border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-dusty-rose/20 transition-all font-serif italic text-xl" 
                  placeholder="Anna, James, etc." 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 px-1">Your Relationship</label>
                <CustomSelect
                  value={personData.relation}
                  onChange={(v) => setPersonData({ ...personData, relation: v })}
                  options={RELATIONS.map(rel => ({ value: rel, label: rel }))}
                  triggerClassName="w-full p-5 bg-charcoal/5 rounded-[22px] border border-outline-variant/10 font-bold text-charcoal text-base flex items-center justify-between gap-2 cursor-pointer hover:bg-charcoal/8 active:scale-[0.99] transition-all"
                />
              </div>

              <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 space-y-7">
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-charcoal/40">Theme Atmosphere</p>
                  <div className="flex flex-wrap gap-2.5">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setPersonData({...personData, color})}
                        className={`w-9 h-9 rounded-full border-2 transition-all shadow-sm ${personData.color === color ? 'border-charcoal scale-110 shadow-md ring-2 ring-charcoal/10' : 'border-transparent opacity-60'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative">
                      <input 
                        type="color" 
                        ref={colorPickerRef}
                        className="sr-only"
                        onChange={(e) => setPersonData({...personData, color: e.target.value})}
                      />
                      <button 
                        onClick={() => colorPickerRef.current?.click()}
                        className={`w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${!PRESET_COLORS.includes(personData.color.toUpperCase()) ? 'border-charcoal scale-110 shadow-md ring-2 ring-charcoal/10 bg-white' : 'border-charcoal/20 opacity-60'}`}
                        style={{ backgroundColor: !PRESET_COLORS.includes(personData.color.toUpperCase()) ? personData.color : 'transparent' }}
                      >
                         <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-red-400 via-green-400 to-blue-400 opacity-80" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-charcoal/40">Identity Emoji</p>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setPersonData({...personData, emoji})}
                        className={`aspect-square rounded-2xl text-xl flex items-center justify-center transition-all ${personData.emoji === emoji ? 'bg-charcoal text-white scale-105 shadow-lg' : 'bg-charcoal/5 hover:bg-charcoal/10'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleNext}
              disabled={!personData.name}
              className="w-full py-4.5 bg-charcoal text-white rounded-2xl font-bold mt-16 disabled:opacity-20 active:scale-[0.98] transition-all shadow-xl shadow-charcoal/10"
            >
              Continue
            </button>
          </div>
        );
      case 3: // STYLE & FEAR (From Screenshot)
        return (
          <div className="p-6 pt-12">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-charcoal/60 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <h2 className="text-[30px] font-headline font-bold mb-3 leading-tight tracking-tight text-charcoal">How would you describe their style?</h2>
            <p className="text-charcoal/60 mb-10 text-sm">This helps our AI target the right archetypes for gift suggestions. Pick the best fit.</p>

            <div className="space-y-10">
              <section>
                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal/60 mb-4 block tracking-[0.2em]">Gifting Profile</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'Thoughtful', label: '🎯 Thoughtful', sub: 'Values meaning > price' },
                    { id: 'Minimalist', label: '✨ Minimalist', sub: 'Hates clutter' },
                    { id: 'Fun / Playful', label: '🎉 Fun / Playful', sub: 'Likes surprises' },
                    { id: 'Trendy', label: '🛍️ Trendy', sub: 'Follows trends' },
                    { id: 'Practical', label: '🎁 Practical', sub: 'Wants useful stuff' },
                    { id: 'Luxury', label: '💎 Luxury', sub: 'Cares about quality' }
                  ].map(opt => (
                    <button 
                      key={opt.id}
                      onClick={() => setQuestionsData({...questionsData, style: opt.id})}
                      className={`p-4 border rounded-[24px] text-left transition-all ${questionsData.style === opt.id ? 'bg-dusty-rose/10 border-dusty-rose text-dusty-rose shadow-md scale-[1.02]' : 'bg-surface-container-low border-outline-variant/30 text-charcoal/60 hover:bg-white hover:border-charcoal/10'}`}
                    >
                      <div className="font-bold text-xs mb-1">{opt.label}</div>
                      <div className="text-[10px] opacity-60 leading-tight">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal/60 mb-4 block tracking-[0.2em]">Your Biggest Fear</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    'Giving something generic', 
                    'Forgetting the occasion', 
                    'Going over budget', 
                    'They already have it'
                  ].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setQuestionsData({...questionsData, fear: opt})}
                      className={`p-5 border rounded-[22px] text-left transition-all font-bold text-sm ${questionsData.fear === opt ? 'bg-dusty-rose/10 border-dusty-rose text-dusty-rose' : 'bg-surface border-outline-variant/30 text-charcoal/60'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <button 
              onClick={handleNext}
              disabled={!questionsData.style || !questionsData.fear}
              className="w-full py-4.5 bg-charcoal text-white rounded-2xl font-bold mt-16 disabled:opacity-20 active:scale-[0.98] transition-all shadow-lg shadow-charcoal/10"
            >
              Continue
            </button>
          </div>
        );

      case 4: // Dates
        return (
          <div className="p-6 pt-12">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <h2 className="text-[32px] font-headline font-bold mb-3 leading-tight tracking-tight">Timeline</h2>
            <p className="text-charcoal/60 mb-10 text-sm">When do the celebrations start? We'll remind you based on how early you like to shop.</p>

              <div className="space-y-10">
              <div className="space-y-3">
                <WheelDatePicker
                  label={`${personData.name}'s Birthday`}
                  value={personData.birthday}
                  onChange={v => setPersonData({...personData, birthday: v})}
                  defaultYear={new Date().getFullYear() - 30}
                />
              </div>
              
              {isPartnerRelation(personData.relation) && (
                <div className="space-y-3">
                  <WheelDatePicker
                    label="Your Anniversary"
                    value={personData.anniversaryDate}
                    onChange={v => setPersonData({...personData, anniversaryDate: v})}
                    defaultYear={new Date().getFullYear()}
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4.5 bg-charcoal text-white rounded-2xl font-bold mt-16 active:scale-[0.98] transition-all shadow-xl shadow-charcoal/10"
            >
              Continue
            </button>
          </div>
        );

      case 5: // Passions/Budget
        return (
          <div className="p-6 pt-12">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <h2 className="text-[32px] font-headline font-bold mb-3 leading-tight tracking-tight text-balance">What makes them tick?</h2>
            <p className="text-charcoal/60 mb-10 text-sm">Specific interests lead to specific gifts. Tell us about {personData.name}.</p>

            <div className="space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 px-1 flex items-center justify-between">
                  Interests & Passions
                  <span className={`font-semibold tabular-nums normal-case ${personData.interests.length >= 180 ? 'text-amber-500' : 'text-charcoal/25'}`}>{personData.interests.length}/200</span>
                </label>
                <textarea 
                  value={personData.interests}
                  onChange={e => setPersonData({...personData, interests: e.target.value.slice(0, 200)})}
                  className="w-full p-6 bg-surface-container/20 border border-outline-variant/10 rounded-[32px] focus:outline-none focus:bg-white transition-all min-h-[140px] text-base font-serif italic" 
                  placeholder="Ceramics, coffee culture, modern design..." 
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 px-1">Gift Budget Target</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {BUDGET_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setPersonData({...personData, budget: opt})}
                      className={`py-4 border rounded-[22px] text-sm font-bold transition-all ${personData.budget === opt ? 'bg-charcoal text-white border-charcoal' : 'bg-surface border-outline-variant/30 text-charcoal/60'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 px-1">Gift style</label>
                <div className="flex gap-2">
                  {([
                    { value: 'Physical gifts', label: '🎁 Things' },
                    { value: 'Experiences', label: '🎟️ Events' },
                    { value: 'Either', label: '✨ Both' },
                  ] as { value: 'Physical gifts' | 'Experiences' | 'Either'; label: string }[]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPersonData({...personData, preferences: opt.value})}
                      className={`flex-1 py-3 rounded-[22px] text-xs font-bold border transition-all ${personData.preferences === opt.value ? 'bg-charcoal text-white border-charcoal' : 'bg-surface border-outline-variant/30 text-charcoal/60'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 px-1">
                  Past gifts & things to avoid
                  <span className="ml-2 font-semibold normal-case text-charcoal/25">(optional)</span>
                </label>
                <input
                  type="text"
                  value={personData.fallenFlat}
                  onChange={e => setPersonData({...personData, fallenFlat: e.target.value})}
                  placeholder="e.g. candles, silk scarf last year…"
                  className="w-full px-5 py-4 bg-surface-container/20 border border-outline-variant/10 rounded-[24px] focus:outline-none focus:bg-white transition-all text-sm font-medium text-charcoal placeholder:text-charcoal/25"
                />
              </div>
            </div>

            <button onClick={handleNext} className="w-full py-4.5 bg-charcoal text-white rounded-2xl font-bold mt-16 shadow-xl shadow-charcoal/10 transition-all">Continue</button>
          </div>
        );

      case 6: // Occasions
        return (
          <div className="p-6 pt-12">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <h2 className="text-[28px] font-headline font-bold mb-3 leading-tight tracking-tight">Extra Occasions</h2>
            <p className="text-charcoal/60 mb-8 text-sm">Which other days should we curate for {personData.name}?</p>

            <div className="space-y-8 mb-10">
              {OCCASION_GROUPS.map(group => (
                <div key={group.name} className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/60 px-2">{group.name}</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {group.items.map(opt => {
                      const isDisabled = group.disabled;
                      const isSelected = selectedOccasions.includes(opt);
                      
                      return (
                        <button 
                          key={opt}
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) return;
                            if (selectedOccasions.includes(opt)) {
                              setSelectedOccasions(selectedOccasions.filter(o => o !== opt));
                            } else {
                              setSelectedOccasions([...selectedOccasions, opt]);
                            }
                          }}
                          className={`py-4 px-2 border rounded-[24px] text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            isSelected 
                              ? 'bg-dusty-rose/10 border-dusty-rose text-dusty-rose shadow-sm' 
                              : isDisabled 
                                ? 'bg-charcoal/[0.02] border-charcoal/5 text-charcoal/40 cursor-not-allowed'
                                : 'bg-surface border-outline-variant/40 text-charcoal/60 hover:bg-charcoal/5'
                          }`}
                        >
                          <span className={`text-sm ${isDisabled ? 'opacity-20' : 'opacity-70'}`}>{PRESET_DATA[opt]?.emoji}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {group.note && <p className="text-[9px] text-charcoal/30 px-2 mt-1 italic">{group.note}</p>}
                </div>
              ))}
            </div>

            <div className="relative mb-8">
              <input 
                type="text"
                placeholder="+ Add custom (Promotion, etc.)"
                value={customOccasion}
                onChange={e => setCustomOccasion(e.target.value)}
                className="w-full py-5 px-6 bg-surface-container-low border-2 border-dashed border-charcoal/10 rounded-[28px] text-sm font-bold text-charcoal/80 focus:outline-none focus:border-dusty-rose/40 hover:bg-charcoal/5 transition-all text-center"
              />
            </div>

            <button onClick={handleNext} className="w-full py-4.5 bg-charcoal text-white rounded-2xl font-bold shadow-lg shadow-charcoal/10">Looks good</button>
          </div>
        );

      case 7: // Location
        return (
          <div className="p-6 pt-12 text-center flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-dusty-rose/10 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_20px_rgba(196,32,64,0.1)]">
                <MapPin className="text-dusty-rose w-10 h-10" />
              </div>

              <h2 className="text-[30px] font-headline font-bold mb-4 leading-tight tracking-tight">One last detail</h2>
              <p className="text-charcoal/60 mb-12 text-base max-w-[280px] mx-auto leading-relaxed text-balance">Where are you based? This helps us find physical gift makers and local experiences near you.</p>

              <div className="p-7 bg-surface-container-low/60 rounded-[32px] border border-outline-variant/20 mb-12 w-full max-w-sm">
                <p className="text-xs text-charcoal/40 italic leading-relaxed font-medium">
                  We value your privacy.<br />Location data stays strictly on device,<br />strictly for sourcing local ideas.
                </p>
              </div>

              <div className="space-y-3 w-full max-w-xs mx-auto">
                <button
                  disabled={isDetecting}
                  onClick={() => {
                    setIsDetecting(true);
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        try {
                          const { latitude, longitude } = pos.coords;
                          const res = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                            { headers: { 'Accept-Language': 'en' } }
                          );
                          const data = await res.json();
                          const city = data.address?.city || data.address?.town || data.address?.village || '';
                          const country = data.address?.country || '';
                          setUserCity(city ? `${city}, ${country}` : country);
                          setIsDetecting(false);
                          handleNext();
                        } catch {
                          setIsDetecting(false);
                          setShowCityInput(true);
                        }
                      },
                      () => {
                        setIsDetecting(false);
                        setShowCityInput(true);
                      }
                    );
                  }}
                  className="w-full py-4 bg-charcoal text-white rounded-2xl font-bold shadow-xl disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity"
                >
                  {isDetecting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Detecting…</>
                  ) : 'Detect Location'}
                </button>

                {showCityInput ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={manualCityValue}
                      onChange={e => setManualCityValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && manualCityValue.trim()) {
                          setUserCity(manualCityValue.trim());
                          handleNext();
                        }
                      }}
                      placeholder="e.g. Tallinn, Estonia"
                      className="w-full px-4 py-3 rounded-2xl border border-charcoal/15 text-sm font-medium text-charcoal focus:outline-none focus:border-charcoal/30 placeholder:text-charcoal/30"
                    />
                    <button
                      onClick={() => {
                        if (manualCityValue.trim()) {
                          setUserCity(manualCityValue.trim());
                          handleNext();
                        }
                      }}
                      disabled={!manualCityValue.trim()}
                      className="w-full py-3 bg-charcoal text-white rounded-2xl font-bold text-sm disabled:opacity-30"
                    >
                      Confirm City
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowCityInput(true)} className="w-full py-4 text-charcoal/60 font-bold border border-charcoal/10 rounded-2xl text-sm">Enter city manually</button>
                )}

                <button onClick={handleNext} className="w-full py-4 text-charcoal/40 font-bold text-sm tracking-wide">Skip for now</button>
              </div>
            </div>
          </div>
        );

      case 8: { // Notification timing + permission
        const TIMING_OPTIONS = [
          { days: 30, label: '1 month before', sub: 'I plan way ahead', emoji: '📅' },
          { days: 7,  label: '1 week before',  sub: 'Sweet spot',       emoji: '🎯' },
          { days: 3,  label: '3 days before',  sub: 'Last-minute me',   emoji: '⚡' },
        ];

        const toggleTiming = (d: number) => {
          setNotifTimings(prev =>
            prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
          );
        };

        const requestNotifications = async () => {
          if (!('Notification' in window)) {
            setNotifPermission('unsupported');
            return;
          }
          const result = await Notification.requestPermission();
          setNotifPermission(result);
        };

        return (
          <div className="p-6 pt-12">
            <div className="flex justify-between items-center mb-12">
              <button onClick={handleBack} className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"><ArrowLeft className="w-4 h-4" /> back</button>
              <div className="flex gap-1.5">
                {[...Array(TOTAL_STEPS)].map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'bg-dusty-rose w-4' : 'bg-charcoal/10 w-1.5'}`} />
                ))}
              </div>
              <span className="text-[10px] text-charcoal/30 font-bold uppercase tracking-widest">{step} of {TOTAL_STEPS}</span>
            </div>

            <h2 className="text-[30px] font-headline font-bold mb-3 leading-tight tracking-tight">When should we<br />remind you?</h2>
            <p className="text-charcoal/60 mb-10 text-sm leading-relaxed">Pick how early you shop — we'll send you curated gift ideas at the perfect time.</p>

            <div className="space-y-3 mb-10">
              {TIMING_OPTIONS.map(opt => {
                const active = notifTimings.includes(opt.days);
                return (
                  <button
                    key={opt.days}
                    onClick={() => toggleTiming(opt.days)}
                    className={`w-full flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all text-left ${
                      active ? 'border-dusty-rose bg-dusty-rose/[0.06] shadow-sm' : 'border-charcoal/10 bg-surface-container-low'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="flex-grow">
                      <p className={`font-bold text-sm ${active ? 'text-dusty-rose' : 'text-charcoal/70'}`}>{opt.label}</p>
                      <p className="text-[11px] text-charcoal/40 mt-0.5">{opt.sub}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      active ? 'border-dusty-rose bg-dusty-rose' : 'border-charcoal/20'
                    }`}>
                      {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-10 p-5 rounded-[24px] border border-outline-variant/20 bg-surface-container-low/60">
              {notifPermission === 'granted' ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-green-500" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-charcoal">Notifications enabled</p>
                    <p className="text-[11px] text-charcoal/40 mt-0.5">We'll send reminders before each occasion.</p>
                  </div>
                </div>
              ) : notifPermission === 'denied' || notifPermission === 'unsupported' ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-charcoal">Notifications blocked</p>
                    <p className="text-[11px] text-charcoal/40 mt-0.5">Enable them in your browser settings to receive reminders.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-charcoal">Enable reminders 🔔</p>
                    <p className="text-[11px] text-charcoal/40 mt-0.5 leading-relaxed">Get notified before every occasion so you never shop at the last second.</p>
                  </div>
                  <button
                    onClick={requestNotifications}
                    className="flex-shrink-0 px-4 py-2 bg-charcoal text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Allow
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={notifTimings.length === 0}
              className="w-full py-4.5 bg-charcoal text-white rounded-2xl font-bold disabled:opacity-20 active:scale-[0.98] transition-all shadow-xl shadow-charcoal/10"
            >
              Continue
            </button>
          </div>
        );
      }

      case 9: // Success
        return (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative mb-12">
              <Sparkles className="text-dusty-rose w-16 h-16" />
              <motion.div 
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-dusty-rose/30 blur-3xl rounded-full"
              />
            </div>
            
            <h2 className="text-[36px] font-headline font-bold mb-4 leading-tight tracking-tighter">Profile Sealed.</h2>
            <p className="text-charcoal/60 mb-12 text-base leading-relaxed max-w-xs">
              {personData.name}'s profile is sealed.<br />
              <span className="font-semibold text-charcoal/80 italic text-balance">Head to Ideas to generate your first gift suggestions.</span>
            </p>

            <div className="w-full p-6 border border-outline-variant/20 rounded-[36px] bg-white flex items-center justify-between mb-20 shadow-2xl border-b-[4px] border-b-charcoal/10">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm border border-white/20"
                  style={{ backgroundColor: `${personData.color}20` }}
                >
                   {personData.emoji}
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg text-charcoal leading-tight">{personData.name}</p>
                  <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-[0.1em] mt-1">
                    {personData.relation} · Birthday next
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 bg-charcoal text-white rounded-full">
                <p className="text-[10px] font-black uppercase tracking-widest text-center leading-none">Ready</p>
              </div>
            </div>

            <button onClick={finishOnboarding} className="w-full py-5 bg-charcoal text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl active:scale-[0.95] transition-all group">
              Enter Dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="min-h-screen bg-surface font-body text-charcoal overflow-y-auto selection:bg-dusty-rose/20"
    >
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        {renderStep()}
      </div>
    </div>
  );
}
