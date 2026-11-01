import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-200/80 pt-6 pb-4 text-center text-xs leading-relaxed text-slate-500">
      <div className="mx-auto max-w-2xl space-y-2.5 px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-600 font-medium">
          <span className="text-slate-500">Browse by Sport:</span>
          <Link href="/figure-skating" className="hover:text-ice-600 underline underline-offset-2">
            Figure Skating Buy-ons
          </Link>
          <span>·</span>
          <Link href="/drop-in-hockey" className="hover:text-ice-600 underline underline-offset-2">
            Drop-In Hockey
          </Link>
          <span>·</span>
          <Link href="/stick-and-puck" className="hover:text-ice-600 underline underline-offset-2">
            Stick &amp; Puck
          </Link>
          <span>·</span>
          <Link href="/public-skate" className="hover:text-ice-600 underline underline-offset-2">
            Public Skating
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-600 font-medium">
          <span className="text-slate-500">Drop-in Ice Schedules:</span>
          <Link href="/burnaby" className="hover:text-ice-600 underline underline-offset-2">
            Burnaby
          </Link>
          <span>·</span>
          <Link href="/vancouver" className="hover:text-ice-600 underline underline-offset-2">
            Vancouver
          </Link>
          <span>·</span>
          <Link href="/richmond" className="hover:text-ice-600 underline underline-offset-2">
            Richmond
          </Link>
          <span>·</span>
          <Link href="/coquitlam" className="hover:text-ice-600 underline underline-offset-2">
            Coquitlam
          </Link>
          <span>·</span>
          <Link href="/delta" className="hover:text-ice-600 underline underline-offset-2">
            Delta
          </Link>
          <span>·</span>
          <Link href="/maple-ridge" className="hover:text-ice-600 underline underline-offset-2">
            Maple Ridge
          </Link>
        </div>
        <p className="text-slate-500">
          Schedules and spot availability are synced periodically from municipal recreation
          portals. Times, capacity, and holiday hours are subject to change. Please confirm
          directly with the host facility or city booking page prior to heading to the rink.
        </p>
        <p className="text-[11px] font-medium text-slate-400">
          Data from Metro Vancouver Municipalities, Canlan Sports &amp; Planet Ice · icefinder.ca ·
          Built for Metro Vancouver skaters
        </p>
      </div>
    </footer>
  );
}
