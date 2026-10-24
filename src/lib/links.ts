import type { Category } from "./domain";

export const CANLAN_PROGRAMS_FALLBACK =
  "https://apps.daysmartrecreation.com/dash/x/#/online/canlan/programs?facility_ids=1";

// ── Burnaby (ActiveNet) ──────────────────────────────────────────────────
export const BURNABY_FACILITY_URLS: Record<string, string> = {
  "rosemary-brown":
    "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=180&viewMode=list",
  kensington:
    "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=147&viewMode=list",
  "bill-copeland":
    "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=146&viewMode=list",
};

// Aliased for backwards compatibility
export const BURNABY_FACILITY_SCHEDULE_URLS = BURNABY_FACILITY_URLS;

export const BURNABY_PUBLIC_SKATE_SEARCH_FALLBACK =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_keyword=skate&viewMode=list";

export const BURNABY_FIGURE_SKATING_RESERVE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=figure%20skating%20reserve&viewMode=list";

export const BURNABY_HOCKEY_RESERVE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve&viewMode=list";

export function getBurnabyPublicSkateUrl(facilitySlug?: string | null): string {
  if (facilitySlug && BURNABY_FACILITY_URLS[facilitySlug]) {
    return BURNABY_FACILITY_URLS[facilitySlug];
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
  if (facilitySlug && BURNABY_FACILITY_URLS[facilitySlug]) {
    return BURNABY_FACILITY_URLS[facilitySlug];
  }
  if (category === "figure_buyon") {
    return BURNABY_FIGURE_SKATING_RESERVE_URL;
  }
  if (category === "hockey_dropin" || category === "stick_and_puck") {
    return BURNABY_HOCKEY_RESERVE_URL;
  }
  return BURNABY_PUBLIC_SKATE_SEARCH_FALLBACK;
}

// ── Vancouver (Park Board ActiveNet) ────────────────────────────────────
export const VANCOUVER_DROPIN_CALENDAR_URL =
  "https://anc.ca.apm.activecommunities.com/vancouver/calendars?onlineSiteId=0&no_scroll_top=true&defaultCalendarId=3&displayType=0&view=2";

export const VANCOUVER_SEARCH_FALLBACK =
  "https://anc.ca.apm.activecommunities.com/vancouver/activity/search?onlineSiteId=0&activity_keyword=skate&viewMode=list";

export const VANCOUVER_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  britannia: VANCOUVER_DROPIN_CALENDAR_URL,
  hillcrest: VANCOUVER_DROPIN_CALENDAR_URL,
  kitsilano: VANCOUVER_DROPIN_CALENDAR_URL,
  "trout-lake": VANCOUVER_DROPIN_CALENDAR_URL,
  sunset: VANCOUVER_DROPIN_CALENDAR_URL,
  killarney: VANCOUVER_DROPIN_CALENDAR_URL,
};

export function getVancouverDetailUrl(activityId: number | string): string {
  return `https://anc.ca.apm.activecommunities.com/vancouver/activity/search/detail/${activityId}?onlineSiteId=0&from_original_cui=true`;
}

export function getVancouverFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  void facilitySlug;
  if (category === "public_skate") {
    return VANCOUVER_DROPIN_CALENDAR_URL;
  }
  return VANCOUVER_SEARCH_FALLBACK;
}

// ── Coquitlam (PerfectMind) ─────────────────────────────────────────────
export const COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL =
  "https://cityofcoquitlam.perfectmind.com/Contacts/BookMe4BookingPages/Classes?calendarId=4f07c977-74de-46ab-9d0a-2397f83f254f&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const COQUITLAM_PERFECTMIND_SKATING_URL =
  COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;

export const COQUITLAM_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  poirier: COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL,
};

export function getCoquitlamUrl(
  category?: Category | string,
  facilitySlug?: string | null,
  source?: string | null,
): string {
  void category;
  void facilitySlug;
  void source;
  return COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;
}

export function getCoquitlamFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  void category;
  void facilitySlug;
  return COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;
}

// ── Richmond (PerfectMind) ──────────────────────────────────────────────
export const RICHMOND_PERFECTMIND_REGISTRATION_URL =
  "https://richmondcity.perfectmind.com/23650/Clients/BookMe4?widgetId=15f6af07-39c5-473e-b053-96653f77a406";

export const RICHMOND_ARENAS_FALLBACK_URL = "https://www.richmond.ca/arenas";

export const RICHMOND_FACILITY_URLS: Record<string, string> = {
  "richmond-ice-centre": RICHMOND_PERFECTMIND_REGISTRATION_URL,
  minoru: RICHMOND_PERFECTMIND_REGISTRATION_URL,
};

export const RICHMOND_PERFECTMIND_CALENDAR_URL =
  RICHMOND_PERFECTMIND_REGISTRATION_URL;

export function getRichmondUrl(
  categoryOrSlug?: Category | string | null,
  facilitySlug?: string | null,
): string {
  void facilitySlug;
  if (categoryOrSlug === "public_skate") {
    return RICHMOND_ARENAS_FALLBACK_URL;
  }
  return RICHMOND_PERFECTMIND_REGISTRATION_URL;
}

export function getRichmondFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  return getRichmondUrl(category, facilitySlug);
}

// ── Delta (PerfectMind) ─────────────────────────────────────────────────
export const DELTA_PERFECTMIND_REGISTRATION_URL =
  "https://cityofdelta.perfectmind.com/24140/Clients/BookMe4?widgetId=15f6af07-39c5-473e-b053-96653f77a406";

export const DELTA_SKATING_FALLBACK_URL =
  "https://www.delta.ca/community-culture/recreation-activities/skating-ice-sports";

export const DELTA_ONLINE_REGISTRATION_URL =
  DELTA_PERFECTMIND_REGISTRATION_URL;

export const DELTA_PERFECTMIND_SKATING_CALENDAR_URL =
  DELTA_PERFECTMIND_REGISTRATION_URL;

export const DELTA_FACILITY_URLS: Record<string, string> = {
  "north-delta": DELTA_PERFECTMIND_REGISTRATION_URL,
  sungod: DELTA_PERFECTMIND_REGISTRATION_URL,
  "south-delta": DELTA_PERFECTMIND_REGISTRATION_URL,
  tilbury: DELTA_PERFECTMIND_REGISTRATION_URL,
};

export function getDeltaUrl(
  categoryOrSlug?: Category | string | null,
  facilitySlug?: string | null,
): string {
  void facilitySlug;
  if (categoryOrSlug === "public_skate") {
    return DELTA_SKATING_FALLBACK_URL;
  }
  return DELTA_PERFECTMIND_REGISTRATION_URL;
}

export function getDeltaFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  return getDeltaUrl(category, facilitySlug);
}

/**
 * Universal link resolver for UI components and serializers.
 * Never links to generic municipal landing or facility info pages.
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

  // Vancouver (ActiveNet)
  if (municipality === "Vancouver" || (facilitySlug && ["britannia", "hillcrest", "kitsilano", "trout-lake", "sunset", "killarney"].includes(facilitySlug))) {
    if (source === "live") {
      if (activityId) return getVancouverDetailUrl(activityId);
      if (externalId) {
        const m = externalId.match(/activenet:(\d+)/i);
        if (m) return getVancouverDetailUrl(m[1]);
      }
    }
    if (category === "public_skate") {
      return VANCOUVER_DROPIN_CALENDAR_URL;
    }
    if (
      bookingUrl &&
      !bookingUrl.includes("vancouver.ca") &&
      !bookingUrl.includes("activity_keyword=")
    ) {
      return bookingUrl;
    }
    return getVancouverFallbackUrl(category, facilitySlug);
  }

  // Richmond (PerfectMind)
  if (municipality === "Richmond" || (facilitySlug && ["richmond-ice-centre", "minoru"].includes(facilitySlug))) {
    if (category === "public_skate" || source === "schedule") {
      return RICHMOND_ARENAS_FALLBACK_URL;
    }
    if (
      !bookingUrl ||
      bookingUrl.includes("BookMe4BookingPages") ||
      bookingUrl.includes("calendarId=") ||
      bookingUrl.includes("23734") ||
      bookingUrl.includes("richmond.ca")
    ) {
      return RICHMOND_PERFECTMIND_REGISTRATION_URL;
    }
    return bookingUrl;
  }

  // Coquitlam (PerfectMind)
  if (municipality === "Coquitlam" || facilitySlug === "poirier") {
    if (
      !bookingUrl ||
      bookingUrl.includes("/Clients/BookMe4?") ||
      bookingUrl.includes("23902") ||
      bookingUrl.includes("coquitlam.ca")
    ) {
      return COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;
    }
    return bookingUrl;
  }

  // Delta (PerfectMind)
  if (municipality === "Delta" || (facilitySlug && ["north-delta", "sungod", "south-delta", "tilbury"].includes(facilitySlug))) {
    if (category === "public_skate" || source === "schedule") {
      return DELTA_SKATING_FALLBACK_URL;
    }
    if (
      !bookingUrl ||
      bookingUrl.includes("BookMe4BookingPages") ||
      bookingUrl.includes("calendarId=") ||
      bookingUrl.includes("24184") ||
      bookingUrl.includes("delta.ca")
    ) {
      return DELTA_PERFECTMIND_REGISTRATION_URL;
    }
    return bookingUrl;
  }

  // Burnaby (ActiveNet)
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

  if (category === "public_skate") {
    return getBurnabyPublicSkateUrl(facilitySlug);
  }

  if (
    !bookingUrl ||
    bookingUrl.includes("burnaby.ca") ||
    bookingUrl.includes("daily-activities") ||
    bookingUrl.endsWith("/search")
  ) {
    return getBurnabyFallbackUrl(category, facilitySlug);
  }

  return bookingUrl;
}
