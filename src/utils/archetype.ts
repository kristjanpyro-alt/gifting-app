import { GiftVibe, UserIntent, UserProfile } from '../types';

/**
 * Deterministically derive a friendly archetype label from onboarding answers.
 * No AI call, pure mapping, runs instantly during reveal.
 *
 * Taglines describe the USER (not the app's promise). They interpolate real
 * profile data (circle size, vibes) so they don't read as generic marketing.
 */
export interface Archetype {
  label: string;
  tagline: string;
  emoji: string;
}

const VIBE_PRIMARY_ORDER: GiftVibe[] = [
  'sentimental',
  'experiential',
  'luxury',
  'surprising',
  'handmade-feel',
  'practical',
];

function primaryVibe(vibes: GiftVibe[]): GiftVibe | null {
  for (const v of VIBE_PRIMARY_ORDER) if (vibes.includes(v)) return v;
  return vibes[0] ?? null;
}

export function deriveArchetype(profile: UserProfile): Archetype {
  const intent: UserIntent | null = profile.intent;
  const vibe = primaryVibe(profile.vibes);

  // ── FORGETFUL ──────────────────────────────────────────────────────────
  if (intent === 'forgetful' && vibe === 'sentimental') {
    return {
      label: 'Heartfelt Planner',
      tagline: `Every birthday should land. The forgetting part is the only thing in the way.`,
      emoji: '💗',
    };
  }
  if (intent === 'forgetful' && vibe === 'experiential') {
    return {
      label: 'The Memory Maker',
      tagline: `Moments over things. The dates just keep getting away from you.`,
      emoji: '🎟️',
    };
  }
  if (intent === 'forgetful') {
    return {
      label: 'Quietly Reliable',
      tagline: `You always show up — every year, even when the calendar is against you.`,
      emoji: '🌿',
    };
  }

  // ── NEVER KNOW WHAT TO BUY ─────────────────────────────────────────────
  if (intent === 'never-know' && vibe === 'practical') {
    return {
      label: 'The Useful Romantic',
      tagline: `Practical at heart. The best gift is the one they reach for every day, not the one that sits on a shelf.`,
      emoji: '🎯',
    };
  }
  if (intent === 'never-know' && vibe === 'experiential') {
    return {
      label: 'The Memory Maker',
      tagline: `A great evening beats a wrapped box every time. You'd rather they remember the dinner than the receipt.`,
      emoji: '🎟️',
    };
  }
  if (intent === 'never-know') {
    return {
      label: 'Open-Hearted Searcher',
      tagline: `You care about each name on the list. You just don't always know where to start.`,
      emoji: '✨',
    };
  }

  // ── FEEL GENERIC ──────────────────────────────────────────────────────
  if (intent === 'feel-generic' && vibe === 'surprising') {
    return {
      label: 'The Surprise Engineer',
      tagline: `The wow moment is the gift. Anything they could have predicted is already a fail.`,
      emoji: '🎆',
    };
  }
  if (intent === 'feel-generic' && vibe === 'luxury') {
    return {
      label: 'The Connoisseur',
      tagline: `Off-the-shelf is a no. Quality, craft, the kind of object they'd keep for a decade.`,
      emoji: '💎',
    };
  }
  if (intent === 'feel-generic') {
    return {
      label: 'The Anti-Cliché',
      tagline: `You'd rather skip a gift than hand over a forgettable one. Done with the obvious picks.`,
      emoji: '🪄',
    };
  }

  // ── LAST MINUTE ───────────────────────────────────────────────────────
  if (intent === 'last-minute' && vibe === 'experiential') {
    return {
      label: 'Last-Minute Legend',
      tagline: `Late is just early in disguise. You'd rather book the dinner reservation than ship a box.`,
      emoji: '⚡',
    };
  }
  if (intent === 'last-minute') {
    return {
      label: 'The Sprinter',
      tagline: `You think on your feet. Whole list, handled in the last 48 hours.`,
      emoji: '⏱️',
    };
  }

  // ── MORE THOUGHTFUL ───────────────────────────────────────────────────
  if (intent === 'more-thoughtful' && vibe === 'sentimental') {
    return {
      label: 'The Soft-Hearted Giver',
      tagline: `Every gift carries something you can't quite say out loud. Each one worth the care.`,
      emoji: '💗',
    };
  }
  if (intent === 'more-thoughtful') {
    return {
      label: 'The Mindful Maker',
      tagline: `Meaningful over flashy. You want gifts that feel earned, not bought in a panic.`,
      emoji: '🌿',
    };
  }

  // ── Fallback ──────────────────────────────────────────────────────────
  return {
    label: 'The Thoughtful One',
    tagline: `Getting it right matters to you more than getting it perfect.`,
    emoji: '🎁',
  };
}
