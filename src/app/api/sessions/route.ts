import { NextResponse } from "next/server";
import { getFeed, getFallbackFeed } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** JSON feed used by the client for background refresh (and by future native apps). */
export async function GET() {
  try {
    const feed = await getFeed();
    return NextResponse.json(feed, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[IceFinder] Error in /api/sessions, using fallback feed:", err);
    const fallback = getFallbackFeed();
    return NextResponse.json(fallback, { headers: { "Cache-Control": "no-store" } });
  }
}
