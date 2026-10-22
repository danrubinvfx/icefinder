import { TIMEZONE } from "./domain";

/** All date math is done in America/Vancouver so server and client render identically. */

const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "long", month: "short", day: "numeric" });
const dowFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short" });

export const localYmd = (d: Date | string) => ymdFmt.format(new Date(d));
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));
export const formatDayHeading = (d: Date | string) => dayFmt.format(new Date(d));

const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", hourCycle: "h23" });
export const localHour = (d: Date | string) => Number(hourFmt.format(new Date(d)));

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Add whole days to a YYYY-MM-DD string (calendar math, DST-safe). */
export function addDaysYmd(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function dowOfYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

export function shortDow(d: Date | string) {
  return dowFmt.format(new Date(d));
}

/** The set of local dates that make up "this weekend" (today included if it's Sat/Sun). */
export function weekendDays(todayYmd: string): string[] {
  const dow = dowOfYmd(todayYmd);
  if (dow === 6) return [todayYmd, addDaysYmd(todayYmd, 1)];
  if (dow === 0) return [todayYmd];
  const sat = addDaysYmd(todayYmd, 6 - dow);
  return [sat, addDaysYmd(sat, 1)];
}

export function relativeTime(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}
