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
 * Uses Burnaby's working "Reserve in Advance" ice search with broad parameters
 * instead of free-text titles that return "No results found".
 */
export function getBurnabyFallbackUrl(category?: Category | string): string {
  if (category === "figure_buyon") {
    return "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_keyword=figure%20skating%20reserve&viewMode=list";
  }
  if (category === "hockey_dropin" || category === "stick_and_puck") {
    return "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_keyword=hockey%20reserve&viewMode=list";
  }
  return "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&viewMode=list";
}

/**
 * Robust link resolver for UI components and serializers.
 * - For Canlan / DaySmart: preserves the direct DaySmart link.
 * - For Burnaby:
 *   1. If explicit activityId exists, returns direct detail deep-link.
 *   2. If externalId has numeric ID (e.g. "activenet:123456"), returns direct detail deep-link.
 *   3. If bookingUrl has numeric activity ID in path, converts to direct detail deep-link.
 *   4. If URL has query params with specific keywords (like "Buy-on Ice"), replaces with broad working fallback.
 */
export function resolveBookingUrl(opts: {
  bookingUrl: string;
  category: Category;
  bookingPlatform: string;
  activityId?: number | null;
  externalId?: string | null;
}): string {
  const { bookingUrl, category, bookingPlatform, activityId, externalId } = opts;

  // Preserve Canlan / DaySmart URLs
  if (bookingPlatform === "canlan" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    return bookingUrl;
  }

  // 1. Direct numeric activityId
  if (activityId) {
    return getBurnabyDetailUrl(activityId);
  }

  // 2. Extract numeric ID from externalId if present
  if (externalId) {
    const m = externalId.match(/activenet:(\d+)/i);
    if (m) {
      return getBurnabyDetailUrl(m[1]);
    }
  }

  // 3. Extract numeric ID from existing URL if present
  if (bookingUrl) {
    const detailMatch = bookingUrl.match(/(?:\/detail\/|\/Activity_Search\/[^/]+\/)(\d+)/i);
    if (detailMatch) {
      return getBurnabyDetailUrl(detailMatch[1]);
    }

    // 4. If URL has broken activity_keyword query (like "Buy-on Ice") or is a search page, use working fallback
    if (
      bookingUrl.includes("activity_keyword=") ||
      bookingUrl.includes("search?") ||
      bookingUrl.endsWith("/search")
    ) {
      return getBurnabyFallbackUrl(category);
    }

    return bookingUrl;
  }

  // General fallback by category
  return getBurnabyFallbackUrl(category);
}
