"use client";

import React from "react";
import Link from "next/link";
import { Snowflake, MapPin, ChevronDown, RefreshCw } from "lucide-react";
import { MUNICIPALITIES, type Municipality } from "@/lib/domain";
import { formatTime } from "@/lib/time";

export interface HeaderProps {
  municipality: Municipality;
  onSelectMunicipality: (m: Municipality) => void;
  municipalityCounts: Record<Municipality, number>;
  refreshing: boolean;
  onRefresh: () => void;
  mounted: boolean;
  lastSyncAt?: string;
  syncTone: "fresh" | "stale" | "old";
  toast: string | null;
}

export function Header({
  municipality,
  onSelectMunicipality,
  municipalityCounts,
  refreshing,
  onRefresh,
  mounted,
  lastSyncAt,
  syncTone,
  toast,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/" className="inline-flex min-h-[48px] items-center gap-2" aria-label="IceFinder home">
          <span className="grid size-9 place-items-center rounded-xl bg-ice-600 text-white shadow-sm ring-1 ring-ice-700/20">
            <Snowflake className="size-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <span className="text-base font-extrabold tracking-tight text-slate-900">IceFinder</span>
            <span className="ml-1.5 hidden text-xs font-semibold text-slate-600 min-[420px]:inline">Metro Van</span>
          </div>
        </Link>

        {/* Desktop location selector */}
        <div className="hidden items-center gap-1.5 text-sm sm:flex">
          <MapPin className="size-4 text-ice-600" aria-hidden />
          <label className="relative">
            <span className="sr-only">Municipality</span>
            <select
              value={municipality}
              onChange={(e) => onSelectMunicipality(e.target.value as Municipality)}
              className="appearance-none bg-transparent pr-5 font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {MUNICIPALITIES.map((m) => (
                <option key={m} value={m}>
                  {m === "All Metro Van" ? "All Metro Vancouver" : `${m}, BC`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-slate-600" aria-hidden />
          </label>
        </div>

        {/* Direct category shortcuts for desktop */}
        <div className="hidden lg:flex items-center gap-2 pl-2 text-xs font-semibold">
          <Link
            href="/drop-in-hockey"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-ice-600 transition"
          >
            Drop-In Hockey
          </Link>
          <Link
            href="/stick-and-puck"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-ice-600 transition"
          >
            Stick &amp; Puck
          </Link>
        </div>

        <div className="flex-1" />

        {/* Refresh / sync button */}
        <div className="relative">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title={mounted && lastSyncAt ? `Synced at ${formatTime(lastSyncAt)}` : undefined}
            aria-label="Refresh feed"
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 cursor-pointer disabled:cursor-not-allowed"
          >
            <span
              className={`size-2 rounded-full ${
                refreshing ? "bg-ice-500 animate-pulse" : syncTone === "fresh" ? "bg-emerald-500" : syncTone === "stale" ? "bg-amber-500" : "bg-slate-500"
              }`}
              aria-hidden
            />
            <span className="tabular-nums" suppressHydrationWarning>
              {refreshing ? (
                "Checking live ice..."
              ) : !mounted ? (
                <>
                  <span className="hidden min-[400px]:inline">Live · </span>synced
                </>
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

      {/* Main Header Nav Ribbon: Municipalities + Accessible Category Cross-Links */}
      <nav
        aria-label="Municipality and Sport Categories"
        className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-2"
      >
        {MUNICIPALITIES.map((m) => {
          const active = municipality === m;
          const count = municipalityCounts[m];
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMunicipality(m)}
              aria-pressed={active}
              className={`inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 cursor-pointer ${
                active ? "bg-ice-900 text-white shadow-sm" : "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100"
              }`}
            >
              {m}
              {count !== undefined && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-[11px] tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 font-bold"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <span className="h-6 w-px bg-slate-300 shrink-0 mx-1" aria-hidden />
        <Link
          href="/drop-in-hockey"
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500"
        >
          <span>🏒</span> Drop-In Hockey
        </Link>
        <Link
          href="/stick-and-puck"
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500"
        >
          <span>🏒</span> Stick &amp; Puck
        </Link>
      </nav>
    </header>
  );
}
