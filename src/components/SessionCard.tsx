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
} from "lucide-react";
import { CATEGORY_SHORT, isSpecialSession, type Category } from "@/lib/domain";
import { extractSessionRequirements, sanitizeSessionNotes } from "@/lib/normalize";
import { formatTimeRange } from "@/lib/time";
import { resolveBookingUrl } from "@/lib/links";
import type { SessionDTO } from "@/lib/queries";
import { SessionDetailsModal } from "./SessionDetailsModal";

const CATEGORY_STYLE: Record<Category, { bar: string; text: string; bg: string }> = {
  figure_buyon: { bar: "bg-pink-500", text: "text-pink-700 ring-1 ring-pink-300/80 font-bold", bg: "bg-pink-50" },
  hockey_dropin: { bar: "bg-ice-600", text: "text-ice-700", bg: "bg-ice-50" },
  stick_and_puck: { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  public_skate: { bar: "bg-teal-500", text: "text-teal-700", bg: "bg-teal-50" },
};

export type DivisionChip =
  | "19+ Adult"
  | "30+"
  | "50+"
  | "Youth (11-18)"
  | "Family / All Ages"
  | "Buy-On / StarSkate";

export function goalieNeeded(s: SessionDTO): boolean {
  if (s.category !== "hockey_dropin") return false;
  if (s.goalieSpots !== null && s.goalieSpots > 0) {
    if (s.goaliesRegistered === null) return true;
    return s.goaliesRegistered < s.goalieSpots;
  }
  if (s.goaliesRegistered !== null && s.goaliesRegistered <= 1) return true;
  return /goalie\s*(needed|wanted|spots?\s*open|required)/i.test(s.rawTitle);
}

export function goalieFree(s: SessionDTO): boolean {
  if (s.category !== "hockey_dropin") return false;
  return Boolean(s.isGoalieFree) || /goalies?\s*(are\s*)?(free|\$0)|free\s*(for\s*)?goalies?/i.test(s.rawTitle);
}

export function parseDivisionChips(s: SessionDTO): DivisionChip[] {
  const chips: DivisionChip[] = [];
  const t = s.rawTitle.toLowerCase();

  const is30Plus = /\b30\s*(\+|yrs|years)/i.test(t);
  const is50Plus = /\b(50|55|60)\s*(\+|yrs|years)|\bsenior/i.test(t);
  const isYouth = /\byouth\b|\b1[1-3]\s*-\s*1[7-8]\b|\bteen/i.test(t);
  const isParentChild = /\b(adult\s*&\s*child|parent\s*&?\s*tot|0\s*-\s*6)\b/i.test(t);
  const isAdult =
    !is30Plus &&
    !is50Plus &&
    !isParentChild &&
    (/\b(18|19)\s*(\+|yrs|years|&\s*over|and\s*over)/i.test(t) || /\badults?\b/i.test(t) || /\bshinny\b/i.test(t));
  const isFamilyOrAllAges =
    isParentChild ||
    /\b(family|all\s*ages|everyone\s*welcome|public\s*skate|leisure\s*skate|community\s*skate|3\+)\b/i.test(t) ||
    (!is30Plus && !is50Plus && !isYouth && !isAdult && /\btoonie\s*skate\b/i.test(t));
  const isBuyOn =
    s.category === "figure_buyon" || /\b(buy[\s-]?on|starskate|star\s*\d|figure\s*skat|freestyle|patch)\b/i.test(t);

  if (isAdult) chips.push("19+ Adult");
  if (is30Plus) chips.push("30+");
  if (is50Plus) chips.push("50+");
  if (isYouth) chips.push("Youth (11-18)");
  if (isFamilyOrAllAges) chips.push("Family / All Ages");
  if (isBuyOn) chips.push("Buy-On / StarSkate");

  return chips;
}

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
  const isSpecial = isSpecialSession(s);
  const isWalkIn = s.category === "public_skate" || Boolean(s.is_walkin) || s.source === "schedule";
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
          isSpecial
            ? "ring-amber-300/80 hover:ring-amber-400"
            : needsGoalie
            ? "ring-2 ring-amber-400"
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
              {isSpecial && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-amber-300 shadow-2xs">
                  <span aria-hidden>✨</span> Unlisted Ice
                </span>
              )}
              {divisionChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80"
                >
                  {chip}
                </span>
              ))}
              {requirements.map((req) => (
                <span
                  key={req}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${getRequirementBadgeStyle(req)}`}
                >
                  <AlertCircle className="size-3 shrink-0" aria-hidden />
                  {req}
                </span>
              ))}
              {needsGoalie && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-300/80">
                  <ShieldHalf className="size-3" aria-hidden /> Goalie Needed
                </span>
              )}
              {isFreeGoalie && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                  <ShieldHalf className="size-3" aria-hidden /> Goalies Free
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
            <div className="flex items-center gap-2">
              <p className="truncate text-sm text-slate-600" title={s.rawTitle}>
                {s.rawTitle}
              </p>
              {hasNotesOrReqs && !isWalkIn && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80 transition hover:bg-ice-50 hover:text-ice-700 hover:ring-ice-200 cursor-pointer"
                  aria-label={`More info and requirements for ${s.rawTitle}`}
                >
                  <Info className="size-3" aria-hidden />
                  More Info
                </button>
              )}
            </div>

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
                <p className="text-xs text-slate-500">
                  First-come, first-served at the front desk. No online reservation required.
                </p>
                {s.facilitySlug === "poirier" && (
                  <Link
                    href="/schedules/coquitlam-poirier"
                    className="text-[11px] font-bold text-teal-700 underline underline-offset-2 hover:text-teal-900"
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
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                <Info className="size-3.5" aria-hidden />
                Session Info
              </button>
            ) : isWalkIn ? (
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
                onClick={handleOutboundClick}
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
          {isSpecial
            ? "⭐ Special Schedule · Offline Notice"
            : s.source === "schedule"
            ? "Published schedule"
            : `Spots updated ${relUpdated}`}
        </p>
      </article>

      <SessionDetailsModal session={s} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
