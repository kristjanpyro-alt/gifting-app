export interface Person {
  id: string;
  name: string;
  initials: string;
  relation: string;
  interests: string[];
  budget: string;
  style: string; // Archetypes: Thoughtful, Minimalist, Fun / Playful, Trendy, Practical, Luxury-Oriented
  avatarUrl: string;
  notes: string;
  lastNoteUpdate: string;
  savedGifts: GiftIdea[];
  themeColor?: string;
  emoji?: string;
  birthday?: string;
  anniversaryDate?: string;
  preferences?: 'Physical gifts' | 'Experiences' | 'Either';
  location?: string;
  fallenFlatKeywords?: string[];
  pastGifts?: string[];
  /** Titles the user explicitly marked "Not quite" — feeds back to AI for steering. */
  dislikedGiftTitles?: string[];
  /** Giver's primary gifting anxiety — steers AI away from that failure mode. */
  giftingFear?: string;
  generatedIdeas?: GiftIdea[];
  generationHistory?: {
    /** Stable key for list UI (multiple runs in one ms). */
    id?: string;
    date: string;
    ideas: GiftIdea[];
    /** Stable id tying this batch to one gift event (see giftEventOptions). */
    occasionKey?: string;
  }[];
}

/** When opening Ideas from a system holiday row (not stored as an Occasion). */
export interface IdeasOccasionFocus {
  personId: string;
  title: string;
  type: string;
  date: string;
  month: string;
  day: number;
  daysRemaining: number;
  emoji?: string;
}

export interface Occasion {
  id: string;
  personId: string;
  title: string;
  type: string;
  date: string; // ISO or human readable
  month: string;
  day: number;
  daysRemaining: number;
  suggestedGift?: string;
  /** Optional notes from the giver to steer AI ideas for this specific event. */
  ideaContext?: string;
  emoji?: string;
  isSystem?: boolean;
}

export type UserIntent =
  | 'forgetful'
  | 'never-know'
  | 'feel-generic'
  | 'last-minute'
  | 'more-thoughtful';

export type GiftVibe =
  | 'practical'
  | 'sentimental'
  | 'experiential'
  | 'surprising'
  | 'luxury'
  | 'handmade-feel';

export type BudgetBand =
  | 'under-25'
  | '25-50'
  | '50-100'
  | '100-plus'
  | 'depends';

export interface UserProfile {
  intent: UserIntent | null;
  relationCircle: string[];
  vibes: GiftVibe[];
  budgetBand: BudgetBand | null;
  archetype?: string;
  trialStartedAt?: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'none';
  notificationsAsked?: boolean;
}

export interface GiftIdea {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
  emoji?: string;
  productUrl?: string;
  searchQuery?: string;
  category: 'Saved' | 'Curated' | 'Bought';
  source?: 'Amazon' | 'Etsy' | 'Local' | 'Gift Card' | 'Online' | 'Subscription' | 'Trending';
  description?: string;
  rationale?: string;
  isStarred?: boolean;
}
