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
    "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve&center_ids=180&viewMode=list",
  kensington:
    "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve&center_ids=147&viewMode=list",
  "bill-copeland":
    "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve&center_ids=146&viewMode=list",
};

export const BURNABY_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  "rosemary-brown":
    "https://www.burnaby.ca/recreation-and-arts/recreation-facilities/rosemary-brown-recreation-centre",
  kensington:
    "https://www.burnaby.ca/recreation-and-arts/recreation-facilities/kensington-complex",
  "bill-copeland":
    "https://www.burnaby.ca/recreation-and-arts/recreation-facilities/bill-copeland-sports-centre",
};

export const BURNABY_DAILY_ACTIVITIES_URL =
  "https://www.burnaby.ca/recreation-and-arts/activities-and-registration/daily-activities";

export const BURNABY_PUBLIC_SKATE_SEARCH_FALLBACK =
  BURNABY_DAILY_ACTIVITIES_URL;

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

  if (category === "public_skate") {
    return getBurnabyPublicSkateUrl(facilitySlug);
  }
  if (category === "figure_buyon") {
    return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=figure%20skating%20reserve${centerParam}&viewMode=list`;
  }
  if (category === "hockey_dropin" || category === "stick_and_puck") {
    return `https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&activity_select_param=2&activity_keyword=hockey%20reserve${centerParam}&viewMode=list`;
  }
  return getBurnabyPublicSkateUrl(facilitySlug);
}

export function getBurnabyPublicSkateUrl(facilitySlug?: string | null): string {
  if (facilitySlug && BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug]) {
    return BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug];
  }
  return BURNABY_DAILY_ACTIVITIES_URL;
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
  if (facilitySlug && BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug]) {
    return BURNABY_FACILITY_SCHEDULE_URLS[facilitySlug];
  }
  return BURNABY_DAILY_ACTIVITIES_URL;
}

export function getBurnabyUrl(opts: {
  category?: Category | string;
  activityId?: number | string | null;
  externalId?: string | null;
  external_id?: string | null;
  facilitySlug?: string | null;
}): string {
  if (opts.category === "public_skate") {
    return getBurnabyPublicSkateUrl(opts.facilitySlug);
  }
  const rawExt = opts.external_id ?? opts.externalId;
  const rawId = opts.activityId ?? (rawExt ? String(rawExt).replace(/^activenet:/i, "").replace(/\D/g, "") : null);
  if (rawId) {
    return getBurnabyDetailUrl(rawId);
  }
  return getBurnabyFallbackUrl(opts.category, opts.facilitySlug);
}

// ── Vancouver (Park Board ActiveNet) ────────────────────────────────────
export const VANCOUVER_CENTER_IDS: Record<string, number> = {
  britannia: 24,
  hillcrest: 22,
  killarney: 25,
  kitsilano: 26,
  sunset: 27,
  "trout-lake": 28,
};

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

export function getVancouverCenterId(facilitySlug?: string | null): number | undefined {
  if (!facilitySlug) return undefined;
  return VANCOUVER_CENTER_IDS[facilitySlug];
}

export function getVancouverFacilitySearchUrl(facilitySlug?: string | null): string {
  const centerId = getVancouverCenterId(facilitySlug);
  if (centerId) {
    return `https://anc.ca.apm.activecommunities.com/vancouver/activity/search?onlineSiteId=0&center_ids=${centerId}&viewMode=list`;
  }
  return VANCOUVER_SEARCH_FALLBACK;
}

export function getVancouverDetailUrl(activityId: number | string, facilitySlug?: string | null): string {
  const cleanId = String(activityId).replace(/^activenet:/i, "").trim();
  const centerId = getVancouverCenterId(facilitySlug);
  const centerParam = centerId ? `&center_ids=${centerId}` : "";
  return `https://anc.ca.apm.activecommunities.com/vancouver/activity/search/detail/${cleanId}?onlineSiteId=0&from_original_cui=true${centerParam}`;
}

export function getVancouverFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  if (category === "public_skate") {
    return VANCOUVER_DROPIN_CALENDAR_URL;
  }
  if (facilitySlug && VANCOUVER_CENTER_IDS[facilitySlug]) {
    return getVancouverFacilitySearchUrl(facilitySlug);
  }
  return VANCOUVER_DROPIN_CALENDAR_URL;
}

// ── Coquitlam (PerfectMind) ─────────────────────────────────────────────
export const COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL =
  "https://cityofcoquitlam.perfectmind.com/Contacts/BookMe4BookingPages/Classes?calendarId=4f07c977-74de-46ab-9d0a-2397f83f254f&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const COQUITLAM_PERFECTMIND_PUBLIC_SKATE_CALENDAR_URL =
  "https://cityofcoquitlam.perfectmind.com/Contacts/BookMe4BookingPages/Classes?calendarId=b7685f76-3d81-4fac-b270-60659b414ff6&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const COQUITLAM_PERFECTMIND_SKATING_CALENDAR_URL =
  COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL;

export const COQUITLAM_PERFECTMIND_SKATING_URL =
  COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL;

export const COQUITLAM_FACILITY_SCHEDULE_URLS: Record<string, string> = {
  poirier: COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL,
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
  if (categoryOrOpts && typeof categoryOrOpts === "object") {
    cat = categoryOrOpts.category;
  } else {
    cat = categoryOrOpts;
  }
  void facilitySlug;
  void source;
  void rawTitle;

  if (cat === "public_skate") {
    return COQUITLAM_PERFECTMIND_PUBLIC_SKATE_CALENDAR_URL;
  }
  return COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL;
}

export function getCoquitlamFallbackUrl(
  category?: Category | string,
  facilitySlug?: string | null,
): string {
  return getCoquitlamUrl(category, facilitySlug);
}

// ── Richmond (PerfectMind) ──────────────────────────────────────────────
export const RICHMOND_ICE_CENTRE_CALENDAR_URL =
  "https://richmondcity.perfectmind.com/23650/Clients/BookMe4BookingPages/Classes?calendarId=8bd697eb-ee1e-4067-b6bb-be1901a7753d&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const RICHMOND_MINORU_CALENDAR_URL =
  "https://richmondcity.perfectmind.com/23650/Clients/BookMe4BookingPages/Classes?calendarId=6ef4a37b-91d1-432a-a92e-9828e83b4c10&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const RICHMOND_PERFECTMIND_REGISTRATION_URL =
  RICHMOND_ICE_CENTRE_CALENDAR_URL;

export const RICHMOND_ARENAS_FALLBACK_URL = "https://www.richmond.ca/arenas";

export const RICHMOND_FACILITY_URLS: Record<string, string> = {
  "richmond-ice-centre": RICHMOND_ICE_CENTRE_CALENDAR_URL,
  minoru: RICHMOND_MINORU_CALENDAR_URL,
};

export const RICHMOND_PERFECTMIND_CALENDAR_URL =
  RICHMOND_ICE_CENTRE_CALENDAR_URL;

export function getRichmondUrl(
  categoryOrSlug?: Category | string | null,
  facilitySlug?: string | null,
): string {
  if (categoryOrSlug && RICHMOND_FACILITY_URLS[categoryOrSlug]) {
    return RICHMOND_FACILITY_URLS[categoryOrSlug];
  }
  if (facilitySlug && RICHMOND_FACILITY_URLS[facilitySlug]) {
    return RICHMOND_FACILITY_URLS[facilitySlug];
  }
  return RICHMOND_ICE_CENTRE_CALENDAR_URL;
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
  "https://www.delta.ca/parks-recreation/drop-in-activities/skating";

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

// ── Surrey (PerfectMind) ────────────────────────────────────────────────
export const SURREY_PERFECTMIND_CALENDAR_URL =
  "https://cityofsurrey.perfectmind.com/23615/Clients/BookMe4BookingPages/Classes?calendarId=5b599b6d-d54f-43c1-b86a-e962d9bf107b&widgetId=b4059e75-9755-401f-a7b5-d7c75361420d&embed=False";

export function getSurreyUrl(): string {
  return SURREY_PERFECTMIND_CALENDAR_URL;
}

// ── North Vancouver / NVRC (PerfectMind) ────────────────────────────────
export const NVRC_PERFECTMIND_WIDGET_URL =
  "https://nvrc.perfectmind.com/23734/Clients/BookMe4?widgetId=a28b2c65-61af-407f-80d1-eaa58f30a94a";

export const NVRC_PERFECTMIND_CALENDAR_URL =
  "https://nvrc.perfectmind.com/23734/Clients/BookMe4BookingPages/Classes?calendarId=9290cb7e-d450-4972-b327-b89aa12b2a69&widgetId=a28b2c65-61af-407f-80d1-eaa58f30a94a&embed=False";

export function getNvrcUrl(): string {
  return NVRC_PERFECTMIND_WIDGET_URL;
}

// ── West Vancouver (ActiveNet) ──────────────────────────────────────────
export const WEST_VANCOUVER_SEARCH_URL =
  "https://anc.ca.apm.activecommunities.com/westvancouver/activity/search?onlineSiteId=0&activity_keyword=skate&viewMode=list";

export function getWestVancouverDetailUrl(activityId: number | string): string {
  const cleanId = String(activityId).replace(/^activenet:/i, "").replace(/\D/g, "");
  return `https://anc.ca.apm.activecommunities.com/westvancouver/activity/search/detail/${cleanId}?onlineSiteId=0&from_original_cui=true`;
}

export function getWestVancouverUrl(activityId?: number | string | null): string {
  if (activityId) return getWestVancouverDetailUrl(activityId);
  return WEST_VANCOUVER_SEARCH_URL;
}

// ── New Westminster (ActiveNet) ─────────────────────────────────────────
export const NEW_WESTMINSTER_SEARCH_URL =
  "https://anc.ca.apm.activecommunities.com/newwestminster/activity/search?onlineSiteId=0&activity_keyword=skate&viewMode=list";

export function getNewWestminsterDetailUrl(activityId: number | string): string {
  const cleanId = String(activityId).replace(/^activenet:/i, "").replace(/\D/g, "");
  return `https://anc.ca.apm.activecommunities.com/newwestminster/activity/search/detail/${cleanId}?onlineSiteId=0&from_original_cui=true`;
}

export function getNewWestminsterUrl(activityId?: number | string | null): string {
  if (activityId) return getNewWestminsterDetailUrl(activityId);
  return NEW_WESTMINSTER_SEARCH_URL;
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
  external_id?: string | null;
  facilitySlug?: string | null;
  municipality?: string | null;
  source?: string | null;
  rawTitle?: string | null;
}): string {
  const { bookingUrl, category, bookingPlatform, activityId, externalId, external_id, facilitySlug, municipality, source, rawTitle } = opts;
  const rawExternalId = external_id ?? externalId;
  void source;
  void rawTitle;

  // 1. Scotia Barn / Canlan (DaySmart)
  if (bookingPlatform === "canlan" || facilitySlug === "scotia-barn" || (bookingUrl && bookingUrl.includes("daysmartrecreation.com"))) {
    const eventIdMatch = bookingUrl?.match(/event\/(\d+)/i);
    const canlanId = eventIdMatch ? eventIdMatch[1] : (rawExternalId ? rawExternalId.replace(/\D/g, "") : (activityId ? String(activityId) : null));
    if (canlanId) {
      return getCanlanEventUrl(canlanId);
    }
    return CANLAN_PROGRAMS_FALLBACK;
  }

  // 2. City of Vancouver (ActiveNet)
  if (municipality === "Vancouver" || (facilitySlug && ["britannia", "hillcrest", "kitsilano", "trout-lake", "sunset", "killarney"].includes(facilitySlug))) {
    if (category === "public_skate") {
      return VANCOUVER_DROPIN_CALENDAR_URL;
    }
    const detailMatch = bookingUrl?.match(/\/activity\/search\/detail\/(\d+)/i);
    const rawId =
      activityId ??
      (rawExternalId ? rawExternalId.replace(/\D/g, "") : null) ??
      (detailMatch ? detailMatch[1] : null);
    if (rawId) {
      return getVancouverDetailUrl(rawId, facilitySlug);
    }
    return getVancouverFallbackUrl(category, facilitySlug);
  }

  // 3. Richmond (PerfectMind)
  if (municipality === "Richmond" || (facilitySlug && ["richmond-ice-centre", "minoru"].includes(facilitySlug))) {
    if (facilitySlug === "minoru") {
      return RICHMOND_MINORU_CALENDAR_URL;
    }
    return RICHMOND_ICE_CENTRE_CALENDAR_URL;
  }

  // 4. Coquitlam / Poirier (PerfectMind)
  if (municipality === "Coquitlam" || facilitySlug === "poirier") {
    return getCoquitlamUrl(category);
  }

  // 5. Delta (PerfectMind)
  if (municipality === "Delta" || (facilitySlug && ["north-delta", "sungod", "south-delta", "tilbury"].includes(facilitySlug))) {
    return DELTA_PERFECTMIND_ARENA_DROPIN_URL;
  }

  // 6. Surrey (PerfectMind)
  if (
    municipality === "Surrey" ||
    (facilitySlug &&
      ["north-surrey", "surrey-sport-leisure", "cloverdale-ice", "south-surrey", "newton-arena"].includes(
        facilitySlug,
      ))
  ) {
    return SURREY_PERFECTMIND_CALENDAR_URL;
  }

  // 7. North Vancouver (NVRC PerfectMind)
  if (
    municipality === "North Vancouver" ||
    (facilitySlug && ["karen-magnussen", "harry-jerome"].includes(facilitySlug))
  ) {
    return NVRC_PERFECTMIND_WIDGET_URL;
  }

  // 8. West Vancouver (ActiveNet)
  if (municipality === "West Vancouver" || facilitySlug === "west-vancouver-arena") {
    const detailMatch = bookingUrl?.match(/\/activity\/search\/detail\/(\d+)/i);
    const rawId =
      activityId ??
      (rawExternalId ? String(rawExternalId).replace(/^activenet:/i, "").replace(/\D/g, "") : null) ??
      (detailMatch ? detailMatch[1] : null);
    return getWestVancouverUrl(rawId);
  }

  // 9. New Westminster (ActiveNet)
  if (municipality === "New Westminster" || facilitySlug === "moody-park") {
    const detailMatch = bookingUrl?.match(/\/activity\/search\/detail\/(\d+)/i);
    const rawId =
      activityId ??
      (rawExternalId ? String(rawExternalId).replace(/^activenet:/i, "").replace(/\D/g, "") : null) ??
      (detailMatch ? detailMatch[1] : null);
    return getNewWestminsterUrl(rawId);
  }

  // 10. Burnaby (ActiveNet)
  if (category === "public_skate") {
    return getBurnabyPublicSkateUrl(facilitySlug);
  }
  const detailMatch = bookingUrl?.match(/\/activity\/search\/detail\/(\d+)/i);
  const burnabyId =
    activityId ??
    (rawExternalId ? String(rawExternalId).replace(/^activenet:/i, "").replace(/\D/g, "") : null) ??
    (detailMatch ? detailMatch[1] : null);
  if (burnabyId) {
    return getBurnabyDetailUrl(burnabyId);
  }
  return getBurnabyFallbackUrl(category, facilitySlug);
}
