/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
  Gift,
  UserCircle2,
} from "lucide-react";

import HomeView from "./components/HomeView";
import ProfileView from "./components/ProfileView";
import IdeasView from "./components/IdeasView";
import PeopleListView from "./components/PeopleListView";
import OnboardingV2View from "./components/OnboardingV2View";
import SettingsView from "./components/SettingsView";
import AddPersonModal from "./components/AddPersonModal";
import {
  suggestedRelationForHolidayTitle,
  presetOccasionKeyForHolidayTitle,
} from "./data/holidays";
import MilestoneModal from "./components/MilestoneModal";
import SplashScreen from "./components/SplashScreen";
import Mascot from "./components/Mascot";
import { StorageService } from "./services/StorageService";
import { curateGiftIdeas } from "./services/geminiService";
import { Person, Occasion, IdeasOccasionFocus, GiftIdea, UserProfile } from "./types";
import { calculateDaysRemaining, MONTHS } from "./constants";
import { isOccasionTypeAvailableForPerson } from "./utils/occasionRules";

type View = "home" | "people" | "ideas" | "settings" | "person-profile" | "gifts" | "me";

export default function App() {
  const today = new Date();

  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [currentView, setCurrentView] = useState<View>("home");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [ideasOccasionFocus, setIdeasOccasionFocus] = useState<IdeasOccasionFocus | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addPersonRelationHint, setAddPersonRelationHint] = useState<string | null>(null);
  const [addPersonPresetKeys, setAddPersonPresetKeys] = useState<string[]>([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [notificationTimings, setNotificationTimings] = useState<number[]>([7]);
  const [limitToast, setLimitToast] = useState<string | null>(null);
  const [ideasInitialOccasionId, setIdeasInitialOccasionId] = useState<string | null>(null);
  const [showOnboardingHandoff, setShowOnboardingHandoff] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentView]);

  useEffect(() => {
    if (currentView !== "ideas") {
      setIdeasOccasionFocus(null);
    }
  }, [currentView]);

  function showLimitToast(msg: string) {
    setLimitToast(msg);
    setTimeout(() => setLimitToast(null), 3500);
  }

  function openAddPerson(holidayTitle?: string) {
    setAddPersonRelationHint(
      holidayTitle ? suggestedRelationForHolidayTitle(holidayTitle) : null
    );
    setAddPersonPresetKeys([]);
    setIsAddModalOpen(true);
  }

  /** Home holiday chips: open Add Person with relation hint + preset occasion when no matched contact */
  function openAddPersonFromHolidayChip(holidayTitle: string) {
    setAddPersonRelationHint(suggestedRelationForHolidayTitle(holidayTitle));
    const key = presetOccasionKeyForHolidayTitle(holidayTitle);
    setAddPersonPresetKeys(key ? [key] : []);
    setIsAddModalOpen(true);
  }

  // -------------------------------------------------------------------------
  // Bootstrap
  // -------------------------------------------------------------------------
  useEffect(() => {
    setHasOnboarded(StorageService.getOnboarded());
    setPeople(StorageService.getPeople());
    setNotificationTimings(StorageService.getNotificationTimings());
    // Recalculate daysRemaining on every load — stored values go stale after a day
    setOccasions(
      StorageService.getOccasions().map((o) => ({
        ...o,
        daysRemaining: calculateDaysRemaining(o.date),
      }))
    );
  }, []);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const handlePrevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );

  const handleNextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  const handlePersonClick = (
    id: string,
    action?: "profile" | "ideas",
    focus?: IdeasOccasionFocus | null
  ) => {
    setSelectedPersonId(id);
    if (action === "ideas") {
      if (focus && focus.personId === id) {
        setIdeasOccasionFocus(focus);
      } else {
        setIdeasOccasionFocus(null);
      }
      setCurrentView("ideas");
    } else {
      setIdeasOccasionFocus(null);
      setCurrentView("person-profile");
    }
  };

  const handleIdeasSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    setIdeasOccasionFocus((prev) => (prev?.personId === id ? prev : null));
  };

  // -------------------------------------------------------------------------
  // CRUD handlers
  // -------------------------------------------------------------------------
  const PEOPLE_LIMIT = 10;
  const MONTHLY_EVENT_LIMIT = 5;

  const handlePersonAdded = (newPerson: Person, occasionsToAdd: Occasion[]) => {
    if (people.length >= PEOPLE_LIMIT) {
      setIsAddModalOpen(false);
      setAddPersonRelationHint(null);
      setAddPersonPresetKeys([]);
      showLimitToast(`You've reached the ${PEOPLE_LIMIT}-person limit for your inner circle.`);
      return;
    }
    StorageService.addPerson(newPerson);
    occasionsToAdd.forEach((o) => StorageService.addOccasion(o));
    setPeople((prev) => [...prev, newPerson]);
    setOccasions((prev) => [...prev, ...occasionsToAdd]);
    setIsAddModalOpen(false);
    setAddPersonRelationHint(null);
    setAddPersonPresetKeys([]);
  };

  const handleMilestoneAdded = (newOccasion: Occasion) => {
    if (!isOccasionTypeAvailableForPerson(newOccasion.type, newOccasion.personId, occasions)) {
      setIsMilestoneModalOpen(false);
      showLimitToast(`That person already has a ${newOccasion.type} event.`);
      return;
    }
    const [, m] = newOccasion.date.split('-').map(Number);
    const eventsInMonth = occasions.filter(o => {
      const [, om] = o.date.split('-').map(Number);
      return om === m;
    }).length;
    if (eventsInMonth >= MONTHLY_EVENT_LIMIT) {
      setIsMilestoneModalOpen(false);
      showLimitToast(`You can only track ${MONTHLY_EVENT_LIMIT} special events per month.`);
      return;
    }
    StorageService.addOccasion(newOccasion);
    setOccasions((prev) => [...prev, newOccasion]);
    setIsMilestoneModalOpen(false);
  };

  /** Append a generation batch using latest state so rapid runs do not drop prior history. */
  const handleRecordIdeaGeneration = (
    personId: string,
    batch: NonNullable<Person["generationHistory"]>[number],
    latestIdeas: GiftIdea[]
  ) => {
    setPeople((prev) => {
      const p = prev.find((x) => x.id === personId);
      if (!p) return prev;
      const newHistory = [batch, ...(p.generationHistory ?? [])].slice(0, 5);
      const updated: Person = {
        ...p,
        generatedIdeas: latestIdeas,
        generationHistory: newHistory,
      };
      StorageService.updatePerson(updated);
      return prev.map((x) => (x.id === personId ? updated : x));
    });
  };

  const handleUpdatePerson = (updatedPerson: Person) => {
    StorageService.updatePerson(updatedPerson);
    const oldPerson = people.find((p) => p.id === updatedPerson.id);
    setPeople((prev) =>
      prev.map((p) => (p.id === updatedPerson.id ? updatedPerson : p))
    );

    if (!oldPerson) return;

    if (updatedPerson.birthday !== oldPerson.birthday && updatedPerson.birthday) {
      const [, m, d] = updatedPerson.birthday.split("-").map(Number);
      setOccasions((prev) =>
        prev.map((o) => {
          if (o.personId === updatedPerson.id && o.type === "Birthday") {
            const updated = {
              ...o,
              date: updatedPerson.birthday!,
              month: MONTHS[m - 1],
              day: d,
              daysRemaining: calculateDaysRemaining(updatedPerson.birthday!),
            };
            StorageService.updateOccasion(updated);
            return updated;
          }
          return o;
        })
      );
    }

    if (
      updatedPerson.anniversaryDate !== oldPerson.anniversaryDate &&
      updatedPerson.anniversaryDate
    ) {
      const [, m, d] = updatedPerson.anniversaryDate.split("-").map(Number);
      setOccasions((prev) =>
        prev.map((o) => {
          if (o.personId === updatedPerson.id && o.type === "Anniversary") {
            const updated = {
              ...o,
              date: updatedPerson.anniversaryDate!,
              month: MONTHS[m - 1],
              day: d,
              daysRemaining: calculateDaysRemaining(updatedPerson.anniversaryDate!),
            };
            StorageService.updateOccasion(updated);
            return updated;
          }
          return o;
        })
      );
    }
  };

  const handleDeletePerson = (id: string) => {
    StorageService.deletePerson(id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setOccasions((prev) => prev.filter((o) => o.personId !== id));
    setCurrentView("people");
    setSelectedPersonId(null);
  };

  const handleDeleteOccasion = (id: string) => {
    StorageService.deleteOccasion(id);
    setOccasions((prev) => prev.filter((o) => o.id !== id));
  };

  const handleAddOccasion = (occasion: Occasion) => {
    if (!isOccasionTypeAvailableForPerson(occasion.type, occasion.personId, occasions)) {
      showLimitToast(`They already have a ${occasion.type} on their calendar.`);
      return;
    }
    StorageService.addOccasion(occasion);
    setOccasions((prev) => [...prev, occasion]);
  };

  const handleOnboardingComplete = (
    person: Person,
    onboardOccasions: Occasion[],
    userCity: string,
    timings: number[],
    profile?: UserProfile,
    preGeneratedIdeas?: GiftIdea[],
  ) => {
    const nextOcc = [...onboardOccasions]
      .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

    // If onboarding pre-generated real ideas, attach them to the person now.
    let personToSave = person;
    if (preGeneratedIdeas && preGeneratedIdeas.length > 0) {
      personToSave = {
        ...person,
        generatedIdeas: preGeneratedIdeas,
        generationHistory: [{
          id: `onboard-${Date.now()}`,
          date: new Date().toISOString(),
          ideas: preGeneratedIdeas,
          occasionKey: nextOcc?.id,
        }],
      };
    }

    StorageService.addPerson(personToSave);
    onboardOccasions.forEach((o) => StorageService.addOccasion(o));
    StorageService.setOnboarded(true);
    StorageService.setUserCity(userCity);
    StorageService.setNotificationTimings(timings);
    if (profile) StorageService.setUserProfile(profile);
    setPeople([personToSave]);
    setOccasions(onboardOccasions);
    setNotificationTimings(timings);
    setHasOnboarded(true);
    setCurrentView("home");
    setShowOnboardingHandoff(true);
    setTimeout(() => setShowOnboardingHandoff(false), 1100);

    // Skip auto-kickoff when we already have pre-generated ideas.
    if (preGeneratedIdeas && preGeneratedIdeas.length > 0) return;

    // Fallback path: pre-generation didn't run or failed. Kick off in background.
    (async () => {
      try {
        const ideas = await curateGiftIdeas(person, nextOcc);
        const batch = {
          id: `onboard-${Date.now()}`,
          date: new Date().toISOString(),
          ideas,
          occasionKey: nextOcc?.id,
        };
        const updated: Person = {
          ...person,
          generatedIdeas: ideas,
          generationHistory: [batch],
        };
        StorageService.updatePerson(updated);
        setPeople((prev) => prev.map((p) => (p.id === person.id ? updated : p)));
      } catch (e) {
        console.error("First-ideas generation failed:", e);
      }
    })();
  };

  const handleOnboardingSkip = () => {
    StorageService.setOnboarded(true);
    setHasOnboarded(true);
    setCurrentView("home");
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (!hasOnboarded) {
    return (
      <OnboardingV2View
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  const renderView = () => {
    switch (currentView) {
      case "gifts":
        return (
          <IdeasView
            onBack={() => {
              setIdeasOccasionFocus(null);
              setIdeasInitialOccasionId(null);
              setCurrentView("home");
            }}
            personId={selectedPersonId}
            occasionFocus={ideasOccasionFocus}
            initialOccasionId={ideasInitialOccasionId}
            people={people}
            occasions={occasions}
            onUpdatePerson={handleUpdatePerson}
            onRecordIdeaGeneration={handleRecordIdeaGeneration}
            onSelectPerson={handleIdeasSelectPerson}
            onRequestAddPerson={() => openAddPerson()}
          />
        );
      case "me":
        return <SettingsView people={people} occasions={occasions} />;
      case "home":
        return (
          <HomeView
            onPersonClick={handlePersonClick}
            onAddFromHoliday={openAddPersonFromHolidayChip}
            occasions={occasions}
            people={people}
            currentDate={currentDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        );
      case "people":
        return (
          <PeopleListView
            people={people}
            occasions={occasions}
            onPersonClick={handlePersonClick}
            onAddClick={(ctx) => openAddPerson(ctx?.holidayTitle)}
          />
        );
      case "person-profile":
        if (!selectedPersonId) {
          setCurrentView("people");
          return null;
        }
        return (
          <ProfileView
            personId={selectedPersonId}
            onBack={() => setCurrentView("people")}
            onViewIdeas={(id, occasionId) => {
              setSelectedPersonId(id);
              setIdeasOccasionFocus(null);
              setIdeasInitialOccasionId(occasionId ?? null);
              setCurrentView("ideas");
            }}
            people={people}
            occasions={occasions}
            onUpdatePerson={handleUpdatePerson}
            onDeletePerson={handleDeletePerson}
            onDeleteOccasion={handleDeleteOccasion}
            onAddOccasion={handleAddOccasion}
            notificationTimings={notificationTimings}
            onEditReminderSettings={() => setCurrentView("settings")}
          />
        );
      case "ideas":
        return (
          <IdeasView
            onBack={() => {
              setIdeasOccasionFocus(null);
              setIdeasInitialOccasionId(null);
              setCurrentView("people");
            }}
            personId={selectedPersonId}
            occasionFocus={ideasOccasionFocus}
            initialOccasionId={ideasInitialOccasionId}
            people={people}
            occasions={occasions}
            onUpdatePerson={handleUpdatePerson}
            onRecordIdeaGeneration={handleRecordIdeaGeneration}
            onSelectPerson={handleIdeasSelectPerson}
            onRequestAddPerson={() => openAddPerson()}
          />
        );
      case "settings":
        return <SettingsView people={people} occasions={occasions} />;
      default:
        return (
          <HomeView
            onPersonClick={handlePersonClick}
            onAddFromHoliday={openAddPersonFromHolidayChip}
            occasions={occasions}
            people={people}
            currentDate={currentDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        );
    }
  };

  return (
    <div
      className="min-h-screen selection:bg-primary/20 relative overflow-x-hidden font-body text-charcoal antialiased"
      style={{
        backgroundImage: "url('/gifting-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: '#F8D8C8',
      }}
    >

      {/* Limit toast */}
      <AnimatePresence>
        {limitToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] bg-charcoal text-white text-[13px] font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-[300px] text-center"
          >
            {limitToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button on legacy settings route (kept for deep links) */}
      {currentView === "settings" && (
        <button
          onClick={() => setCurrentView("home")}
          className="fixed top-8 left-6 z-[60] p-1.5 text-charcoal/40 hover:text-charcoal transition-all active:scale-90 bg-white/30 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <main className="pb-24 pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentView}-${people.length}`}
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 1.005 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>

        {/* Plus Options Menu — bottom sheet */}
        <AnimatePresence>
          {isPlusMenuOpen && (
            <div className="fixed inset-0 z-[70] flex items-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPlusMenuOpen(false)}
                className="absolute inset-0 bg-black/20 backdrop-blur-[3px]"
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.25 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.y > 80 || info.velocity.y > 500) {
                    setIsPlusMenuOpen(false);
                  }
                }}
                style={{ willChange: "transform" }}
                className="relative w-full bg-white rounded-t-[36px] px-6 pt-3 pb-36 z-10 shadow-[0_-8px_40px_rgba(0,0,0,0.08)]"
              >
                {/* Drag handle */}
                <div className="w-10 h-1 bg-charcoal/12 rounded-full mx-auto mb-7" />

                {/* Header */}
                <div className="mb-6 text-center">
                  <h2 className="text-[20px] font-bold text-charcoal tracking-tight">
                    What would you like to add?
                  </h2>
                  <p className="text-[13px] text-on-surface-variant mt-1 leading-snug">
                    Add loved ones or track special moments
                  </p>
                </div>

                {/* Option cards */}
                <div className="space-y-3">
                  {/* Add Person */}
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.1, duration: 0.18 }}
                    onClick={() => { setIsPlusMenuOpen(false); openAddPerson(); }}
                    className="w-full bg-[#EEF1FF] rounded-[24px] p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden"
                  >
                    {/* Decorative blobs */}
                    <div className="absolute top-2 right-20 w-10 h-10 rounded-full bg-blue-200/30 blur-xl pointer-events-none" />
                    <div className="absolute bottom-2 right-14 w-6 h-6 rounded-full bg-indigo-200/25 blur-lg pointer-events-none" />

                    {/* Icon */}
                    <div className="w-[58px] h-[58px] rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm relative">
                      <Users className="w-6 h-6 text-indigo-500" strokeWidth={1.75} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-indigo-500 flex items-center justify-center">
                        <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    </div>

                    <div className="flex-grow min-w-0">
                      <p className="text-[16px] font-bold text-charcoal">Add Person</p>
                      <p className="text-[12px] text-charcoal/50 mt-0.5 leading-relaxed">
                        Get reminders for their events and gift ideas that feel personal
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <ChevronRight className="w-4 h-4 text-charcoal/40" strokeWidth={2.5} />
                    </div>
                  </motion.button>

                  {/* Log Milestone */}
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.15, duration: 0.18 }}
                    onClick={() => { setIsPlusMenuOpen(false); setIsMilestoneModalOpen(true); }}
                    className="w-full bg-[#FFF0F3] rounded-[24px] p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden"
                  >
                    {/* Decorative blobs */}
                    <div className="absolute top-2 right-20 w-10 h-10 rounded-full bg-rose-200/30 blur-xl pointer-events-none" />
                    <div className="absolute bottom-2 right-14 w-6 h-6 rounded-full bg-pink-200/25 blur-lg pointer-events-none" />

                    {/* Icon */}
                    <div className="w-[58px] h-[58px] rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm relative">
                      <Star className="w-6 h-6 text-dusty-rose" strokeWidth={1.75} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-dusty-rose flex items-center justify-center">
                        <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    </div>

                    <div className="flex-grow min-w-0">
                      <p className="text-[16px] font-bold text-charcoal">Log Milestone</p>
                      <p className="text-[12px] text-charcoal/50 mt-0.5 leading-relaxed">
                        Record weddings, graduations and other life moments
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <ChevronRight className="w-4 h-4 text-charcoal/40" strokeWidth={2.5} />
                    </div>
                  </motion.button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation — 4 items + center FAB */}
      <nav
        className={`fixed bottom-0 left-0 w-full z-[80] glass-nav flex items-center justify-between px-5 pb-7 pt-2 transition-opacity duration-200 ${(isAddModalOpen || isMilestoneModalOpen) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {(() => {
          const PURPLE = '#8B5CF6';
          const isPeopleActive = currentView === 'people' || currentView === 'person-profile';
          const isGiftsActive  = currentView === 'gifts' || currentView === 'ideas';
          const isMeActive     = currentView === 'me' || currentView === 'settings';
          const isHomeActive   = currentView === 'home';

          const Item = ({
            label, Icon, active, onClick,
          }: { label: string; Icon: any; active: boolean; onClick: () => void }) => (
            <motion.button
              onClick={onClick}
              whileTap={{ scale: 0.90 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className={`flex flex-col items-center gap-0.5 pt-1 w-14 transition-opacity duration-200 ${isPlusMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              <Icon
                className="w-[24px] h-[24px] transition-all duration-200"
                strokeWidth={active ? 2.0 : 1.5}
                style={{ color: active ? PURPLE : 'rgba(28,28,30,0.30)' }}
              />
              <span
                className="text-[10px] font-bold tracking-wide transition-all duration-200"
                style={{ color: active ? PURPLE : 'rgba(28,28,30,0.35)' }}
              >{label}</span>
              <div className="h-[5px] flex items-center justify-center">
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="nav-dot"
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: PURPLE }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );

          return (
            <>
              <Item
                label="Home"
                Icon={CalendarIcon}
                active={isHomeActive}
                onClick={() => setCurrentView('home')}
              />
              <Item
                label="People"
                Icon={Users}
                active={isPeopleActive}
                onClick={() => { setCurrentView('people'); setSelectedPersonId(null); }}
              />

              {/* Plus / Cancel — center FAB */}
              <div className="relative -mt-3 flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.90 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsPlusMenuOpen(v => !v)}
                  animate={{
                    background: isPlusMenuOpen
                      ? 'linear-gradient(145deg, #C8C8C8 0%, #A8A8A8 50%, #909090 100%)'
                      : 'linear-gradient(145deg, #C490D1 0%, #B070C0 50%, #9858B0 100%)',
                  }}
                  transition={{ type: 'spring', stiffness: 460, damping: 20 }}
                  className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center border-[4px] border-white/95"
                  style={{
                    boxShadow: isPlusMenuOpen
                      ? '0 6px 22px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10), inset 0 1.5px 0 rgba(255,255,255,0.28)'
                      : '0 8px 24px rgba(152,88,176,0.40), 0 2px 8px rgba(152,88,176,0.20), inset 0 1.5px 0 rgba(255,255,255,0.35)',
                  }}
                >
                  <motion.div
                    animate={{ rotate: isPlusMenuOpen ? 405 : 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
                  >
                    <Plus className="w-8 h-8 text-white" strokeWidth={2.2} />
                  </motion.div>
                </motion.button>
                <AnimatePresence>
                  {isPlusMenuOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/35 pointer-events-none whitespace-nowrap"
                    >Cancel</motion.span>
                  )}
                </AnimatePresence>
              </div>

              <Item
                label="Gifts"
                Icon={Gift}
                active={isGiftsActive}
                onClick={() => setCurrentView('gifts')}
              />
              <Item
                label="Me"
                Icon={UserCircle2}
                active={isMeActive}
                onClick={() => setCurrentView('me')}
              />
            </>
          );
        })()}
      </nav>

      {/* Modals */}
      <AddPersonModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddPersonRelationHint(null);
          setAddPersonPresetKeys([]);
        }}
        onAdd={handlePersonAdded}
        people={people}
        initialRelationHint={addPersonRelationHint}
        initialPresetOccasionKeys={
          addPersonPresetKeys.length ? addPersonPresetKeys : null
        }
      />

      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        onAdd={handleMilestoneAdded}
        people={people}
        existingOccasions={occasions}
      />

      {/* Onboarding → Home handoff: carrying mascot glides center → bottom-right */}
      <AnimatePresence>
        {showOnboardingHandoff && (
          <motion.div
            initial={{ left: '50%', top: '50%', x: '-50%', y: '-50%', scale: 1, opacity: 0, rotate: -6 }}
            animate={{ left: '85%', top: '88%', x: '-50%', y: '-50%', scale: 0.45, opacity: [0, 1, 1, 0], rotate: 6 }}
            transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1], times: [0, 0.15, 0.85, 1] }}
            className="fixed z-[120] pointer-events-none"
            style={{ filter: 'drop-shadow(0 18px 32px rgba(152,88,176,0.32))' }}
            aria-hidden
          >
            <Mascot pose="carrying" size={180} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
