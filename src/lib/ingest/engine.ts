/**
 * Ingestion orchestrator — shared by the CLI (`scripts/ingest.ts`) and the HTTP cron route.
 *
 * Parallelizes sweeps across independent software networks:
 *  - Worker 1: ActiveNet (Burnaby, City of Vancouver, West Vancouver, New Westminster, Langley)
 *  - Worker 2: PerfectMind / Xplor (Richmond, Coquitlam, Delta, Surrey, NVRC)
 *  - Worker 3: DaySmart / Dash (Canlan Scotia Barn, Planet Ice)
 *
 * Rate limits and politeness delays are preserved per provider network.
 * Sessions from all workers are aggregated and upserted into Supabase in batched chunks.
 */
import type { PrismaClient } from "@prisma/client";
import { FACILITIES, type FacilitySeed } from "../domain";
import { collectActiveNet, resetActiveNetCache, generateLangleyLiveSessions } from "./activenet";
import { fetchBurnabySessions } from "./burnaby";
import { collectVancouver, resetVancouverCache } from "./vancouver";
import { collectPerfectMind, resetPerfectMindCache } from "./perfectmind";
import { collectCanlan } from "./canlan";
import { collectPlanetIce } from "./planetice";
import { mockSessionsFor, publicSkateScheduleFor } from "./mock";
import { fetchPoirierSessions, poirierSessionKey } from "./poirier";
import type { IngestLogger, IngestWindow, NormalizedSession } from "./types";
import { sessionKey } from "../normalize";

export const POLITE_FACILITY_COOLDOWN_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const ACTIVENET_FACILITY_SLUGS = [
  "rosemary-brown",
  "kensington",
  "bill-copeland",
  "britannia",
  "hillcrest",
  "kitsilano",
  "trout-lake",
  "sunset",
  "killarney",
  "west-vancouver-arena",
  "moody-park",
  "george-preston",
  "aldergrove-cucc",
] as const;

export const PERFECTMIND_FACILITY_SLUGS = [
  "richmond-ice-centre",
  "minoru",
  "poirier",
  "north-delta",
  "sungod",
  "south-delta",
  "tilbury",
  "north-surrey",
  "surrey-sport-leisure",
  "cloverdale-ice",
  "south-surrey",
  "newton-arena",
  "karen-magnussen",
  "harry-jerome",
] as const;

export const DAYSMART_FACILITY_SLUGS = [
  "scotia-barn",
  "planet-ice-coquitlam",
  "planet-ice-delta",
  "planet-ice-maple-ridge",
] as const;

export interface IngestOptions {
  mode: "auto" | "live" | "mock"; // auto = live with per-rink mock fallback
  days: number;
  only?: string[]; // facility slugs
  logger?: IngestLogger;
}

export interface RunnerOptions extends Partial<IngestOptions> {
  window?: IngestWindow;
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

export interface WorkerResult {
  network: "ActiveNet" | "PerfectMind" | "DaySmart";
  sessions: NormalizedSession[];
  facilityResults: FacilityResult[];
  seenIdsByFacility: Map<string, string[]>;
  error?: string;
}

export interface IngestReport {
  startedAt: Date;
  finishedAt: Date;
  status: "ok" | "partial" | "failed";
  results: FacilityResult[];
  transitionedSessions?: Array<{ sessionKey: string; openSpots: number; bookingUrl: string }>;
}

const consoleLogger: IngestLogger = {
  info: (m) => console.log(m),
  warn: (m) => console.warn(m),
  error: (m) => console.error(m),
};

export function getSessionId(s: NormalizedSession): string {
  return s.facilitySlug === "poirier"
    ? poirierSessionKey(s.facilitySlug, s.startTime, s.category)
    : sessionKey(s.facilitySlug, s.startTime, s.category);
}

function collectorFor(f: FacilitySeed) {
  if (f.slug === "poirier") {
    return async (_facility: FacilitySeed, window: IngestWindow) => {
      return fetchPoirierSessions(window.from, window.to);
    };
  }
  if (f.municipality === "Langley" || f.slug === "george-preston" || f.slug === "aldergrove-cucc") {
    return async (facility: FacilitySeed, window: IngestWindow) => {
      return generateLangleyLiveSessions(facility.slug as "george-preston" | "aldergrove-cucc", window);
    };
  }
  if (f.bookingPlatform === "canlan") return collectCanlan;
  if (f.bookingPlatform === "daysmart") return collectPlanetIce;
  if (f.bookingPlatform === "perfectmind") return collectPerfectMind;
  if (f.municipality === "Vancouver") return collectVancouver;
  if (f.municipality === "Burnaby") return fetchBurnabySessions;
  return collectActiveNet;
}

/**
 * Merge lists; earlier lists win on key collisions (live > schedule).
 * Also ensures live sessions override schedule templates on the same local date & category
 * so true start/end times parsed from live feeds replace static template times.
 */
function mergeByKey(...lists: NormalizedSession[][]): NormalizedSession[] {
  const map = new Map<string, NormalizedSession>();
  const liveDayCategory = new Set<string>();
  const liveFacilityCategory = new Set<string>();

  for (const list of lists) {
    for (const s of list) {
      if (s.source === "live") {
        const ymd = s.startTime.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
        liveDayCategory.add(`${s.facilitySlug}|${ymd}|${s.category}`);
        liveFacilityCategory.add(`${s.facilitySlug}|${s.category}`);
      }
    }
  }

  for (const list of lists) {
    for (const s of list) {
      if (s.source === "schedule") {
        const ymd = s.startTime.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
        if (
          liveDayCategory.has(`${s.facilitySlug}|${ymd}|${s.category}`) ||
          liveFacilityCategory.has(`${s.facilitySlug}|${s.category}`)
        ) {
          continue;
        }
      }
      const k = getSessionId(s);
      if (!map.has(k)) map.set(k, s);
    }
  }
  return [...map.values()];
}

function resolveRunnerParams(
  arg1?: PrismaClient | RunnerOptions,
  arg2?: RunnerOptions | IngestLogger,
  arg3?: IngestLogger,
): { opts: RunnerOptions; log: IngestLogger; window: IngestWindow } {
  let opts: RunnerOptions = {};
  let log: IngestLogger = consoleLogger;

  if (arg1 && typeof (arg1 as PrismaClient).$disconnect === "function") {
    if (arg2 && typeof (arg2 as RunnerOptions).mode !== "undefined") {
      opts = arg2 as RunnerOptions;
      if (arg3) log = arg3;
    } else if (arg2 && typeof (arg2 as IngestLogger).info === "function") {
      log = arg2 as IngestLogger;
    }
  } else if (arg1) {
    opts = arg1 as RunnerOptions;
    if (arg2 && typeof (arg2 as IngestLogger).info === "function") {
      log = arg2 as IngestLogger;
    }
  }

  if (opts.logger) {
    log = opts.logger;
  }

  const days = opts.days ?? 8;
  const startedAt = Date.now();
  const window: IngestWindow = opts.window ?? {
    from: new Date(startedAt - 3 * 3_600_000),
    to: new Date(startedAt + days * 86_400_000),
  };

  return { opts, log, window };
}

/**
 * Worker 1: ActiveNet (Burnaby, City of Vancouver, West Vancouver, New Westminster, Langley)
 */
export async function runActiveNetIngest(
  arg1?: PrismaClient | RunnerOptions,
  arg2?: RunnerOptions | IngestLogger,
  arg3?: IngestLogger,
): Promise<WorkerResult> {
  const { opts, log, window } = resolveRunnerParams(arg1, arg2, arg3);
  const mode = opts.mode ?? "auto";

  resetActiveNetCache();
  resetVancouverCache();

  const facilities = FACILITIES.filter(
    (f) =>
      (ACTIVENET_FACILITY_SLUGS as readonly string[]).includes(f.slug) &&
      (!opts.only?.length || opts.only.includes(f.slug)),
  );

  const workerResult: WorkerResult = {
    network: "ActiveNet",
    sessions: [],
    facilityResults: [],
    seenIdsByFacility: new Map(),
  };

  try {
    for (let i = 0; i < facilities.length; i++) {
      const facility = facilities[i];
      if (i > 0 && mode !== "mock") {
        await sleep(POLITE_FACILITY_COOLDOWN_MS);
      }
      const facResult: FacilityResult = {
        slug: facility.slug,
        status: "failed",
        collected: 0,
        created: 0,
        updated: 0,
        pruned: 0,
      };

      log.info(`[ActiveNet] ▶ ${facility.name} (${facility.municipality}) [${facility.bookingPlatform}]`);

      try {
        let primary: NormalizedSession[] = [];
        if (mode === "mock") {
          primary = mockSessionsFor(facility, window);
          facResult.status = "mock";
        } else {
          try {
            primary = await collectorFor(facility)(facility, window, log);
            if (primary.length === 0 && mode === "auto") {
              log.warn(`  [ActiveNet] ! live returned 0 sessions for ${facility.slug} → supplementing with fallback schedule`);
              primary = mockSessionsFor(facility, window);
              facResult.status = "fallback";
            } else {
              facResult.status = "live";
              log.info(`  [ActiveNet] ✓ live: ${primary.length} normalized sessions`);
            }
          } catch (err) {
            const msg = (err as Error).message;
            facResult.error = msg;
            if (mode === "live") throw err;
            log.warn(`  [ActiveNet] ✗ live collection failed (${msg}) → using mock fallback`);
            primary = mockSessionsFor(facility, window);
            facResult.status = "fallback";
          }
        }

        const sessions = mergeByKey(primary, publicSkateScheduleFor(facility, window));
        facResult.collected = sessions.length;
        const seenIds = sessions.map((s) => getSessionId(s));
        workerResult.seenIdsByFacility.set(facility.slug, seenIds);
        workerResult.sessions.push(...sessions);
      } catch (err) {
        facResult.status = "failed";
        facResult.error = (err as Error).message;
        log.error(`  [ActiveNet] ✗ ${facility.slug} failed: ${facResult.error}`);
      }
      workerResult.facilityResults.push(facResult);
    }
  } catch (workerErr) {
    workerResult.error = (workerErr as Error).message;
    log.error(`[ActiveNet] Worker error: ${workerResult.error}`);
  }

  return workerResult;
}

/**
 * Worker 2: PerfectMind / Xplor (Richmond, Coquitlam, Delta, Surrey, NVRC)
 */
export async function runPerfectMindIngest(
  arg1?: PrismaClient | RunnerOptions,
  arg2?: RunnerOptions | IngestLogger,
  arg3?: IngestLogger,
): Promise<WorkerResult> {
  const { opts, log, window } = resolveRunnerParams(arg1, arg2, arg3);
  const mode = opts.mode ?? "auto";

  resetPerfectMindCache();

  const facilities = FACILITIES.filter(
    (f) =>
      (PERFECTMIND_FACILITY_SLUGS as readonly string[]).includes(f.slug) &&
      (!opts.only?.length || opts.only.includes(f.slug)),
  );

  const workerResult: WorkerResult = {
    network: "PerfectMind",
    sessions: [],
    facilityResults: [],
    seenIdsByFacility: new Map(),
  };

  try {
    for (let i = 0; i < facilities.length; i++) {
      const facility = facilities[i];
      if (i > 0 && mode !== "mock") {
        await sleep(POLITE_FACILITY_COOLDOWN_MS);
      }
      const facResult: FacilityResult = {
        slug: facility.slug,
        status: "failed",
        collected: 0,
        created: 0,
        updated: 0,
        pruned: 0,
      };

      log.info(`[PerfectMind] ▶ ${facility.name} (${facility.municipality}) [${facility.bookingPlatform}]`);

      try {
        let primary: NormalizedSession[] = [];
        if (mode === "mock") {
          primary = mockSessionsFor(facility, window);
          facResult.status = "mock";
        } else {
          try {
            primary = await collectorFor(facility)(facility, window, log);
            if (primary.length === 0 && mode === "auto") {
              log.warn(`  [PerfectMind] ! live returned 0 sessions for ${facility.slug} → supplementing with fallback schedule`);
              primary = mockSessionsFor(facility, window);
              facResult.status = "fallback";
            } else {
              facResult.status = "live";
              log.info(`  [PerfectMind] ✓ live: ${primary.length} normalized sessions`);
            }
          } catch (err) {
            const msg = (err as Error).message;
            facResult.error = msg;
            if (mode === "live") throw err;
            log.warn(`  [PerfectMind] ✗ live collection failed (${msg}) → using mock fallback`);
            primary = mockSessionsFor(facility, window);
            facResult.status = "fallback";
          }
        }

        const sessions = mergeByKey(primary, publicSkateScheduleFor(facility, window));
        facResult.collected = sessions.length;
        const seenIds = sessions.map((s) => getSessionId(s));
        workerResult.seenIdsByFacility.set(facility.slug, seenIds);
        workerResult.sessions.push(...sessions);
      } catch (err) {
        facResult.status = "failed";
        facResult.error = (err as Error).message;
        log.error(`  [PerfectMind] ✗ ${facility.slug} failed: ${facResult.error}`);
      }
      workerResult.facilityResults.push(facResult);
    }
  } catch (workerErr) {
    workerResult.error = (workerErr as Error).message;
    log.error(`[PerfectMind] Worker error: ${workerResult.error}`);
  }

  return workerResult;
}

/**
 * Worker 3: DaySmart / Dash (Canlan Scotia Barn, Planet Ice)
 */
export async function runDaySmartIngest(
  arg1?: PrismaClient | RunnerOptions,
  arg2?: RunnerOptions | IngestLogger,
  arg3?: IngestLogger,
): Promise<WorkerResult> {
  const { opts, log, window } = resolveRunnerParams(arg1, arg2, arg3);
  const mode = opts.mode ?? "auto";

  const facilities = FACILITIES.filter(
    (f) =>
      (DAYSMART_FACILITY_SLUGS as readonly string[]).includes(f.slug) &&
      (!opts.only?.length || opts.only.includes(f.slug)),
  );

  const workerResult: WorkerResult = {
    network: "DaySmart",
    sessions: [],
    facilityResults: [],
    seenIdsByFacility: new Map(),
  };

  try {
    for (let i = 0; i < facilities.length; i++) {
      const facility = facilities[i];
      if (i > 0 && mode !== "mock") {
        await sleep(POLITE_FACILITY_COOLDOWN_MS);
      }
      const facResult: FacilityResult = {
        slug: facility.slug,
        status: "failed",
        collected: 0,
        created: 0,
        updated: 0,
        pruned: 0,
      };

      log.info(`[DaySmart] ▶ ${facility.name} (${facility.municipality}) [${facility.bookingPlatform}]`);

      try {
        let primary: NormalizedSession[] = [];
        if (mode === "mock") {
          primary = mockSessionsFor(facility, window);
          facResult.status = "mock";
        } else {
          try {
            primary = await collectorFor(facility)(facility, window, log);
            if (primary.length === 0 && mode === "auto") {
              log.warn(`  [DaySmart] ! live returned 0 sessions for ${facility.slug} → supplementing with fallback schedule`);
              primary = mockSessionsFor(facility, window);
              facResult.status = "fallback";
            } else {
              facResult.status = "live";
              log.info(`  [DaySmart] ✓ live: ${primary.length} normalized sessions`);
            }
          } catch (err) {
            const msg = (err as Error).message;
            facResult.error = msg;
            if (mode === "live") throw err;
            log.warn(`  [DaySmart] ✗ live collection failed (${msg}) → using mock fallback`);
            primary = mockSessionsFor(facility, window);
            facResult.status = "fallback";
          }
        }

        const sessions = mergeByKey(primary, publicSkateScheduleFor(facility, window));
        facResult.collected = sessions.length;
        const seenIds = sessions.map((s) => getSessionId(s));
        workerResult.seenIdsByFacility.set(facility.slug, seenIds);
        workerResult.sessions.push(...sessions);
      } catch (err) {
        facResult.status = "failed";
        facResult.error = (err as Error).message;
        log.error(`  [DaySmart] ✗ ${facility.slug} failed: ${facResult.error}`);
      }
      workerResult.facilityResults.push(facResult);
    }
  } catch (workerErr) {
    workerResult.error = (workerErr as Error).message;
    log.error(`[DaySmart] Worker error: ${workerResult.error}`);
  }

  return workerResult;
}

export async function runIngestion(prisma: PrismaClient, opts: IngestOptions): Promise<IngestReport> {
  const log = opts.logger ?? consoleLogger;
  const startedAt = new Date();
  const window: IngestWindow = {
    from: new Date(startedAt.getTime() - 3 * 3_600_000),
    to: new Date(startedAt.getTime() + opts.days * 86_400_000),
  };

  const run = await prisma.syncRun.create({ data: { status: "running" } });
  const lines: string[] = [];
  const tee: IngestLogger = {
    info: (m) => (lines.push(m), log.info(m)),
    warn: (m) => (lines.push(`WARN ${m}`), log.warn(m)),
    error: (m) => (lines.push(`ERROR ${m}`), log.error(m)),
  };

  tee.info(
    `IceFinder ingest • mode=${opts.mode} • window ${window.from.toISOString()} → ${window.to.toISOString()}`,
  );

  // Clean up any legacy pipe-delimited composite keys before upserting deterministic underscore keys
  try {
    await prisma.iceSession.deleteMany({
      where: { id: { contains: "|" } },
    });
  } catch (cleanupErr) {
    tee.warn(`Legacy key cleanup warning: ${(cleanupErr as Error).message}`);
  }

  // Pre-seed/fetch facilities in DB to build slug -> facilityId map
  const dbFacilityMap = new Map<string, string>();
  for (const f of FACILITIES) {
    try {
      const dbFac = await prisma.facility.upsert({
        where: { slug: f.slug },
        update: {
          name: f.name,
          municipality: f.municipality,
          address: f.address,
          lat: f.lat,
          lng: f.lng,
          bookingPlatform: f.bookingPlatform,
          sheets: f.sheets ?? 1,
        },
        create: {
          slug: f.slug,
          name: f.name,
          municipality: f.municipality,
          address: f.address,
          lat: f.lat,
          lng: f.lng,
          bookingPlatform: f.bookingPlatform,
          sheets: f.sheets ?? 1,
        },
      });
      dbFacilityMap.set(f.slug, dbFac.id);
    } catch (facilityErr) {
      tee.error(`Failed to seed facility ${f.slug}: ${(facilityErr as Error).message}`);
    }
  }

  tee.info(`Starting concurrent provider sweeps (ActiveNet, PerfectMind, DaySmart)...`);

  // Execute sweeps concurrently across independent software networks
  const [activeNetRes, perfectMindRes, daySmartRes] = await Promise.allSettled([
    runActiveNetIngest({ ...opts, window }, tee),
    runPerfectMindIngest({ ...opts, window }, tee),
    runDaySmartIngest({ ...opts, window }, tee),
  ]);

  const allSessions: NormalizedSession[] = [];
  const results: FacilityResult[] = [];
  const seenIdsByFacility = new Map<string, string[]>();

  const settledWorkers = [
    { name: "ActiveNet", res: activeNetRes },
    { name: "PerfectMind", res: perfectMindRes },
    { name: "DaySmart", res: daySmartRes },
  ];

  for (const worker of settledWorkers) {
    if (worker.res.status === "fulfilled") {
      const val = worker.res.value;
      allSessions.push(...val.sessions);
      results.push(...val.facilityResults);
      for (const [slug, ids] of val.seenIdsByFacility.entries()) {
        seenIdsByFacility.set(slug, ids);
      }
      tee.info(`  ✓ Worker ${worker.name} finished: collected ${val.sessions.length} sessions across ${val.facilityResults.length} arenas`);
    } else {
      tee.error(`  ✗ Worker ${worker.name} failed: ${worker.res.reason}`);
    }
  }

  tee.info(`Aggregated ${allSessions.length} total sessions. Batch upserting into Supabase...`);

  const facilityStats = new Map<string, { created: number; updated: number }>();
  for (const r of results) {
    facilityStats.set(r.slug, { created: 0, updated: 0 });
  }

  const allTransitioned: Array<{ sessionKey: string; openSpots: number; bookingUrl: string }> = [];

  // Upsert in batched chunks to maximize Supabase throughput without exhausting connection limits
  const BATCH_SIZE = 25;
  for (let i = 0; i < allSessions.length; i += BATCH_SIZE) {
    const chunk = allSessions.slice(i, i + BATCH_SIZE);
    const chunkIds = chunk.map((s) => getSessionId(s));

    const existingSessions = await prisma.iceSession.findMany({
      where: { id: { in: chunkIds } },
      select: { id: true, openSpots: true, bookingUrl: true },
    });
    const existingMap = new Map(existingSessions.map((e) => [e.id, e]));

    await Promise.all(
      chunk.map(async (s) => {
        const id = getSessionId(s);
        const facilityId = dbFacilityMap.get(s.facilitySlug);
        if (!facilityId) return;

        const existing = existingMap.get(id);
        if (existing && existing.openSpots === 0 && s.openSpots > 0) {
          allTransitioned.push({
            sessionKey: id,
            openSpots: s.openSpots,
            bookingUrl: s.bookingUrl || existing.bookingUrl,
          });
        }

        await prisma.iceSession.upsert({
          where: { id },
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
            requirements: s.requirements ?? [],
            notes: s.notes ?? null,
          },
          create: {
            id,
            facilityId,
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

        const stat = facilityStats.get(s.facilitySlug);
        if (stat) {
          if (existing) stat.updated++;
          else stat.created++;
        }
      }),
    );
  }

  // Prune future slots in the window that the source no longer lists (cancelled/rescheduled)
  for (const r of results) {
    const stat = facilityStats.get(r.slug);
    if (stat) {
      r.created = stat.created;
      r.updated = stat.updated;
    }
    const facilityId = dbFacilityMap.get(r.slug);
    const seen = seenIdsByFacility.get(r.slug);
    if (facilityId && seen && r.status !== "failed") {
      try {
        const pruned = await prisma.iceSession.deleteMany({
          where: {
            facilityId,
            startTime: { gte: window.from, lt: window.to },
            id: { notIn: seen },
          },
        });
        r.pruned = pruned.count;
      } catch (pruneErr) {
        tee.warn(`Pruning warning for ${r.slug}: ${(pruneErr as Error).message}`);
      }
    }
  }

  // Housekeeping: drop sessions that ended more than 2 days ago.
  await prisma.iceSession.deleteMany({ where: { endTime: { lt: new Date(Date.now() - 2 * 86_400_000) } } });

  const failed = results.filter((r) => r.status === "failed").length;
  const degraded = results.filter((r) => r.status === "fallback").length;
  const status: IngestReport["status"] =
    results.length === 0 || failed === results.length ? "failed" : failed || degraded ? "partial" : "ok";
  const finishedAt = new Date();
  const upserted = results.reduce((n, r) => n + r.created + r.updated, 0);

  await prisma.syncRun.update({
    where: { id: run.id },
    data: { finishedAt, status, upserted, log: lines.join("\n").slice(-20_000) },
  });

  tee.info(
    `\nDone in ${((finishedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)}s • status=${status} • ${upserted} rows upserted across Metro Vancouver`,
  );
  return { startedAt, finishedAt, status, results, transitionedSessions: allTransitioned };
}
