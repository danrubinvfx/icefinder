/**
 * Goalie and division detection logic for IceFinder sessions.
 * Adheres strictly to icefinder-audit guidelines.
 */

export interface SessionLike {
  category?: string | null;
  rawTitle?: string | null;
  raw_title?: string | null;
  title?: string | null;
  session_title?: string | null;
  notes?: string | null;
  description?: string | null;
  isGoalieFree?: boolean | null;
  is_goalie_free?: boolean | null;
  goalieSpots?: number | null;
  goalie_spots?: number | null;
  openGoalieSpots?: number | null;
  open_goalie_spots?: number | null;
  goaliesRegistered?: number | null;
  goalies_registered?: number | null;
  goalieCost?: number | null;
  goalie_cost?: number | null;
  cost?: number | null;
  municipality?: string | null;
  facilitySlug?: string | null;
}

export type DivisionTag =
  | "19+ Adult"
  | "30+"
  | "40+"
  | "50+ Senior"
  | "Women / Female"
  | "Youth (11-18)"
  | "Family / All Ages"
  | "StarSkate / Buy-On";

export type DivisionChip = DivisionTag;

/**
 * Evaluates whether a session has an open goalie spot needed.
 * Applies strictly to drop-in hockey sessions (`category === 'hockey_dropin'`).
 * Evaluates true if `session.open_goalie_spots > 0`, or regex matches raw title / notes (/goalie(s)?\s*(needed|wanted|\d+\/\d+)/i).
 */
export function hasGoalieNeeded(session: SessionLike): boolean {
  if (session.category && session.category !== "hockey_dropin") {
    return false;
  }

  // If category is not set, verify title implies hockey drop-in / shinny
  if (!session.category) {
    const fallbackTitle = session.rawTitle || session.raw_title || session.session_title || session.title || "";
    if (!/hockey|shinny/i.test(fallbackTitle)) {
      return false;
    }
  }

  // 1. Direct open goalie spots numeric properties
  if (typeof session.open_goalie_spots === "number" && session.open_goalie_spots > 0) {
    return true;
  }
  if (typeof session.openGoalieSpots === "number" && session.openGoalieSpots > 0) {
    return true;
  }

  // 2. Computed from goalieSpots vs goaliesRegistered
  const goalieSpots = session.goalieSpots ?? session.goalie_spots;
  const goaliesRegistered = session.goaliesRegistered ?? session.goalies_registered;

  if (typeof goalieSpots === "number" && goalieSpots > 0) {
    if (goaliesRegistered === null || goaliesRegistered === undefined) {
      return true;
    }
    if (goalieSpots - goaliesRegistered > 0) {
      return true;
    }
  } else if (goaliesRegistered !== null && goaliesRegistered !== undefined) {
    // Standard drop-in hockey rosters target 2 goalies; 0 or 1 registered means open spot
    if (goaliesRegistered <= 1) {
      return true;
    }
  }

  // 3. Parsed session notes / title explicitly indicating open goalie spots
  const title = session.rawTitle || session.raw_title || session.session_title || session.title || "";
  const notes = session.notes || session.description || "";
  const combined = `${title}\n${notes}`;

  // Direct prompt regex: /goalie(s)?\s*(needed|wanted|\d+\/\d+)/i
  if (/goalie(s)?\s*(needed|wanted|\d+\/\d+)/i.test(combined)) {
    return true;
  }

  // Explicit text indicators: "Goalies Needed", "Goalie Needed", "Goalie Spots Open", "Need Goalie(s)"
  if (
    /\b(?:goalies?|goaltenders?)\s*(?:needed|wanted|required|spots?\s*(?:open|available)|callout)\b/i.test(combined) ||
    /\bneed\s*(?:a\s+)?(?:goalie|goalies|goaltender)\b/i.test(combined) ||
    /\bopen\s*goalie\s*spots?\b/i.test(combined)
  ) {
    return true;
  }

  // Fraction/ratio patterns: "0/2 Goalies", "1/2 Goalies", "0 of 2 Goalies", "1 of 2 Goalies", "Goalies: 0/2", "Goalies: 1/2", "(0/2) Goalies", etc.
  if (
    /\b(?:[01]\s*\/\s*[12]|[01]\s*of\s*[12])\s*goalies?\b/i.test(combined) ||
    /\bgoalies?\s*[:\-]?\s*(?:[01]\s*\/\s*[12]|[01]\s*of\s*[12])\b/i.test(combined) ||
    /\b\(?[01]\s*\/\s*[12]\)?\s*goalies?\b/i.test(combined) ||
    /\bgoalies?\s*\(?[01]\s*\/\s*[12]\)?\b/i.test(combined)
  ) {
    return true;
  }

  return false;
}

/** Backward-compatible alias for hasGoalieNeeded */
export const goalieNeeded = hasGoalieNeeded;

/**
 * Evaluates whether goalies play free for a hockey drop-in session.
 * Evaluates true if `session.is_goalie_free === true`, goalie fee is $0,
 * or municipal notes state goalies play free (e.g. Burnaby & Vancouver adult drop-in policies).
 */
export function isGoalieFree(session: SessionLike): boolean {
  if (session.category && session.category !== "hockey_dropin") {
    return false;
  }

  // 1. Explicit boolean flag
  if (session.is_goalie_free === true || session.isGoalieFree === true) {
    return true;
  }

  // 2. Goalie cost is explicitly $0
  const goalieCost = session.goalieCost ?? session.goalie_cost;
  if (typeof goalieCost === "number" && goalieCost === 0) {
    return true;
  }

  // 3. Parsed notes / title stating goalies play free
  const title = session.rawTitle || session.raw_title || session.session_title || session.title || "";
  const notes = session.notes || session.description || "";
  const combined = `${title}\n${notes}`;

  if (
    /\bgoalies?\s*(?:play\s*|are\s*|skate\s*)?(?:free|\$0|no\s*charge)\b/i.test(combined) ||
    /\bfree\s*(?:for\s*)?goalies?\b/i.test(combined) ||
    /\bno\s*(?:fee|charge)\s*for\s*goalies?\b/i.test(combined) ||
    /\bgoalie[s]?\s*(?:is|are)?\s*free\b/i.test(combined) ||
    /\bfree\s*admission\s*for\s*goalies?\b/i.test(combined)
  ) {
    return true;
  }

  // 4. Municipal drop-in policies (Burnaby & Vancouver municipal adult drop-in allows goalies free)
  const municipality = (session.municipality || "").toLowerCase().trim();
  const facilitySlug = (session.facilitySlug || "").toLowerCase().trim();

  const isBurnabyOrVancouver =
    municipality === "burnaby" ||
    municipality === "vancouver" ||
    [
      "bill-copeland",
      "kensington",
      "rosemary-brown",
      "britannia",
      "kitsilano",
      "sunset",
      "killarney",
      "trout-lake",
      "west-end",
      "kerrisdale",
      "hillcrest",
    ].includes(facilitySlug);

  if (isBurnabyOrVancouver) {
    return true;
  }

  return false;
}

/** Backward-compatible alias for isGoalieFree */
export const goalieFree = isGoalieFree;

/**
 * Division/Age pill parser:
 * Extracts lightweight tags from `raw_title` / `session_title`:
 * `19+ Adult`, `30+`, `40+`, `50+ Senior`, `Women / Female`, `Youth (11-18)`, `Family / All Ages`, `StarSkate / Buy-On`.
 */
export function parseDivisionChips(input: SessionLike | string): DivisionTag[] {
  const title =
    typeof input === "string"
      ? input
      : input.rawTitle || input.raw_title || input.session_title || input.title || "";

  const t = title.toLowerCase();
  const tags: DivisionTag[] = [];

  const is30Plus = /(?:\b30\s*\+|\b30\s*(?:yrs|years|&\s*over|and\s*over)\b)/i.test(t);
  const is40Plus =
    /(?:\b40\s*\+|\b40\s*(?:yrs|years|&\s*over|and\s*over)\b|\bmasters\b)/i.test(t);
  const is50Plus =
    /(?:\b(?:50|55|60|65)\s*\+|\b(?:50|55|60|65)\s*(?:yrs|years|&\s*over|and\s*over)\b|\bsenior[s]?\b|\b50\s*and\s*(?:better|older)\b)/i.test(
      t,
    );

  const isWomen =
    /(?:\bwomen\+|\b(?:women|woman|female|gender\s*diverse|w&gd)\b)/i.test(t);

  const isYouth =
    /\b(?:youth|teens?|children|child|kids?|1[1-8]\s*-\s*1[7-8]|under\s*1[89]|u1[1-8])\b/i.test(t) &&
    !/\badult\s*&\s*child\b/i.test(t);

  const isFamilyOrAllAges =
    /\b(?:all\s*ages|everyone\s*welcome|family|family\s*&\s*child|parent\s*&?\s*(?:tot|child|preschooler)|public\s*skate|leisure\s*skate|community\s*skate|toonie\s*skate|all-ages)\b/i.test(
      t,
    );

  const isBuyOn =
    (typeof input !== "string" && input.category === "figure_buyon") ||
    /\b(?:buy[\s-]?on|starskate|star\s*\d|figure\s*skat|freestyle|patch)\b/i.test(t);

  const isAdultExplicit =
    /(?:\b(?:18|19)\s*\+|\b(?:18|19)\s*(?:yrs|years|&\s*over|and\s*over)\b|\badults?\b|\bshinny\b)/i.test(
      t,
    );

  const isAdult =
    (isAdultExplicit && !is30Plus && !is40Plus && !is50Plus && !isFamilyOrAllAges) ||
    /(?:\b(?:18|19)\s*\+|\b(?:18|19)\s*(?:yrs|years)\b)/i.test(t);

  if (isAdult) tags.push("19+ Adult");
  if (is30Plus) tags.push("30+");
  if (is40Plus) tags.push("40+");
  if (is50Plus) tags.push("50+ Senior");
  if (isWomen) tags.push("Women / Female");
  if (isYouth) tags.push("Youth (11-18)");
  if (isFamilyOrAllAges) tags.push("Family / All Ages");
  if (isBuyOn) tags.push("StarSkate / Buy-On");

  return tags;
}

export const extractDivisionTags = parseDivisionChips;
