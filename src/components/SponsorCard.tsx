"use client";

import { Sparkles, ChevronRight } from "lucide-react";
import { formatTime, localHour } from "@/lib/time";
import type { SessionDTO } from "@/lib/queries";

/**
 * Native, contextual sponsorship slot. Copy adapts to the next upcoming session in the
 * current feed so it reads as useful advice rather than a banner ad.
 */
export function SponsorCard({ nextSession }: { nextSession?: SessionDTO }) {
  const evening = nextSession ? localHour(nextSession.startTime) >= 17 : false;
  const when = nextSession ? `${evening ? "tonight's" : "your"} ${formatTime(nextSession.startTime)} session` : "your next skate";

  return (
    <aside
      aria-label="Sponsored"
      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-ice-900 to-ice-700 p-4 text-white shadow-sm"
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
        <Sparkles className="size-5 text-sky-200" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-200/80">Sponsored · Local</p>
        <p className="text-sm font-semibold leading-snug">
          Sharpen your skates before {when} at Skater&apos;s Edge
        </p>
        <p className="text-xs text-sky-100/80">
          {nextSession ? `10 mins from ${nextSession.facilityShort}` : "10 mins away"} · Same-day sharpening $10
        </p>
      </div>
      <a
        href="#sponsor"
        className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg bg-white px-3 text-xs font-bold text-ice-900 hover:bg-sky-50"
      >
        Directions <ChevronRight className="size-3.5" aria-hidden />
      </a>
    </aside>
  );
}
