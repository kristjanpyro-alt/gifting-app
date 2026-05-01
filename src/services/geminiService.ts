import { GoogleGenAI, Type } from "@google/genai";
import { GiftIdea, Person, Occasion } from "../types";
import { StorageService } from "./StorageService";

/**
 * Builds a guaranteed-working search URL for each source type.
 * Gemini provides a searchQuery (e.g. "Manta Sleep Mask original"); we route it
 * to the appropriate store's search so the link is always live.
 */
function buildShopUrl(source: string, searchQuery: string): string {
  const q = encodeURIComponent(searchQuery);
  switch (source) {
    case "Amazon":       return `https://www.amazon.com/s?k=${q}`;
    case "Etsy":         return `https://www.etsy.com/search?q=${q}`;
    case "Subscription": return `https://www.google.com/search?q=${q}+gift+subscription`;
    case "Trending":     return `https://www.google.com/search?tbm=shop&q=${q}`;
    case "Local":
    default:             return `https://www.google.com/search?q=${q}`;
  }
}

export type CurateGiftIdeasOptions = {
  /** Titles from earlier batches for the SAME occasion — avoid repeating or near-duplicates. */
  seenIdeaTitles?: string[];
  /** Title + short description per idea so the model avoids the same concepts, not just names. */
  seenIdeaBriefs?: string[];
  /** Briefs from prior batches for OTHER occasions for the same person — broaden away from these patterns. */
  crossOccasionBriefs?: string[];
  /** Titles the user has explicitly loved (saved) — use as positive signal but DO NOT repeat. */
  lovedTitles?: string[];
  /** Titles the user has explicitly disliked — strongly avoid this style/category. */
  dislikedTitles?: string[];
};

export async function curateGiftIdeas(
  person: Person,
  nextOccasion: Occasion | undefined,
  options: CurateGiftIdeasOptions = {}
): Promise<GiftIdea[]> {
  const {
    seenIdeaTitles = [],
    seenIdeaBriefs = [],
    crossOccasionBriefs = [],
    lovedTitles = [],
    dislikedTitles = [],
  } = options;
  const isRefresh = seenIdeaTitles.length > 0 || seenIdeaBriefs.length > 0;
  const hasFeedback = lovedTitles.length > 0 || dislikedTitles.length > 0;
  const hasCrossPriors = crossOccasionBriefs.length > 0;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Add it to your .env file.");
  }
  const ai = new GoogleGenAI({ apiKey });

  // Priority: person's own location → user's city set during onboarding → fallback
  const userCity = person.location || StorageService.getUserCity() || "Tallinn, Estonia";
  const antiPatterns = (person.fallenFlatKeywords || []).join(", ") || "None mentioned";
  const savedTitles = (person.savedGifts || []).map((g) => g.title).join(", ") || null;
  const urgency = nextOccasion
    ? `${nextOccasion.daysRemaining} days until ${nextOccasion.type}`
    : "No specific deadline";

  const priorList =
    seenIdeaBriefs.length > 0
      ? seenIdeaBriefs
          .slice(0, 20)
          .map((line, i) => `${i + 1}. ${line}`)
          .join("\n")
      : seenIdeaTitles.length > 0
        ? seenIdeaTitles
            .slice(0, 25)
            .map((t, i) => `${i + 1}. ${t}`)
            .join("\n")
        : "";

  const crossOccasionList = crossOccasionBriefs
    .slice(0, 30)
    .map((b, i) => `${i + 1}. ${b}`)
    .join("\n");

  const lovedList = lovedTitles.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join("\n");
  const dislikedList = dislikedTitles.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join("\n");

  const crossOccasionBlock = hasCrossPriors
    ? `
    [CROSS-OCCASION CONTEXT — BROADEN, DON'T RECYCLE]
    For this same person, you have already suggested gifts for OTHER occasions:
${crossOccasionList}

    Do NOT propose the same products or near-duplicates again here. More importantly, recognise the *patterns* (e.g. "lots of beauty boxes", "lots of cat-themed jewelry", "lots of generic Amazon tech") and deliberately pivot. The recipient deserves new niches, not a re-skin of the previous batch with a different ribbon. Aim to surface ideas they might love that they would never have thought of themselves.
  `
    : "";

  const feedbackBlock = hasFeedback
    ? `
    [USER FEEDBACK — STRONG STEERING SIGNAL]
    ${lovedTitles.length > 0
      ? `LOVED (the giver explicitly saved these — they hit the mark, but DO NOT repeat them):\n${lovedList}\nInfer what made these resonate (material, sentiment, niche, vibe) and find ADJACENT but distinct ideas in new categories.`
      : ""}
    ${dislikedTitles.length > 0
      ? `\nDISLIKED (the giver explicitly rejected these — strongly avoid this style/category, not just these exact products):\n${dislikedList}`
      : ""}
  `
    : "";

  const freshAngleBlock = isRefresh
    ? `
    [FRESH BATCH — STRICT ANTI-REPEAT — OVERRIDES DEFAULT "OBVIOUS" PICKS]
    The user already saw this prior batch in the app and clicked for NEW ideas. Google Search will keep surfacing the same bestsellers for narrow interests unless you deliberately pivot.

    Prior suggestions (titles + gist — distance yourself semantically, not just by renaming):
    ${priorList}

    MANDATORY:
    - Do NOT repeat or trivially rephrase any prior title or the same core product (e.g. another LED vanity mirror if one appeared; another custom cat portrait necklace if one appeared; another Tallinn boutique jewelry earring line if one appeared; another cat-treat subscription if one appeared; another viral makeup blush set if one appeared).
    - At least THREE of the five ideas must be chiefly outside BOTH of these clusters: (A) makeup / cosmetics / skincare / hair-beauty boxes, (B) cat- or pet-themed physical gifts or pet subscription boxes. You may still nod to their tastes in the rationale, but the primary item type must differ.
    - For the slot that must stay "on brief" (interests), pick a different hook than the last batch (e.g. experience, workshop, home, kitchen, reading, travel accessory, desk, wellness-non-beauty, music, film, fitness, specialty food — not the same subcategory twice).
    - Local (${userCity}) idea: choose a different local angle than prior (if last was jewelry designer, use food, bookshop, experience, home goods, etc.).
    - Subscriptions: if the prior batch had a beauty or cat box, the new subscription must be a clearly different category (learning, wine, plants, coffee, digital service, etc.).
    - Each rationale must briefly state how this idea differs from the prior batch's themes (one short phrase).
  `
    : "";

  const systemInstruction = `
    You are an expert gift curator for an app called GIFTIN.
    Your goal is to provide highly personalized, thoughtful, and creative gift ideas.

    [DIVERSITY FIRST]
    Default to BREADTH over safety. The giver has likely already considered the obvious choices for this person's interests. Your job is to surface fresh angles — adjacent niches, unexpected categories, ideas they would not find by Googling "${person.relation} gift ideas". Five suggestions = five distinct lanes (no two from the same micro-category, e.g. don't return two candles or two skincare items).
    ${crossOccasionBlock}
    ${feedbackBlock}
    ${freshAngleBlock}

    [SEARCH MODE]
    Use Google Search to research REAL, currently available products.
    For each gift, provide a short searchQuery (2-5 words, brand + product name) that would find it on the relevant store.
    Do NOT invent product URLs — the app will construct reliable links from your searchQuery and source.

    [STYLE ANALYSIS]
    Analyze the recipient's style and interests:
    - Minimalist → quality over quantity, clean materials
    - Thoughtful → sentiment and personal connection
    - Luxury → brand heritage, premium materials
    - Practical → utility, solves a daily problem

    [REQUIRED SOURCE SLOTS — follow this order exactly]
    Idea 1 (source: "Amazon")  — a product available on Amazon
    Idea 2 (source: "Etsy")    — a handmade, personalised, or artisan item from Etsy
    Idea 3 (source: "Local")   — a product or experience from a real business in ${userCity}
    Idea 4 (source: "Subscription") — a gift card, subscription box, or digital service
    Idea 5 (source: "Trending") — a trending or boutique item found via Google Shopping

    Return exactly 5 ideas in this order.
  `;

  const prompt = `
    Find gifts for:
    Recipient: ${person.name}
    Relationship: ${person.relation}
    Interests: ${person.interests.join(", ")}
    Style: ${person.style}
    Budget: ${person.budget}
    Location: ${userCity}
    Notes: ${person.notes}
    Preferences: ${person.preferences}
    Anti-patterns (DO NOT suggest): ${antiPatterns}
    Past Gifts (avoid repeating): ${person.pastGifts?.join(", ") || "None"}
    ${savedTitles ? `Already Saved (DO NOT repeat): ${savedTitles}` : ""}
    ${
      isRefresh
        ? `REFRESH — user already saw these; must diversify as in system rules:\n${priorList}`
        : ""
    }
    Occasion: ${nextOccasion?.type || "Special event"}
    Urgency: ${urgency}
    ${
      nextOccasion?.ideaContext?.trim()
        ? `Event-specific guidance (prioritise this when choosing gifts): ${nextOccasion.ideaContext.trim()}`
        : ""
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction,
      ...(isRefresh || hasCrossPriors || hasFeedback ? { temperature: 1 } : {}),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title:       { type: Type.STRING },
            price:       { type: Type.STRING },
            description: { type: Type.STRING },
            rationale:   { type: Type.STRING },
            emoji:       { type: Type.STRING },
            source:      { type: Type.STRING, enum: ["Amazon", "Etsy", "Local", "Subscription", "Trending"] },
            searchQuery: { type: Type.STRING, description: "2-5 word search query to find this product on its source store" },
            imageUrl:    { type: Type.STRING, description: "Public image URL of the product if found via search" },
          },
          required: ["title", "price", "description", "rationale", "emoji", "source", "searchQuery"]
        }
      }
    }
  });

  const suggestions = JSON.parse(response.text);

  return suggestions.map((s: any, idx: number) => ({
    ...s,
    id: `gen-${Date.now()}-${idx}`,
    category: "Curated",
    productUrl: buildShopUrl(s.source, s.searchQuery),
  }));
}
