/**
 * Target 3 — PerfectMind booking platform.
 *
 * Covers Richmond, Coquitlam, and Delta municipalities.
 * Queries the public BookMe4 calendar endpoints with polite rate-limiting.
 */
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE, type FacilitySeed } from "../domain";
import { cleanTitle, isGoalieListing, normalizeCategory, sessionKey } from "../normalize";
import { resolveBookingUrl } from "../links";
import { fetchJson } from "./http";
import type { IngestLogger, IngestWindow, NormalizedSession } from "./types";

interface PerfectMindClass {
  EventId: string;
  CourseIdTrimmed?: string;
  EventName: string;
  OccurrenceDate?: string; // e.g. "20261026"
  FormattedStartDate?: string; // e.g. "Mon, Oct 26th, 2026"
  FormattedStartTime?: string; // e.g. "09:00 AM"
  FormattedEndTime?: string; // e.g. "11:00 AM"
  EventTimeDescription?: string; // e.g. "09:00 am - 11:00 am"
  Spots?: string; // e.g. "20 spots left" or ""
  PriceRange?: string; // e.g. "$0.00 - $7.90"
  Facility?: string; // e.g. "Registered Visits - Coliseum"
  Location?: string; // e.g. "Richmond Ice Centre"
}

interface PerfectMindClassesResponse {
  classes?: PerfectMindClass[];
}

const perfectmindCache = new Map<string, Promise<PerfectMindClass[]>>();

export function resetPerfectMindCache() {
  perfectmindCache.clear();
}

async function fetchPerfectMindClasses(
  url: string,
  calendarId: string,
  log: IngestLogger,
  label: string,
): Promise<PerfectMindClass[]> {
  try {
    const data = await fetchJson<PerfectMindClassesResponse>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ calendarId }),
    });
    const classes = data.classes ?? [];
    log.info(`  perfectmind: ${label} → ${classes.length} raw activities`);
    return classes;
  } catch (err) {
    log.warn(`  perfectmind: failed to fetch ${label} (${(err as Error).message})`);
    return [];
  }
}

function getPerfectMindClassesCached(
  url: string,
  calendarId: string,
  log: IngestLogger,
  label: string,
) {
  const key = `${url}|${calendarId}`;
  if (!perfectmindCache.has(key)) {
    perfectmindCache.set(key, fetchPerfectMindClasses(url, calendarId, log, label));
  }
  return perfectmindCache.get(key)!;
}

function parseClock(s: string): [number, number] {
  const t = s.trim().toLowerCase();
  if (t === "noon") return [12, 0];
  if (t === "midnight") return [0, 0];
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!m) throw new Error(`Unparseable time "${s}"`);
  let h = Number(m[1]) % 12;
  if (m[3] === "pm") h += 12;
  return [h, Number(m[2] ?? 0)];
}

function parseOccurrenceYmd(c: PerfectMindClass): string | null {
  if (c.OccurrenceDate && c.OccurrenceDate.length === 8) {
    return `${c.OccurrenceDate.slice(0, 4)}-${c.OccurrenceDate.slice(4, 6)}-${c.OccurrenceDate.slice(6, 8)}`;
  }
  if (c.FormattedStartDate) {
    const sanitized = c.FormattedStartDate.replace(/(\d+)(st|nd|rd|th)/, "$1");
    const d = new Date(sanitized);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
    }
  }
  return null;
}

function parsePrice(range?: string): number | null {
  if (!range) return null;
  const matches = [...range.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)];
  if (!matches.length) return null;
  const nums = matches.map((m) => Number(m[1])).filter((n) => n > 0);
  return nums.length ? nums[0] : 0;
}

function parseSpots(s?: string): number {
  if (!s) return 20;
  const m = s.match(/(\d+)\s*spots?/i);
  return m ? Number(m[1]) : 20;
}

function matchesDeltaFacility(loc: string, slug: string): boolean {
  const l = loc.toLowerCase();
  switch (slug) {
    case "sungod":
      return l.includes("sungod");
    case "north-delta":
      return l.includes("north delta");
    case "south-delta":
      return l.includes("south delta");
    case "tilbury":
      return l.includes("tilbury");
    default:
      return false;
  }
}

export async function collectPerfectMind(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  let classes: PerfectMindClass[] = [];

  if (facility.municipality === "Richmond") {
    const calendarId =
      facility.slug === "richmond-ice-centre"
        ? "8bd697eb-ee1e-4067-b6bb-be1901a7753d"
        : "08c56c84-5ee7-4c81-9d52-d4cfc850aad7";
    const url =
      "https://richmondcity.perfectmind.com/23734/Clients/BookMe4BookingPages/Classes?widgetId=15f6af07-39c5-473e-b053-96653f77a406";
    classes = await getPerfectMindClassesCached(url, calendarId, log, `Richmond ${facility.shortName}`);
  } else if (facility.municipality === "Coquitlam") {
    const calendarId = "4f07c977-74de-46ab-9d0a-2397f83f254f";
    const url =
      "https://cityofcoquitlam.perfectmind.com/23902/Clients/BookMe4BookingPages/Classes?widgetId=15f6af07-39c5-473e-b053-96653f77a406";
    classes = await getPerfectMindClassesCached(url, calendarId, log, "Coquitlam Poirier");
  } else if (facility.municipality === "Delta") {
    const calendarId = "c9b7ca71-56dc-43e3-aec7-d976239a5660";
    const url =
      "https://cityofdelta.perfectmind.com/24140/Clients/BookMe4BookingPages/Classes?widgetId=0da93182-93fb-4314-87bd-a8ba4ee9a4c9";
    const allDelta = await getPerfectMindClassesCached(url, calendarId, log, "Delta All Arenas");
    classes = allDelta.filter((c) => matchesDeltaFacility(c.Location ?? "", facility.slug));
  }

  const sessions = new Map<string, NormalizedSession>();
  const goalieRows: { key: string; item: PerfectMindClass }[] = [];

  for (const c of classes) {
    const category = normalizeCategory(c.EventName);
    if (!category) continue;

    const ymd = parseOccurrenceYmd(c);
    if (!ymd) continue;

    let startStr = c.FormattedStartTime;
    let endStr = c.FormattedEndTime;
    if ((!startStr || !endStr) && c.EventTimeDescription) {
      const parts = c.EventTimeDescription.split(/\s+-\s+/);
      startStr = parts[0];
      endStr = parts[1];
    }
    if (!startStr || !endStr) continue;

    let startTime: Date;
    let endTime: Date;
    try {
      const [sh, sm] = parseClock(startStr);
      const [eh, em] = parseClock(endStr);
      startTime = fromZonedTime(`${ymd}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`, TIMEZONE);
      endTime = fromZonedTime(`${ymd}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`, TIMEZONE);
      if (endTime <= startTime) endTime = new Date(endTime.getTime() + 86_400_000);
    } catch {
      continue;
    }

    if (startTime < window.from || startTime >= window.to) continue;

    const key = sessionKey(facility.slug, startTime, category);
    if (isGoalieListing(c.EventName)) {
      goalieRows.push({ key, item: c });
      continue;
    }

    const spotsLeft = parseSpots(c.Spots);
    const cost = parsePrice(c.PriceRange);
    const bookingUrl = resolveBookingUrl({
      category,
      bookingPlatform: facility.bookingPlatform,
      facilitySlug: facility.slug,
      municipality: facility.municipality,
    });

    const rink = c.Facility?.replace(/^registered visits\s*-\s*/i, "").trim() || null;

    sessions.set(key, {
      facilitySlug: facility.slug,
      rawTitle: cleanTitle(c.EventName),
      category,
      rink,
      startTime,
      endTime,
      totalSpots: Math.max(spotsLeft, 25),
      openSpots: spotsLeft,
      waitlistCount: 0,
      isGoalieFree: false,
      goalieSpots: null,
      goaliesRegistered: null,
      cost,
      bookingUrl,
      source: "live",
      activityId: c.CourseIdTrimmed ? Number(c.CourseIdTrimmed) : null,
      externalId: c.EventId ? `perfectmind:${c.EventId}` : null,
    });
  }

  for (const { key, item } of goalieRows) {
    const parent = sessions.get(key);
    if (!parent) continue;
    const gSpots = parseSpots(item.Spots);
    parent.goalieSpots = gSpots;
    parent.goaliesRegistered = 0;
    parent.isGoalieFree = true;
  }

  return [...sessions.values()];
}
