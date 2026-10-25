/**
 * Target 2 — City of Vancouver (ActiveNet / ActiveCommunities).
 *
 * Vancouver operates 6 major rinks on ActiveNet: Britannia, Hillcrest, Kitsilano,
 * Trout Lake, Sunset, and Killarney.
 */
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE, type FacilitySeed } from "../domain";
import { cleanTitle, isGoalieListing, normalizeCategory, sessionKey } from "../normalize";
import {
  getVancouverDetailUrl,
  VANCOUVER_DROPIN_CALENDAR_URL,
} from "../links";
import { fetchJson } from "./http";
import type { IngestLogger, IngestWindow, NormalizedSession } from "./types";

const BASE = "https://anc.ca.apm.activecommunities.com/vancouver/rest/activities/list?locale=en-US";
const KEYWORDS = ["Skate", "Stick", "Hockey", "Shinny", "Figure"];
const PAGE_SIZE = 20;
const MAX_PAGES_PER_KEYWORD = 8;
const POLITE_FACILITY_COOLDOWN_MS = 1500;

interface VancouverActiveNetItem {
  id: number;
  name: string;
  location?: { label?: string };
  category?: string;
  date_range_start: string; // YYYY-MM-DD
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

const vancouverCache = new Map<string, Promise<VancouverActiveNetItem[]>>();

export function resetVancouverCache() {
  vancouverCache.clear();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchVancouverKeyword(keyword: string, window: IngestWindow, log: IngestLogger): Promise<VancouverActiveNetItem[]> {
  const items: VancouverActiveNetItem[] = [];
  const lastDay = toYmd(window.to);

  for (let page = 1; page <= MAX_PAGES_PER_KEYWORD; page++) {
    if (page > 1) {
      await sleep(POLITE_FACILITY_COOLDOWN_MS);
    }
    const data = await fetchJson<VancouverActiveNetResponse>(BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Origin: "https://anc.ca.apm.activecommunities.com",
        Referer: "https://anc.ca.apm.activecommunities.com/vancouver/activity/search",
        page_info: JSON.stringify({ order_by: "", page_number: page, total_records_per_page: PAGE_SIZE }),
      },
      body: JSON.stringify({
        activity_search_pattern: { activity_keyword: keyword },
        activity_transfer_pattern: {},
      }),
    });

    if (data.headers?.response_code !== "0000") {
      throw new Error(`Vancouver ActiveNet response_code=${data.headers?.response_code} for "${keyword}"`);
    }

    const batch = data.body?.activity_items ?? [];
    items.push(...batch);
    const totalPages = data.headers.page_info?.total_page ?? 1;
    const lastStart = batch.at(-1)?.date_range_start ?? "";
    if (page >= totalPages || batch.length === 0 || lastStart > lastDay) break;
  }

  log.info(`  vancouver activenet: "${keyword}" → ${items.length} raw activities`);
  return items;
}

function getVancouverKeyword(keyword: string, window: IngestWindow, log: IngestLogger) {
  if (!vancouverCache.has(keyword)) {
    vancouverCache.set(keyword, fetchVancouverKeyword(keyword, window, log));
  }
  return vancouverCache.get(keyword)!;
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

function parseCost(label?: string): number | null {
  const m = label?.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : null;
}

function matchesFacility(item: VancouverActiveNetItem, slug: string): boolean {
  const loc = (item.location?.label ?? "").toLowerCase();
  const name = item.name.toLowerCase();

  switch (slug) {
    case "britannia":
      return loc.includes("britannia") || name.includes("britannia");
    case "hillcrest":
      return loc.includes("hillcrest") || name.includes("hillcrest");
    case "kitsilano":
      return loc.includes("kitsilano") || name.includes("kitsilano");
    case "trout-lake":
      return loc.includes("trout lake") || name.includes("trout lake");
    case "sunset":
      return loc.includes("sunset") || name.includes("sunset");
    case "killarney":
      return loc.includes("killarney") || name.includes("killarney");
    default:
      return false;
  }
}

export async function collectVancouver(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  const all: VancouverActiveNetItem[] = [];
  for (const kw of KEYWORDS) {
    all.push(...(await getVancouverKeyword(kw, window, log)));
    await sleep(300);
  }

  const seenIds = new Set<number>();
  const sessions = new Map<string, NormalizedSession>();
  const goalieRows: { key: string; item: VancouverActiveNetItem }[] = [];

  for (const item of all) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    if (!matchesFacility(item, facility.slug) || !item.only_one_day) continue;

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
      goalieRows.push({ key, item });
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
    const directUrl = numericActivityId
      ? getVancouverDetailUrl(numericActivityId)
      : VANCOUVER_DROPIN_CALENDAR_URL;

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
    });
  }

  for (const { key, item } of goalieRows) {
    const parent = sessions.get(key);
    if (!parent) continue;
    parent.goalieSpots = item.total_open;
    parent.goaliesRegistered = item.already_enrolled;
    const goalieCost = parseCost(item.fee?.label);
    parent.isGoalieFree = goalieCost === null || goalieCost === 0 || (parent.cost !== null && goalieCost < parent.cost);
  }

  // Ensure Killarney Sunday Public Skate defaults to 2:15 PM – 3:45 PM (14:15 – 15:45)
  // while allowing any live Park Board calendar/activity payload entry for that date to override with its true parsed start/end times.
  if (facility.slug === "killarney") {
    const livePublicSkateDates = new Set<string>();
    for (const s of sessions.values()) {
      if (s.category === "public_skate") {
        livePublicSkateDates.add(toYmd(s.startTime));
      }
    }

    for (let t = window.from.getTime() - 86_400_000; t < window.to.getTime() + 86_400_000; t += 86_400_000) {
      const ymd = toYmd(new Date(t));
      const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay();
      if (dow !== 0 || livePublicSkateDates.has(ymd)) continue;
      const startTime = localToUtc(ymd, [14, 15]);
      const endTime = localToUtc(ymd, [15, 45]);
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
          totalSpots: 200,
          openSpots: 200,
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
