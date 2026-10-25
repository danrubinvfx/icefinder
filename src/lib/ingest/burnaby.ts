/**
 * City of Burnaby ActiveNet ingestion scraper module.
 *
 * Implements scraping of Burnaby recreation ice drop-in sessions from ActiveNet WebReg.
 * Ensures all sessions have proper center-scoped URLs (&center_ids=180, 147, 146)
 * to prevent stale browser session filter collisions.
 */
import { FacilitySeed } from "../domain";
import { IngestLogger, IngestWindow, NormalizedSession } from "./types";
import { collectActiveNet, resetActiveNetCache } from "./activenet";

export { collectActiveNet, resetActiveNetCache };
export const collectBurnaby = collectActiveNet;

export async function fetchBurnabySessions(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  return collectActiveNet(facility, window, log);
}
