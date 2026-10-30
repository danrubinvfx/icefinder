/**
 * Poirier Sport & Leisure Complex (Coquitlam) Ingestion Module.
 *
 * Implements two-tier ingestion:
 *   1. Primary: Attempt live query to Coquitlam's public BookMe4 widget API
 *   2. Fallback Engine: Structured timetable rule engine adhering strictly to Coquitlam recreation guidelines,
 *      including footer buy-ons, mid-season cutoffs, blackout/cancellations, and statutory holiday schedules.
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { PrismaClient } from "@prisma/client";
import { TIMEZONE, type Category } from "../domain";
import {
  cleanTitle,
  extractSessionRequirements,
  isGoalieListing,
  normalizeCategory,
  sanitizeSessionNotes,
} from "../normalize";
import { fetchJson } from "./http";
import type { NormalizedSession } from "./types";

export const POIRIER_BOOKING_URL =
  "https://cityofcoquitlam.perfectmind.com/Contacts/BookMe4BookingPages/Classes?calendarId=4f07c977-74de-46ab-9d0a-2397f83f254f&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

export const POIRIER_PUBLIC_SKATE_BOOKING_URL =
  "https://cityofcoquitlam.perfectmind.com/Contacts/BookMe4BookingPages/Classes?calendarId=b7685f76-3d81-4fac-b270-60659b414ff6&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False";

const POIRIER_API_URL =
  "https://cityofcoquitlam.perfectmind.com/23902/Clients/BookMe4BookingPages/Classes?widgetId=15f6af07-39c5-473e-b053-96653f77a406";

const POIRIER_CALENDAR_ID = "4f07c977-74de-46ab-9d0a-2397f83f254f";
const POIRIER_PUBLIC_SKATE_CALENDAR_ID = "b7685f76-3d81-4fac-b270-60659b414ff6";

export interface PoirierSessionOptions {
  requiresPreReg?: boolean;
  requiresAdult?: boolean;
  recurrenceEndDate?: string;
  cancelledDates?: string[];
}

/**
 * Deterministic composite key: facility_slug + '_' + start_time + '_' + category
 */
export function poirierSessionKey(facilitySlug: string, startTime: Date, category: string): string {
  return `${facilitySlug}_${startTime.toISOString()}_${category}`;
}

interface PerfectMindClass {
  EventId: string;
  CourseIdTrimmed?: string;
  EventName: string;
  OccurrenceDate?: string;
  FormattedStartDate?: string;
  FormattedStartTime?: string;
  FormattedEndTime?: string;
  EventTimeDescription?: string;
  Spots?: string;
  PriceRange?: string;
  Facility?: string;
  Location?: string;
  Details?: string;
  Description?: string;
  Notes?: string;
  ExtraDetails?: string;
  description?: string;
  notes?: string;
  extraDetails?: string;
}

interface PerfectMindClassesResponse {
  classes?: PerfectMindClass[];
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

function parseSpots(s?: string): number {
  if (!s) return 20;
  const m = s.match(/(\d+)\s*spots?/i);
  return m ? Number(m[1]) : 20;
}

function parsePrice(range?: string): number | null {
  if (!range) return null;
  const matches = [...range.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)];
  if (!matches.length) return null;
  const nums = matches.map((m) => Number(m[1])).filter((n) => n > 0);
  return nums.length ? nums[0] : 0;
}

/**
 * Tier 1: Query live widget API for Poirier sessions.
 */
async function fetchLivePoirierClasses(startDate: Date, endDate: Date): Promise<NormalizedSession[]> {
  try {
    const [dropInRes, skateRes] = await Promise.all([
      fetchJson<PerfectMindClassesResponse>(POIRIER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ calendarId: POIRIER_CALENDAR_ID }),
        timeoutMs: 8_000,
      }).catch(() => ({ classes: [] })),
      fetchJson<PerfectMindClassesResponse>(POIRIER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ calendarId: POIRIER_PUBLIC_SKATE_CALENDAR_ID }),
        timeoutMs: 8_000,
      }).catch(() => ({ classes: [] })),
    ]);

    const classes = [...(dropInRes.classes ?? []), ...(skateRes.classes ?? [])];
    if (!classes.length) return [];

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

      if (startTime < startDate || startTime >= endDate) continue;

      const key = poirierSessionKey("poirier", startTime, category);
      if (isGoalieListing(c.EventName)) {
        goalieRows.push({ key, item: c });
        continue;
      }

      const spotsLeft = parseSpots(c.Spots);
      const cost = parsePrice(c.PriceRange);
      const activityId = c.CourseIdTrimmed ? Number(c.CourseIdTrimmed) : null;
      const externalId = c.EventId ? `perfectmind:${c.EventId}` : null;
      const rink = c.Facility?.replace(/^registered visits\s*-\s*/i, "").trim() || "Main Arena";
      const rawDesc =
        c.Details ?? c.Description ?? c.Notes ?? c.ExtraDetails ?? c.description ?? c.notes ?? c.extraDetails ?? null;
      const notes = sanitizeSessionNotes(rawDesc);
      const requirements = extractSessionRequirements(rawDesc, c.EventName);

      sessions.set(key, {
        facilitySlug: "poirier",
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
        bookingUrl:
          category === "public_skate" ? POIRIER_PUBLIC_SKATE_BOOKING_URL : POIRIER_BOOKING_URL,
        source: "live",
        activityId,
        externalId,
        requirements,
        notes,
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
  } catch {
    return [];
  }
}

/**
 * Tier 2: Structured timetable rule engine.
 */
function defaultPoirierDescription(rawTitle: string, category: Category): string {
  const t = rawTitle.toLowerCase();
  if (category === "figure_buyon") {
    if (t.includes("adult")) {
      return "This drop in is for ice dancers and figure skaters only! Dance music is played during these sessions. No coaches allowed. Figure skaters may practice jumps and spins on the ice but no full ice routines. Skaters must be aware of their surroundings and be respectful of other skaters.";
    }
    return "Drop-in Figure Skating. This program is run in partnership with the Coquitlam Skate Club. Participants are to bring receipt of payment to Coquitlam Skate Club coaches. Coaches are free of charge.\n• Only figure skates can be worn during sessions.\n• Helmets are optional but strongly recommended.\n• The use of the structural harness can only be done so by Coquitlam Skate Club coaches.\n• Participants must have previous figure skating experience.";
  }
  if (category === "hockey_dropin") {
    return "Adults of all skill level are welcome for adult drop-in hockey. Come out and enjoy a fun and welcoming non-competitive environment.\n• CSA approved helmets are mandatory; full face cage/visor highly recommended.\n• Full hockey equipment is required.\n• Players are to bring both dark & light jerseys.";
  }
  if (category === "stick_and_puck") {
    return "Participants must have own hockey gloves, stick and puck.\n• All participants must have a CSA approved helmet, hockey gloves, stick & puck. A full cage is required for all participants 18 years and under. A cage or visor is highly recommended for anyone 19+.\n• No goalies allowed, no slap shots & no scrimmages.";
  }
  return "Helmets are mandatory for children under 12 and any skater using a skating aid.\n• Children under 7 must be accompanied on the ice by a paying, registered adult (16+).\n• Wheelchairs and strollers are permitted on the ice if the occupant wears a helmet.";
}

export function generatePoirierTimetable(startDate: Date, endDate: Date): NormalizedSession[] {
  const sessions: NormalizedSession[] = [];

  const days: string[] = [];
  for (let t = startDate.getTime() - 86_400_000; t <= endDate.getTime() + 86_400_000; t += 86_400_000) {
    const ymd = new Date(t).toLocaleDateString("en-CA", { timeZone: TIMEZONE });
    if (!days.includes(ymd)) days.push(ymd);
  }

  function addSession(opts: {
    ymd: string;
    start: string;
    end: string;
    rawTitle: string;
    category: Category;
    totalSpots?: number;
    openSpots?: number;
    cost?: number;
    rink?: string;
    isGoalieFree?: boolean;
    goalieSpots?: number;
    goaliesRegistered?: number;
    notes?: string;
    source?: string;
    is_walkin?: boolean;
  }) {
    const startTime = fromZonedTime(`${opts.ymd}T${opts.start}:00`, TIMEZONE);
    const endTime = fromZonedTime(`${opts.ymd}T${opts.end}:00`, TIMEZONE);
    if (startTime < startDate || startTime >= endDate) return;

    const total = opts.totalSpots ?? 25;
    const open = opts.openSpots ?? total;
    const rawDesc = opts.notes ?? defaultPoirierDescription(opts.rawTitle, opts.category);
    const notes = sanitizeSessionNotes(rawDesc);
    const requirements = extractSessionRequirements(rawDesc, opts.rawTitle);

    sessions.push({
      facilitySlug: "poirier",
      rawTitle: opts.rawTitle,
      category: opts.category,
      rink: opts.rink ?? "Main Arena",
      startTime,
      endTime,
      totalSpots: total,
      openSpots: open,
      waitlistCount: 0,
      isGoalieFree: opts.isGoalieFree ?? false,
      goalieSpots: opts.goalieSpots ?? null,
      goaliesRegistered: opts.goaliesRegistered ?? null,
      cost: opts.cost ?? null,
      bookingUrl:
        opts.category === "public_skate" ? POIRIER_PUBLIC_SKATE_BOOKING_URL : POIRIER_BOOKING_URL,
      source: opts.source ?? "schedule",
      is_walkin: opts.is_walkin ?? false,
      externalId: null,
      requirements,
      notes,
    });
  }

  for (const ymd of days) {
    const localNoon = fromZonedTime(`${ymd}T12:00:00`, TIMEZONE);
    const dow = toZonedTime(localNoon, TIMEZONE).getDay();

    // ── C. Statutory Holiday & Special Event Overrides ─────────────────────
    // 2026-09-07 (Labour Day) & 2026-10-12 (Thanksgiving):
    if (ymd === "2026-09-07" || ymd === "2026-10-12") {
      addSession({ ymd, start: "12:00", end: "13:00", rawTitle: "*Stick, Ring & Puck", category: "stick_and_puck", totalSpots: 25, cost: 7.5 });
      addSession({ ymd, start: "13:15", end: "14:30", rawTitle: "Family Skate", category: "public_skate", totalSpots: 150, cost: 6.8 });
      addSession({ ymd, start: "14:45", end: "16:00", rawTitle: "Family Skate", category: "public_skate", totalSpots: 150, cost: 6.8 });
      addSession({ ymd, start: "16:15", end: "17:15", rawTitle: "*Adult Stick, Ring & Puck", category: "stick_and_puck", totalSpots: 25, cost: 7.5 });
      continue;
    }

    // 2026-11-11 (Remembrance Day):
    if (ymd === "2026-11-11") {
      addSession({ ymd, start: "15:30", end: "16:30", rawTitle: "*Stick, Ring & Puck", category: "stick_and_puck", totalSpots: 25, cost: 7.5 });
      addSession({ ymd, start: "16:45", end: "18:00", rawTitle: "Family Skate", category: "public_skate", totalSpots: 150, cost: 6.8 });
      addSession({ ymd, start: "18:15", end: "19:30", rawTitle: "Family Skate", category: "public_skate", totalSpots: 150, cost: 6.8 });
      continue;
    }

    // 2026-09-30 (Truth & Reconciliation): Blackout Wednesday standard recurring schedule
    const isTruthAndReconciliation = ymd === "2026-09-30";

    // ── B. Figure Skating Buy-On Schedule (Footer Block) ───────────────────
    const isStatutoryBuyOnCancelled = ["2026-09-07", "2026-10-12", "2026-11-11"].includes(ymd);
    if (!isStatutoryBuyOnCancelled) {
      if (dow === 1 || dow === 3 || dow === 5) {
        addSession({
          ymd,
          start: "08:15",
          end: "09:15",
          rawTitle: "Figure Skating Buy-on",
          category: "figure_buyon",
          totalSpots: 20,
          cost: 9.0,
          rink: "Poirier Ice Arena 2",
          source: "special_schedule",
          is_walkin: true,
          notes:
            "Run in partnership with Coquitlam Skate Club. Pay $9 at arena office. Coaches free. Not bookable on city portal.",
        });
        addSession({
          ymd,
          start: "13:00",
          end: "14:00",
          rawTitle: "Figure Skating Buy-on",
          category: "figure_buyon",
          totalSpots: 20,
          cost: 9.0,
          rink: "Poirier Ice Arena 2",
          source: "special_schedule",
          is_walkin: true,
          notes:
            "Run in partnership with Coquitlam Skate Club. Pay $9 at arena office. Coaches free. Not bookable on city portal.",
        });
      } else if (dow === 2) {
        addSession({
          ymd,
          start: "08:00",
          end: "09:00",
          rawTitle: "Figure Skating Buy-on",
          category: "figure_buyon",
          totalSpots: 20,
          cost: 9.0,
          rink: "Poirier Ice Arena 2",
          source: "special_schedule",
          is_walkin: true,
          notes:
            "Run in partnership with Coquitlam Skate Club. Pay $9 at arena office. Coaches free. Not bookable on city portal.",
        });
      }
    }

    // ── A. Weekly Recurring Schedule ───────────────────────────────────────
    if (dow === 0) {
      // Sunday
      addSession({
        ymd,
        start: "09:15",
        end: "10:15",
        rawTitle: "Adult & Child Toonie Skate (0-6 yrs)** (Max 100)",
        category: "public_skate",
        totalSpots: 100,
        cost: 2.0,
      });

      // Special override for Sunday 2026-11-08: Optimist Community Skate
      if (ymd === "2026-11-08") {
        addSession({
          ymd,
          start: "14:45",
          end: "16:00",
          rawTitle: "Optimist Community Skate (Admission by food donation)",
          category: "public_skate",
          totalSpots: 150,
          cost: 0,
        });
      } else {
        addSession({
          ymd,
          start: "14:45",
          end: "16:00",
          rawTitle: "Family Skate (All Ages)",
          category: "public_skate",
          totalSpots: 150,
          cost: 6.8,
        });
      }

      addSession({
        ymd,
        start: "17:30",
        end: "18:30",
        rawTitle: "*Family Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 7.5,
      });
      addSession({
        ymd,
        start: "18:45",
        end: "19:45",
        rawTitle: "*Female's Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 7.5,
      });
      addSession({
        ymd,
        start: "20:00",
        end: "21:15",
        rawTitle: "*Adult Hockey (19+ yrs)",
        category: "hockey_dropin",
        totalSpots: 22,
        cost: 9.0,
        isGoalieFree: true,
        goalieSpots: 2,
        goaliesRegistered: 0,
      });
    } else if (dow === 1) {
      // Monday
      addSession({
        ymd,
        start: "11:00",
        end: "12:00",
        rawTitle: "*Toonie Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 2.0,
      });
      addSession({
        ymd,
        start: "12:15",
        end: "13:15",
        rawTitle: "Adult & Child Toonie Skate (0-6 yrs)**",
        category: "public_skate",
        totalSpots: 100,
        cost: 2.0,
      });
      addSession({
        ymd,
        start: "13:30",
        end: "14:30",
        rawTitle: "50+ Toonie Skate (50+ yrs)",
        category: "public_skate",
        totalSpots: 100,
        cost: 2.0,
      });
      addSession({
        ymd,
        start: "15:30",
        end: "16:30",
        rawTitle: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 7.5,
      });
      addSession({
        ymd,
        start: "20:15",
        end: "21:15",
        rawTitle: "Toonie Skate (All Ages)",
        category: "public_skate",
        totalSpots: 200,
        cost: 2.0,
      });
    } else if (dow === 2) {
      // Tuesday
      addSession({
        ymd,
        start: "10:00",
        end: "11:15",
        rawTitle: "*Toonie Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 2.0,
      });
      addSession({
        ymd,
        start: "11:30",
        end: "12:45",
        rawTitle: "Toonie Skate (All Ages)",
        category: "public_skate",
        totalSpots: 200,
        cost: 2.0,
      });
    } else if (dow === 3) {
      // Wednesday
      if (isTruthAndReconciliation) {
        continue;
      }
      // Mid-season cutoff: Wednesday 09:30 and 11:00 end after 2026-10-28
      if (ymd <= "2026-10-28") {
        addSession({
          ymd,
          start: "09:30",
          end: "10:30",
          rawTitle: "*Toonie Stick, Ring & Puck (All Ages)",
          category: "stick_and_puck",
          totalSpots: 25,
          cost: 2.0,
        });
        addSession({
          ymd,
          start: "11:00",
          end: "12:00",
          rawTitle: "Toonie Skate (All Ages)",
          category: "public_skate",
          totalSpots: 200,
          cost: 2.0,
        });
      }
      addSession({
        ymd,
        start: "15:30",
        end: "16:30",
        rawTitle: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 7.5,
      });
    } else if (dow === 4) {
      // Thursday
      addSession({
        ymd,
        start: "10:00",
        end: "11:15",
        rawTitle: "*Toonie Adult Drop In Hockey (19+ yrs)",
        category: "hockey_dropin",
        totalSpots: 22,
        cost: 2.0,
        isGoalieFree: true,
        goalieSpots: 2,
        goaliesRegistered: 0,
      });
      addSession({
        ymd,
        start: "11:30",
        end: "12:45",
        rawTitle: "Toonie Skate (All Ages)",
        category: "public_skate",
        totalSpots: 200,
        cost: 2.0,
      });
    } else if (dow === 5) {
      // Friday
      addSession({
        ymd,
        start: "09:30",
        end: "10:30",
        rawTitle: "*Adult Figure Skating (19+ yrs)",
        category: "figure_buyon",
        totalSpots: 20,
        cost: 11.0,
      });
      addSession({
        ymd,
        start: "11:00",
        end: "12:00",
        rawTitle: "Adult & Child Toonie Skate (0-6 yrs)**",
        category: "public_skate",
        totalSpots: 100,
        cost: 2.0,
      });
      addSession({
        ymd,
        start: "12:15",
        end: "13:30",
        rawTitle: "Toonie Skate (All Ages)",
        category: "public_skate",
        totalSpots: 200,
        cost: 2.0,
      });
      addSession({
        ymd,
        start: "15:45",
        end: "16:45",
        rawTitle: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 7.5,
      });
      addSession({
        ymd,
        start: "20:30",
        end: "21:30",
        rawTitle: "Youth Toonie Skate (11-18 yrs)",
        category: "public_skate",
        totalSpots: 150,
        cost: 2.0,
      });
      addSession({
        ymd,
        start: "21:45",
        end: "23:00",
        rawTitle: "*Adult Hockey (19+ yrs)",
        category: "hockey_dropin",
        totalSpots: 22,
        cost: 9.0,
        isGoalieFree: true,
        goalieSpots: 2,
        goaliesRegistered: 0,
      });
      addSession({
        ymd,
        start: "22:00",
        end: "23:00",
        rawTitle: "*Adult Stick, Ring & Puck (19+ yrs)",
        category: "stick_and_puck",
        totalSpots: 25,
        cost: 7.5,
      });
    } else if (dow === 6) {
      // Saturday
      const isCancelled = ymd === "2026-10-10" || ymd === "2026-11-14";

      if (!isCancelled) {
        addSession({
          ymd,
          start: "10:00",
          end: "11:15",
          rawTitle: "*30+ Drop In Hockey (30+ yrs)",
          category: "hockey_dropin",
          totalSpots: 22,
          cost: 9.0,
          isGoalieFree: true,
          goalieSpots: 2,
          goaliesRegistered: 0,
        });
        addSession({
          ymd,
          start: "11:30",
          end: "12:30",
          rawTitle: "*Stick, Ring & Puck (All Ages)",
          category: "stick_and_puck",
          totalSpots: 25,
          cost: 7.5,
        });
      }

      // Public Skate always runs
      addSession({
        ymd,
        start: "17:45",
        end: "19:15",
        rawTitle: "Public Skate (All Ages)",
        category: "public_skate",
        totalSpots: 200,
        cost: 6.8,
      });

      if (!isCancelled) {
        addSession({
          ymd,
          start: "19:30",
          end: "20:30",
          rawTitle: "*Stick, Ring & Puck (All Ages)",
          category: "stick_and_puck",
          totalSpots: 25,
          cost: 7.5,
        });
        addSession({
          ymd,
          start: "20:45",
          end: "21:45",
          rawTitle: "*Adult Stick, Ring & Puck (19+ yrs)",
          category: "stick_and_puck",
          totalSpots: 25,
          cost: 7.5,
        });
      }
    }
  }

  return sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * Main scraper entrypoint for Poirier Sport & Leisure Complex.
 * Merges live PerfectMind widget data (with dynamic capacity) with verified timetable sessions.
 */
export async function fetchPoirierSessions(startDate: Date, endDate: Date): Promise<NormalizedSession[]> {
  const fallback = generatePoirierTimetable(startDate, endDate);

  try {
    const live = await fetchLivePoirierClasses(startDate, endDate);
    if (!live || live.length === 0) {
      return fallback;
    }

    const merged = new Map<string, NormalizedSession>();
    // Live instances take priority for spots and titles
    for (const s of live) {
      merged.set(poirierSessionKey(s.facilitySlug, s.startTime, s.category), s);
    }
    // Fill in timetable sessions not found in widget feed
    for (const s of fallback) {
      const k = poirierSessionKey(s.facilitySlug, s.startTime, s.category);
      if (!merged.has(k)) {
        merged.set(k, s);
      }
    }

    return [...merged.values()].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  } catch {
    return fallback;
  }
}

/**
 * Clean deterministic upsert for Poirier sessions into Supabase PostgreSQL.
 */
export async function upsertPoirierSessions(
  prisma: PrismaClient,
  sessions: NormalizedSession[],
): Promise<number> {
  const facility = await prisma.facility.upsert({
    where: { slug: "poirier" },
    update: {},
    create: {
      slug: "poirier",
      name: "Poirier Sport & Leisure Complex",
      municipality: "Coquitlam",
      address: "633 Poirier St, Coquitlam, BC V3J 6A9",
      lat: 49.2608,
      lng: -122.829,
      bookingPlatform: "perfectmind",
    },
  });

  // Clean up legacy pipe-delimited IDs if present
  await prisma.iceSession.deleteMany({
    where: {
      facilityId: facility.id,
      id: { startsWith: "poirier|" },
    },
  });

  let upserted = 0;
  for (const s of sessions) {
    const id = poirierSessionKey(s.facilitySlug, s.startTime, s.category);
    await prisma.iceSession.upsert({
      where: { id },
      update: {
        rawTitle: s.rawTitle,
        category: s.category,
        rink: s.rink,
        endTime: s.endTime,
        totalSpots: s.totalSpots,
        openSpots: s.openSpots,
        waitlistCount: s.waitlistCount,
        isGoalieFree: s.isGoalieFree,
        goalieSpots: s.goalieSpots,
        goaliesRegistered: s.goaliesRegistered,
        cost: s.cost,
        bookingUrl: s.bookingUrl,
        activityId: s.activityId,
        source: s.source,
        externalId: s.externalId,
        requirements: s.requirements ?? [],
        notes: s.notes ?? null,
      },
      create: {
        id,
        facilityId: facility.id,
        rawTitle: s.rawTitle,
        category: s.category,
        rink: s.rink,
        startTime: s.startTime,
        endTime: s.endTime,
        totalSpots: s.totalSpots,
        openSpots: s.openSpots,
        waitlistCount: s.waitlistCount,
        isGoalieFree: s.isGoalieFree,
        goalieSpots: s.goalieSpots,
        goaliesRegistered: s.goaliesRegistered,
        cost: s.cost,
        bookingUrl: s.bookingUrl,
        activityId: s.activityId,
        source: s.source,
        externalId: s.externalId,
        requirements: s.requirements ?? [],
        notes: s.notes ?? null,
      },
    });
    upserted++;
  }

  return upserted;
}
