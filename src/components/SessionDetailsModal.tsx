"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import {
  X,
  Clock,
  MapPin,
  Sparkles,
  Info,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Building2,
  Calendar,
  Navigation,
  DollarSign,
  Footprints,
  CheckCircle2,
} from "lucide-react";
import { CATEGORY_SHORT, FACILITIES, isSpecialSession } from "@/lib/domain";
import { extractSessionRequirements, sanitizeSessionNotes } from "@/lib/normalize";
import { formatDayHeading, formatTimeRange } from "@/lib/time";
import { resolveBookingUrl } from "@/lib/links";
import type { SessionDTO } from "@/lib/queries";

export interface SessionDetailsModalProps {
  session: SessionDTO;
  isOpen: boolean;
  onClose: () => void;
}

const FACILITY_BY_SLUG = new Map(FACILITIES.map((f) => [f.slug, f]));

function getRequirementBadgeStyle(req: string): string {
  if (req === "Women+ / 19+") {
    return "bg-purple-50 text-purple-800 ring-1 ring-purple-200 font-bold";
  }
  if (req === "Figure Skates Only" || req === "Prior Experience Required" || req === "No Coaches Allowed") {
    return "bg-rose-50 text-rose-800 ring-1 ring-rose-200 font-bold";
  }
  if (req === "Coquitlam Skate Club" || req === "Coaches Free") {
    return "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200 font-semibold";
  }
  return "bg-amber-50/90 text-amber-900 ring-1 ring-amber-200/90 font-semibold";
}

export function SessionDetailsModal({ session, isOpen, onClose }: SessionDetailsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSpecial = isSpecialSession(session);
  const isWalkIn =
    session.category === "public_skate" || Boolean(session.is_walkin) || session.source === "schedule";
  const isReservable =
    !isWalkIn &&
    (session.category === "hockey_dropin" ||
      session.category === "stick_and_puck" ||
      session.category === "figure_buyon");
  const full = isReservable && session.source !== "schedule" && session.openSpots <= 0;

  const facilityMeta = FACILITY_BY_SLUG.get(session.facilitySlug);
  const facilityAddress = facilityMeta?.address ?? `${session.facilityName}, ${session.municipality}, BC`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${session.facilityName}, ${facilityAddress}`,
  )}`;

  const cleanNotes = sanitizeSessionNotes(session.notes);
  const requirements =
    session.requirements && session.requirements.length > 0
      ? session.requirements
      : extractSessionRequirements(cleanNotes, session.rawTitle);

  const destinationUrl = resolveBookingUrl({
    bookingUrl: session.bookingUrl,
    category: session.category,
    bookingPlatform: session.bookingPlatform,
    activityId: session.activityId,
    externalId: session.externalId,
    external_id: session.external_id,
    facilitySlug: session.facilitySlug,
    municipality: session.municipality,
    source: session.source,
    rawTitle: session.rawTitle,
  });

  const handleOutboundClick = () => {
    track("outbound_click", {
      facility_slug: session.facilitySlug,
      category: session.category,
      title: session.rawTitle,
    });
  };

  const cta =
    session.bookingPlatform === "canlan"
      ? "Register"
      : isReservable
      ? "Book on City Site"
      : "Session Details";

  // Compute sheet name and title formatted as "[Facility Name] • [Session Title]"
  // (e.g., "Poirier Ice Arena 2 • Figure Skating Buy-On")
  const sheetName = session.rink
    ? session.rink.includes("Poirier") || session.rink.includes("Arena") || session.rink.includes("Rink")
      ? session.rink.includes("Poirier")
        ? session.rink
        : session.facilitySlug === "poirier"
        ? `Poirier Ice ${session.rink}`
        : `${session.facilityShort} ${session.rink}`
      : `${session.facilityShort} • ${session.rink}`
    : session.facilitySlug === "poirier"
    ? "Poirier Ice Arena 2"
    : `${session.facilityName} • Main Arena Pad`;

  const specialModalTitle = session.facilitySlug === "poirier"
    ? `${sheetName} • ${session.rawTitle}`
    : `${session.facilityName} • ${session.rawTitle}`;

  const isBurnaby =
    session.municipality === "Burnaby" ||
    ["rosemary-brown", "kensington", "bill-copeland"].includes(session.facilitySlug);

  const priceDisplay = isBurnaby
    ? session.cost !== null && session.cost !== 6.4
      ? `$${session.cost.toFixed(2)} (Standard: $6.40 / Be Active Pass)`
      : "$6.40 / Be Active Pass"
    : session.municipality === "Vancouver" ||
      ["britannia", "hillcrest", "kitsilano", "trout-lake", "sunset", "killarney"].includes(session.facilitySlug)
    ? `$${(session.cost ?? 7.2).toFixed(2)}`
    : session.cost !== null
    ? `$${session.cost.toFixed(2)}`
    : "Drop-in Admission";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${session.id}`}
      onClick={onClose}
    >
      <div
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {isSpecial ? (
          // ── SPECIAL / UNLISTED SCHEDULE MODAL ─────────────────────────
          <>
            <div className="flex items-start justify-between border-b border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 px-5 py-4">
              <div className="space-y-1.5 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-300">
                    <Sparkles className="size-3 text-amber-600" aria-hidden /> Unlisted Ice
                  </span>
                  <span className="rounded-md bg-pink-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pink-800">
                    {CATEGORY_SHORT[session.category]}
                  </span>
                </div>
                <h3
                  id={`modal-title-${session.id}`}
                  className="text-lg font-extrabold tracking-tight text-slate-900"
                >
                  {specialModalTitle}
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {session.facilityName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close session details"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="space-y-4 p-5 text-sm text-slate-700">
              {/* Highlight Banner */}
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-950 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-base select-none" aria-hidden>✨</span>
                  <p className="text-xs sm:text-sm font-semibold leading-relaxed text-amber-950">
                    Special Schedule Ice Time — Found in facility schedule notices. This session is not listed on the city&apos;s online booking portal.
                  </p>
                </div>
              </div>

              {/* Session Specifications */}
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">🕒 Time</p>
                    <p className="font-bold text-slate-900">{formatTimeRange(session.startTime, session.endTime)}</p>
                    <p className="text-xs font-medium text-slate-500">{formatDayHeading(session.startTime)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 border-t border-slate-200/70 pt-2.5">
                  <DollarSign className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">💵 Admission</p>
                    <p className="font-bold text-slate-900">
                      {session.cost !== null ? `$${session.cost.toFixed(2)} / session (Coaches Free)` : "$9.00 / session (Coaches Free)"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 border-t border-slate-200/70 pt-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">📍 Sheet</p>
                    <p className="font-bold text-slate-900">{sheetName}</p>
                    <p className="text-xs font-medium text-slate-500">{session.facilityName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 border-t border-slate-200/70 pt-2.5">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">⛸️ Restrictions</p>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      Figure skates only; prior figure skating / StarSkate experience required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It’s Not on WebReg / PerfectMind */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                  <HelpCircle className="size-4 text-amber-600 shrink-0" aria-hidden />
                  Why It’s Not on WebReg / PerfectMind
                </h4>
                <p className="text-xs leading-relaxed text-slate-600">
                  Figure skating buy-ons at Poirier are operated under Coquitlam Skating Club guidelines. Payment is handled directly at the rink front desk or club skate office prior to stepping onto the ice. Online municipal pre-booking is not available through Coquitlam&apos;s portal.
                </p>
              </div>

              {/* Attendance Guidelines */}
              {cleanNotes && (
                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Attendance Guidelines
                  </p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
                    {cleanNotes}
                  </p>
                </div>
              )}

              {/* Facility Address & Actions */}
              <div className="space-y-2.5 rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Facility Address</p>
                    <p className="font-semibold text-slate-800">{facilityAddress}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href="https://www.coquitlam.ca/384/Poirier-Sport-and-Leisure-Complex"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOutboundClick}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                  >
                    View PSLC Facility Page
                    <ExternalLink className="size-3 text-slate-500" aria-hidden />
                  </a>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOutboundClick}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 cursor-pointer"
                  >
                    <Navigation className="size-3.5" aria-hidden />
                    Get Directions in Google Maps
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
              <a
                href="https://www.coquitlam.ca/384/Poirier-Sport-and-Leisure-Complex"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOutboundClick}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
              >
                Facility website
                <ExternalLink className="size-3" aria-hidden />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          // ── STANDARD / WALK-IN SESSION MODAL ──────────────────────────
          <>
            <div className="flex items-start justify-between border-b border-slate-100 bg-teal-50/60 px-5 py-4">
              <div className="space-y-1 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-teal-800">
                    {CATEGORY_SHORT[session.category]}
                  </span>
                  {isWalkIn ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      <Footprints className="size-3" aria-hidden /> Walk-in Info
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      <Info className="size-3" aria-hidden /> Session Requirements &amp; Notes
                    </span>
                  )}
                </div>
                <h3 id={`modal-title-${session.id}`} className="text-lg font-extrabold tracking-tight text-slate-900">
                  {session.rawTitle}
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {session.facilityName}
                  {session.rink ? ` • ${session.rink}` : " • Main Arena Pad"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
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
                    <p className="font-bold text-slate-900">{formatDayHeading(session.startTime)}</p>
                    <p className="font-semibold tabular-nums text-slate-700">{formatTimeRange(session.startTime, session.endTime)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 border-t border-slate-200/70 pt-2.5">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Facility &amp; Arena Pad</p>
                    <p className="font-bold text-slate-900">{session.facilityName}</p>
                    <p className="text-xs font-medium text-slate-600">{session.rink ?? "Main Arena Pad"}</p>
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

              {requirements.length > 0 && (
                <div className="space-y-2 rounded-xl border border-rose-200/80 bg-rose-50/50 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-900">
                    <CheckCircle2 className="size-3.5 shrink-0 text-rose-600" aria-hidden />
                    Key Session Requirements
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {requirements.map((req) => (
                      <span
                        key={req}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${getRequirementBadgeStyle(req)}`}
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cleanNotes && (
                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Facility Program Notes &amp; Policies
                  </p>
                  <div className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
                    {cleanNotes}
                  </div>
                </div>
              )}

              {isWalkIn && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs leading-relaxed text-amber-950">
                  <p className="font-bold text-amber-900">Walk-In Admission Only</p>
                  <p className="mt-1 font-medium text-amber-900">
                    Admission is managed at the arena front desk. Always verify facility status before heading over.
                  </p>
                  <p className="mt-1 text-amber-800/90">
                    First-come, first-served at the facility front desk. The City of {session.municipality || "Vancouver"} does not take online pre-registration for general public skating sessions.
                  </p>
                </div>
              )}

              <div className="space-y-2.5 rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Facility Address</p>
                    <p className="font-semibold text-slate-800">{facilityAddress}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {!isWalkIn && (
                    <a
                      href={destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleOutboundClick}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ice-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-ice-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 focus-visible:ring-offset-2"
                    >
                      {full ? "Join Waitlist on City Site" : cta}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOutboundClick}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  >
                    <Navigation className="size-3.5" aria-hidden />
                    Get Directions in Google Maps
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
