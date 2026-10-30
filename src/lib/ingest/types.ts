import type { Category } from "../domain";

/** Platform-agnostic session produced by every collector before persistence. */
export interface NormalizedSession {
  facilitySlug: string;
  rawTitle: string;
  category: Category;
  rink: string | null;
  startTime: Date;
  endTime: Date;
  totalSpots: number;
  openSpots: number;
  waitlistCount: number;
  isGoalieFree: boolean;
  goalieSpots: number | null;
  goaliesRegistered: number | null;
  cost: number | null;
  bookingUrl: string;
  source: "live" | "mock" | "schedule" | "special_schedule" | "schedule_footer" | string;
  is_walkin?: boolean;
  activityId?: number | null;
  externalId: string | null;
  requirements?: string[];
  notes?: string | null;
}

export interface IngestWindow {
  from: Date; // inclusive
  to: Date; // exclusive
}

export interface IngestLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}
