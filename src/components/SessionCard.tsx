"use client";

import { ExternalLink, Clock, MapPin, ShieldHalf, DollarSign, Users, Footprints } from "lucide-react";
import { CATEGORY_SHORT, type Category } from "@/lib/domain";
import { formatTimeRange } from "@/lib/time";
import { resolveBookingUrl } from "@/lib/links";
import type { SessionDTO } from "@/lib/queries";

const CATEGORY_STYLE: Record<Category, { bar: string; text: string; bg: string }> = {
  figure_buyon: { bar: "bg-pink-500", text: "text-pink-700 ring-1 ring-pink-300/80 font-bold", bg: "bg-pink-50" },
  hockey_dropin: { bar: "bg-ice-600", text: "text-ice-700", bg: "bg-ice-50" },
  stick_and_puck: { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  public_skate: { bar: "bg-teal-500", text: "text-teal-700", bg: "bg-teal-50" },
};

export function goalieNeeded(s: SessionDTO) {
  return s.category === "hockey_dropin" && s.goaliesRegistered !== null && s.goaliesRegistered <= 1;
}

export function CapacityChip({ s }: { s: SessionDTO }) {
  if (s.source === "schedule") {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
        <Footprints className="size-3.5" aria-hidden /> Walk-in · pay at door
      </span>
    );
  }
  if (s.openSpots <= 0) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-red-50 px-2.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        <span className="size-2 rounded-full bg-red-500" aria-hidden />
        {s.waitlistCount > 0 ? `Full · ${s.waitlistCount} on waitlist` : "Full / Waitlist"}
      </span>
    );
  }
  if (s.openSpots <= 2) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-300">
        <span className="size-2 rounded-full bg-amber-500" aria-hidden />
        {s.openSpots} spot{s.openSpots === 1 ? "" : "s"} left · Act fast
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
      {s.openSpots} spots left
    </span>
  );
}

export function SessionCard({ s, relUpdated }: { s: SessionDTO; relUpdated: string }) {
  const style = CATEGORY_STYLE[s.category];
  const full = s.source !== "schedule" && s.openSpots <= 0;
  const needsGoalie = goalieNeeded(s);
  const cta = s.bookingPlatform === "canlan" ? "Register" : s.source === "schedule" ? "View on City Site" : "Book on City Site";
  const destinationUrl = resolveBookingUrl({
    bookingUrl: s.bookingUrl,
    category: s.category,
    bookingPlatform: s.bookingPlatform,
    activityId: s.activityId,
    externalId: s.externalId,
    facilitySlug: s.facilitySlug,
  });

  return (
    <article
      className={`relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:shadow-md ${
        needsGoalie ? "ring-2 ring-amber-400" : "ring-slate-200"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${style.bar}`} aria-hidden />
      <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}>
              {CATEGORY_SHORT[s.category]}
            </span>
            {needsGoalie && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                <ShieldHalf className="size-3" aria-hidden /> Goalie needed
              </span>
            )}
            {s.source === "mock" && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Demo data
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <Clock className="size-4 shrink-0 translate-y-0.5 text-slate-400" aria-hidden />
            <p className="text-lg font-bold tabular-nums tracking-tight text-slate-900">{formatTimeRange(s.startTime, s.endTime)}</p>
          </div>
          <p className="truncate text-sm text-slate-600" title={s.rawTitle}>
            {s.rawTitle}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">
              <MapPin className="size-3" aria-hidden />
              {s.facilityShort}
              {s.rink ? ` • ${s.rink}` : ""}
            </span>
            {s.cost !== null && (
              <span className="inline-flex items-center gap-0.5">
                <DollarSign className="size-3" aria-hidden />
                {s.cost.toFixed(2)}
              </span>
            )}
            {s.goalieSpots !== null && (
              <span className="inline-flex items-center gap-1">
                <ShieldHalf className="size-3" aria-hidden />
                Goalies {s.goaliesRegistered ?? "?"}/{s.goalieSpots}
                {s.isGoalieFree && <span className="font-semibold text-emerald-600">· free</span>}
              </span>
            )}
            {s.source !== "schedule" && s.totalSpots > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {s.totalSpots - s.openSpots}/{s.totalSpots}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
          <CapacityChip s={s} />
          <a
            href={destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 focus-visible:ring-offset-2 ${
              full ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-ice-600 text-white hover:bg-ice-700"
            }`}
          >
            {full ? "Join Waitlist" : cta}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
      <p className="border-t border-slate-100 px-5 py-1.5 text-[11px] text-slate-400" suppressHydrationWarning>
        {s.source === "schedule" ? "Published schedule" : `Spots updated ${relUpdated}`}
      </p>
    </article>
  );
}
