/**
 * City of Burnaby ActiveNet ingestion scraper module.
 *
 * Implements scraping of Burnaby recreation ice drop-in sessions from ActiveNet WebReg.
 * Ensures all sessions have proper center-scoped URLs (&center_ids=180, 147, 146)
 * to prevent stale browser session filter collisions.
 *
 * Bill Copeland public skate and drop-in ice sessions route directly to
 * ActiveNet schedule search locked to center ID 146.
 */
import { FacilitySeed } from "../domain";
import { IngestLogger, IngestWindow, NormalizedSession } from "./types";
import { collectActiveNet, resetActiveNetCache } from "./activenet";
import { getBurnabyPublicSkateUrl } from "../links";

export { collectActiveNet, resetActiveNetCache };
export const collectBurnaby = collectActiveNet;

export const BILL_COPELAND_PUBLIC_SKATE_SCHEDULE_URL =
  "https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=146&viewMode=list";
export const BURNABY_DAILY_ACTIVITIES_URL =
  "https://www.burnaby.ca/recreation-and-arts/activities-and-registration/daily-activities";

export async function fetchBurnabySessions(
  facility: FacilitySeed,
  window: IngestWindow,
  log: IngestLogger,
): Promise<NormalizedSession[]> {
  const sessions = await collectActiveNet(facility, window, log);
  return sessions.map((s) => {
    if (facility.slug === "bill-copeland" && s.category === "public_skate") {
      return {
        ...s,
        bookingUrl: getBurnabyPublicSkateUrl(facility.slug),
      };
    }
    return s;
  });
}
