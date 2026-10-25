import type { Category } from "./domain";

/**
 * Map a raw activity title from any booking platform to a strict IceFinder category.
 * Returns null for non-ice / non-public activities (lessons, leagues, ringette, etc.).
 *
 * Examples:
 *   "Adult Stick & Puck 19+"                          -> stick_and_puck
 *   "Reserve In Advance: Shoot & Score 18yrs+"        -> stick_and_puck
 *   "Leisure Skate" / "Family Skate" / "Public Skate" -> public_skate
 *   "Buy-on Ice" / "Reserve in Advance: Figure Skating" -> figure_buyon
 *   "Reserve In Advance: Recreational Hockey 50yrs+"  -> hockey_dropin
 *   "Shinny" / "Adult Drop-in Hockey"                 -> hockey_dropin
 */
export function normalizeCategory(rawTitle: string): Category | null {
  const t = rawTitle
    .toLowerCase()
    .replace(/^\|+|\|+$/g, "")
    .replace(/^reserve in advance:\s*/i, "")
    .replace(/\(goalies?\)/g, "")
    .trim();

  // Explicit Britannia / Vancouver drop-in overrides before general exclusions:
  if (/\bfamily\s+fun\s+hockey\b/.test(t)) {
    return "stick_and_puck";
  }
  if (/britannia\s+arena\s*-\s*women\s*\+|women\s*\+\s*gender\s*diverse.*hockey|women\s*\+.*hockey/.test(t)) {
    return "hockey_dropin";
  }
  if (/discount\s+(public\s+)?skate/.test(t)) {
    return "public_skate";
  }

  // Exclusions first: lessons, programs, leagues, private rentals, and non-target sports.
  if (
    /\b(lesson|lessons|blades|camp|clinic|league|vachl|ringette|floor hockey|ball hockey|intro to hockey|learn to|package|party|birthday|rental|all levels|preschool level)\b/.test(
      t,
    ) ||
    /\blevel\s*\d\b/.test(t)
  ) {
    return null;
  }

  if (/stick\s*(&|and|n|,)\s*puck|shoot\s*(&|and|n)\s*score|stick-and-puck|stick.*ring.*puck|stick.*puck.*ring/.test(t)) {
    return "stick_and_puck";
  }
  if (/buy[\s-]?on|figure skat|freestyle|open session champs|patch/.test(t)) {
    return "figure_buyon";
  }
  if (
    /shinny|drop[\s-]?in hockey|recreational hockey|rec hockey|pick[\s-]?up hockey|adult hockey|public hockey|adult fun hockey|para hockey|\b\d+\+\s*hockey|hockey drop/.test(
      t,
    )
  ) {
    return "hockey_dropin";
  }
  if (
    /(leisure|public|family|adult|toonie|everyone welcome|parent\s*(&|and)?\s*(tot|preschooler)|youth|senior|50\+|55\+|50 and better|discount|community)\s*skat/.test(
      t,
    ) ||
    /^parent and preschooler$/.test(t) ||
    /^skat(e|ing)\b/.test(t)
  ) {
    return "public_skate";
  }
  return null;
}

/** True if the raw title denotes a goalie-only roster attached to a drop-in. */
export function isGoalieListing(rawTitle: string): boolean {
  return /\bgoalies?|goaltenders?\b/i.test(rawTitle);
}

/** Strip platform noise for display (e.g. "Reserve In Advance: ", surrounding pipes "|...|"). */
export function cleanTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^\|+|\|+$/g, "")
    .replace(/^reserve in advance:\s*/i, "")
    .replace(/\s*\(goalies?\)\s*/i, "")
    .trim();
}

/** Composite dedupe key: facility_slug + '_' + startTime + '_' + category. */
export function sessionKey(facilitySlug: string, startTime: Date, category: Category | string): string {
  return `${facilitySlug}_${startTime.toISOString()}_${category}`;
}

/**
 * Clean and sanitize raw description/notes text from municipal portals (strips HTML tags,
 * normalizes bullets and whitespace, and removes duplicate lines).
 */
export function sanitizeSessionNotes(raw?: string | null): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t+/g, " ");

  const rawLines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Deduplicate identical bullet lines that sometimes repeat in PerfectMind descriptions
  const seenBullets = new Set<string>();
  const dedupedLines: string[] = [];
  for (const line of rawLines) {
    const key = line.toLowerCase();
    if (line.startsWith("•") || line.startsWith("-")) {
      if (seenBullets.has(key)) continue;
      seenBullets.add(key);
    }
    dedupedLines.push(line);
  }

  const cleaned = dedupedLines.join("\n").trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Parse key policy constraints from raw description/notes/extraDetails into structured requirement tags.
 */
export function extractSessionRequirements(
  rawText?: string | null,
  rawTitle?: string | null,
): string[] {
  const combined = `${rawTitle ?? ""}\n${ sanitizeSessionNotes(rawText) ?? "" }`;
  if (!combined.trim()) return [];

  const reqs: string[] = [];
  const add = (tag: string) => {
    if (!reqs.includes(tag)) reqs.push(tag);
  };

  // 0. Women+ / gender diverse adult tag
  if (/britannia\s+arena\s*-\s*women\s*\+|women\s*\+|women\s*and\s*gender\s*diverse/i.test(combined)) {
    add("Women+ / 19+");
  }

  // 1. Skate type restrictions
  if (
    /only figure skates can be worn|must wear figure skates|ice dancers and figure skaters only|recreational skates are not appropriate/i.test(
      combined,
    )
  ) {
    add("Figure Skates Only");
  }

  // 2. Experience requirements
  if (
    /previous figure skating experience|prior.*experience|confidently skate at star\s*\d|level star\s*\d/i.test(
      combined,
    )
  ) {
    add("Prior Experience Required");
  }

  // 3. Club partnerships & coaching rules
  if (/coquitlam skate club/i.test(combined)) {
    add("Coquitlam Skate Club");
  }
  if (/no coaches allowed|coaching is not permitted/i.test(combined)) {
    add("No Coaches Allowed");
  } else if (/coaches are free of charge/i.test(combined)) {
    add("Coaches Free");
  } else if (/coaches are required to pay/i.test(combined)) {
    add("Coaches Must Pay");
  }

  // 4. Equipment & safety rules
  if (
    /full hockey equipment is required|full hockey equipment.*mandatory|full equipment is mandatory|full gear is required/i.test(
      combined,
    )
  ) {
    add("Full Gear Required");
  } else if (/csa approved.*helmet.*mandatory|helmets? are mandatory/i.test(combined)) {
    add("CSA Helmet Required");
  }

  if (/no goalies allowed/i.test(combined)) {
    add("No Goalies Allowed");
  }

  return reqs;
}
