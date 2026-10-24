import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { runIngestion } from "@/lib/ingest/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Live sync API route.
 * - Triggered by Vercel Cron with `Authorization: Bearer $CRON_SECRET`
 * - Also callable via POST with `x-cron-secret: $CRON_SECRET`
 * - Ingests Burnaby ActiveNet & Canlan Scotia Barn with 1500ms polite delay
 * - Upserts sessions with composite dedupe key: facility_slug + startTime + category
 */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Allow manual execution if CRON_SECRET is not yet configured
  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-cron-secret");
  return authHeader === `Bearer ${secret}` || cronHeader === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const modeParam = req.nextUrl.searchParams.get("mode");
  const mode = modeParam === "mock" || modeParam === "live" ? modeParam : "auto";

  try {
    const report = await runIngestion(prisma, { mode, days: 8 });
    return NextResponse.json(report, {
      status: report.status === "failed" ? 502 : 200,
    });
  } catch (err) {
    console.error("[IceFinder] Sync route error:", err);
    return NextResponse.json(
      { error: "Sync failed", message: (err as Error).message },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
