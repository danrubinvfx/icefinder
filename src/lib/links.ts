import type { Category } from "./domain";

export const CANLAN_PROGRAMS_FALLBACK =
  "https://apps.daysmartrecreation.com/dash/x/#/online/canlan/programs?facility_ids=1";

export const BURNABY_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  "rosemary-brown":
    "https://www.burnaby.ca/recreation-and-arts/recreation-facilities/rosemary-brown-recreation-centre",
  kensington:
    "https://www.burnaby.ca/recreation-and-arts/recreation-facilities/kensington-complex",
  "bill-copeland":
    "https://www.burnaby.ca/recreation-and-arts/recreation-facilities/bill-copeland-sports-centre",
};

export const BURNABY_PUBLIC_SKATE_SEARCH_FALLBACK =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_keyword=skate&viewMode=list";

export const BURNABY_FIGURE_SKATING_RESERVE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=figure%20skating%20reserve&viewMode=list";

export const BURNABY_HOCKEY_RESERVE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve&viewMode=list";

/**
 * Facility-specific schedule page for Burnaby public skates (or general search fallback).
 */
export function getBurnabyPublicSkateUrl(facilitySlug?: string | null): string {
  if (facilitySlug && BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug]) {
    return BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug];
  }
  return BURNABY_PUBLIC_SKATE_SEARCH_FALLBACK;
}

/**
 * Direct ActiveNet deep-link to session detail page by numeric activity ID.
 * Takes the user straight to the session page with the green "Enroll Now" button,
 * bypassing search entirely.
 */
export function getBurnabyDetailUrl(activityId: number | string): string {
  return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search/detail/${activityId}?onlineSiteId=0&from_original_cui=true`;
}

/**
 * Fallback link when numeric activity ID is not available or when rendering mock/schedule data.
 * - public_skate: Facility-specific schedule page on Burnaby.ca (or general skate search).
 * - figure_buyon: Verified figure skating reserve query on ActiveNet.
 * - hockey_dropin / stick_and_puck: Verified hockey reserve query on ActiveNet.
 */
export function getBurnabyFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  if (category === "public_skate") {
    return getBurnabyPublicSkateUrl(facilitySlug);
  }
  if (category === "figure_buyon") {
    return BURNABY_FIGURE_SKATING_RESERVE_URL;
  }
  if (category === "hockey_dropin" || category === "stick_and_puck") {
    return BURNABY_HOCKEY_RESERVE_URL;
  }
  return getBurnabyPublicSkateUrl(facilitySlug);
}

export const BURNABY_FACILITY_CENTER_IDS: Record<string, number> = {
  kensington: 147,
  "rosemary-brown": 180,
  "bill-copeland": 56,
};

/**
 * Robust link resolver for UI components and serializers.
 * - For Canlan / DaySmart: preserves the direct Dash event deeplink if active, otherwise programs fallback.
 * - For Burnaby:
 *   1. public_skate -> facility-specific schedule page on Burnaby.ca.
 *   2. source === 'live' with numeric activityId -> direct /detail/{id} deep-link.
 *   3. fallback / schedule / mock -> verified category reserve query or facility schedule URL.
 */
export function resolveBookingUrl(opts: {
  bookingUrl?: string | null;
  category: Category;
  bookingPlatform?: string;
  activityId?: number | null;
  externalId?: string | null;
  facilitySlug?: string | null;
  centerId?: number | string | null;
  source?: string | null;
}): string {
  const { bookingUrl, category, bookingPlatform, activityId, externalId, facilitySlug, source } = opts;

  // Preserve Canlan / DaySmart verified event URLs, or use programs fallback
  if (bookingPlatform === "canlan" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    if (bookingUrl && /daysmartrecreation\.com\/dash\/x\/#\/online\/canlan\/event\/\d+/i.test(bookingUrl)) {
      return bookingUrl;
    }
    return CANLAN_PROGRAMS_FALLBACK;
  }

  // Public skate routes directly to facility-specific schedule page or general skate search
  if (category === "public_skate") {
    return getBurnabyPublicSkateUrl(facilitySlug);
  }

  // Only use numeric /detail/{id} when verified live
  if (source === "live") {
    if (activityId) {
      return getBurnabyDetailUrl(activityId);
    }
    if (externalId) {
      const m = externalId.match(/activenet:(\d+)/i);
      if (m) {
        return getBurnabyDetailUrl(m[1]);
      }
    }
  }

  // If URL has broken keywords, generic landing pages, or center_ids, sanitize to fallback query
  if (
    !bookingUrl ||
    bookingUrl.includes("daily-activities") ||
    bookingUrl.includes("center_ids=") ||
    bookingUrl.includes("activity_keyword=") ||
    bookingUrl.includes("search?") ||
    bookingUrl.endsWith("/search") ||
    bookingUrl.includes("/detail/138467") ||
    bookingUrl.includes("/detail/111580") ||
    bookingUrl.includes("/detail/124539")
  ) {
    return getBurnabyFallbackUrl(category, facilitySlug);
  }

  if (activityId && source === "live") {
    return getBurnabyDetailUrl(activityId);
  }

  return bookingUrl;
}
