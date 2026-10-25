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
    .replace(/^reserve in advance:\s*/i, "")
    .replace(/\(goalie\)/g, "")
    .trim();

  // Exclusions first: lessons, programs, leagues, private rentals, and non-target sports.
  if (/\b(lesson|blades|camp|clinic|league|ringette|floor hockey|ball hockey|intro to hockey|learn to|package|party|birthday|rental)\b/.test(t)) {
    return null;
  }

  if (/stick\s*(&|and|n)\s*puck|shoot\s*(&|and|n)\s*score|stick-and-puck|stick.*ring.*puck|stick.*puck.*ring/.test(t)) {
    return "stick_and_puck";
  }
  if (/buy[\s-]?on|figure skat|freestyle|open session champs|patch/.test(t)) {
    return "figure_buyon";
  }
  if (/shinny|drop[\s-]?in hockey|recreational hockey|rec hockey|pick[\s-]?up hockey|adult hockey|hockey drop/.test(t)) {
    return "hockey_dropin";
  }
  if (/(leisure|public|family|adult|toonie|everyone welcome|parent\s*&?\s*tot|youth|senior|55\+|discount|community)\s*skat/.test(t) || /^skat(e|ing)\b/.test(t)) {
    return "public_skate";
  }
  return null;
}

/** True if the raw title denotes a goalie-only roster attached to a drop-in. */
export function isGoalieListing(rawTitle: string): boolean {
  return /\bgoalie|goaltender\b/i.test(rawTitle);
}

/** Strip platform noise for display (e.g. "Reserve In Advance: "). */
export function cleanTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^reserve in advance:\s*/i, "")
    .replace(/\s*\(goalie\)\s*/i, "")
    .trim();
}

/** Composite dedupe key: facility_slug + '_' + startTime + '_' + category. */
export function sessionKey(facilitySlug: string, startTime: Date, category: Category | string): string {
  return `${facilitySlug}_${startTime.toISOString()}_${category}`;
}
