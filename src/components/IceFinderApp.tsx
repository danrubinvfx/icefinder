"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, MapPin, ShieldHalf, Snowflake, RefreshCw, SearchX, Building2 } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/domain";
import type { FeedPayload, SessionDTO } from "@/lib/queries";
import {
  addDaysYmd,
  formatDayHeading,
  formatDayNumber,
  formatTime,
  localYmd,
  relativeTime,
  shortDow,
  weekendDays,
} from "@/lib/time";
import { SessionCard, goalieNeeded } from "./SessionCard";
import { SponsorCard } from "./SponsorCard";

type DateMode = "today" | "tomorrow" | "3days" | "week" | "weekend" | "pick";
type CategoryFilter = "all" | Category;

const REFRESH_MS = 60_000;
const LOCATIONS = [
  { value: "burnaby", label: "Burnaby, BC", enabled: true },
  { value: "vancouver", label: "Vancouver, BC (soon)", enabled: false },
  { value: "coquitlam", label: "Coquitlam, BC (soon)", enabled: false },
  { value: "richmond", label: "Richmond, BC (soon)", enabled: false },
  { value: "north-van", label: "North Vancouver, BC (soon)", enabled: false },
];

function Pill({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 ${
        active ? "bg-ice-900 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] tabular-nums ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full pl-1.5 pr-3.5 text-sm font-semibold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 ${
        checked ? "bg-emerald-50 text-emerald-800 ring-emerald-300" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100"
      }`}
    >
      <span className={`relative h-6 w-10 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {icon}
      {label}
    </button>
  );
}

export function IceFinderApp({ initialFeed }: { initialFeed: FeedPayload }) {
  const [feed, setFeed] = useState(initialFeed);
  // `now` starts at the server render time so the first client render matches SSR exactly.
  const [now, setNow] = useState(() => new Date(initialFeed.generatedAt).getTime());
  const [refreshing, setRefreshing] = useState(false);

  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [pickedDate, setPickedDate] = useState<string>("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [goalieOnly, setGoalieOnly] = useState(false);
  const [facility, setFacility] = useState<string>("all");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      router.refresh();
      const res = await fetch("/api/sessions", {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const nextFeed = await res.json();
        setFeed(nextFeed);
      }
    } catch (err) {
      console.warn("Manual refresh fallback:", err);
    } finally {
      setRefreshing(false);
      setNow(Date.now());
    }
  }, [router]);

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const poll = setInterval(refresh, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const today = localYmd(new Date(now));
  const selectedDays = useMemo<string[]>(() => {
    switch (dateMode) {
      case "today":
        return [today];
      case "tomorrow":
        return [addDaysYmd(today, 1)];
      case "3days":
        return [0, 1, 2].map((i) => addDaysYmd(today, i));
      case "week":
        return [0, 1, 2, 3, 4, 5, 6].map((i) => addDaysYmd(today, i));
      case "weekend":
        return weekendDays(today);
      case "pick":
        return pickedDate ? [pickedDate] : [today];
    }
  }, [dateMode, pickedDate, today]);

  // Pre-index day key once per feed so filter toggles are O(n) with no date parsing.
  const indexed = useMemo(
    () => feed.sessions.map((s) => ({ s, day: localYmd(s.startTime), endMs: new Date(s.endTime).getTime() })),
    [feed.sessions],
  );

  const baseFiltered = useMemo(() => {
    const days = new Set(selectedDays);
    return indexed.filter(
      ({ s, day, endMs }) =>
        days.has(day) &&
        endMs > now &&
        (facility === "all" || s.facilitySlug === facility) &&
        (!openOnly || s.source === "schedule" || s.openSpots > 0) &&
        (!goalieOnly || goalieNeeded(s)),
    );
  }, [indexed, selectedDays, now, facility, openOnly, goalieOnly]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: baseFiltered.length };
    for (const c of CATEGORIES) counts[c] = 0;
    for (const { s } of baseFiltered) counts[s.category]++;
    return counts;
  }, [baseFiltered]);

  const visible = useMemo(
    () => baseFiltered.filter(({ s }) => category === "all" || s.category === category),
    [baseFiltered, category],
  );

  const groups = useMemo(() => {
    const map = new Map<string, SessionDTO[]>();
    for (const { s, day } of visible) {
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    // Sort each day block: strictly chronological, prioritizing figure_buyon when start times match
    for (const list of map.values()) {
      list.sort((a, b) => {
        const diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (diff !== 0) return diff;
        const prioA = a.category === "figure_buyon" ? 0 : 1;
        const prioB = b.category === "figure_buyon" ? 0 : 1;
        return prioA - prioB;
      });
    }
    return [...map.entries()];
  }, [visible]);

  // Per-day counts for the quick ribbon in week/multi-day views
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of selectedDays) counts[d] = 0;
    for (const { day } of visible) {
      if (counts[day] !== undefined) counts[day]++;
    }
    return counts;
  }, [selectedDays, visible]);

  const lastSyncAt = feed.lastSync?.at;
  const syncAgeMin = lastSyncAt ? (now - new Date(lastSyncAt).getTime()) / 60_000 : Infinity;
  const syncTone = syncAgeMin < 30 ? "fresh" : syncAgeMin < 180 ? "stale" : "old";

  const openPicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  const pickLabel =
    dateMode === "pick" && pickedDate
      ? new Date(`${pickedDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      : "Pick Date";

  const resetFilters = () => {
    setCategory("all");
    setOpenOnly(false);
    setGoalieOnly(false);
    setFacility("all");
  };

  const scrollToDay = (day: string) => {
    const el = document.getElementById(`day-${day}`);
    if (el) {
      const yOffset = -150;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  let cardIndex = 0;
  const sponsorAfter = Math.min(2, Math.max(visible.length - 1, 0));

  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-16">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="IceFinder home">
            <span className="grid size-9 place-items-center rounded-xl bg-ice-600 text-white shadow-sm ring-1 ring-ice-700/20">
              <Snowflake className="size-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <span className="text-base font-extrabold tracking-tight text-slate-900">IceFinder</span>
              <span className="ml-1.5 hidden text-xs font-semibold text-slate-400 min-[420px]:inline">Metro Van</span>
            </div>
          </Link>

          {/* Desktop location selector */}
          <div className="hidden items-center gap-1.5 text-sm sm:flex">
            <MapPin className="size-4 text-ice-600" aria-hidden />
            <label className="relative">
              <span className="sr-only">Location</span>
              <select
                defaultValue="burnaby"
                className="appearance-none bg-transparent pr-5 font-semibold text-slate-800 focus:outline-none"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value} disabled={!l.enabled}>
                    {l.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            </label>
          </div>

          <div className="flex-1" />

          {/* Refresh / sync button */}
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            title={lastSyncAt ? `Synced at ${formatTime(lastSyncAt)}` : undefined}
            aria-label="Refresh feed"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-slate-600 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500"
          >
            <span
              className={`size-2 rounded-full ${
                syncTone === "fresh" ? "bg-emerald-500" : syncTone === "stale" ? "bg-amber-500" : "bg-slate-400"
              }`}
              aria-hidden
            />
            <span className="tabular-nums" suppressHydrationWarning>
              {lastSyncAt ? (
                <>
                  <span className="hidden min-[400px]:inline">Live · </span>synced {formatTime(lastSyncAt)}
                </>
              ) : (
                "Awaiting first sync"
              )}
            </span>
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>

        {/* Mobile location row */}
        <div className="flex items-center gap-1.5 px-4 pb-2 text-sm sm:hidden">
          <MapPin className="size-4 text-ice-600" aria-hidden />
          <label className="relative">
            <span className="sr-only">Location</span>
            <select
              defaultValue="burnaby"
              className="appearance-none bg-transparent pr-5 font-semibold text-slate-800 focus:outline-none"
            >
              {LOCATIONS.map((l) => (
                <option key={l.value} value={l.value} disabled={!l.enabled}>
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          </label>
        </div>

        {/* Date / Timeframe pills */}
        <nav aria-label="Timeframe" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          <Pill active={dateMode === "today"} onClick={() => setDateMode("today")}>
            Today
          </Pill>
          <Pill active={dateMode === "tomorrow"} onClick={() => setDateMode("tomorrow")}>
            Tomorrow
          </Pill>
          <Pill active={dateMode === "3days"} onClick={() => setDateMode("3days")}>
            Next 3 Days
          </Pill>
          <Pill active={dateMode === "week"} onClick={() => setDateMode("week")}>
            Next 7 Days
          </Pill>
          <Pill active={dateMode === "weekend"} onClick={() => setDateMode("weekend")}>
            This Weekend
          </Pill>
          <span className="relative shrink-0">
            <Pill active={dateMode === "pick"} onClick={openPicker}>
              <CalendarDays className="size-4" aria-hidden />
              <span suppressHydrationWarning>{pickLabel}</span>
            </Pill>
            <input
              ref={dateInputRef}
              type="date"
              aria-label="Pick a date"
              min={today}
              max={addDaysYmd(today, 14)}
              value={pickedDate}
              onChange={(e) => {
                setPickedDate(e.target.value);
                if (e.target.value) setDateMode("pick");
              }}
              className="pointer-events-none absolute inset-0 opacity-0"
              tabIndex={-1}
            />
          </span>
        </nav>

        {/* Category pills */}
        <nav aria-label="Category" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          <Pill active={category === "all"} onClick={() => setCategory("all")} count={categoryCounts.all}>
            All
          </Pill>
          {CATEGORIES.map((c) => (
            <Pill key={c} active={category === c} onClick={() => setCategory(c)} count={categoryCounts[c]}>
              {CATEGORY_LABELS[c]}
            </Pill>
          ))}
        </nav>

        {/* Toggles + facility */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-3">
          <Toggle checked={openOnly} onChange={setOpenOnly} label="Open Spots Only" />
          <Toggle
            checked={goalieOnly}
            onChange={setGoalieOnly}
            label="Goalie Needed"
            icon={<ShieldHalf className="size-4" aria-hidden />}
          />
          <label className="relative shrink-0">
            <span className="sr-only">Facility</span>
            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="h-9 appearance-none rounded-full bg-white pl-9 pr-8 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-ice-500"
            >
              <option value="all">All arenas</option>
              {feed.facilities.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.shortName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          </label>
        </div>
      </header>

      {/* ── Feed ─────────────────────────────────────────────── */}
      <main className="space-y-6 px-4 pt-4">
        {/* Quick Day-Selector Ribbon for 7-Day / Multi-Day View */}
        {(dateMode === "week" || dateMode === "3days") && selectedDays.length > 1 && (
          <div className="sticky top-14 z-10 -mx-4 border-b border-slate-200/80 bg-slate-50/95 px-4 py-2 backdrop-blur">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              <span className="shrink-0 pr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Jump to:
              </span>
              {selectedDays.map((d) => {
                const count = dayCounts[d] ?? 0;
                const dObj = new Date(`${d}T12:00:00Z`);
                const isToday = d === today;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => scrollToDay(d)}
                    disabled={count === 0}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      count > 0
                        ? "border-slate-200 bg-white text-slate-800 shadow-2xs hover:border-ice-400 hover:bg-ice-50/60 active:scale-95"
                        : "border-slate-100 bg-slate-100/60 text-slate-400 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase text-slate-500">{shortDow(dObj)}</span>
                    <span className="font-bold tabular-nums text-slate-900">{formatDayNumber(dObj)}</span>
                    {isToday && (
                      <span className="rounded-full bg-ice-100 px-1 text-[10px] font-bold text-ice-700">Today</span>
                    )}
                    <span
                      className={`min-w-4 rounded-full px-1 text-center text-[10px] font-bold tabular-nums ${
                        count > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          {visible.length} session{visible.length === 1 ? "" : "s"}
          {goalieOnly ? " needing a goalie" : ""} · {feed.facilities.length} Burnaby arenas
          {dateMode === "week" ? " · Next 7 Days" : dateMode === "3days" ? " · Next 3 Days" : ""}
        </p>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <SearchX className="size-8 text-slate-400" aria-hidden />
            <p className="font-semibold text-slate-800">No ice matches those filters</p>
            <p className="max-w-xs text-sm text-slate-500">
              {dateMode === "today"
                ? "Today's sessions may have already finished for the day. Check the upcoming week or switch filters."
                : "Try another timeframe, switch arenas, or turn off \u201cOpen Spots Only\u201d."}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {dateMode === "today" && (
                <button
                  type="button"
                  onClick={() => setDateMode("week")}
                  className="h-9 rounded-full bg-ice-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-ice-700"
                >
                  View Next 7 Days
                </button>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Reset filters
              </button>
            </div>
          </div>
        ) : (
          groups.map(([day, sessions]) => (
            <section key={day} aria-labelledby={`day-${day}`} className="space-y-3">
              {(groups.length > 1 || dateMode !== "today") && (
                <div id={`day-${day}`} className="scroll-mt-36 pt-2 pb-1">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      {day === today ? `Today · ${formatDayHeading(sessions[0].startTime)}` : formatDayHeading(sessions[0].startTime)}
                    </h2>
                    <span className="text-xs font-semibold text-slate-400">
                      {sessions.length} session{sessions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              )}
              {sessions.map((s) => {
                const i = cardIndex++;
                return (
                  <div key={s.id} className="space-y-3">
                    <SessionCard s={s} relUpdated={relativeTime(s.updatedAt, now)} />
                    {i === sponsorAfter && <SponsorCard nextSession={visible[0]?.s} />}
                  </div>
                );
              })}
            </section>
          ))
        )}

        <footer className="pt-6 text-center text-xs leading-relaxed text-slate-400">
          Data from City of Burnaby WebReg (ActiveNet) and Canlan Sports (DaySmart). Always confirm on the booking
          site. <br />
          icefinder.ca · Built in Burnaby, BC
        </footer>
      </main>
    </div>
  );
}
