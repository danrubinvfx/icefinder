import type { Category } from "./domain";

export const CANLAN_PROGRAMS_FALLBACK =
  "https://apps.daysmartrecreation.com/dash/x/#/online/canlan/programs?facility_ids=1";

export function getCanlanEventUrl(eventId: number | string): string {
  const cleanId = String(eventId).replace(/\D/g, "");
  return `https://apps.daysmartrecreation.com/dash/x/#/online/canlan/event/${cleanId}`;
}

// ── Burnaby (ActiveNet) ──────────────────────────────────────────────────
export const BURNABY_CENTER_IDS: Record<string, number> = {
  "rosemary-brown": 180,
  kensington: 147,
  "bill-copeland": 146,
};

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

export function getBurnabyCenterId(facilitySlug?: string | null): number | undefined {
  if (!facilitySlug) return undefined;
  return BURNABY_CENTER_IDS[facilitySlug];
}

export function getBurnabyCategoryUrl(category: Category | string, facilitySlug?: string | null): string {
  const centerId = getBurnabyCenterId(facilitySlug);
  const centerParam = centerId ? `&center_ids=${centerId}` : "";

  if (category === "figure_buyon") {
    return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=figure%20skating%20reserve${centerParam}&viewMode=list`;
  }
  if (category === "hockey_dropin" || category === "stick_and_puck") {
    return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve${centerParam}&viewMode=list`;
  }
  return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_keyword=skate${centerParam}&viewMode=list`;
}

export function getBurnabyPublicSkateUrl(facilitySlug?: string | null): string {
  const centerId = getBurnabyCenterId(facilitySlug);
  const centerParam = centerId ? `&center_ids=${centerId}` : "";
  return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_keyword=skate${centerParam}&viewMode=list`;
}

export function getBurnabyDetailUrl(activityId: number | string): string {
  const cleanId = String(activityId).replace(/^activenet:/i, "").trim();
  return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search/detail/${cleanId}?onlineSiteId=0&from_original_cui=true`;
}

export function getBurnabyFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  if (category) {
    return getBurnabyCategoryUrl(category, facilitySlug);
  }
  const centerId = getBurnabyCenterId(facilitySlug);
  if (centerId) {
    return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_keyword=skate&center_ids=${centerId}&viewMode=list`;
  }
  return BURNABY_PUBLIC_SKATE_SEARCH_FALLBACK;
}

export function getBurnabyUrl(opts: {
  category?: Category | string;
  activityId?: number | string | null;
  externalId?: string | null;
  facilitySlug?: string | null;
}): string {
  const rawId = opts.activityId ?? (opts.externalId ? opts.externalId.replace(/\D/g, "") : null);
  if (rawId) {
    return getBurnabyDetailUrl(rawId);
  }
  return getBurnabyFallbackUrl(opts.category, opts.facilitySlug);
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
  const cleanId = String(activityId).replace(/^activenet:/i, "").trim();
  return `https://anc.ca.apm.activecommunities.com/vancouver/activity/search/detail/${cleanId}?onlineSiteId=0&from_original_cui=true`;
}

export function getVancouverFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  void category;
  void facilitySlug;
  return VANCOUVER_DROPIN_CALENDAR_URL;
}

// ── Coquitlam (PerfectMind) ─────────────────────────────────────────────
export const COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL =
  "https://cityofcoquitlam.perfectmind.com/Contacts/BookMe4BookingPages/Classes?calendarId=4f07c977-74de-46ab-9d0a-2397f83f254f&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const COQUITLAM_PERFECTMIND_SKATING_URL =
  COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;

export const COQUITLAM_SCHEDULE_URL =
  "https://www.coquitlam.ca/384/Poirier-Sport-and-Leisure-Complex";

export const COQUITLAM_POIRIER_SCHEDULE_URL = COQUITLAM_SCHEDULE_URL;

export const COQUITLAM_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  poirier: COQUITLAM_SCHEDULE_URL,
};

export function getCoquitlamUrl(
  categoryOrOpts?:
    | Category
    | string
    | {
        category?: Category | string;
        facilitySlug?: string | null;
        source?: string | null;
        rawTitle?: string | null;
      },
  facilitySlug?: string | null,
  source?: string | null,
  rawTitle?: string | null,
): string {
  let cat: Category | string | undefined;
  let src: string | null | undefined = source;
  let title: string | null | undefined = rawTitle;

  if (categoryOrOpts && typeof categoryOrOpts === "object") {
    cat = categoryOrOpts.category;
    src = categoryOrOpts.source ?? src;
    title = categoryOrOpts.rawTitle ?? title;
  } else {
    cat = categoryOrOpts;
  }

  const isExplicitWalkIn = title ? /walk-?in/i.test(title) : false;

  const isReservableCategory =
    cat === "hockey_dropin" ||
    cat === "stick_and_puck" ||
    cat === "figure_buyon";

  if (isReservableCategory && !isExplicitWalkIn) {
    return COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;
  }

  if (cat === "public_skate" || src === "schedule" || isExplicitWalkIn) {
    return COQUITLAM_SCHEDULE_URL;
  }

  return COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL;
}

export function getCoquitlamFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  return getCoquitlamUrl(category, facilitySlug);
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
  void categoryOrSlug;
  void facilitySlug;
  return RICHMOND_PERFECTMIND_REGISTRATION_URL;
}

export function getRichmondFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  return getRichmondUrl(category, facilitySlug);
}

// ── Delta (PerfectMind) ─────────────────────────────────────────────────
export const DELTA_PERFECTMIND_ARENA_DROPIN_URL =
  "https://cityofdelta.perfectmind.com/24140/Clients/BookMe4BookingPages/Classes?calendarId=c9b7ca71-56dc-43e3-aec7-d976239a5660&widgetId=0da93182-93fb-4314-87bd-a8ba4ee9a4c9&embed=False";

export const DELTA_PERFECTMIND_REGISTRATION_URL =
  DELTA_PERFECTMIND_ARENA_DROPIN_URL;

export const DELTA_SKATING_FALLBACK_URL =
  "https://www.delta.ca/community-culture/recreation-activities/skating-ice-sports";

export const DELTA_ONLINE_REGISTRATION_URL =
  DELTA_PERFECTMIND_ARENA_DROPIN_URL;

export const DELTA_PERFECTMIND_SKATING_CALENDAR_URL =
  DELTA_PERFECTMIND_ARENA_DROPIN_URL;

export const DELTA_FACILITY_URLS: Record<string, string> = {
  "north-delta": DELTA_PERFECTMIND_ARENA_DROPIN_URL,
  sungod: DELTA_PERFECTMIND_ARENA_DROPIN_URL,
  "south-delta": DELTA_PERFECTMIND_ARENA_DROPIN_URL,
  tilbury: DELTA_PERFECTMIND_ARENA_DROPIN_URL,
};

export function getDeltaUrl(
  categoryOrSlug?: Category | string | null,
  facilitySlug?: string | null,
): string {
  void categoryOrSlug;
  void facilitySlug;
  return DELTA_PERFECTMIND_ARENA_DROPIN_URL;
}

export function getDeltaFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  return getDeltaUrl(category, facilitySlug);
}

/**
 * Universal link resolver for UI components and serializers.
 * Generates direct session registration URLs across all platforms.
 * Never links to generic civic homepages or municipal department landing pages.
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
  rawTitle?: string | null;
}): string {
  const { bookingUrl, category, bookingPlatform, activityId, externalId, facilitySlug, municipality, source, rawTitle } = opts;

  // 1. Scotia Barn / Canlan (DaySmart)
  if (bookingPlatform === "canlan" || facilitySlug === "scotia-barn" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    const eventIdMatch = bookingUrl?.match(/event\/(\d+)/i);
    const canlanId = eventIdMatch ? eventIdMatch[1] : (externalId ? externalId.replace(/\D/g, "") : (activityId ? String(activityId) : null));
    if (canlanId) {
      return getCanlanEventUrl(canlanId);
    }
    return CANLAN_PROGRAMS_FALLBACK;
  }

  // 2. City of Vancouver (ActiveNet)
  if (municipality === "Vancouver" || (facilitySlug && ["britannia", "hillcrest", "kitsilano", "trout-lake", "sunset", "killarney"].includes(facilitySlug))) {
    const rawId = activityId ?? (externalId ? externalId.replace(/\D/g, "") : null);
    if (rawId) {
      return getVancouverDetailUrl(rawId);
    }
    return VANCOUVER_DROPIN_CALENDAR_URL;
  }

  // 3. Richmond (PerfectMind)
  if (municipality === "Richmond" || (facilitySlug && ["richmond-ice-centre", "minoru"].includes(facilitySlug))) {
    return RICHMOND_PERFECTMIND_REGISTRATION_URL;
  }

  // 4. Coquitlam / Poirier (PerfectMind)
  if (municipality === "Coquitlam" || facilitySlug === "poirier") {
    return getCoquitlamUrl({
      category,
      facilitySlug,
      source,
      rawTitle,
    });
  }

  // 5. Delta (PerfectMind)
  if (municipality === "Delta" || (facilitySlug && ["north-delta", "sungod", "south-delta", "tilbury"].includes(facilitySlug))) {
    return DELTA_PERFECTMIND_ARENA_DROPIN_URL;
  }

  // 6. Burnaby (ActiveNet)
  const burnabyId = activityId ?? (externalId ? externalId.replace(/\D/g, "") : null);
  if (burnabyId) {
    return getBurnabyDetailUrl(burnabyId);
  }
  return getBurnabyFallbackUrl(category, facilitySlug);
}
