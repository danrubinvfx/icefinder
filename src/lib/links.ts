import type { Category } from "./domain";

export const CANLAN_PROGRAMS_FALLBACK =
  "https://apps.daysmartrecreation.com/dash/x/#/online/canlan/programs?facility_ids=1";

// ── Burnaby ─────────────────────────────────────────────────────────────
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

export function getBurnabyPublicSkateUrl(facilitySlug?: string | null): string {
  if (facilitySlug && BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug]) {
    return BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug];
  }
  return BURNABY_PUBLIC_SKATE_SEARCH_FALLBACK;
}

export function getBurnabyDetailUrl(activityId: number | string): string {
  return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search/detail/${activityId}?onlineSiteId=0&from_original_cui=true`;
}

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

// ── Vancouver (ActiveNet) ────────────────────────────────────────────────
export const VANCOUVER_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  britannia: "https://vancouver.ca/parks-recreation-culture/britannia-rink.aspx",
  hillcrest: "https://vancouver.ca/parks-recreation-culture/hillcrest-rink.aspx",
  kitsilano: "https://vancouver.ca/parks-recreation-culture/kitsilano-rink.aspx",
  "trout-lake": "https://vancouver.ca/parks-recreation-culture/trout-lake-rink.aspx",
  sunset: "https://vancouver.ca/parks-recreation-culture/sunset-rink.aspx",
  killarney: "https://vancouver.ca/parks-recreation-culture/killarney-rink.aspx",
};

export const VANCOUVER_SEARCH_FALLBACK =
  "https://anc.ca.apm.activecommunities.com/vancouver/activity/search?onlineSiteId=0&activity_keyword=skate&viewMode=list";

export function getVancouverDetailUrl(activityId: number | string): string {
  return `https://anc.ca.apm.activecommunities.com/vancouver/activity/search/detail/${activityId}?onlineSiteId=0&from_original_cui=true`;
}

export function getVancouverFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  if (facilitySlug && VANCOUVER_FACILITY_SCHEDULE_URLS[facilitySlug]) {
    return VANCOUVER_FACILITY_SCHEDULE_URLS[facilitySlug];
  }
  return VANCOUVER_SEARCH_FALLBACK;
}

// ── Richmond (PerfectMind) ──────────────────────────────────────────────
export const RICHMOND_PERFECTMIND_CALENDAR_URL =
  "https://richmondcity.perfectmind.com/23734/Clients/BookMe4?widgetId=15f6af07-39c5-473e-b053-96653f77a406";

export const RICHMOND_FACILITY_URLS: Record<string, string> = {
  "richmond-ice-centre":
    "https://richmondcity.perfectmind.com/23734/Clients/BookMe4BookingPages/Classes?widgetId=15f6af07-39c5-473e-b053-96653f77a406&calendarId=8bd697eb-ee1e-4067-b6bb-be1901a7753d",
  minoru:
    "https://richmondcity.perfectmind.com/23734/Clients/BookMe4BookingPages/Classes?widgetId=15f6af07-39c5-473e-b053-96653f77a406&calendarId=08c56c84-5ee7-4c81-9d52-d4cfc850aad7",
};

export function getRichmondUrl(facilitySlug?: string | null): string {
  if (facilitySlug && RICHMOND_FACILITY_URLS[facilitySlug]) {
    return RICHMOND_FACILITY_URLS[facilitySlug];
  }
  return RICHMOND_PERFECTMIND_CALENDAR_URL;
}

// ── Coquitlam (PerfectMind) ─────────────────────────────────────────────
export const COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL =
  "https://cityofcoquitlam.perfectmind.com/Contacts/BookMe4BookingPages/Classes?calendarId=4f07c977-74de-46ab-9d0a-2397f83f254f&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const COQUITLAM_PERFECTMIND_SKATING_URL =
  COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;

export const COQUITLAM_POIRIER_SCHEDULE_FALLBACK =
  "https://www.coquitlam.ca/384/Poirier-Sport-and-Leisure-Complex";

export const COQUITLAM_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  poirier: COQUITLAM_POIRIER_SCHEDULE_FALLBACK,
};

export function getCoquitlamFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  if (facilitySlug && COQUITLAM_FACILITY_SCHEDULE_URLS[facilitySlug]) {
    return COQUITLAM_FACILITY_SCHEDULE_URLS[facilitySlug];
  }
  return COQUITLAM_POIRIER_SCHEDULE_FALLBACK;
}

export function getCoquitlamUrl(
  category?: Category | string,
  facilitySlug?: string | null,
  source?: string | null,
): string {
  if (source === "schedule" || (category === "public_skate" && source !== "live")) {
    return getCoquitlamFallbackUrl(category, facilitySlug);
  }
  return COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;
}

// ── Delta (PerfectMind) ─────────────────────────────────────────────────
export const DELTA_ONLINE_REGISTRATION_URL =
  "https://delta.ca/OnlineRegistration";

export const DELTA_PERFECTMIND_SKATING_CALENDAR_URL =
  "https://cityofdelta.perfectmind.com/24140/Clients/BookMe4BookingPages/Classes?calendarId=c9b7ca71-56dc-43e3-aec7-d976239a5660&widgetId=0da93182-93fb-4314-87bd-a8ba4ee9a4c9";

export function getDeltaUrl(): string {
  return DELTA_PERFECTMIND_SKATING_CALENDAR_URL;
}

/**
 * Universal link resolver for UI components and serializers.
 */
export function resolveBookingUrl(opts: {
  bookingUrl?: string | null;
  category: Category;
  bookingPlatform?: string;
  activityId?: number | null;
  externalId?: string | null;
  facilitySlug?: string | null;
  municipality?: string | null;
  source?: string | null;
}): string {
  const { bookingUrl, category, bookingPlatform, activityId, externalId, facilitySlug, municipality, source } = opts;

  // Preserve Canlan / DaySmart verified event URLs, or use programs fallback
  if (bookingPlatform === "canlan" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    if (bookingUrl && /daysmartrecreation\.com\/dash\/x\/#\/online\/canlan\/event\/\d+/i.test(bookingUrl)) {
      return bookingUrl;
    }
    return CANLAN_PROGRAMS_FALLBACK;
  }

  // Vancouver
  if (municipality === "Vancouver" || (facilitySlug && ["britannia", "hillcrest", "kitsilano", "trout-lake", "sunset", "killarney"].includes(facilitySlug))) {
    if (category === "public_skate") {
      return getVancouverFallbackUrl(category, facilitySlug);
    }
    if (activityId) {
      return getVancouverDetailUrl(activityId);
    }
    if (externalId) {
      const m = externalId.match(/activenet:(\d+)/i);
      if (m) return getVancouverDetailUrl(m[1]);
    }
    return bookingUrl || getVancouverFallbackUrl(category, facilitySlug);
  }

  // Richmond
  if (municipality === "Richmond" || (facilitySlug && ["richmond-ice-centre", "minoru"].includes(facilitySlug))) {
    return bookingUrl || getRichmondUrl(facilitySlug);
  }

  // Coquitlam
  if (municipality === "Coquitlam" || facilitySlug === "poirier") {
    if (
      source === "schedule" ||
      (category === "public_skate" && source !== "live" && (!bookingUrl || bookingUrl.includes("perfectmind")))
    ) {
      return getCoquitlamFallbackUrl(category, facilitySlug);
    }
    if (
      !bookingUrl ||
      bookingUrl.includes("/Clients/BookMe4?") ||
      bookingUrl.includes("23902")
    ) {
      return COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;
    }
    return bookingUrl;
  }

  // Delta
  if (municipality === "Delta" || (facilitySlug && ["north-delta", "sungod", "south-delta", "tilbury"].includes(facilitySlug))) {
    return bookingUrl || getDeltaUrl();
  }

  // Burnaby:
  if (category === "public_skate") {
    return getBurnabyPublicSkateUrl(facilitySlug);
  }

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

  if (
    !bookingUrl ||
    bookingUrl.includes("daily-activities") ||
    bookingUrl.includes("center_ids=") ||
    bookingUrl.includes("activity_keyword=") ||
    bookingUrl.includes("search?") ||
    bookingUrl.endsWith("/search")
  ) {
    return getBurnabyFallbackUrl(category, facilitySlug);
  }

  return bookingUrl;
}
