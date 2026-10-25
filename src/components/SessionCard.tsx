"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Clock,
  MapPin,
  ShieldHalf,
  DollarSign,
  Users,
  Footprints,
  Info,
  X,
  Calendar,
  Navigation,
  Building2,
} from "lucide-react";
import { CATEGORY_SHORT, FACILITIES, type Category } from "@/lib/domain";
import { formatDayHeading, formatTimeRange } from "@/lib/time";
import { resolveBookingUrl } from "@/lib/links";
import type { SessionDTO } from "@/lib/queries";

const CATEGORY_STYLE: Record<Category, { bar: string; text: string; bg: string }> = {
  figure_buyon: { bar: "bg-pink-500", text: "text-pink-700 ring-1 ring-pink-300/80 font-bold", bg: "bg-pink-50" },
  hockey_dropin: { bar: "bg-ice-600", text: "text-ice-700", bg: "bg-ice-50" },
  stick_and_puck: { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  public_skate: { bar: "bg-teal-500", text: "text-teal-700", bg: "bg-teal-50" },
};

const FACILITY_BY_SLUG = new Map(FACILITIES.map((f) => [f.slug, f]));

export function goalieNeeded(s: SessionDTO) {
  return s.category === "hockey_dropin" && s.goaliesRegistered !== null && s.goaliesRegistered <= 1;
}

export function CapacityChip({ s }: { s: SessionDTO }) {
  const isWalkIn = s.category === "public_skate" || Boolean(s.is_walkin) || s.source === "schedule";
  if (isWalkIn) {
    return (
      <span
        title="First-come, first-served at the front desk. No online reservation required."
        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
      >
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
  const [modalOpen, setModalOpen] = useState(false);
  const style = CATEGORY_STYLE[s.category];
  const isWalkIn = s.category === "public_skate" || Boolean(s.is_walkin) || s.source === "schedule";
  const isReservable =
    !isWalkIn &&
    (s.category === "hockey_dropin" ||
      s.category === "stick_and_puck" ||
      s.category === "figure_buyon");
  const full = isReservable && s.source !== "schedule" && s.openSpots <= 0;
  const needsGoalie = goalieNeeded(s);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const cta =
    s.bookingPlatform === "canlan"
      ? "Register"
      : isReservable
      ? "Book on City Site"
      : "Session Details";

  const destinationUrl = resolveBookingUrl({
    bookingUrl: s.bookingUrl,
    category: s.category,
    bookingPlatform: s.bookingPlatform,
    activityId: s.activityId,
    externalId: s.externalId,
    external_id: s.external_id,
    facilitySlug: s.facilitySlug,
    municipality: s.municipality,
    source: s.source,
    rawTitle: s.rawTitle,
  });

  const facilityMeta = FACILITY_BY_SLUG.get(s.facilitySlug);
  const facilityAddress = facilityMeta?.address ?? `${s.facilityName}, ${s.municipality}, BC`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${s.facilityName}, ${facilityAddress}`,
  )}`;

  const isBurnaby =
    s.municipality === "Burnaby" ||
    ["rosemary-brown", "kensington", "bill-copeland"].includes(s.facilitySlug);

  const priceDisplay = isBurnaby
    ? s.cost !== null && s.cost !== 6.4
      ? `$${s.cost.toFixed(2)} (Standard: $6.40 / Be Active Pass)`
      : "$6.40 / Be Active Pass"
    : s.municipality === "Vancouver" ||
      ["britannia", "hillcrest", "kitsilano", "trout-lake", "sunset", "killarney"].includes(s.facilitySlug)
    ? `$${(s.cost ?? 7.2).toFixed(2)}`
    : s.cost !== null
    ? `$${s.cost.toFixed(2)}`
    : "Drop-in Admission";

  return (
    <>
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

            {isWalkIn && (
              <p className="text-xs text-slate-500">
                First-come, first-served at the front desk. No online reservation required.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
            <CapacityChip s={s} />
            {isWalkIn ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                Session Details
                <Info className="size-3.5" aria-hidden />
              </button>
            ) : (
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
            )}
          </div>
        </div>
        <p className="border-t border-slate-100 px-5 py-1.5 text-[11px] text-slate-400" suppressHydrationWarning>
          {s.source === "schedule" ? "Published schedule" : `Spots updated ${relUpdated}`}
        </p>
      </article>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`modal-title-${s.id}`}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 bg-teal-50/60 px-5 py-4">
              <div className="space-y-1 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-teal-800">
                    {CATEGORY_SHORT[s.category]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    <Footprints className="size-3" aria-hidden /> Walk-in Info
                  </span>
                </div>
                <h3 id={`modal-title-${s.id}`} className="text-lg font-extrabold tracking-tight text-slate-900">
                  {s.rawTitle}
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {s.facilityName}
                  {s.rink ? ` • ${s.rink}` : " • Main Arena Pad"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close session details"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="space-y-4 p-5 text-sm text-slate-700">
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80">
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date &amp; Time Window</p>
                    <p className="font-bold text-slate-900">{formatDayHeading(s.startTime)}</p>
                    <p className="font-semibold tabular-nums text-slate-700">{formatTimeRange(s.startTime, s.endTime)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 border-t border-slate-200/70 pt-2.5">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Facility &amp; Arena Pad</p>
                    <p className="font-bold text-slate-900">{s.facilityName}</p>
                    <p className="text-xs font-medium text-slate-600">{s.rink ?? "Main Arena Pad"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 border-t border-slate-200/70 pt-2.5">
                  <DollarSign className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Admission Price</p>
                    <p className="font-bold text-slate-900">{priceDisplay}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs leading-relaxed text-amber-950">
                <p className="font-bold text-amber-900">Walk-In Admission Only</p>
                <p className="mt-1">
                  First-come, first-served at the facility front desk. The City of {s.municipality || "Vancouver"} does not take online pre-registration for general public skating sessions.
                </p>
              </div>

              <div className="space-y-2.5 rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Facility Address</p>
                    <p className="font-semibold text-slate-800">{facilityAddress}</p>
                  </div>
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  <Navigation className="size-3.5" aria-hidden />
                  Get Directions in Google Maps
                </a>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
