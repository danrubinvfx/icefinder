import type { Category } from "./domain";

/**
 * Direct ActiveNet deep-link to session detail page by numeric activity ID.
 * Takes the user straight to the session page with the green "Enroll Now" button,
 * bypassing search entirely.
 */
export function getBurnabyDetailUrl(activityId: number | string): string {
  return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search/detail/${activityId}?onlineSiteId=0&from_original_cui=true`;
}

/**
 * Fallback link when numeric activity ID is not available or when rendering mock/cached data.
 * Uses ActiveNet's exact query parameters that enforce the search filter (`activity_select_param=2`)
 * and arena center_ids so ActiveNet does not drop keywords or show unrelated recreation activities.
 */
export function getBurnabyFallbackUrl(
  category?: Category | string,
  centerId?: number | string | null
): string {
  let keyword = "public skate";
  if (category === "figure_buyon") {
    keyword = "figure skating reserve";
  } else if (category === "hockey_dropin" || category === "stick_and_puck") {
    keyword = "hockey reserve";
  } else if (category === "public_skate") {
    keyword = "public skate";
  }

  const encodedKeyword = encodeURIComponent(keyword);
  let url = `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=${encodedKeyword}&viewMode=list`;

  if (centerId) {
    url += `&center_ids=${centerId}`;
  }
  return url;
}

export const BURNABY_FACILITY_CENTER_IDS: Record<string, number> = {
  "kensington": 147,
  "rosemary-brown": 180,
  "bill-copeland": 56,
};

/**
 * Robust link resolver for UI components and serializers.
 * - For Canlan / DaySmart: preserves the direct DaySmart link.
 * - For Burnaby:
 *   1. Only construct a `/detail/{id}` URL when the ID is freshly parsed directly
 *      from a live API response in the current sweep (`source === 'live'`).
 *   2. For mock, cached, or fallback sessions, always use verified category reserve queries
 *      with facility-specific center_ids to avoid stale ID redirects (e.g. into yoga classes).
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

  // Preserve Canlan / DaySmart URLs
  if (bookingPlatform === "canlan" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    return bookingUrl || "https://www.canlansports.com/";
  }

  // Determine center ID from opts or facility slug
  let centerId = opts.centerId;
  if (!centerId && facilitySlug && BURNABY_FACILITY_CENTER_IDS[facilitySlug]) {
    centerId = BURNABY_FACILITY_CENTER_IDS[facilitySlug];
  }

  // For mock or schedule fallback data, ALWAYS use verified category reserve query
  if (source === "mock" || source === "schedule") {
    return getBurnabyFallbackUrl(category, centerId);
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

  // If URL has broken keywords, search params, or brittle mock detail IDs, sanitize to fallback query
  if (
    !bookingUrl ||
    bookingUrl.includes("activity_keyword=") ||
    bookingUrl.includes("search?") ||
    bookingUrl.endsWith("/search") ||
    bookingUrl.includes("/detail/138467") ||
    bookingUrl.includes("/detail/111580") ||
    bookingUrl.includes("/detail/124539")
  ) {
    return getBurnabyFallbackUrl(category, centerId);
  }

  if (activityId && source === "live") {
    return getBurnabyDetailUrl(activityId);
  }

  return bookingUrl;
}
