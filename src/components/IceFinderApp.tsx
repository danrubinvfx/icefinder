"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, MapPin, ShieldHalf, Snowflake, RefreshCw, SearchX, Building2 } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, MUNICIPALITIES, type Category, type Municipality } from "@/lib/domain";
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

  const [municipality, setMunicipality] = useState<Municipality>("All Metro Van");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [pickedDate, setPickedDate] = useState<string>("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [goalieOnly, setGoalieOnly] = useState(false);
  const [facility, setFacility] = useState<string>("all");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [toast, setToast] = useState<string | null>(null);

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

  const handleManualRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const syncRes = await fetch("/api/sync/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(120_000),
      });
      const data = await syncRes.json();
      if (data.status === "cached") {
        setToast("Already up to date");
      } else if (data.status === "refreshed") {
        setToast("Live sweep complete");
      }
      setTimeout(() => setToast(null), 2500);

      // Re-fetch sessions to update UI
      const res = await fetch("/api/sessions", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const nextFeed = await res.json();
        setFeed(nextFeed);
      }
      router.refresh();
    } catch (err) {
      console.warn("Manual refresh failed:", err);
      setToast("Refresh failed");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setRefreshing(false);
      setNow(Date.now());
    }
  }, [refreshing, router]);

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

  const availableFacilities = useMemo(() => {
    if (municipality === "All Metro Van") return feed.facilities;
    return feed.facilities.filter((f) => f.municipality === municipality);
  }, [feed.facilities, municipality]);

  // If active facility is not in current municipality, reset facility to "all"
  useEffect(() => {
    if (facility !== "all" && !availableFacilities.some((f) => f.slug === facility)) {
      setFacility("all");
    }
  }, [municipality, facility, availableFacilities]);

  const municipalityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of MUNICIPALITIES) counts[m] = 0;
    const days = new Set(selectedDays);
    for (const { s, day, endMs } of indexed) {
      if (days.has(day) && endMs > now) {
        counts["All Metro Van"] = (counts["All Metro Van"] || 0) + 1;
        if (s.municipality && counts[s.municipality] !== undefined) {
          counts[s.municipality]++;
        }
      }
    }
    return counts;
  }, [indexed, selectedDays, now]);

  const baseFiltered = useMemo(() => {
    const days = new Set(selectedDays);
    return indexed.filter(
      ({ s, day, endMs }) =>
        days.has(day) &&
        endMs > now &&
        (municipality === "All Metro Van" || s.municipality === municipality) &&
        (facility === "all" || s.facilitySlug === facility) &&
        (!openOnly || s.source === "schedule" || s.openSpots > 0) &&
        (!goalieOnly || goalieNeeded(s)),
    );
  }, [indexed, selectedDays, now, municipality, facility, openOnly, goalieOnly]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const c of CATEGORIES) counts[c] = 0;
    const days = new Set(selectedDays);
    for (const { s, day, endMs } of indexed) {
      if (
        days.has(day) &&
        endMs > now &&
        (municipality === "All Metro Van" || s.municipality === municipality) &&
        (facility === "all" || s.facilitySlug === facility) &&
        (!openOnly || s.source === "schedule" || s.openSpots > 0) &&
        (!goalieOnly || goalieNeeded(s))
      ) {
        counts.all++;
        counts[s.category] = (counts[s.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [indexed, selectedDays, now, municipality, facility, openOnly, goalieOnly]);

  const visible = useMemo(() => {
    return baseFiltered.filter(({ s }) => {
      if (category !== "all" && s.category !== category) return false;
      return true;
    });
  }, [baseFiltered, category]);

  // Group visible sessions by local date (YYYY-MM-DD)
  const groups = useMemo(() => {
    const map = new Map<string, SessionDTO[]>();
    for (const { s, day } of visible) {
      const list = map.get(day);
      if (list) list.push(s);
      else map.set(day, [s]);
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
    setMunicipality("All Metro Van");
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
              <span className="sr-only">Municipality</span>
              <select
                value={municipality}
                onChange={(e) => {
                  setMunicipality(e.target.value as Municipality);
                  setFacility("all");
                }}
                className="appearance-none bg-transparent pr-5 font-semibold text-slate-800 focus:outline-none"
              >
                {MUNICIPALITIES.map((m) => (
                  <option key={m} value={m}>
                    {m === "All Metro Van" ? "All Metro Vancouver" : `${m}, BC`}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            </label>
          </div>

          <div className="flex-1" />

          {/* Refresh / sync button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title={lastSyncAt ? `Synced at ${formatTime(lastSyncAt)}` : undefined}
              aria-label="Refresh feed"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-slate-600 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 cursor-pointer disabled:cursor-not-allowed"
            >
              <span
                className={`size-2 rounded-full ${
                  refreshing ? "bg-ice-500 animate-pulse" : syncTone === "fresh" ? "bg-emerald-500" : syncTone === "stale" ? "bg-amber-500" : "bg-slate-400"
                }`}
                aria-hidden
              />
              <span className="tabular-nums" suppressHydrationWarning>
                {refreshing ? (
                  "Checking live ice..."
                ) : lastSyncAt ? (
                  <>
                    <span className="hidden min-[400px]:inline">Live · </span>synced {formatTime(lastSyncAt)}
                  </>
                ) : (
                  "Awaiting first sync"
                )}
              </span>
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-ice-600" : ""}`} aria-hidden />
            </button>
            {toast && (
              <div
                role="status"
                className="pointer-events-none absolute right-0 top-full mt-1.5 z-30 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg transition-all animate-in fade-in"
              >
                {toast}
              </div>
            )}
          </div>
        </div>

        {/* Municipality Filter Ribbon */}
        <nav aria-label="Municipality" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          {MUNICIPALITIES.map((m) => (
            <Pill
              key={m}
              active={municipality === m}
              onClick={() => {
                setMunicipality(m);
                setFacility("all");
              }}
              count={municipalityCounts[m]}
            >
              {m}
            </Pill>
          ))}
        </nav>

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

        {/* Toggles + facility dropdown */}
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
              <option value="all">
                {municipality === "All Metro Van" ? "All arenas" : `All ${municipality} arenas`}
              </option>
              {availableFacilities.map((f) => (
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
              <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                Jump to:
              </span>
              {selectedDays.map((d) => {
                const dayDate = new Date(`${d}T12:00:00Z`);
                const isCurrentToday = d === today;
                const count = dayCounts[d] ?? 0;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => scrollToDay(d)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100 hover:text-ice-600 transition"
                  >
                    <span>{shortDow(dayDate)}</span>
                    <span className="font-bold">{formatDayNumber(dayDate)}</span>
                    {isCurrentToday && (
                      <span className="text-[10px] uppercase font-bold text-ice-600 ml-0.5">· today</span>
                    )}
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500 tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-xs">
            <SearchX className="mx-auto size-10 text-slate-300" aria-hidden />
            <h2 className="mt-3 text-base font-bold text-slate-800">No sessions match your filters</h2>
            <p className="mt-1 text-sm text-slate-500">
              {dateMode === "today"
                ? "Today's sessions may have already finished for the day. Check the upcoming week, switch municipality, or clear filters."
                : "Try widening your date range, switching municipality, or turning off \u201cOpen Spots Only\u201d."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
          Data from Burnaby, Vancouver, Richmond, Coquitlam, Delta & Canlan Sports. Always confirm on the booking
          site. <br />
          icefinder.ca · Built for Metro Vancouver skaters
        </footer>
      </main>
    </div>
  );
}
