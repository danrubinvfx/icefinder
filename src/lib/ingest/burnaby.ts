/**
 * City of Burnaby ActiveNet ingestion scraper module.
 *
 * Implements scraping of Burnaby recreation ice drop-in sessions from ActiveNet WebReg.
 * Ensures all sessions have proper center-scoped URLs (&center_ids=180, 147, 146)
 * to prevent stale browser session filter collisions.
 *
 * Bill Copeland public skate and drop-in ice sessions route directly to
 * ActiveNet schedule search locked to center ID 146.
 *
 * Day-of-week indexing strictly follows standard JavaScript `Date.prototype.getDay()`
 * evaluated in `America/Vancouver` (0 = Sunday, 1 = Monday, ..., 6 = Saturday):
 *   - Bill Copeland Leisure Skate (12:00 PM – 1:30 PM) runs on Monday (`dayOfWeek: 1`)
 *     and Wednesday (`dayOfWeek: 3`).
 *   - Bill Copeland has 0 public skate / walk-in sessions on Sunday (`dayOfWeek: 0`).
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE, type Category, type FacilitySeed } from "../domain";
import { IngestLogger, IngestWindow, NormalizedSession } from "./types";
import { collectActiveNet, resetActiveNetCache } from "./activenet";
import { getBurnabyPublicSkateUrl } from "../links";
import { sessionKey } from "../normalize";

export { collectActiveNet, resetActiveNetCache };
export const collectBurnaby = collectActiveNet;

export const BILL_COPELAND_PUBLIC_SKATE_SCHEDULE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=146&viewMode=list";
export const BURNABY_DAILY_ACTIVITIES_URL =
  "https://www.burnaby.ca/recreation-and-arts/activities-and-registration/daily-activities";

export interface RecurringSkateRule {
  title: string;
  category: Category;
  /** Standard JS getDay() in America/Vancouver: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat */
  dayOfWeek: number;
  start: string; // HH:mm in America/Vancouver
  end: string; // HH:mm in America/Vancouver
  capacity: number;
  cost: number;
}

/**
 * Verified Bill Copeland public skate recurring rules (0 = Sunday .. 6 = Saturday in America/Vancouver).
 * Note: Sunday (dayOfWeek: 0) has no public skate at Bill Copeland.
 */
export const BILL_COPELAND_PUBLIC_SKATE_RULES: RecurringSkateRule[] = [
  {
    title: "Leisure Skate",
    category: "public_skate",
    dayOfWeek: 1, // Monday (12:00 PM – 1:30 PM)
    start: "12:00",
    end: "13:30",
    capacity: 220,
    cost: 6.4,
  },
  {
    title: "Leisure Skate",
    category: "public_skate",
    dayOfWeek: 3, // Wednesday (12:00 PM – 1:30 PM)
    start: "12:00",
    end: "13:30",
    capacity: 220,
    cost: 6.4,
  },
  {
    title: "Everyone Welcome Skate",
    category: "public_skate",
    dayOfWeek: 6, // Saturday (7:30 PM – 9:30 PM)
    start: "19:30",
    end: "21:30",
    capacity: 250,
    cost: 6.4,
  },
];

function toVancouverYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

function getVancouverDayOfWeek(d: Date): number {
  return toZonedTime(d, TIMEZONE).getDay();
}

function getVancouverDayOfWeekFromYmd(ymd: string): number {
  const localNoon = fromZonedTime(`${ymd}T12:00:00`, TIMEZONE);
  return toZonedTime(localNoon, TIMEZONE).getDay();
}

export async function fetchBurnabySessions(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  const sessions = await collectActiveNet(facility, window, log);

  if (facility.slug !== "bill-copeland") {
    return sessions;
  }

  // Filter out any false Sunday (dayOfWeek === 0 in America/Vancouver) walk-in public skates for Bill Copeland
  const filtered = sessions
    .filter((s) => {
      if (s.category === "public_skate" && getVancouverDayOfWeek(s.startTime) === 0) {
        return false;
      }
      return true;
    })
    .map((s) => {
      if (s.category === "public_skate") {
        return {
          ...s,
          bookingUrl: getBurnabyPublicSkateUrl(facility.slug),
        };
      }
      return s;
    });

  const byKey = new Map<string, NormalizedSession>();
  const livePublicSkateDates = new Set<string>();
  for (const s of filtered) {
    byKey.set(sessionKey(s.facilitySlug, s.startTime, s.category), s);
    if (s.category === "public_skate" && s.source === "live") {
      livePublicSkateDates.add(toVancouverYmd(s.startTime));
    }
  }

  const localDays: string[] = [];
  for (let t = window.from.getTime() - 86_400_000; t < window.to.getTime() + 86_400_000; t += 86_400_000) {
    const ymd = toVancouverYmd(new Date(t));
    if (!localDays.includes(ymd)) localDays.push(ymd);
  }

  for (const ymd of localDays) {
    const dow = getVancouverDayOfWeekFromYmd(ymd);
    // Explicitly ensure Sunday (dow === 0) generates 0 walk-in sessions for Bill Copeland
    if (dow === 0 || livePublicSkateDates.has(ymd)) continue;

    for (const rule of BILL_COPELAND_PUBLIC_SKATE_RULES) {
      if (rule.dayOfWeek !== dow) continue;
      const startTime = fromZonedTime(`${ymd}T${rule.start}:00`, TIMEZONE);
      const endTime = fromZonedTime(`${ymd}T${rule.end}:00`, TIMEZONE);
      if (startTime < window.from || startTime >= window.to) continue;

      const key = sessionKey(facility.slug, startTime, rule.category);
      if (!byKey.has(key)) {
        byKey.set(key, {
          facilitySlug: facility.slug,
          rawTitle: rule.title,
          category: rule.category,
          rink: null,
          startTime,
          endTime,
          totalSpots: rule.capacity,
          openSpots: rule.capacity,
          waitlistCount: 0,
          isGoalieFree: false,
          goalieSpots: null,
          goaliesRegistered: null,
          cost: rule.cost,
          bookingUrl: getBurnabyPublicSkateUrl(facility.slug),
          source: "schedule",
          activityId: null,
          externalId: null,
          requirements: [],
          notes: null,
        });
      }
    }
  }

  return [...byKey.values()];
}
