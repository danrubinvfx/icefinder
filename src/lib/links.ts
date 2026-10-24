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
 * Fallback link when numeric activity ID is not available.
 * Uses ActiveNet's exact query parameters that enforce the search filter (`activity_select_param=2`)
 * so ActiveNet does not drop keywords and show unfiltered recreation results.
 */
export function getBurnabyFallbackUrl(
  category?: Category | string,
  centerId?: number | string | null
): string {
  let keyword = "skate";
  if (category === "figure_buyon") {
    keyword = "figure skating reserve";
  } else if (category === "hockey_dropin" || category === "stick_and_puck") {
    keyword = "hockey reserve";
  } else if (category === "public_skate") {
    keyword = "skate";
  }

  const encodedKeyword = encodeURIComponent(keyword);
  let url = `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=${encodedKeyword}&viewMode=list`;

  if (centerId && category !== "figure_buyon") {
    url += `&center_ids=${centerId}`;
  }
  return url;
}

const BURNABY_FACILITY_CENTER_IDS: Record<string, number> = {
  "rosemary-brown": 180,
  "bill-copeland": 56,
};

/**
 * Robust link resolver for UI components and serializers.
 * - For Canlan / DaySmart: preserves the direct DaySmart link.
 * - For Burnaby:
 *   1. Intercepts cancelled placeholder #111580 and points to verified Kensington figure skating #138467.
 *   2. If explicit activityId exists, returns direct detail deep-link.
 *   3. If externalId has numeric ID (e.g. "activenet:123456"), returns direct detail deep-link.
 *   4. If bookingUrl has numeric activity ID in path, converts to direct detail deep-link.
 *   5. If URL has query params with specific keywords or is a search page, replaces with working fallback
 *      including activity_select_param=2 and arena center_ids.
 */
export function resolveBookingUrl(opts: {
  bookingUrl?: string | null;
  category: Category;
  bookingPlatform?: string;
  activityId?: number | null;
  externalId?: string | null;
  facilitySlug?: string | null;
  centerId?: number | string | null;
}): string {
  const { bookingUrl, category, bookingPlatform, activityId, externalId, facilitySlug } = opts;

  // Preserve Canlan / DaySmart URLs
  if (bookingPlatform === "canlan" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    return bookingUrl || "https://www.canlansports.com/";
  }

  // Intercept cancelled placeholder #111580 and replace with verified Kensington figure skating #138467
  if (
    activityId === 111580 ||
    String(activityId) === "111580" ||
    (externalId && externalId.includes("111580")) ||
    (bookingUrl && bookingUrl.includes("111580"))
  ) {
    return getBurnabyDetailUrl(138467);
  }

  // 1. Direct numeric activityId
  if (activityId) {
    return getBurnabyDetailUrl(activityId);
  }

  // 2. Extract numeric ID from externalId if present (e.g. "activenet:123456")
  if (externalId) {
    const m = externalId.match(/activenet:(\d+)/i);
    if (m) {
      return getBurnabyDetailUrl(m[1]);
    }
  }

  // Determine center ID from opts or facility slug
  let centerId = opts.centerId;
  if (!centerId && facilitySlug && BURNABY_FACILITY_CENTER_IDS[facilitySlug]) {
    centerId = BURNABY_FACILITY_CENTER_IDS[facilitySlug];
  }

  // 3. Extract numeric ID from existing URL if present
  if (bookingUrl) {
    const detailMatch = bookingUrl.match(/(?:\/detail\/|\/Activity_Search\/[^/]+\/)(\d+)/i);
    if (detailMatch) {
      return getBurnabyDetailUrl(detailMatch[1]);
    }

    // Check if the URL has center_ids already
    if (!centerId) {
      const centerMatch = bookingUrl.match(/center_ids=(\d+)/i);
      if (centerMatch) {
        centerId = centerMatch[1];
      }
    }

    // 4. If URL is a search URL (or contains activity_keyword or bare search), sanitize it to have activity_select_param=2
    if (
      bookingUrl.includes("activity_keyword=") ||
      bookingUrl.includes("search?") ||
      bookingUrl.endsWith("/search")
    ) {
      return getBurnabyFallbackUrl(category, centerId);
    }

    return bookingUrl;
  }

  // General fallback by category & center
  return getBurnabyFallbackUrl(category, centerId);
}
