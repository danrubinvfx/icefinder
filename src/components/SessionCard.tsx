"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import {
  ExternalLink,
  Clock,
  MapPin,
  ShieldHalf,
  DollarSign,
  Users,
  Footprints,
  Info,
  AlertCircle,
  Bell,
  Flag,
} from "lucide-react";
import { CATEGORY_SHORT, isSpecialSession, type Category } from "@/lib/domain";
import { extractSessionRequirements, sanitizeSessionNotes } from "@/lib/normalize";
import { formatTimeRange } from "@/lib/time";
import { resolveBookingUrl } from "@/lib/links";
import type { SessionDTO } from "@/lib/queries";
import { SessionDetailsModal } from "./SessionDetailsModal";
import { SpotAlertModal } from "./SpotAlertModal";
import { ReportIssueModal } from "./ReportIssueModal";

const CATEGORY_STYLE: Record<Category, { bar: string; text: string; bg: string }> = {
  figure_buyon: { bar: "bg-pink-500", text: "text-pink-700 ring-1 ring-pink-300/80 font-bold", bg: "bg-pink-50" },
  hockey_dropin: { bar: "bg-ice-600", text: "text-ice-700", bg: "bg-ice-50" },
  stick_and_puck: { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  public_skate: { bar: "bg-teal-500", text: "text-teal-700", bg: "bg-teal-50" },
};

import {
  hasGoalieNeeded,
  isGoalieFree,
  parseDivisionChips,
  goalieNeeded,
  goalieFree,
  type DivisionChip,
  type DivisionTag,
} from "@/lib/sessions";

export {
  hasGoalieNeeded,
  isGoalieFree,
  parseDivisionChips,
  goalieNeeded,
  goalieFree,
  type DivisionChip,
  type DivisionTag,
};

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
  if (req === "Lap Skate / Conditioning") {
    return "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 font-semibold";
  }
  return "bg-amber-50/90 text-amber-900 ring-1 ring-amber-200/90 font-semibold";
}

export function CapacityChip({ s }: { s: SessionDTO }) {
  if (isSpecialSession(s)) {
    return (
      <span
        title="Unlisted session sourced from facility schedule notices. Pay at arena office."
        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-amber-100/90 px-2.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300 shadow-xs"
      >
        <span aria-hidden>✨</span> Unlisted Ice
      </span>
    );
  }
  const isWalkIn =
    s.category === "public_skate" ||
    Boolean(s.is_walkin) ||
    s.source === "schedule" ||
    (s.requirements && s.requirements.includes("Lap Skate / Conditioning")) ||
    /lap\s*skat/i.test(s.rawTitle);
  if (isWalkIn) {
    return (
      <span
        title="First-come, first-served at the front desk. No online reservation required."
        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-300"
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
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const style = CATEGORY_STYLE[s.category];
  const isSpecial = isSpecialSession(s);
  const isWalkIn =
    s.category === "public_skate" ||
    Boolean(s.is_walkin) ||
    s.source === "schedule" ||
    (s.requirements && s.requirements.includes("Lap Skate / Conditioning")) ||
    /lap\s*skat/i.test(s.rawTitle);
  const isReservable =
    !isWalkIn &&
    (s.category === "hockey_dropin" ||
      s.category === "stick_and_puck" ||
      s.category === "figure_buyon");
  const full = isReservable && s.source !== "schedule" && s.openSpots <= 0;
  const needsGoalie = goalieNeeded(s);
  const isFreeGoalie = goalieFree(s);
  const divisionChips = parseDivisionChips(s);

  const cleanNotes = sanitizeSessionNotes(s.notes);
  const requirements =
    s.requirements && s.requirements.length > 0
      ? s.requirements
      : extractSessionRequirements(cleanNotes, s.rawTitle);
  const hasNotesOrReqs = Boolean(cleanNotes) || requirements.length > 0;

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

  const handleOutboundClick = () => {
    track("outbound_click", {
      facility_slug: s.facilitySlug,
      category: s.category,
      title: s.rawTitle,
    });
  };

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:shadow-md ${
          needsGoalie
            ? "ring-2 ring-emerald-500/80 hover:ring-emerald-500"
            : isSpecial
            ? "ring-amber-300/80 hover:ring-amber-400"
            : "ring-slate-200"
        }`}
      >
        <span className={`absolute inset-y-0 left-0 w-1.5 ${style.bar}`} aria-hidden />
        <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}>
                {CATEGORY_SHORT[s.category]}
              </span>
              {divisionChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80"
                >
                  {chip}
                </span>
              ))}
              {s.category === "hockey_dropin" && needsGoalie && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/85 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/40 shadow-xs animate-pulse">
                  <span aria-hidden>🥅</span> Goalie Needed
                </span>
              )}
              {s.category === "hockey_dropin" && isFreeGoalie && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900 border border-emerald-300 shadow-2xs">
                  <span aria-hidden>🆓</span> Goalie Free
                </span>
              )}
              {isSpecial && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-amber-300 shadow-2xs">
                  <span aria-hidden>✨</span> Unlisted Ice
                </span>
              )}
              {requirements.map((req) => (
                <span
                  key={req}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${getRequirementBadgeStyle(req)}`}
                >
                  <AlertCircle className="size-3 shrink-0" aria-hidden />
                  {req}
                </span>
              ))}
              {s.source === "mock" && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  Demo data
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <Clock className="size-4 shrink-0 translate-y-0.5 text-slate-500" aria-hidden />
              <p className="text-lg font-bold tabular-nums tracking-tight text-slate-900" suppressHydrationWarning>{formatTimeRange(s.startTime, s.endTime)}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-slate-700" title={s.rawTitle}>
                {s.rawTitle}
              </p>
              {hasNotesOrReqs && !isWalkIn && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-ice-50 hover:text-ice-700 hover:ring-ice-200 cursor-pointer"
                  aria-label={`More info and requirements for ${s.rawTitle}`}
                >
                  <Info className="size-3.5" aria-hidden />
                  More Info
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-slate-700">
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
                  {s.isGoalieFree && <span className="font-semibold text-emerald-700">· free</span>}
                </span>
              )}
              {s.source !== "schedule" && s.source !== "special_schedule" && s.totalSpots > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" aria-hidden />
                  {s.totalSpots - s.openSpots}/{s.totalSpots}
                </span>
              )}
            </div>

            {isSpecial ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-xs font-medium text-amber-800">
                  ✨ Special schedule ice time. Sourced from facility notice. Pay at arena office.
                </p>
                {s.facilitySlug === "poirier" && (
                  <Link
                    href="/schedules/coquitlam-poirier"
                    className="text-[11px] font-bold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    View Full Poirier Schedule Table
                  </Link>
                )}
              </div>
            ) : isWalkIn ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-xs font-medium text-slate-700">
                  First-come, first-served at the front desk. No online reservation required.
                </p>
                {s.facilitySlug === "poirier" && (
                  <Link
                    href="/schedules/coquitlam-poirier"
                    className="text-[11px] font-bold text-teal-800 underline underline-offset-2 hover:text-teal-950"
                  >
                    View Full Poirier Schedule Table
                  </Link>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
            <CapacityChip s={s} />
            {isSpecial ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                <Info className="size-3.5" aria-hidden />
                Session Info
              </button>
            ) : isWalkIn ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                Session Details
                <Info className="size-3.5" aria-hidden />
              </button>
            ) : full ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAlertModalOpen(true)}
                  className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <Bell className="size-3.5" aria-hidden />
                  Spot Drop Alert
                </button>
                <a
                  href={destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOutboundClick}
                  className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-200 focus:outline-none cursor-pointer"
                  title="Open booking site"
                >
                  Waitlist
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
            ) : (
              <a
                href={destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOutboundClick}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ice-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-ice-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 focus-visible:ring-offset-2"
              >
                {cta}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2 text-xs font-medium text-slate-600">
          <p suppressHydrationWarning>
            {isSpecial
              ? "⭐ Special Schedule · Offline Notice"
              : s.source === "schedule"
              ? "Published schedule"
              : `Spots updated ${relUpdated}`}
          </p>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1 text-xs text-slate-600 hover:text-amber-700 transition cursor-pointer"
            title="Report an issue with this session"
            aria-label={`Report an issue with ${s.rawTitle}`}
          >
            <Flag className="size-3.5" aria-hidden />
            <span>Report issue</span>
          </button>
        </div>
      </article>

      <SessionDetailsModal session={s} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <SpotAlertModal session={s} isOpen={alertModalOpen} onClose={() => setAlertModalOpen(false)} />
      <ReportIssueModal session={s} isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
    </>
  );
}
