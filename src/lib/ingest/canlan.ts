/**
 * Target 2 — Canlan Sports / Scotia Barn (Burnaby 8 Rinks).
 *
 * Canlan's public online schedule is powered by DaySmart "Dash". Its JSON:API endpoint
 * exposes published drop-in events (Shinny, Stick & Puck, figure Open Sessions) with
 * live roster counts via the `summary` include and the rink via the `resource` include.
 */
import { TIMEZONE, type FacilitySeed } from "../domain";
import {
  cleanTitle,
  extractSessionRequirements,
  isGoalieListing,
  normalizeCategory,
  sanitizeSessionNotes,
  sessionKey,
} from "../normalize";
import { CANLAN_PROGRAMS_FALLBACK } from "../links";
import { fetchJson } from "./http";
import type { IngestLogger, IngestWindow, NormalizedSession } from "./types";

const BASE = "https://apps.daysmartrecreation.com/dash/jsonapi/api/v1/events";
const COMPANY = "canlan";
/** DaySmart event types: 12 Shinny, 13 Stick and Puck, 56 Drop-In. */
const EVENT_TYPES = "12,13,56";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

interface DashEvent {
  id: string;
  attributes: {
    desc: string;
    start_gmt: string; // "2026-10-22T17:00:00" (UTC, no suffix)
    end_gmt: string;
    resource_id: number;
    publish: boolean;
    description: string | null;
    notice: string | null;
  };
}
interface DashSummary {
  type: "event-summaries";
  id: string;
  attributes: {
    composite_capacity: number;
    open_slots: number;
    remaining_registration_slots: number;
    registered_count: number;
    registration_status: string; // 'open' | 'closed' | 'full' | 'invite-only' ...
  };
}
interface DashResource {
  type: "resources";
  id: string;
  attributes: { name: string };
}
interface DashResponse {
  meta: { page: { "last-page": number; total: number } };
  data: DashEvent[];
  included?: (DashSummary | DashResource)[];
}

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });

export function canlanBookingUrl(eventId?: string | null) {
  if (!eventId) return CANLAN_PROGRAMS_FALLBACK;
  return `https://apps.daysmartrecreation.com/dash/x/#/online/${COMPANY}/event/${eventId}`;
}

export async function collectCanlan(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  if (!facility.daysmartFacilityId) throw new Error(`No DaySmart facility id for ${facility.slug}`);

  const events: DashEvent[] = [];
  const summaries = new Map<string, DashSummary["attributes"]>();
  const resources = new Map<string, string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      company: COMPANY,
      sort: "start",
      include: "summary,resource",
      "page[size]": String(PAGE_SIZE),
      "page[number]": String(page),
      "filter[start_date__gte]": ymd(new Date(window.from.getTime() - 86_400_000)),
      "filter[start_date__lte]": ymd(window.to),
      "filter[resource.facility_id]": String(facility.daysmartFacilityId),
      "filter[event_type_id__in]": EVENT_TYPES,
      "filter[publish]": "true",
    });
    const data = await fetchJson<DashResponse>(`${BASE}?${params}`, {
      headers: { Origin: "https://apps.daysmartrecreation.com", Referer: "https://apps.daysmartrecreation.com/dash/x/" },
    });
    events.push(...data.data);
    for (const inc of data.included ?? []) {
      if (inc.type === "event-summaries") summaries.set(inc.id, inc.attributes);
      if (inc.type === "resources") resources.set(inc.id, inc.attributes.name);
    }
    if (page >= (data.meta?.page?.["last-page"] ?? 1)) break;
  }
  log.info(`  canlan: ${events.length} raw published drop-in events`);

  const sessions = new Map<string, NormalizedSession>();
  const goalieEvents: { key: string; ev: DashEvent; s: DashSummary["attributes"] }[] = [];

  for (const ev of events) {
    const a = ev.attributes;
    if (!a.publish) continue;
    const category = normalizeCategory(a.desc);
    if (!category) continue;
    const s = summaries.get(ev.id);
    if (!s || s.registration_status === "invite-only" || s.composite_capacity <= 0) continue;

    const startTime = new Date(`${a.start_gmt}Z`);
    const endTime = new Date(`${a.end_gmt}Z`);
    if (startTime < window.from || startTime >= window.to) continue;

    const key = sessionKey(facility.slug, startTime, category);
    if (isGoalieListing(a.desc)) {
      goalieEvents.push({ key, ev, s });
      continue;
    }

    const total = s.composite_capacity;
    const open = Math.max(0, s.open_slots >= 0 ? s.open_slots : s.remaining_registration_slots);
    const text = `${a.desc} ${a.description ?? ""} ${a.notice ?? ""}`;
    const goalieFree = /goalies?\s+(are\s+)?(free|skate free|no charge)|free\s+(for\s+)?goalies?/i.test(text);

    const existing = sessions.get(key);
    if (existing) {
      // Same activity on two sheets at the same time — combine capacity, list both rinks.
      existing.totalSpots += total;
      existing.openSpots += open;
      const rink = resources.get(String(a.resource_id));
      if (rink && existing.rink && !existing.rink.includes(rink)) existing.rink += ` + ${rink.replace(/^Rink\s*/i, "")}`;
      continue;
    }
    const rawDesc = [a.description, a.notice].filter(Boolean).join("\n");
    const notes = sanitizeSessionNotes(rawDesc || null);
    const requirements = extractSessionRequirements(rawDesc || null, a.desc);

    sessions.set(key, {
      facilitySlug: facility.slug,
      rawTitle: cleanTitle(a.desc),
      category,
      rink: resources.get(String(a.resource_id)) ?? null,
      startTime,
      endTime,
      totalSpots: total,
      openSpots: open,
      waitlistCount: 0, // DaySmart's public summary does not expose waitlist depth.
      isGoalieFree: goalieFree,
      goalieSpots: null,
      goaliesRegistered: null,
      cost: null, // Canlan fees are behind the authenticated cart; null per spec when unavailable.
      bookingUrl: canlanBookingUrl(ev.id),
      source: "live",
      activityId: Number(ev.id) || null,
      externalId: `daysmart:${ev.id}`,
      requirements,
      notes,
    });
  }

  for (const { key, s } of goalieEvents) {
    const parent = sessions.get(key);
    if (!parent) continue;
    parent.goalieSpots = s.composite_capacity;
    parent.goaliesRegistered = s.registered_count;
    parent.isGoalieFree = true;
  }

  return [...sessions.values()];
}
