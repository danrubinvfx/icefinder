import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { runIngestion } from "@/lib/ingest/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * HTTP cron trigger.
 *   - Vercel Cron:  GET  with `Authorization: Bearer $CRON_SECRET`
 *   - Any scheduler: POST with `x-cron-secret: $CRON_SECRET`  (optional ?mode=mock|live|auto)
 */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || req.headers.get("x-cron-secret") === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const modeParam = req.nextUrl.searchParams.get("mode");
  const mode = modeParam === "mock" || modeParam === "live" ? modeParam : "auto";
  const report = await runIngestion(prisma, { mode, days: 8 });
  return NextResponse.json(report, { status: report.status === "failed" ? 502 : 200 });
}

export const GET = handle;
export const POST = handle;
