"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, MapPin, ShieldHalf, Snowflake, RefreshCw, SearchX, Building2 } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/domain";
import type { FeedPayload, SessionDTO } from "@/lib/queries";
import { addDaysYmd, formatDayHeading, formatTime, localYmd, relativeTime, weekendDays } from "@/lib/time";
import { SessionCard, goalieNeeded } from "./SessionCard";
import { SponsorCard } from "./SponsorCard";

type DateMode = "today" | "tomorrow" | "weekend" | "pick";
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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" });
      if (res.ok) setFeed(await res.json());
    } finally {
      setRefreshing(false);
      setNow(Date.now());
    }
  }, []);

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

  let cardIndex = 0;
  const sponsorAfter = Math.min(2, Math.max(visible.length - 1, 0));

  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-16">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="IceFinder home">
            <span className="grid size-8 place-items-center rounded-lg bg-ice-900 text-sky-300">
              <Snowflake className="size-5" aria-hidden />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ice-900">
              Ice<span className="text-ice-600">Finder</span>
            </span>
          </Link>

          <label className="relative ml-1 hidden items-center sm:flex">
            <span className="sr-only">Location</span>
            <MapPin className="pointer-events-none absolute left-2.5 size-4 text-slate-400" aria-hidden />
            <select
              defaultValue="burnaby"
              className="h-9 appearance-none rounded-full bg-white pl-8 pr-8 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-ice-500"
            >
              {LOCATIONS.map((l) => (
                <option key={l.value} value={l.value} disabled={!l.enabled}>
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-slate-400" aria-hidden />
          </label>

          <button
            type="button"
            onClick={refresh}
            className="ml-auto inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
            title={lastSyncAt ? `Last sync ${new Date(lastSyncAt).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}` : "No sync yet"}
          >
            <span
              className={`size-2 rounded-full ${
                syncTone === "fresh" ? "live-dot bg-emerald-500" : syncTone === "stale" ? "bg-amber-500" : "bg-slate-400"
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

        {/* Date pills */}
        <nav aria-label="Date" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          <Pill active={dateMode === "today"} onClick={() => setDateMode("today")}>
            Today
          </Pill>
          <Pill active={dateMode === "tomorrow"} onClick={() => setDateMode("tomorrow")}>
            Tomorrow
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
        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          {visible.length} session{visible.length === 1 ? "" : "s"}
          {goalieOnly ? " needing a goalie" : ""} · {feed.facilities.length} Burnaby arenas
        </p>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <SearchX className="size-8 text-slate-400" aria-hidden />
            <p className="font-semibold text-slate-800">No ice matches those filters</p>
            <p className="max-w-xs text-sm text-slate-500">
              Try another day, switch arenas, or turn off &ldquo;Open Spots Only&rdquo;.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-1 h-9 rounded-full bg-ice-900 px-4 text-sm font-semibold text-white hover:bg-ice-700"
            >
              Reset filters
            </button>
          </div>
        ) : (
          groups.map(([day, sessions]) => (
            <section key={day} aria-labelledby={`day-${day}`} className="space-y-3">
              {(groups.length > 1 || dateMode !== "today") && (
                <h2 id={`day-${day}`} className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {day === today ? "Today" : formatDayHeading(sessions[0].startTime)}
                </h2>
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
