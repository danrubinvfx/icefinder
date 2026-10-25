/**
 * Target 2 — City of Vancouver (ActiveNet / ActiveCommunities).
 *
 * Vancouver operates 6 major rinks on ActiveNet: Britannia, Hillcrest, Kitsilano,
 * Trout Lake, Sunset, and Killarney.
 *
 * Combines:
 *   1. Live Park Board Drop-In Calendar API (`onlinecalendar/multicenter/events`, calendar_id=3)
 *      for exact live start/end timestamps, descriptions, fees, and recurring drop-ins
 *      (e.g. `|Public Skate|`, `|Family Fun Hockey|`, `|Adult Skate|`, `|Discount Public Skate|`).
 *   2. ActiveNet Activity Search API (`activities/list` scoped by `center_ids`)
 *      for real-time `total_open` / `already_enrolled` roster capacities and goalie slots.
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE, type FacilitySeed } from "../domain";
import {
  cleanTitle,
  extractSessionRequirements,
  isGoalieListing,
  normalizeCategory,
  sanitizeSessionNotes,
  sessionKey,
} from "../normalize";
import {
  getVancouverCenterId,
  getVancouverDetailUrl,
  getVancouverFallbackUrl,
  VANCOUVER_CENTER_IDS,
  VANCOUVER_DROPIN_CALENDAR_URL,
} from "../links";
import { fetchJson } from "./http";
import type { IngestLogger, IngestWindow, NormalizedSession } from "./types";

const LIST_BASE = "https://anc.ca.apm.activecommunities.com/vancouver/rest/activities/list?locale=en-US";
const CALENDAR_BASE =
  "https://anc.ca.apm.activecommunities.com/vancouver/rest/onlinecalendar/multicenter/events?locale=en-US";
const DROPIN_SKATING_CALENDAR_ID = 3;
const PAGE_SIZE = 20;
const MAX_PAGES_PER_CENTER = 8;
const POLITE_FACILITY_COOLDOWN_MS = 1200;

interface VancouverActiveNetItem {
  id: number;
  name: string;
  desc?: string;
  description?: string;
  notes?: string;
  location?: { label?: string };
  category?: string;
  date_range_start: string; // YYYY-MM-DD
  date_range_end?: string; // YYYY-MM-DD
  days_of_week?: string;
  time_range: string; // "11:30 AM - 1:00 PM"
  only_one_day: boolean;
  total_open: number;
  already_enrolled: number;
  fee?: { label?: string };
  urgent_message?: { status_description?: string | null };
}

interface VancouverActiveNetResponse {
  headers: { response_code: string; page_info: { total_page: number; page_number: number } };
  body: { activity_items: VancouverActiveNetItem[] };
}

interface VancouverCalendarPriceDetail {
  price?: string;
  description?: string;
}

interface VancouverCalendarEvent {
  title: string;
  start_time: string; // "2026-10-25 14:15:00" (local America/Vancouver)
  end_time: string; // "2026-10-25 15:45:00" (local America/Vancouver)
  description?: string | null;
  event_item_id?: number | null;
  activity_detail_url?: string | null;
  price?: {
    estimate_price?: string | null;
    prices?: { details?: VancouverCalendarPriceDetail[] }[];
  } | null;
}

interface VancouverCalendarCenterEvents {
  center_id: number;
  center_name: string;
  events: VancouverCalendarEvent[];
}

interface VancouverCalendarResponse {
  headers: { response_code: string };
  body: { center_events: VancouverCalendarCenterEvents[] };
}

const centerListCache = new Map<number, Promise<VancouverActiveNetItem[]>>();
let calendarCache: Promise<Map<number, VancouverCalendarEvent[]>> | null = null;

export function resetVancouverCache() {
  centerListCache.clear();
  calendarCache = null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchVancouverCenterActivities(
  centerId: number,
  slug: string,
  log: IngestLogger,
): Promise<VancouverActiveNetItem[]> {
  const items: VancouverActiveNetItem[] = [];

  for (let page = 1; page <= MAX_PAGES_PER_CENTER; page++) {
    if (page > 1) {
      await sleep(POLITE_FACILITY_COOLDOWN_MS);
    }
    const data = await fetchJson<VancouverActiveNetResponse>(LIST_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Origin: "https://anc.ca.apm.activecommunities.com",
        Referer: "https://anc.ca.apm.activecommunities.com/vancouver/activity/search",
        page_info: JSON.stringify({ order_by: "", page_number: page, total_records_per_page: PAGE_SIZE }),
      },
      body: JSON.stringify({
        activity_search_pattern: { center_ids: [centerId] },
        activity_transfer_pattern: {},
      }),
    });

    if (data.headers?.response_code !== "0000") {
      throw new Error(`Vancouver ActiveNet response_code=${data.headers?.response_code} for center_id=${centerId}`);
    }

    const batch = data.body?.activity_items ?? [];
    items.push(...batch);
    const totalPages = data.headers.page_info?.total_page ?? 1;
    if (page >= totalPages || batch.length === 0) break;
  }

  log.info(`  vancouver activenet [center_id=${centerId} ${slug}]: ${items.length} raw activities`);
  return items;
}

function getVancouverCenterActivities(centerId: number, slug: string, log: IngestLogger) {
  if (!centerListCache.has(centerId)) {
    centerListCache.set(centerId, fetchVancouverCenterActivities(centerId, slug, log));
  }
  return centerListCache.get(centerId)!;
}

async function fetchAllVancouverCalendarEvents(
  window: IngestWindow,
  log: IngestLogger,
): Promise<Map<number, VancouverCalendarEvent[]>> {
  const centerIds = Object.values(VANCOUVER_CENTER_IDS);
  const startDate = toYmd(new Date(window.from.getTime() - 86_400_000));
  const endDate = toYmd(new Date(window.to.getTime() + 86_400_000));

  try {
    const data = await fetchJson<VancouverCalendarResponse>(CALENDAR_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Origin: "https://anc.ca.apm.activecommunities.com",
        Referer: VANCOUVER_DROPIN_CALENDAR_URL,
      },
      body: JSON.stringify({
        calendar_id: DROPIN_SKATING_CALENDAR_ID,
        center_ids: centerIds,
        start_date: startDate,
        end_date: endDate,
      }),
    });

    const map = new Map<number, VancouverCalendarEvent[]>();
    for (const c of data.body?.center_events ?? []) {
      map.set(c.center_id, c.events ?? []);
    }
    log.info(`  vancouver calendar api: fetched live events for ${map.size} park board rinks`);
    return map;
  } catch (err) {
    log.warn(`  vancouver calendar api failed (${(err as Error).message})`);
    return new Map();
  }
}

function getVancouverCalendarEvents(window: IngestWindow, log: IngestLogger) {
  if (!calendarCache) {
    calendarCache = fetchAllVancouverCalendarEvents(window, log);
  }
  return calendarCache;
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

function toYmd(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

function localToUtc(ymd: string, [h, m]: [number, number]) {
  return fromZonedTime(`${ymd}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`, TIMEZONE);
}

/**
 * Parse a Park Board calendar timestamp ("YYYY-MM-DD HH:mm:ss" in America/Vancouver) into a UTC Date.
 */
function parseCalendarTimestamp(ts: string): Date | null {
  const trimmed = ts.trim();
  if (!/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return null;
  const isoLocal = trimmed.replace(/\s+/, "T");
  const d = fromZonedTime(isoLocal, TIMEZONE);
  return isNaN(d.getTime()) ? null : d;
}

function parseCost(label?: string | null): number | null {
  if (!label) return null;
  const m = label.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : null;
}

function parseCalendarEventCost(ev: VancouverCalendarEvent): number | null {
  const est = parseCost(ev.price?.estimate_price);
  if (est !== null) return est;
  for (const group of ev.price?.prices ?? []) {
    for (const det of group.details ?? []) {
      const p = parseCost(det.price);
      if (p !== null) return p;
    }
  }
  return null;
}

function resolveVancouverBookingUrl(
  facilitySlug: string,
  category: NormalizedSession["category"],
  activityId: number | null,
): string {
  if (category === "public_skate") {
    return VANCOUVER_DROPIN_CALENDAR_URL;
  }
  if (activityId) {
    return getVancouverDetailUrl(activityId, facilitySlug);
  }
  return getVancouverFallbackUrl(category, facilitySlug);
}

export async function collectVancouver(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  const centerId = getVancouverCenterId(facility.slug);
  const [listItems, calendarMap] = await Promise.all([
    centerId ? getVancouverCenterActivities(centerId, facility.slug, log) : Promise.resolve([]),
    getVancouverCalendarEvents(window, log),
  ]);
  const calendarEvents = centerId ? (calendarMap.get(centerId) ?? []) : [];

  const byActivityId = new Map<number, VancouverActiveNetItem>();
  for (const item of listItems) {
    if (typeof item.id === "number") {
      byActivityId.set(item.id, item);
    }
  }

  const seenIds = new Set<number>();
  const sessions = new Map<string, NormalizedSession>();
  const goalieRows: {
    key: string;
    totalOpen: number;
    enrolled: number;
    cost: number | null;
  }[] = [];

  // 1. Process single-day reservable sessions from ActiveNet `activities/list` (live roster counts)
  for (const item of listItems) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    if (!item.only_one_day) continue;

    const category = normalizeCategory(item.name);
    if (!category) continue;

    const [startStr, endStr] = (item.time_range ?? "").split(/\s+-\s+/);
    if (!startStr || !endStr) continue;

    let startTime: Date;
    let endTime: Date;
    try {
      startTime = localToUtc(item.date_range_start, parseClock(startStr));
      endTime = localToUtc(item.date_range_start, parseClock(endStr));
      if (endTime <= startTime) endTime = new Date(endTime.getTime() + 86_400_000);
    } catch {
      continue;
    }

    if (startTime < window.from || startTime >= window.to) continue;

    const key = sessionKey(facility.slug, startTime, category);
    if (isGoalieListing(item.name)) {
      goalieRows.push({
        key,
        totalOpen: Math.max(0, item.total_open ?? 0),
        enrolled: Math.max(0, item.already_enrolled ?? 0),
        cost: parseCost(item.fee?.label),
      });
      continue;
    }

    const total = Math.max(0, item.total_open ?? 0);
    const enrolled = Math.max(0, item.already_enrolled ?? 0);
    const status = item.urgent_message?.status_description ?? "";
    const waitlistMatch = status.match(/waitlist\D*(\d+)/i);

    const existing = sessions.get(key);
    if (existing) {
      existing.totalSpots += total;
      existing.openSpots += Math.max(0, total - enrolled);
      continue;
    }

    const numericActivityId = typeof item.id === "number" ? item.id : Number(item.id) || null;
    const directUrl = resolveVancouverBookingUrl(facility.slug, category, numericActivityId);

    const rawDesc = item.desc ?? item.description ?? item.notes ?? null;
    const notes = sanitizeSessionNotes(rawDesc);
    const requirements = extractSessionRequirements(rawDesc, item.name);

    sessions.set(key, {
      facilitySlug: facility.slug,
      rawTitle: cleanTitle(item.name),
      category,
      rink: null,
      startTime,
      endTime,
      totalSpots: total || 25,
      openSpots: Math.max(0, total - enrolled),
      waitlistCount: waitlistMatch ? Number(waitlistMatch[1]) : 0,
      isGoalieFree: false,
      goalieSpots: null,
      goaliesRegistered: null,
      cost: parseCost(item.fee?.label),
      bookingUrl: directUrl,
      source: "live",
      activityId: numericActivityId,
      externalId: numericActivityId ? `activenet:${numericActivityId}` : null,
      requirements,
      notes,
    });
  }

  // 2. Process live Park Board Calendar API events (`onlinecalendar/multicenter/events`).
  //    Parses live start_time and end_time directly from the Park Board calendar payload
  //    to override fallback template hours and capture recurring drop-ins (`|Public Skate|`, `|Family Fun Hockey|`, etc.).
  for (const ev of calendarEvents) {
    const category = normalizeCategory(ev.title);
    if (!category) continue;

    const startTime = parseCalendarTimestamp(ev.start_time);
    let endTime = parseCalendarTimestamp(ev.end_time);
    if (!startTime || !endTime) continue;
    if (endTime <= startTime) endTime = new Date(endTime.getTime() + 86_400_000);
    if (startTime < window.from || startTime >= window.to) continue;

    const key = sessionKey(facility.slug, startTime, category);
    const numericActivityId =
      typeof ev.event_item_id === "number" ? ev.event_item_id : Number(ev.event_item_id) || null;
    const matchedItem = numericActivityId ? byActivityId.get(numericActivityId) : undefined;
    const calCost = parseCalendarEventCost(ev);

    if (isGoalieListing(ev.title)) {
      if (!goalieRows.some((g) => g.key === key)) {
        goalieRows.push({
          key,
          totalOpen: Math.max(0, matchedItem?.total_open ?? 2),
          enrolled: Math.max(0, matchedItem?.already_enrolled ?? 0),
          cost: calCost,
        });
      }
      continue;
    }

    const calNotes = sanitizeSessionNotes(ev.description ?? null);
    const calReqs = extractSessionRequirements(ev.description ?? null, ev.title);

    const existing = sessions.get(key);
    if (existing) {
      // Enrich existing session from calendar payload & enforce live calendar start/end timestamps
      existing.startTime = startTime;
      existing.endTime = endTime;
      if (existing.cost === null && calCost !== null) {
        existing.cost = calCost;
      }
      if (!existing.notes && calNotes) {
        existing.notes = calNotes;
      }
      if (calReqs.length > 0) {
        existing.requirements = Array.from(new Set([...(existing.requirements ?? []), ...calReqs]));
      }
      existing.bookingUrl = resolveVancouverBookingUrl(
        facility.slug,
        existing.category,
        existing.activityId ?? numericActivityId,
      );
      continue;
    }

    const total = Math.max(
      0,
      matchedItem?.total_open ?? (category === "public_skate" ? 180 : 25),
    );
    const enrolled = Math.max(0, matchedItem?.already_enrolled ?? 0);
    const directUrl = resolveVancouverBookingUrl(facility.slug, category, numericActivityId);

    sessions.set(key, {
      facilitySlug: facility.slug,
      rawTitle: cleanTitle(ev.title),
      category,
      rink: null,
      startTime,
      endTime,
      totalSpots: total || 25,
      openSpots: Math.max(0, total - enrolled),
      waitlistCount: 0,
      isGoalieFree: false,
      goalieSpots: null,
      goaliesRegistered: null,
      cost: calCost ?? (category === "public_skate" ? 7.2 : null),
      bookingUrl: directUrl,
      source: "live",
      activityId: numericActivityId,
      externalId: numericActivityId ? `activenet:${numericActivityId}` : null,
      requirements: calReqs,
      notes: calNotes,
    });
  }

  for (const g of goalieRows) {
    const parent = sessions.get(g.key);
    if (!parent) continue;
    parent.goalieSpots = g.totalOpen;
    parent.goaliesRegistered = g.enrolled;
    parent.isGoalieFree =
      g.cost === null || g.cost === 0 || (parent.cost !== null && g.cost < parent.cost);
  }

  // Fallback Sunday Public Skate schedule for Britannia (2:15 PM – 3:30 PM) and Killarney (2:15 PM – 3:45 PM)
  // when no live Park Board calendar entry is present for that Sunday date.
  if (facility.slug === "britannia" || facility.slug === "killarney") {
    const livePublicSkateDates = new Set<string>();
    for (const s of sessions.values()) {
      if (s.category === "public_skate") {
        livePublicSkateDates.add(toYmd(s.startTime));
      }
    }

    const endClock: [number, number] = facility.slug === "britannia" ? [15, 30] : [15, 45];
    const defaultCap = facility.slug === "britannia" ? 180 : 200;

    for (let t = window.from.getTime() - 86_400_000; t < window.to.getTime() + 86_400_000; t += 86_400_000) {
      const ymd = toYmd(new Date(t));
      const dow = toZonedTime(fromZonedTime(`${ymd}T12:00:00`, TIMEZONE), TIMEZONE).getDay();
      if (dow !== 0 || livePublicSkateDates.has(ymd)) continue;
      const startTime = localToUtc(ymd, [14, 15]);
      const endTime = localToUtc(ymd, endClock);
      if (startTime < window.from || startTime >= window.to) continue;
      const key = sessionKey(facility.slug, startTime, "public_skate");
      if (!sessions.has(key)) {
        sessions.set(key, {
          facilitySlug: facility.slug,
          rawTitle: "Public Skate",
          category: "public_skate",
          rink: null,
          startTime,
          endTime,
          totalSpots: defaultCap,
          openSpots: defaultCap,
          waitlistCount: 0,
          isGoalieFree: false,
          goalieSpots: null,
          goaliesRegistered: null,
          cost: 7.2,
          bookingUrl: VANCOUVER_DROPIN_CALENDAR_URL,
          source: "schedule",
          activityId: null,
          externalId: null,
        });
      }
    }
  }

  return [...sessions.values()];
}
