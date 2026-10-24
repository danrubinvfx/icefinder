import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runIngestion } from "@/lib/ingest/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

export async function POST() {
  try {
    const lastRun = await prisma.syncRun.findFirst({
      where: { status: "ok" },
      orderBy: { finishedAt: "desc" },
    });

    const now = Date.now();
    if (lastRun?.finishedAt && now - lastRun.finishedAt.getTime() < COOLDOWN_MS) {
      return NextResponse.json({
        status: "cached",
        message: "Checked recently; data is fresh",
        lastSynced: lastRun.finishedAt.toISOString(),
      });
    }

    // Cooldown expired or no runs recorded — execute live ingestion
    const report = await runIngestion(prisma, { mode: "auto", days: 8 });
    return NextResponse.json({
      status: "refreshed",
      message: "Live sweep completed",
      lastSynced: report.finishedAt.toISOString(),
      upserted: report.results.reduce((n, r) => n + r.created + r.updated, 0),
    });
  } catch (err) {
    console.error("[IceFinder] Manual sync error:", err);
    return NextResponse.json(
      { error: "Manual sync failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}

export const GET = POST;
