/**
 * Shared domain constants used by the web app, seed script and ingestion engine.
 * Keep this file free of Node/Prisma imports so it can be bundled client-side.
 */

export const CATEGORIES = [
  "figure_buyon",
  "hockey_dropin",
  "stick_and_puck",
  "public_skate",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  figure_buyon: "Figure Skating Buy-ons",
  hockey_dropin: "Hockey Drop-in",
  stick_and_puck: "Stick & Puck",
  public_skate: "Public Skate",
};

export const CATEGORY_SHORT: Record<Category, string> = {
  figure_buyon: "Figure Buy-on",
  hockey_dropin: "Drop-in Hockey",
  stick_and_puck: "Stick & Puck",
  public_skate: "Public Skate",
};

export const MUNICIPALITIES = [
  "All Metro Van",
  "Burnaby",
  "Vancouver",
  "Richmond",
  "Coquitlam",
  "Delta",
] as const;

export type Municipality = (typeof MUNICIPALITIES)[number];

export type BookingPlatform = "activenet" | "canlan" | "perfectmind";

export interface FacilitySeed {
  slug: string;
  name: string;
  shortName: string;
  municipality: string;
  address: string;
  lat: number;
  lng: number;
  bookingPlatform: BookingPlatform;
  /** Exact `site` or location string returned by ActiveNet (activenet only). */
  activenetSite?: string;
  /** DaySmart facility id (canlan only). */
  daysmartFacilityId?: number;
}

export const FACILITIES: FacilitySeed[] = [
  // ── Burnaby ─────────────────────────────────────────────────────────────
  {
    slug: "rosemary-brown",
    name: "Rosemary Brown Recreation Centre",
    shortName: "Rosemary Brown",
    municipality: "Burnaby",
    address: "7789 18th St, Burnaby, BC V3N 5E5",
    lat: 49.2186,
    lng: -122.9452,
    bookingPlatform: "activenet",
    activenetSite: "Rosemary Brown Recreation Centre (RBR)",
  },
  {
    slug: "kensington",
    name: "Kensington Complex",
    shortName: "Kensington",
    municipality: "Burnaby",
    address: "6159 Curtis St, Burnaby, BC V5B 4X7",
    lat: 49.279,
    lng: -122.971,
    bookingPlatform: "activenet",
    activenetSite: "Kensington Complex (KEN)",
  },
  {
    slug: "bill-copeland",
    name: "Bill Copeland Sports Centre",
    shortName: "Bill Copeland",
    municipality: "Burnaby",
    address: "3676 Kensington Ave, Burnaby, BC V5B 4Z6",
    lat: 49.2487,
    lng: -122.9757,
    bookingPlatform: "activenet",
    activenetSite: "Bill Copeland Sports Centre (BCS)",
  },
  {
    slug: "scotia-barn",
    name: "Scotia Barn (Canlan Sports Burnaby)",
    shortName: "Scotia Barn",
    municipality: "Burnaby",
    address: "6501 Sprott St, Burnaby, BC V5B 3B8",
    lat: 49.2575,
    lng: -122.969,
    bookingPlatform: "canlan",
    daysmartFacilityId: 1,
  },

  // ── Vancouver (ActiveNet) ────────────────────────────────────────────────
  {
    slug: "britannia",
    name: "Britannia Community Centre Rink",
    shortName: "Britannia",
    municipality: "Vancouver",
    address: "1661 Napier St, Vancouver, BC V5L 4X4",
    lat: 49.2755,
    lng: -123.0714,
    bookingPlatform: "activenet",
    activenetSite: "*Britannia Rink",
  },
  {
    slug: "hillcrest",
    name: "Hillcrest Rink",
    shortName: "Hillcrest",
    municipality: "Vancouver",
    address: "4575 Clancy Loranger Way, Vancouver, BC V5Y 2M4",
    lat: 49.2443,
    lng: -123.1095,
    bookingPlatform: "activenet",
    activenetSite: "*Hillcrest Rink",
  },
  {
    slug: "kitsilano",
    name: "Kitsilano Community Centre Rink",
    shortName: "Kitsilano",
    municipality: "Vancouver",
    address: "2690 Larch St, Vancouver, BC V6K 4K9",
    lat: 49.2618,
    lng: -123.1611,
    bookingPlatform: "activenet",
    activenetSite: "*Kitsilano Rink",
  },
  {
    slug: "trout-lake",
    name: "Trout Lake Rink",
    shortName: "Trout Lake",
    municipality: "Vancouver",
    address: "3360 Victoria Dr, Vancouver, BC V5N 4M4",
    lat: 49.2547,
    lng: -123.0645,
    bookingPlatform: "activenet",
    activenetSite: "*Trout Lake Rink",
  },
  {
    slug: "sunset",
    name: "Sunset Community Centre Rink",
    shortName: "Sunset",
    municipality: "Vancouver",
    address: "390 E 51st Ave, Vancouver, BC V5X 1C9",
    lat: 49.2246,
    lng: -123.0975,
    bookingPlatform: "activenet",
    activenetSite: "*Sunset Rink",
  },
  {
    slug: "killarney",
    name: "Killarney Rink",
    shortName: "Killarney",
    municipality: "Vancouver",
    address: "6260 Killarney St, Vancouver, BC V5S 2W9",
    lat: 49.2253,
    lng: -123.0401,
    bookingPlatform: "activenet",
    activenetSite: "*Killarney Rink",
  },

  // ── Coquitlam (PerfectMind) ─────────────────────────────────────────────
  {
    slug: "poirier",
    name: "Poirier Sport & Leisure Complex",
    shortName: "Poirier",
    municipality: "Coquitlam",
    address: "633 Poirier St, Coquitlam, BC V3J 6A9",
    lat: 49.2608,
    lng: -122.829,
    bookingPlatform: "perfectmind",
  },

  // ── Richmond (PerfectMind) ──────────────────────────────────────────────
  {
    slug: "richmond-ice-centre",
    name: "Richmond Ice Centre",
    shortName: "Richmond Ice",
    municipality: "Richmond",
    address: "14140 Triangle Rd, Richmond, BC V6W 1B1",
    lat: 49.1362,
    lng: -123.0786,
    bookingPlatform: "perfectmind",
  },
  {
    slug: "minoru",
    name: "Minoru Arenas",
    shortName: "Minoru",
    municipality: "Richmond",
    address: "7551 Minoru Gate, Richmond, BC V6Y 1R8",
    lat: 49.1633,
    lng: -123.1417,
    bookingPlatform: "perfectmind",
  },

  // ── Delta (PerfectMind) ─────────────────────────────────────────────────
  {
    slug: "north-delta",
    name: "North Delta Recreation Centre",
    shortName: "North Delta",
    municipality: "Delta",
    address: "11415 84 Ave, Delta, BC V4C 2L9",
    lat: 49.1554,
    lng: -122.9067,
    bookingPlatform: "perfectmind",
  },
  {
    slug: "sungod",
    name: "Sungod Recreation Centre",
    shortName: "Sungod",
    municipality: "Delta",
    address: "7815 112 St, Delta, BC V4C 4V9",
    lat: 49.1447,
    lng: -122.9103,
    bookingPlatform: "perfectmind",
  },
  {
    slug: "south-delta",
    name: "South Delta Recreation Centre",
    shortName: "South Delta",
    municipality: "Delta",
    address: "1720 56 St, Delta, BC V4L 2B1",
    lat: 49.0347,
    lng: -123.0717,
    bookingPlatform: "perfectmind",
  },
  {
    slug: "tilbury",
    name: "Tilbury Ice",
    shortName: "Tilbury",
    municipality: "Delta",
    address: "7187 Vantage Way, Delta, BC V4G 1K7",
    lat: 49.1332,
    lng: -123.0116,
    bookingPlatform: "perfectmind",
  },
];

export const FACILITY_SHORT_NAME: Record<string, string> = Object.fromEntries(
  FACILITIES.map((f) => [f.slug, f.shortName]),
);

export const TIMEZONE = "America/Vancouver";

/**
 * Detect when a session is sourced from an offline schedule or club partner
 */
export function isSpecialSession(session: {
  source?: string | null;
  facilitySlug: string;
  category: string;
}): boolean {
  return (
    session.source === "special_schedule" ||
    session.source === "schedule_footer" ||
    (session.facilitySlug === "poirier" && session.category === "figure_buyon")
  );
}
