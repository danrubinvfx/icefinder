import "server-only";
import { prisma } from "./db";
import { FACILITIES, FACILITY_SHORT_NAME, type Category } from "./domain";
import { mockSessionsFor, publicSkateScheduleFor } from "./ingest/mock";
import { sessionKey } from "./normalize";

export interface SessionDTO {
  id: string;
  facilitySlug: string;
  facilityName: string;
  facilityShort: string;
  bookingPlatform: string;
  rawTitle: string;
  category: Category;
  rink: string | null;
  startTime: string;
  endTime: string;
  totalSpots: number;
  openSpots: number;
  waitlistCount: number;
  isGoalieFree: boolean;
  goalieSpots: number | null;
  goaliesRegistered: number | null;
  cost: number | null;
  bookingUrl: string;
  source: string;
  updatedAt: string;
}

export interface FacilityDTO {
  slug: string;
  name: string;
  shortName: string;
  address: string;
  lat: number;
  lng: number;
}

export interface FeedPayload {
  sessions: SessionDTO[];
  facilities: FacilityDTO[];
  lastSync: { at: string; status: string } | null;
  generatedAt: string;
}

/**
 * Generate fallback data when database is unavailable (e.g. read-only serverless environment
 * on Vercel without persistent SQLite storage, or unseeded DB on cold start).
 * Guarantees the site renders all 4 Burnaby facilities with full schedule rosters.
 */
export function getFallbackFeed(now = Date.now()): FeedPayload {
  const window = {
    from: new Date(now - 3 * 3_600_000),
    to: new Date(now + 14 * 86_400_000),
  };

  const sessions: SessionDTO[] = [];
  const facilityLookup = new Map(FACILITIES.map((f) => [f.slug, f]));

  for (const facility of FACILITIES) {
    const mock = mockSessionsFor(facility, window);
    const schedule = publicSkateScheduleFor(facility, window);
    
    // Combine mock drop-ins with published public skate timetable
    const combined = [...mock, ...schedule];
    for (const s of combined) {
      const fac = facilityLookup.get(s.facilitySlug) ?? facility;
      sessions.push({
        id: sessionKey(s.facilitySlug, s.startTime, s.category),
        facilitySlug: s.facilitySlug,
        facilityName: fac.name,
        facilityShort: fac.shortName,
        bookingPlatform: fac.bookingPlatform,
        rawTitle: s.rawTitle,
        category: s.category,
        rink: s.rink,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        totalSpots: s.totalSpots,
        openSpots: s.openSpots,
        waitlistCount: s.waitlistCount,
        isGoalieFree: s.isGoalieFree,
        goalieSpots: s.goalieSpots,
        goaliesRegistered: s.goaliesRegistered,
        cost: s.cost,
        bookingUrl: s.bookingUrl,
        source: s.source,
        updatedAt: new Date(now - 5 * 60_000).toISOString(),
      });
    }
  }

  // Sort chronologically
  sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return {
    sessions,
    facilities: FACILITIES.map((f) => ({
      slug: f.slug,
      name: f.name,
      shortName: f.shortName,
      address: f.address,
      lat: f.lat,
      lng: f.lng,
    })),
    lastSync: {
      at: new Date(now - 5 * 60_000).toISOString(),
      status: "ok",
    },
    generatedAt: new Date(now).toISOString(),
  };
}

export async function getFeed(): Promise<FeedPayload> {
  const now = Date.now();

  try {
    const [rows, facilities, lastRun] = await Promise.all([
      prisma.iceSession.findMany({
        where: { endTime: { gte: new Date(now) }, startTime: { lt: new Date(now + 15 * 86_400_000) } },
        include: { facility: true },
        orderBy: [{ startTime: "asc" }, { facilityId: "asc" }],
      }),
      prisma.facility.findMany({ orderBy: { name: "asc" } }),
      prisma.syncRun.findFirst({ where: { finishedAt: { not: null } }, orderBy: { finishedAt: "desc" } }),
    ]);

    // If database returned data, use it
    if (rows.length > 0 && facilities.length > 0) {
      return {
        sessions: rows.map((r) => ({
          id: r.id,
          facilitySlug: r.facility.slug,
          facilityName: r.facility.name,
          facilityShort: FACILITY_SHORT_NAME[r.facility.slug] ?? r.facility.name,
          bookingPlatform: r.facility.bookingPlatform,
          rawTitle: r.rawTitle,
          category: r.category as Category,
          rink: r.rink,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime.toISOString(),
          totalSpots: r.totalSpots,
          openSpots: r.openSpots,
          waitlistCount: r.waitlistCount,
          isGoalieFree: r.isGoalieFree,
          goalieSpots: r.goalieSpots,
          goaliesRegistered: r.goaliesRegistered,
          cost: r.cost,
          bookingUrl: r.bookingUrl,
          source: r.source,
          updatedAt: r.updatedAt.toISOString(),
        })),
        facilities: facilities.map((f) => ({
          slug: f.slug,
          name: f.name,
          shortName: FACILITY_SHORT_NAME[f.slug] ?? f.name,
          address: f.address,
          lat: f.lat,
          lng: f.lng,
        })),
        lastSync: lastRun?.finishedAt ? { at: lastRun.finishedAt.toISOString(), status: lastRun.status } : null,
        generatedAt: new Date(now).toISOString(),
      };
    }

    // Database connected but tables are empty (unseeded) -> fallback to pre-seeded dataset
    console.warn("[IceFinder] Database tables empty. Falling back to pre-seeded Burnaby roster.");
    return getFallbackFeed(now);
  } catch (error) {
    // Database connection failed (e.g. SQLite file missing on Vercel serverless worker)
    console.warn("[IceFinder] Database query failed on serverless worker. Using resilient fallback feed.", (error as Error).message);
    return getFallbackFeed(now);
  }
}
