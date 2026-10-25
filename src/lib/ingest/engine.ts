/**
 * Ingestion orchestrator — shared by the CLI (`scripts/ingest.ts`) and the HTTP cron route.
 *
 * For each rink: collect live → (on failure) mock fallback → add published public-skate
 * timetable → upsert by composite key → prune slots that vanished from the source.
 * A failing rink is logged and skipped; it never aborts the batch.
 */
import type { PrismaClient } from "@prisma/client";
import { FACILITIES, type FacilitySeed } from "../domain";
import { collectActiveNet, resetActiveNetCache } from "./activenet";
import { fetchBurnabySessions } from "./burnaby";
import { collectVancouver, resetVancouverCache } from "./vancouver";
import { collectPerfectMind, resetPerfectMindCache } from "./perfectmind";
import { collectCanlan } from "./canlan";
import { mockSessionsFor, publicSkateScheduleFor } from "./mock";
import { fetchPoirierSessions, poirierSessionKey } from "./poirier";
import type { IngestLogger, IngestWindow, NormalizedSession } from "./types";
import { sessionKey } from "../normalize";

export interface IngestOptions {
  mode: "auto" | "live" | "mock"; // auto = live with per-rink mock fallback
  days: number;
  only?: string[]; // facility slugs
  logger?: IngestLogger;
}

export interface FacilityResult {
  slug: string;
  status: "live" | "fallback" | "mock" | "failed";
  collected: number;
  created: number;
  updated: number;
  pruned: number;
  error?: string;
}

export interface IngestReport {
  startedAt: Date;
  finishedAt: Date;
  status: "ok" | "partial" | "failed";
  results: FacilityResult[];
}

const consoleLogger: IngestLogger = {
  info: (m) => console.log(m),
  warn: (m) => console.warn(m),
  error: (m) => console.error(m),
};

function collectorFor(f: FacilitySeed) {
  if (f.slug === "poirier") {
    return async (_facility: FacilitySeed, window: IngestWindow) => {
      return fetchPoirierSessions(window.from, window.to);
    };
  }
  if (f.bookingPlatform === "canlan") return collectCanlan;
  if (f.bookingPlatform === "perfectmind") return collectPerfectMind;
  if (f.municipality === "Vancouver") return collectVancouver;
  if (f.municipality === "Burnaby") return fetchBurnabySessions;
  return collectActiveNet;
}

/** Merge lists; earlier lists win on key collisions (live > schedule). */
function mergeByKey(...lists: NormalizedSession[][]): NormalizedSession[] {
  const map = new Map<string, NormalizedSession>();
  for (const list of lists)
    for (const s of list) {
      const k =
        s.facilitySlug === "poirier"
          ? poirierSessionKey(s.facilitySlug, s.startTime, s.category)
          : sessionKey(s.facilitySlug, s.startTime, s.category);
      if (!map.has(k)) map.set(k, s);
    }
  return [...map.values()];
}

export async function runIngestion(prisma: PrismaClient, opts: IngestOptions): Promise<IngestReport> {
  const log = opts.logger ?? consoleLogger;
  const startedAt = new Date();
  // Window: start of "now minus 3h" (keep in-progress sessions) → N days ahead.
  const window: IngestWindow = {
    from: new Date(startedAt.getTime() - 3 * 3_600_000),
    to: new Date(startedAt.getTime() + opts.days * 86_400_000),
  };
  resetActiveNetCache();
  resetVancouverCache();
  resetPerfectMindCache();

  const run = await prisma.syncRun.create({ data: { status: "running" } });
  const lines: string[] = [];
  const tee: IngestLogger = {
    info: (m) => (lines.push(m), log.info(m)),
    warn: (m) => (lines.push(`WARN ${m}`), log.warn(m)),
    error: (m) => (lines.push(`ERROR ${m}`), log.error(m)),
  };

  tee.info(`IceFinder ingest • mode=${opts.mode} • window ${window.from.toISOString()} → ${window.to.toISOString()}`);

  const targets = FACILITIES.filter((f) => !opts.only?.length || opts.only.includes(f.slug));
  const results: FacilityResult[] = [];

  for (const facility of targets) {
    const result: FacilityResult = { slug: facility.slug, status: "failed", collected: 0, created: 0, updated: 0, pruned: 0 };
    tee.info(`\n▶ ${facility.name} [${facility.bookingPlatform}]`);
    try {
      const dbFacility = await prisma.facility.upsert({
        where: { slug: facility.slug },
        update: {},
        create: {
          slug: facility.slug,
          name: facility.name,
          municipality: facility.municipality,
          address: facility.address,
          lat: facility.lat,
          lng: facility.lng,
          bookingPlatform: facility.bookingPlatform,
        },
      });

      let primary: NormalizedSession[] = [];
      if (opts.mode === "mock") {
        primary = mockSessionsFor(facility, window);
        result.status = "mock";
      } else {
        try {
          primary = await collectorFor(facility)(facility, window, tee);
          result.status = "live";
          tee.info(`  ✓ live: ${primary.length} normalized sessions`);
        } catch (err) {
          const msg = (err as Error).message;
          result.error = msg;
          if (opts.mode === "live") throw err;
          tee.warn(`  ✗ live collection failed (${msg}) → using mock fallback`);
          primary = mockSessionsFor(facility, window);
          result.status = "fallback";
        }
      }

      const sessions = mergeByKey(primary, publicSkateScheduleFor(facility, window));
      result.collected = sessions.length;

      const seen: string[] = [];
      for (const s of sessions) {
        const id =
          s.facilitySlug === "poirier"
            ? poirierSessionKey(s.facilitySlug, s.startTime, s.category)
            : sessionKey(s.facilitySlug, s.startTime, s.category);
        seen.push(id);
        const existing = await prisma.iceSession.findUnique({ where: { id }, select: { id: true } });
        await prisma.iceSession.upsert({
          where: { id },
          // Dedupe: the slot already exists → refresh live capacity fields only (+ metadata that can change).
          update: {
            openSpots: s.openSpots,
            waitlistCount: s.waitlistCount,
            totalSpots: s.totalSpots,
            goalieSpots: s.goalieSpots,
            goaliesRegistered: s.goaliesRegistered,
            isGoalieFree: s.isGoalieFree,
            bookingUrl: s.bookingUrl,
            activityId: s.activityId,
            endTime: s.endTime,
            rawTitle: s.rawTitle,
            rink: s.rink,
            cost: s.cost,
            source: s.source,
            externalId: s.externalId,
          },
          create: {
            id,
            facilityId: dbFacility.id,
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
          },
        });
        if (existing) result.updated++;
        else result.created++;
      }

      // Prune future slots in the window that the source no longer lists (cancelled/rescheduled).
      const pruned = await prisma.iceSession.deleteMany({
        where: {
          facilityId: dbFacility.id,
          startTime: { gte: startedAt, lt: window.to },
          id: { notIn: seen },
        },
      });
      result.pruned = pruned.count;
      tee.info(`  ↳ upserted ${sessions.length} (created ${result.created}, updated ${result.updated}, pruned ${result.pruned})`);
    } catch (err) {
      result.status = "failed";
      result.error = (err as Error).message;
      tee.error(`  ✗ ${facility.slug} failed: ${result.error} — continuing with next rink`);
    }
    results.push(result);
  }

  // Housekeeping: drop sessions that ended more than 2 days ago.
  await prisma.iceSession.deleteMany({ where: { endTime: { lt: new Date(Date.now() - 2 * 86_400_000) } } });

  const failed = results.filter((r) => r.status === "failed").length;
  const degraded = results.filter((r) => r.status === "fallback").length;
  const status: IngestReport["status"] = failed === results.length ? "failed" : failed || degraded ? "partial" : "ok";
  const finishedAt = new Date();
  const upserted = results.reduce((n, r) => n + r.created + r.updated, 0);

  await prisma.syncRun.update({
    where: { id: run.id },
    data: { finishedAt, status, upserted, log: lines.join("\n").slice(-20_000) },
  });

  tee.info(`\nDone in ${((finishedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)}s • status=${status} • ${upserted} rows upserted`);
  return { startedAt, finishedAt, status, results };
}
