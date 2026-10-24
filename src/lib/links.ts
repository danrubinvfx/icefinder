import type { Category } from "./domain";

export const CANLAN_PROGRAMS_FALLBACK =
  "https://apps.daysmartrecreation.com/dash/x/#/online/canlan/programs?facility_ids=1";

export const BURNABY_DAILY_ACTIVITIES_URL =
  "https://www.burnaby.ca/recreation-and-arts/activities-and-registration/daily-activities";

export const BURNABY_FIGURE_SKATING_RESERVE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=figure%20skating%20reserve&viewMode=list";

export const BURNABY_HOCKEY_RESERVE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve&viewMode=list";

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
 * - public_skate: Burnaby public skate is front-desk drop-in published on the municipal calendar.
 * - figure_buyon: Verified figure skating reserve query on ActiveNet.
 * - hockey_dropin / stick_and_puck: Verified hockey reserve query on ActiveNet.
 */
export function getBurnabyFallbackUrl(category?: Category | string): string {
  if (category === "public_skate") {
    return BURNABY_DAILY_ACTIVITIES_URL;
  }
  if (category === "figure_buyon") {
    return BURNABY_FIGURE_SKATING_RESERVE_URL;
  }
  if (category === "hockey_dropin" || category === "stick_and_puck") {
    return BURNABY_HOCKEY_RESERVE_URL;
  }
  return BURNABY_DAILY_ACTIVITIES_URL;
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
 *   1. public_skate -> municipal daily-activities calendar.
 *   2. source === 'live' with numeric activityId -> direct /detail/{id} deep-link.
 *   3. fallback / schedule / mock -> verified category reserve query.
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
  const { bookingUrl, category, bookingPlatform, activityId, externalId, source } = opts;

  // Preserve Canlan / DaySmart verified event URLs, or use programs fallback
  if (bookingPlatform === "canlan" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    if (bookingUrl && /daysmartrecreation\.com\/dash\/x\/#\/online\/canlan\/event\/\d+/i.test(bookingUrl)) {
      return bookingUrl;
    }
    return CANLAN_PROGRAMS_FALLBACK;
  }

  // Public skate is front-desk drop-in on the municipal calendar
  if (category === "public_skate") {
    return BURNABY_DAILY_ACTIVITIES_URL;
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

  // If URL has broken keywords, center_ids, or brittle mock detail IDs, sanitize to fallback query
  if (
    !bookingUrl ||
    bookingUrl.includes("center_ids=") ||
    bookingUrl.includes("activity_keyword=") ||
    bookingUrl.includes("search?") ||
    bookingUrl.endsWith("/search") ||
    bookingUrl.includes("/detail/138467") ||
    bookingUrl.includes("/detail/111580") ||
    bookingUrl.includes("/detail/124539")
  ) {
    return getBurnabyFallbackUrl(category);
  }

  if (activityId && source === "live") {
    return getBurnabyDetailUrl(activityId);
  }

  return bookingUrl;
}
