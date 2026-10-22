import "server-only";
import { prisma } from "./db";
import { FACILITY_SHORT_NAME, type Category } from "./domain";

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

export async function getFeed(): Promise<FeedPayload> {
  const now = Date.now();
  const [rows, facilities, lastRun] = await Promise.all([
    prisma.iceSession.findMany({
      where: { endTime: { gte: new Date(now) }, startTime: { lt: new Date(now + 15 * 86_400_000) } },
      include: { facility: true },
      orderBy: [{ startTime: "asc" }, { facilityId: "asc" }],
    }),
    prisma.facility.findMany({ orderBy: { name: "asc" } }),
    prisma.syncRun.findFirst({ where: { finishedAt: { not: null } }, orderBy: { finishedAt: "desc" } }),
  ]);

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
