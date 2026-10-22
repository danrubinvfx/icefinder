/**
 * Shared domain constants used by the web app, seed script and ingestion engine.
 * Keep this file free of Node/Prisma imports so it can be bundled client-side.
 */

export const CATEGORIES = [
  "hockey_dropin",
  "stick_and_puck",
  "figure_buyon",
  "public_skate",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  hockey_dropin: "Hockey Drop-in",
  stick_and_puck: "Stick & Puck",
  figure_buyon: "Figure Skating Buy-ons",
  public_skate: "Public Skate",
};

export const CATEGORY_SHORT: Record<Category, string> = {
  hockey_dropin: "Drop-in Hockey",
  stick_and_puck: "Stick & Puck",
  figure_buyon: "Figure Buy-on",
  public_skate: "Public Skate",
};

export type BookingPlatform = "activenet" | "canlan";

export interface FacilitySeed {
  slug: string;
  name: string;
  shortName: string;
  municipality: string;
  address: string;
  lat: number;
  lng: number;
  bookingPlatform: BookingPlatform;
  /** Exact `site` string returned by Burnaby ActiveNet (activenet only). */
  activenetSite?: string;
  /** DaySmart facility id (canlan only). */
  daysmartFacilityId?: number;
}

export const FACILITIES: FacilitySeed[] = [
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
];

export const FACILITY_SHORT_NAME: Record<string, string> = Object.fromEntries(
  FACILITIES.map((f) => [f.slug, f.shortName]),
);

export const TIMEZONE = "America/Vancouver";
