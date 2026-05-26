import { BudgetBand, GiftVibe } from '../types';

export interface SampleGift {
  title: string;
  emoji: string;
  why: string;
  priceLabel: string;
}

const BUDGET_LABEL: Record<BudgetBand, string> = {
  'under-25':  '$20',
  '25-50':     '$40',
  '50-100':    '$75',
  '100-plus':  '$150',
  'depends':   '$50',
};

/**
 * Pre-baked gift sample bank. Selected via vibe (primary axis), with fallbacks.
 * Used purely during onboarding reveal to give a "taste" before paywall, $0 cost.
 *
 * Each entry returns 3 ideas. If exact vibe missing, falls back to a general bank.
 */
const BANK: Record<GiftVibe, SampleGift[]> = {
  sentimental: [
    { title: 'Custom star map of a meaningful date', emoji: '✨', why: 'Anchors a date you both remember to something cosmic.', priceLabel: '' },
    { title: 'Handwritten letters jar, one per month', emoji: '✉️', why: 'A year of small moments to open slowly.',                  priceLabel: '' },
    { title: 'Photo book of your shared memories',   emoji: '📖', why: 'Tangible, slow-flip joy instead of a buried camera roll.',  priceLabel: '' },
  ],
  experiential: [
    { title: 'Pottery class for two',            emoji: '🏺', why: 'A few hours of muddy hands and laughing about it after.',         priceLabel: '' },
    { title: 'Sunrise hot-air balloon ride',     emoji: '🎈', why: 'Goes in the memory column, not the closet.',                       priceLabel: '' },
    { title: 'Curated tasting menu for two',     emoji: '🍽️', why: 'A whole evening, not a thing. Perfect for a milestone.',           priceLabel: '' },
  ],
  practical: [
    { title: 'A pocket knife they\'ll have for years', emoji: '🔪', why: 'Used weekly, lasts decades. Quietly excellent.',          priceLabel: '' },
    { title: 'Ember mug for their morning ritual', emoji: '☕', why: 'Coffee stays hot through every meeting and refill.',           priceLabel: '' },
    { title: 'Merino base layer they\'ll live in',   emoji: '🧦', why: 'They\'ll wear it weekly without quite knowing why it\'s nice.', priceLabel: '' },
  ],
  surprising: [
    { title: 'Vintage map of where they grew up', emoji: '🗺️', why: 'A nostalgic gut-punch they didn\'t see coming.',                   priceLabel: '' },
    { title: 'Mystery snack box from their dream country', emoji: '🍡', why: 'Half adventure, half edible souvenir.',                priceLabel: '' },
    { title: 'A constellation named after them',  emoji: '🌌', why: 'Slightly silly, deeply sweet.',                                    priceLabel: '' },
  ],
  luxury: [
    { title: 'Single-origin chocolate flight',   emoji: '🍫', why: 'Tiny, decadent, finishes in a week.',                              priceLabel: '' },
    { title: 'Hand-blown wine carafe',           emoji: '🍷', why: 'A piece they\'ll dust off for every dinner party.',              priceLabel: '' },
    { title: 'Cashmere lounge set',              emoji: '🧥', why: 'The kind of softness they\'d never buy themselves.',              priceLabel: '' },
  ],
  'handmade-feel': [
    { title: 'Ceramic mug from a local potter',  emoji: '🏺', why: 'Slight imperfections. That\'s the whole point.',                    priceLabel: '' },
    { title: 'Hand-bound leather journal',       emoji: '📓', why: 'Smells like a real bookstore.',                                    priceLabel: '' },
    { title: 'Block-printed linen napkins',      emoji: '🧵', why: 'Quietly upgrades every dinner.',                                  priceLabel: '' },
  ],
};

const FALLBACK: SampleGift[] = [
  { title: 'Curated coffee subscription',      emoji: '☕', why: 'A small good thing every month.',                       priceLabel: '' },
  { title: 'Custom illustrated portrait',      emoji: '🖼️', why: 'Their face, but make it art.',                            priceLabel: '' },
  { title: 'Polaroid camera + film starter',   emoji: '📷', why: 'Forces analog moments in a digital life.',              priceLabel: '' },
];

/**
 * Get 3 sample gifts for the user's primary vibe, with budget label injected.
 */
export function sampleGiftsFor(vibes: GiftVibe[], budget: BudgetBand | null): SampleGift[] {
  const primary = vibes[0];
  const list = (primary && BANK[primary]) ? BANK[primary] : FALLBACK;
  const priceLabel = budget ? `~${BUDGET_LABEL[budget]}` : '';
  return list.map(g => ({ ...g, priceLabel }));
}
