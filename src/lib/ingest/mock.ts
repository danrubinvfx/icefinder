/**
 * Fallback data so the pipeline is demonstrable end-to-end even when a rink endpoint is
 * down, rate-limited or returns a challenge page. Mock rows deliberately use messy,
 * real-world raw titles so they flow through the same `normalizeCategory()` logic as live data.
 *
 * Also provides published *public skate* timetables across Metro Vancouver facilities.
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE, type Category, type FacilitySeed } from "../domain";
import {
  cleanTitle,
  extractSessionRequirements,
  isGoalieListing,
  normalizeCategory,
  sanitizeSessionNotes,
  sessionKey,
} from "../normalize";
import { resolveBookingUrl } from "../links";
import { generatePoirierTimetable } from "./poirier";
import type { IngestWindow, NormalizedSession } from "./types";

interface Template {
  title: string;
  days: number[]; // 0 = Sun
  start: string; // "21:45"
  minutes: number;
  capacity: number;
  rink?: string;
  cost?: number;
  goalie?: { capacity: number };
  notes?: string;
}

const MOCK_TEMPLATES: Record<string, Template[]> = {
  // ── Burnaby ──
  "rosemary-brown": [
    { title: "Adult Stick & Puck 19+", days: [1, 3, 5], start: "11:30", minutes: 75, capacity: 20, rink: "Rink 1", cost: 9.6 },
    { title: "Reserve In Advance: Recreational Hockey 18yrs+", days: [2, 4, 6], start: "21:45", minutes: 75, capacity: 20, rink: "Rink 1", cost: 9.6, goalie: { capacity: 3 } },
    { title: "Buy-on Ice - Figure Skating Star 2+", days: [1, 2, 4], start: "13:00", minutes: 75, capacity: 20, rink: "Rink 2", cost: 11.25 },
  ],
  kensington: [
    { title: "Adult Drop-in Hockey 19+", days: [0, 1, 3, 5], start: "22:00", minutes: 75, capacity: 22, rink: "Rink 1", cost: 9.6, goalie: { capacity: 2 } },
    { title: "Figure Skating Buy-on Ice", days: [6, 0], start: "07:15", minutes: 60, capacity: 18, rink: "Rink 1", cost: 11.25 },
  ],
  "bill-copeland": [
    { title: "Adult Stick & Puck 19+", days: [1, 2, 4], start: "12:00", minutes: 75, capacity: 20, cost: 9.6 },
    { title: "Recreational Hockey", days: [2, 5, 6], start: "20:30", minutes: 75, capacity: 26, cost: 9.6, goalie: { capacity: 3 } },
    { title: "Buy-on Ice", days: [3, 6], start: "09:00", minutes: 75, capacity: 20, cost: 11.25 },
  ],
  "scotia-barn": [
    { title: "Shinny", days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", minutes: 65, capacity: 20, rink: "Rink 3", cost: 18, goalie: { capacity: 2 } },
    { title: "Stick & Puck", days: [0, 1, 2, 3, 4, 5, 6], start: "13:15", minutes: 65, capacity: 20, rink: "Rink 4", cost: 15 },
    { title: "Late Night Shinny", days: [4, 5, 6], start: "22:30", minutes: 65, capacity: 20, rink: "Rink 6", cost: 18, goalie: { capacity: 2 } },
  ],

  // ── Vancouver ──
  britannia: [
    { title: "Adult Stick & Puck", days: [1, 3, 5], start: "12:00", minutes: 90, capacity: 24, cost: 7.5 },
    { title: "Drop-in Hockey 19+", days: [2, 4], start: "21:30", minutes: 75, capacity: 22, cost: 8.5, goalie: { capacity: 2 } },
  ],
  hillcrest: [
    { title: "Adult Shinny Hockey", days: [1, 3, 5], start: "22:00", minutes: 75, capacity: 22, cost: 8.5, goalie: { capacity: 2 } },
    { title: "Figure Skating Buy-on", days: [2, 4, 6], start: "07:00", minutes: 60, capacity: 18, cost: 10 },
  ],
  kitsilano: [
    { title: "Stick, Puck & Ring", days: [2, 4], start: "11:45", minutes: 75, capacity: 20, cost: 7.5 },
    { title: "Recreational Hockey 19+", days: [1, 5], start: "21:45", minutes: 75, capacity: 20, cost: 8.5, goalie: { capacity: 2 } },
  ],
  "trout-lake": [
    { title: "Drop-in Hockey", days: [0, 3], start: "21:15", minutes: 75, capacity: 22, cost: 8.5, goalie: { capacity: 2 } },
    { title: "Adult Stick & Puck", days: [2, 4], start: "13:30", minutes: 75, capacity: 20, cost: 7.5 },
  ],
  sunset: [
    { title: "Adult Stick & Puck", days: [1, 4], start: "12:30", minutes: 75, capacity: 20, cost: 7.5 },
    { title: "Shinny Hockey", days: [3, 6], start: "21:45", minutes: 75, capacity: 22, cost: 8.5, goalie: { capacity: 2 } },
  ],
  killarney: [
    { title: "Drop-in Hockey", days: [2, 5], start: "21:30", minutes: 75, capacity: 22, cost: 8.5, goalie: { capacity: 2 } },
    { title: "Figure Skating Buy-on", days: [1, 6], start: "07:30", minutes: 60, capacity: 18, cost: 10 },
  ],

  // ── Coquitlam ──
  poirier: [
    { title: "Adult Hockey Drop-in 19+", days: [1, 3, 5], start: "21:45", minutes: 75, capacity: 22, rink: "Main Arena", cost: 9, goalie: { capacity: 2 } },
    { title: "Stick & Puck", days: [2, 4], start: "11:30", minutes: 75, capacity: 20, rink: "Rink 2", cost: 7.5 },
    { title: "Figure Skating Buy-on", days: [0, 6], start: "08:00", minutes: 60, capacity: 18, rink: "Rink 2", cost: 11 },
  ],

  // ── Richmond ──
  "richmond-ice-centre": [
    { title: "Stick & Puck - Adults", days: [1, 2, 3, 4, 5], start: "09:00", minutes: 120, capacity: 20, rink: "Coliseum", cost: 7.9 },
    { title: "Adult Drop-in Hockey", days: [1, 3, 5], start: "21:45", minutes: 75, capacity: 22, rink: "Igloo", cost: 9.5, goalie: { capacity: 2 } },
  ],
  minoru: [
    { title: "Adult Stick and Puck", days: [2, 4], start: "12:00", minutes: 90, capacity: 20, rink: "Silver Rink", cost: 7.9 },
    { title: "Figure Skating Buy-on", days: [1, 3, 6], start: "07:00", minutes: 75, capacity: 18, rink: "Stadium Rink", cost: 10.5 },
  ],

  // ── Delta ──
  "north-delta": [
    { title: "Adult Drop In Hockey", days: [1, 3, 5], start: "10:00", minutes: 75, capacity: 22, cost: 8.75, goalie: { capacity: 2 } },
    { title: "Stick & Puck 3+", days: [6, 0], start: "14:30", minutes: 75, capacity: 25, cost: 7.5 },
  ],
  sungod: [
    { title: "Adult Drop In Hockey", days: [2, 4], start: "10:00", minutes: 75, capacity: 22, cost: 8.75, goalie: { capacity: 2 } },
    { title: "Stick & Puck 3+", days: [6], start: "14:30", minutes: 75, capacity: 25, cost: 7.5 },
  ],
  "south-delta": [
    { title: "Adult Drop In Hockey", days: [1, 4], start: "11:45", minutes: 75, capacity: 22, cost: 8.75, goalie: { capacity: 2 } },
    { title: "Stick & Puck", days: [0, 3], start: "13:00", minutes: 75, capacity: 25, cost: 7.5 },
  ],
  tilbury: [
    { title: "Stick and Puck Open Session", days: [1, 3, 5], start: "11:00", minutes: 75, capacity: 20, cost: 8.5 },
    { title: "Adult Drop-in Hockey", days: [2, 4], start: "22:00", minutes: 75, capacity: 20, cost: 9.5, goalie: { capacity: 2 } },
  ],
};

const PUBLIC_SKATE_SCHEDULE: Record<string, Template[]> = {
  // ── Burnaby ──
  "rosemary-brown": [
    { title: "Leisure Skate", days: [1, 3, 5], start: "13:00", minutes: 90, capacity: 200, rink: "Rink 2", cost: 6.4 },
    { title: "Family Skate", days: [6, 0], start: "13:30", minutes: 120, capacity: 250, rink: "Rink 1", cost: 6.4 },
    { title: "Toonie Skate", days: [5], start: "19:00", minutes: 90, capacity: 250, rink: "Rink 1", cost: 2 },
  ],
  kensington: [
    { title: "Public Skate", days: [2, 4], start: "15:30", minutes: 90, capacity: 200, rink: "Rink 1", cost: 6.4 },
    { title: "Family Skate", days: [6, 0], start: "14:00", minutes: 120, capacity: 250, rink: "Rink 1", cost: 6.4 },
  ],
  "bill-copeland": [
    { title: "Leisure Skate", days: [1, 3], start: "12:00", minutes: 90, capacity: 220, cost: 6.4 },
    { title: "Everyone Welcome Skate", days: [6], start: "19:30", minutes: 120, capacity: 250, cost: 6.4 },
  ],

  // ── Vancouver ──
  britannia: [
    { title: "Public Skate", days: [0], start: "14:15", minutes: 75, capacity: 180, cost: 7.2 },
    { title: "Public Skate", days: [6], start: "13:30", minutes: 90, capacity: 180, cost: 7.2 },
    { title: "Public Skate", days: [4], start: "18:00", minutes: 90, capacity: 180, cost: 7.2 },
    { title: "Adult Skate", days: [2], start: "20:15", minutes: 75, capacity: 150, cost: 7.2 },
  ],
  hillcrest: [
    { title: "Public Skate", days: [1, 3, 5], start: "13:15", minutes: 90, capacity: 220, cost: 7.2 },
    { title: "Everyone Welcome Skate", days: [6, 0], start: "14:00", minutes: 105, capacity: 250, cost: 7.2 },
  ],
  kitsilano: [
    { title: "Public Skate", days: [2, 4], start: "15:00", minutes: 90, capacity: 180, cost: 7.2 },
    { title: "Family Skate", days: [6, 0], start: "13:30", minutes: 90, capacity: 200, cost: 7.2 },
  ],
  "trout-lake": [
    { title: "Public Skate", days: [0, 6], start: "14:30", minutes: 90, capacity: 200, cost: 7.2 },
    { title: "Adult Leisure Skate", days: [1, 4], start: "11:30", minutes: 75, capacity: 150, cost: 7.2 },
  ],
  sunset: [
    { title: "Public Skate", days: [6, 0], start: "14:30", minutes: 90, capacity: 200, cost: 7.2 },
    { title: "Youth Skate", days: [5], start: "17:30", minutes: 90, capacity: 200, cost: 4.5 },
  ],
  killarney: [
    { title: "Public Skate", days: [0], start: "14:15", minutes: 90, capacity: 200, cost: 7.2 },
    { title: "Public Skate", days: [6], start: "13:00", minutes: 90, capacity: 200, cost: 7.2 },
    { title: "Toonie Skate", days: [4], start: "18:00", minutes: 90, capacity: 200, cost: 2 },
  ],

  // ── Coquitlam ──
  poirier: [
    { title: "Public Skate", days: [6, 0], start: "13:15", minutes: 90, capacity: 220, rink: "Main Arena", cost: 6.8 },
    { title: "Adult Skate 19+", days: [1, 3], start: "12:00", minutes: 75, capacity: 180, rink: "Rink 2", cost: 6.8 },
    { title: "Toonie Skate", days: [5], start: "19:00", minutes: 90, capacity: 250, rink: "Main Arena", cost: 2 },
  ],

  // ── Richmond ──
  "richmond-ice-centre": [
    { title: "Public Skate", days: [6, 0], start: "14:00", minutes: 90, capacity: 200, rink: "Coliseum", cost: 6.5 },
  ],
  minoru: [
    { title: "Public Skate", days: [0, 6], start: "13:30", minutes: 90, capacity: 200, rink: "Stadium Rink", cost: 6.5 },
    { title: "Senior Leisure Skate", days: [2, 4], start: "10:30", minutes: 75, capacity: 150, rink: "Silver Rink", cost: 5 },
  ],

  // ── Delta ──
  "north-delta": [
    { title: "Everyone Welcome Skate", days: [6, 0], start: "13:00", minutes: 90, capacity: 200, cost: 6.5 },
  ],
  sungod: [
    { title: "Everyone Welcome Skate", days: [6, 0], start: "13:00", minutes: 75, capacity: 250, cost: 6.5 },
    { title: "Adult Skate", days: [1, 3], start: "11:45", minutes: 75, capacity: 150, cost: 6.5 },
  ],
  "south-delta": [
    { title: "Everyone Welcome Skate", days: [6, 0], start: "14:00", minutes: 90, capacity: 200, cost: 6.5 },
  ],
  tilbury: [
    { title: "Public Skate", days: [0], start: "13:30", minutes: 75, capacity: 150, cost: 6.5 },
  ],
};

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function eachLocalDay(window: IngestWindow): string[] {
  const days: string[] = [];
  for (let t = window.from.getTime() - 86_400_000; t < window.to.getTime() + 86_400_000; t += 86_400_000) {
    const ymd = new Date(t).toLocaleDateString("en-CA", { timeZone: TIMEZONE });
    if (!days.includes(ymd)) days.push(ymd);
  }
  return days;
}

function bookingUrlFor(
  facility: FacilitySeed,
  category: Category,
  source?: NormalizedSession["source"],
) {
  return resolveBookingUrl({
    category,
    bookingPlatform: facility.bookingPlatform,
    facilitySlug: facility.slug,
    municipality: facility.municipality,
    source,
  });
}

function expand(
  facility: FacilitySeed,
  templates: Template[],
  window: IngestWindow,
  source: NormalizedSession["source"],
): NormalizedSession[] {
  const out: NormalizedSession[] = [];
  const bucket = Math.floor(Date.now() / 600_000);
  for (const ymd of eachLocalDay(window)) {
    const dow = toZonedTime(fromZonedTime(`${ymd}T12:00:00`, TIMEZONE), TIMEZONE).getDay();
    for (const tpl of templates) {
      if (!tpl.days.includes(dow)) continue;
      const category = normalizeCategory(tpl.title);
      if (!category || isGoalieListing(tpl.title)) continue;
      const startTime = fromZonedTime(`${ymd}T${tpl.start}:00`, TIMEZONE);
      if (startTime < window.from || startTime >= window.to) continue;
      const endTime = new Date(startTime.getTime() + tpl.minutes * 60_000);
      const key = sessionKey(facility.slug, startTime, category);

      let openSpots = tpl.capacity;
      let waitlist = 0;
      let goaliesRegistered: number | null = null;
      if (source === "mock") {
        const rnd = seeded(`${key}|${bucket}`);
        const r = rnd();
        openSpots = r < 0.25 ? 0 : r < 0.45 ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * (tpl.capacity - 3));
        waitlist = openSpots === 0 ? Math.floor(rnd() * 6) : 0;
        if (tpl.goalie) goaliesRegistered = Math.floor(rnd() * (tpl.goalie.capacity + 1));
      }

      const notes = sanitizeSessionNotes(tpl.notes ?? null);
      const requirements = extractSessionRequirements(tpl.notes ?? null, tpl.title);

      out.push({
        facilitySlug: facility.slug,
        rawTitle: cleanTitle(tpl.title),
        category,
        rink: tpl.rink ?? null,
        startTime,
        endTime,
        totalSpots: tpl.capacity,
        openSpots,
        waitlistCount: waitlist,
        isGoalieFree: Boolean(tpl.goalie),
        goalieSpots: tpl.goalie?.capacity ?? null,
        goaliesRegistered,
        cost: tpl.cost ?? null,
        bookingUrl: bookingUrlFor(facility, category, source),
        source,
        externalId: null,
        requirements,
        notes,
      });
    }
  }
  return out;
}

export function mockSessionsFor(facility: FacilitySeed, window: IngestWindow): NormalizedSession[] {
  if (facility.slug === "poirier") {
    return generatePoirierTimetable(window.from, window.to);
  }
  const tpls = MOCK_TEMPLATES[facility.slug] ?? [
    { title: "Public Skate", days: [6, 0], start: "13:30", minutes: 90, capacity: 150, cost: 7 },
    { title: "Stick & Puck", days: [2, 4], start: "12:00", minutes: 75, capacity: 20, cost: 8 },
    { title: "Adult Drop-in Hockey", days: [1, 3, 5], start: "21:30", minutes: 75, capacity: 22, cost: 9, goalie: { capacity: 2 } },
  ];
  return expand(facility, tpls, window, "mock");
}

export function publicSkateScheduleFor(facility: FacilitySeed, window: IngestWindow): NormalizedSession[] {
  if (facility.slug === "poirier") {
    return [];
  }
  const tpls = PUBLIC_SKATE_SCHEDULE[facility.slug] ?? [];
  return expand(facility, tpls, window, "schedule");
}
