#!/usr/bin/env -S npx tsx
/**
 * IceFinder ingestion CLI — Multi-municipality sweep across Metro Vancouver.
 *
 *   npx tsx scripts/ingest.ts                 # live, with per-rink fallback (default)
 *   npx tsx scripts/ingest.ts --mock          # mock data only (offline demo)
 *   npx tsx scripts/ingest.ts --live          # live only; failing rinks are logged + skipped
 *   npx tsx scripts/ingest.ts --days 10       # look-ahead window (default 8)
 *   npx tsx scripts/ingest.ts --only scotia-barn,kensington
 *   npx tsx scripts/ingest.ts --watch 15      # long-running: re-sync every 15 minutes
 */
import { PrismaClient } from "@prisma/client";
import { FACILITIES, type Category } from "../src/lib/domain";
import { runIngestion, POLITE_FACILITY_COOLDOWN_MS, type IngestOptions } from "../src/lib/ingest/engine";
import {
  resolveBookingUrl,
  COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL,
  COQUITLAM_PERFECTMIND_PUBLIC_SKATE_CALENDAR_URL,
} from "../src/lib/links";
import { extractSessionRequirements, sanitizeSessionNotes } from "../src/lib/normalize";
import { fetchPoirierSessions, upsertPoirierSessions } from "../src/lib/ingest/poirier";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : "";
}

const opts: IngestOptions = {
  mode: arg("mock") !== undefined ? "mock" : arg("live") !== undefined ? "live" : "auto",
  days: Number(arg("days") || 8),
  only: arg("only")?.split(",").filter(Boolean),
};
const watch = arg("watch");
const intervalMin = watch !== undefined ? Number(watch || 15) : 0;

const prisma = new PrismaClient();

async function seedAllFacilities(prismaClient: PrismaClient) {
  for (const f of FACILITIES) {
    try {
      await prismaClient.facility.upsert({
        where: { slug: f.slug },
        update: {
          name: f.name,
          municipality: f.municipality,
          address: f.address,
          lat: f.lat,
          lng: f.lng,
          bookingPlatform: f.bookingPlatform,
        },
        create: {
          slug: f.slug,
          name: f.name,
          municipality: f.municipality,
          address: f.address,
          lat: f.lat,
          lng: f.lng,
          bookingPlatform: f.bookingPlatform,
        },
      });
    } catch (err) {
      console.error(`Failed to seed facility ${f.slug}:`, err);
    }
  }
  console.log(`Seeded ${FACILITIES.length} facilities across 5 Metro Vancouver municipalities (POLITE_FACILITY_COOLDOWN_MS=${POLITE_FACILITY_COOLDOWN_MS}).`);
}

async function sanitizeAllDatabaseRows(prismaClient: PrismaClient) {
  const sessions = await prismaClient.iceSession.findMany({
    include: { facility: true },
  });

  let updatedCount = 0;
  for (const s of sessions) {
    const cleanUrl =
      s.facility.municipality === "Coquitlam" || s.facility.slug === "poirier"
        ? (s.category === "public_skate"
            ? COQUITLAM_PERFECTMIND_PUBLIC_SKATE_CALENDAR_URL
            : COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL)
        : resolveBookingUrl({
            bookingUrl: s.bookingUrl,
            category: s.category as Category,
            bookingPlatform: s.facility.bookingPlatform,
            activityId: s.activityId,
            externalId: s.externalId,
            facilitySlug: s.facility.slug,
            municipality: s.facility.municipality,
            source: s.source,
          });

    const cleanNotes = sanitizeSessionNotes(s.notes);
    const derivedReqs = extractSessionRequirements(cleanNotes, s.rawTitle);
    const mergedReqs = Array.from(new Set([...(s.requirements ?? []), ...derivedReqs]));

    const needsUrlUpdate = s.bookingUrl !== cleanUrl;
    const needsNotesUpdate = (s.notes ?? null) !== cleanNotes;
    const needsReqsUpdate =
      JSON.stringify(s.requirements ?? []) !== JSON.stringify(mergedReqs);

    if (needsUrlUpdate || needsNotesUpdate || needsReqsUpdate) {
      await prismaClient.iceSession.update({
        where: { id: s.id },
        data: {
          bookingUrl: cleanUrl,
          notes: cleanNotes,
          requirements: mergedReqs,
        },
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`Sanitized ${updatedCount} sessions in database to direct registration endpoints.`);
  }
}

async function once() {
  try {
    await seedAllFacilities(prisma);
    const report = await runIngestion(prisma, opts);

    // Arena-level sync for Poirier Sport & Leisure Complex
    if (!opts.only?.length || opts.only.includes("poirier")) {
      try {
        console.log("\n▶ Arena-level sync: Poirier Sport & Leisure Complex [perfectmind]");
        const windowFrom = new Date(Date.now() - 3 * 3_600_000);
        const windowTo = new Date(Date.now() + (opts.days || 8) * 86_400_000);
        const poirierSessions = await fetchPoirierSessions(windowFrom, windowTo);
        const count = await upsertPoirierSessions(prisma, poirierSessions);
        console.log(`  ✓ Poirier: ${count} verified sessions synchronized to database.`);
      } catch (poirierErr) {
        console.error("  ✗ Poirier arena-level ingestion failed:", poirierErr);
      }
    }

    await sanitizeAllDatabaseRows(prisma);
    console.table(report.results.map(({ error, ...r }) => ({ ...r, error: error?.slice(0, 60) ?? "" })));
    return report.status;
  } catch (err) {
    console.error("Fatal ingest error:", err);
    return "failed" as const;
  }
}

async function main() {
  if (!intervalMin) {
    const status = await once();
    await prisma.$disconnect();
    process.exit(status === "failed" ? 1 : 0);
  }
  console.log(`Watch mode: syncing every ${intervalMin} min. Ctrl+C to stop.`);
  for (;;) {
    await once();
    await new Promise((r) => setTimeout(r, intervalMin * 60_000));
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
