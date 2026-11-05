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
import { extractSessionRequirements, sessionKey } from "../normalize";

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
  requirements?: string[];
  is_walkin?: boolean;
  notes?: string | null;
}

/**
 * Verified Bill Copeland public skate recurring rules (0 = Sunday .. 6 = Saturday in America/Vancouver).
 * Note: Sunday (dayOfWeek: 0) has no public skate at Bill Copeland.
 */
export const BILL_COPELAND_PUBLIC_SKATE_RULES: RecurringSkateRule[] = [
  {
    title: "Lap Skate",
    category: "public_skate",
    dayOfWeek: 1, // Monday (9:30 AM – 11:30 AM)
    start: "09:30",
    end: "11:30",
    capacity: 220,
    cost: 6.4,
    requirements: ["Lap Skate / Conditioning"],
    is_walkin: true,
    notes: "8 yrs+, Walk-in",
  },
  {
    title: "Toonie Skate",
    category: "public_skate",
    dayOfWeek: 1, // Monday (11:45 AM – 1:15 PM)
    start: "11:45",
    end: "13:15",
    capacity: 250,
    cost: 2.0,
    requirements: [],
    is_walkin: true,
    notes: "All ages, Walk-in",
  },
  {
    title: "Leisure Skate",
    category: "public_skate",
    dayOfWeek: 1, // Monday (12:00 PM – 1:30 PM)
    start: "12:00",
    end: "13:30",
    capacity: 220,
    cost: 6.4,
    requirements: [],
    is_walkin: true,
  },
  {
    title: "Leisure Skate",
    category: "public_skate",
    dayOfWeek: 3, // Wednesday (12:00 PM – 1:30 PM)
    start: "12:00",
    end: "13:30",
    capacity: 220,
    cost: 6.4,
    requirements: [],
    is_walkin: true,
  },
  {
    title: "Lap Skate",
    category: "public_skate",
    dayOfWeek: 4, // Thursday (9:00 AM – 10:00 AM)
    start: "09:00",
    end: "10:00",
    capacity: 220,
    cost: 6.4,
    requirements: ["Lap Skate / Conditioning"],
    is_walkin: true,
    notes: "8 yrs+, Walk-in",
  },
  {
    title: "Everyone Welcome Skate",
    category: "public_skate",
    dayOfWeek: 6, // Saturday (7:30 PM – 9:30 PM)
    start: "19:30",
    end: "21:30",
    capacity: 250,
    cost: 6.4,
    requirements: [],
    is_walkin: true,
  },
];

/**
 * Verified Kensington Complex public skate recurring rules (0 = Sunday .. 6 = Saturday in America/Vancouver).
 * Note: Thursday 3:30 PM – 5:00 PM Public Skate at Kensington Rink 1 is invalid and omitted;
 * Thursdays from 3:30 PM to 7:00 PM are dedicated to Burnaby Skating Lessons (e.g. Blades 1/2) and
 * Burnaby Skating Club packages, not drop-in public skate.
 * Verified drop-in windows:
 *   - Tuesday 3:30 PM – 5:00 PM Public Skate
 *   - Thursday morning 9:00 AM – 11:30 AM Public Skate
 *   - Saturday 2:00 PM – 4:00 PM Family Skate
 *   - Sunday afternoon 2:00 PM – 4:00 PM Family Skate
 */
export const KENSINGTON_PUBLIC_SKATE_RULES: RecurringSkateRule[] = [
  {
    title: "Public Skate",
    category: "public_skate",
    dayOfWeek: 2, // Tuesday (3:30 PM – 5:00 PM)
    start: "15:30",
    end: "17:00",
    capacity: 200,
    cost: 6.4,
    requirements: [],
    is_walkin: true,
  },
  {
    title: "Public Skate",
    category: "public_skate",
    dayOfWeek: 4, // Thursday morning window (9:00 AM – 11:30 AM)
    start: "09:00",
    end: "11:30",
    capacity: 200,
    cost: 6.4,
    requirements: [],
    is_walkin: true,
  },
  {
    title: "Family Skate",
    category: "public_skate",
    dayOfWeek: 6, // Saturday (2:00 PM – 4:00 PM)
    start: "14:00",
    end: "16:00",
    capacity: 250,
    cost: 6.4,
    requirements: [],
    is_walkin: true,
  },
  {
    title: "Family Skate",
    category: "public_skate",
    dayOfWeek: 0, // Sunday afternoon window (2:00 PM – 4:00 PM)
    start: "14:00",
    end: "16:00",
    capacity: 250,
    cost: 6.4,
    requirements: [],
    is_walkin: true,
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

  if (facility.slug !== "bill-copeland" && facility.slug !== "kensington") {
    return sessions;
  }

  // Filter out any false Sunday walk-in public skates for Bill Copeland,
  // and eliminate invalid Thursday 3:30 PM – 7:00 PM public skates for Kensington
  // (Thursdays 3:30 PM to 7:00 PM are dedicated to Burnaby Skating Lessons & club packages)
  const filtered = sessions
    .filter((s) => {
      if (s.category === "public_skate") {
        const dow = getVancouverDayOfWeek(s.startTime);
        if (facility.slug === "bill-copeland" && dow === 0) {
          return false;
        }
        if (facility.slug === "kensington" && dow === 4) {
          const zoned = toZonedTime(s.startTime, TIMEZONE);
          const totalMinutes = zoned.getHours() * 60 + zoned.getMinutes();
          // 3:30 PM (930) to 7:00 PM (1140)
          if (totalMinutes >= 15 * 60 + 30 && totalMinutes < 19 * 60) {
            return false;
          }
        }
      }
      return true;
    })
    .map((s) => {
      const isLap = /lap\s*skat/i.test(s.rawTitle);
      const reqs = s.requirements ? [...s.requirements] : [];
      if (isLap && !reqs.includes("Lap Skate / Conditioning")) {
        reqs.push("Lap Skate / Conditioning");
      }
      if (s.category === "public_skate" || isLap) {
        return {
          ...s,
          category: "public_skate" as Category,
          bookingUrl: getBurnabyPublicSkateUrl(facility.slug),
          requirements: reqs,
          is_walkin: true,
        };
      }
      return s;
    });

  const rules =
    facility.slug === "bill-copeland"
      ? BILL_COPELAND_PUBLIC_SKATE_RULES
      : facility.slug === "kensington"
      ? KENSINGTON_PUBLIC_SKATE_RULES
      : [];

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
    if (facility.slug === "bill-copeland" && dow === 0) continue;
    if (livePublicSkateDates.has(ymd)) continue;

    for (const rule of rules) {
      if (rule.dayOfWeek !== dow) continue;
      const startTime = fromZonedTime(`${ymd}T${rule.start}:00`, TIMEZONE);
      let endTime = fromZonedTime(`${ymd}T${rule.end}:00`, TIMEZONE);
      if (endTime <= startTime) endTime = new Date(endTime.getTime() + 86_400_000);
      if (endTime <= window.from || startTime >= window.to) continue;

      const key = sessionKey(facility.slug, startTime, rule.category);
      if (!byKey.has(key)) {
        const ruleRequirements = rule.requirements ?? extractSessionRequirements(rule.notes, rule.title);
        const reqs = [...ruleRequirements];
        if (/lap\s*skat/i.test(rule.title) && !reqs.includes("Lap Skate / Conditioning")) {
          reqs.push("Lap Skate / Conditioning");
        }
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
          requirements: reqs,
          notes: rule.notes ?? null,
          is_walkin: rule.is_walkin ?? true,
        });
      }
    }
  }

  return [...byKey.values()];
}
