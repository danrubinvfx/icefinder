import { NextResponse } from "next/server";
import { getFeed } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** JSON feed used by the client for background refresh (and by future native apps). */
export async function GET() {
  const feed = await getFeed();
  return NextResponse.json(feed, { headers: { "Cache-Control": "no-store" } });
}
