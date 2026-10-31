/**
 * ActiveNet / ActiveCommunities Ingestion Runner.
 *
 * Covers Burnaby, West Vancouver, and New Westminster municipal booking platforms.
 * Goalie rosters are listed as separate "(GOALIE)" activities at the same slot; we merge them
 * into their parent session so the UI can show goalie availability.
 */
import { fromZonedTime } from "date-fns-tz";
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
  resolveBookingUrl,
  getBurnabyDetailUrl,
  getBurnabyFallbackUrl,
  getBurnabyPublicSkateUrl,
  getWestVancouverUrl,
  getNewWestminsterUrl,
} from "../links";
import { fetchJson } from "./http";
import type { IngestLogger, IngestWindow, NormalizedSession } from "./types";

/** Keyword searches that cover ice drop-in types published on ActiveNet. */
const KEYWORDS = ["Recreational Hockey", "Shoot", "Figure Skating", "Stick", "Shinny", "Skate"];
const PAGE_SIZE = 20; // ActiveNet caps pages at 20 records
const MAX_PAGES_PER_KEYWORD = 12;
export const POLITE_FACILITY_COOLDOWN_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ActiveNetItem {
  id: number;
  name: string;
  desc?: string;
  description?: string;
  notes?: string;
  site?: string;
  location?: { label?: string };
  category?: string;
  date_range_start: string; // YYYY-MM-DD
  time_range: string; // "11:30 AM - 12:45 PM" | "Noon - 1:15 PM"
  only_one_day: boolean;
  total_open: number; // capacity
  already_enrolled: number;
  detail_url?: string;
  fee?: { label?: string };
  urgent_message?: { status_description?: string | null };
}

interface ActiveNetResponse {
  headers: { response_code: string; page_info: { total_page: number; page_number: number } };
  body: { activity_items: ActiveNetItem[] };
}

/** Per-run cache so each keyword is fetched once per municipality and shared across rinks. */
const keywordCache = new Map<string, Promise<ActiveNetItem[]>>();

export function resetActiveNetCache() {
  keywordCache.clear();
}

function getActiveNetEndpoints(municipality: string): {
  primaryUrl: string;
  fallbackUrl?: string;
  referer: string;
  tenant: string;
} {
  if (municipality === "West Vancouver") {
    return {
      primaryUrl: "https://anc.ca.apm.activecommunities.com/westvanrec/rest/activities/list?locale=en-US",
      fallbackUrl: "https://anc.ca.apm.activecommunities.com/westvancouver/rest/activities/list?locale=en-US",
      referer: "https://anc.ca.apm.activecommunities.com/westvanrec/activity/search",
      tenant: "westvancouver",
    };
  }
  if (municipality === "New Westminster") {
    return {
      primaryUrl: "https://anc.ca.apm.activecommunities.com/newwestminster/rest/activities/list?locale=en-US",
      referer: "https://anc.ca.apm.activecommunities.com/newwestminster/activity/search",
      tenant: "newwestminster",
    };
  }
  return {
    primaryUrl: "https://anc.ca.apm.activecommunities.com/burnaby/rest/activities/list?locale=en-US",
    referer: "https://anc.ca.apm.activecommunities.com/burnaby/activity/search",
    tenant: "burnaby",
  };
}

async function fetchKeywordPage(
  url: string,
  referer: string,
  keyword: string,
  page: number,
): Promise<ActiveNetResponse> {
  return fetchJson<ActiveNetResponse>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      Origin: "https://anc.ca.apm.activecommunities.com",
      Referer: referer,
      page_info: JSON.stringify({ order_by: "", page_number: page, total_records_per_page: PAGE_SIZE }),
    },
    body: JSON.stringify({
      activity_search_pattern: { activity_select_param: 2, activity_keyword: keyword },
      activity_transfer_pattern: {},
    }),
  });
}

async function fetchKeyword(
  municipality: string,
  keyword: string,
  window: IngestWindow,
  log: IngestLogger,
): Promise<ActiveNetItem[]> {
  const config = getActiveNetEndpoints(municipality);
  const items: ActiveNetItem[] = [];
  const lastDay = toYmd(window.to);

  try {
    let targetUrl = config.primaryUrl;
    for (let page = 1; page <= MAX_PAGES_PER_KEYWORD; page++) {
      if (page > 1) {
        await sleep(POLITE_FACILITY_COOLDOWN_MS);
      }

      let data: ActiveNetResponse;
      try {
        data = await fetchKeywordPage(targetUrl, config.referer, keyword, page);
      } catch (reqErr) {
        if (config.fallbackUrl && targetUrl !== config.fallbackUrl) {
          targetUrl = config.fallbackUrl;
          data = await fetchKeywordPage(targetUrl, config.referer, keyword, page);
        } else {
          throw reqErr;
        }
      }

      if (data.headers?.response_code !== "0000") {
        throw new Error(`ActiveNet response_code=${data.headers?.response_code} for "${keyword}"`);
      }
      const batch = data.body?.activity_items ?? [];
      items.push(...batch);
      const totalPages = data.headers.page_info?.total_page ?? 1;
      const lastStart = batch.at(-1)?.date_range_start ?? "";
      if (page >= totalPages || batch.length === 0 || (lastStart && lastStart > lastDay)) break;
    }
    log.info(`  activenet [${config.tenant}]: "${keyword}" → ${items.length} raw activities`);
  } catch (err) {
    log.warn(`  activenet [${config.tenant}]: sweep notice for "${keyword}" (${(err as Error).message})`);
  }
  return items;
}

function getKeyword(
  municipality: string,
  keyword: string,
  window: IngestWindow,
  log: IngestLogger,
) {
  const cacheKey = `${municipality}|${keyword}`;
  if (!keywordCache.has(cacheKey)) {
    keywordCache.set(cacheKey, fetchKeyword(municipality, keyword, window, log));
  }
  return keywordCache.get(cacheKey)!;
}

/** Parse "11:30 AM", "Noon", "Midnight" → [h, m] (24h). */
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
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE }); // YYYY-MM-DD
}

function localToUtc(ymd: string, [h, m]: [number, number]) {
  return fromZonedTime(`${ymd}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`, TIMEZONE);
}

function parseCost(label?: string): number | null {
  const m = label?.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : null;
}

export async function collectActiveNet(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  // Fetch keywords sequentially (polite), sharing results across rinks via the cache.
  const all: ActiveNetItem[] = [];
  try {
    for (const kw of KEYWORDS) {
      const items = await getKeyword(facility.municipality, kw, window, log);
      all.push(...items);
    }
  } catch (err) {
    log.warn(`  activenet: error collecting keywords for ${facility.slug} (${(err as Error).message})`);
  }

  const seenIds = new Set<number>();
  const sessions = new Map<string, NormalizedSession>();
  const goalieRows: { key: string; item: ActiveNetItem }[] = [];

  for (const item of all) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    // Site / Location matching
    const itemSite = (item.site || item.location?.label || "").toLowerCase();
    const targetSite = (facility.activenetSite ?? "").toLowerCase();
    const siteMatches =
      !targetSite ||
      itemSite.includes(targetSite) ||
      targetSite.includes(itemSite) ||
      (facility.slug === "west-vancouver-arena" && (itemSite.includes("ice") || itemSite.includes("arena"))) ||
      (facility.slug === "moody-park" && (itemSite.includes("moody") || itemSite.includes("arena")));

    if (!siteMatches) continue;

    const category = normalizeCategory(item.name);
    if (!category) continue;

    if (!item.time_range) continue;
    const [startStr, endStr] = item.time_range.split(/\s+-\s+/);
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
      // Two listings for the same slot (e.g. two rinks) — fold capacity together.
      existing.totalSpots += total;
      existing.openSpots += Math.max(0, total - enrolled);
      continue;
    }

    const numericActivityId = typeof item.id === "number" ? item.id : Number(item.id) || null;
    const directUrl =
      facility.municipality === "Burnaby"
        ? category === "public_skate"
          ? getBurnabyPublicSkateUrl(facility.slug)
          : numericActivityId
          ? getBurnabyDetailUrl(numericActivityId)
          : getBurnabyFallbackUrl(category, facility.slug)
        : facility.municipality === "West Vancouver"
        ? getWestVancouverUrl(numericActivityId)
        : facility.municipality === "New Westminster"
        ? getNewWestminsterUrl(numericActivityId)
        : resolveBookingUrl({
            category,
            bookingPlatform: facility.bookingPlatform,
            activityId: numericActivityId,
            facilitySlug: facility.slug,
            municipality: facility.municipality,
            source: "live",
          });

    const rawDesc = item.desc ?? item.description ?? item.notes ?? null;
    const notes = sanitizeSessionNotes(rawDesc);
    const requirements = extractSessionRequirements(rawDesc, item.name);

    sessions.set(key, {
      facilitySlug: facility.slug,
      rawTitle: cleanTitle(item.name),
      category,
      rink: item.site || item.location?.label || null,
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

  // Merge goalie rosters into parent sessions
  for (const { key, item } of goalieRows) {
    const parent = sessions.get(key);
    if (!parent) continue;
    parent.goalieSpots = item.total_open;
    parent.goaliesRegistered = item.already_enrolled;
    const goalieCost = parseCost(item.fee?.label);
    parent.isGoalieFree = goalieCost === null || goalieCost === 0 || (parent.cost !== null && goalieCost < parent.cost);
  }

  return [...sessions.values()];
}
