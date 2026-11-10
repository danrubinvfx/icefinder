import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-200/80 pt-6 pb-6 text-center text-xs leading-relaxed text-slate-600">
      <div className="mx-auto max-w-2xl space-y-3 px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-700 font-medium">
          <span className="text-slate-800 font-bold">Browse by Sport:</span>
          <Link href="/figure-skating" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Figure Skating Buy-ons
          </Link>
          <span>·</span>
          <Link href="/drop-in-hockey" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Drop-In Hockey
          </Link>
          <span>·</span>
          <Link href="/stick-and-puck" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Stick &amp; Puck
          </Link>
          <span>·</span>
          <Link href="/public-skate" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Public Skating
          </Link>
          <span>·</span>
          <Link href="/richmond?category=hockey_dropin" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Richmond Drop-In Hockey
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-700 font-medium">
          <span className="text-slate-800 font-bold">Drop-in Ice Schedules:</span>
          <Link href="/burnaby" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Burnaby
          </Link>
          <span>·</span>
          <Link href="/vancouver" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Vancouver
          </Link>
          <span>·</span>
          <Link href="/richmond" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Richmond
          </Link>
          <span>·</span>
          <Link href="/coquitlam" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Coquitlam
          </Link>
          <span>·</span>
          <Link href="/delta" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Delta
          </Link>
          <span>·</span>
          <Link href="/maple-ridge" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Maple Ridge
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-slate-700 font-medium">
          <span className="text-slate-800 font-bold">Popular Arenas:</span>
          <Link href="/rinks/rosemary-brown" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Rosemary Brown
          </Link>
          <span>·</span>
          <Link href="/rinks/bill-copeland" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Bill Copeland
          </Link>
          <span>·</span>
          <Link href="/rinks/scotia-barn" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Scotia Barn
          </Link>
          <span>·</span>
          <Link href="/rinks/richmond-ice-centre" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Richmond Ice Centre
          </Link>
          <span>·</span>
          <Link href="/rinks/minoru" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Minoru Arenas
          </Link>
          <span>·</span>
          <Link href="/rinks/poirier" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Poirier Complex
          </Link>
          <span>·</span>
          <Link href="/rinks/hillcrest" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Hillcrest Rink
          </Link>
          <span>·</span>
          <Link href="/rinks/kitsilano" className="hover:text-ice-600 underline underline-offset-2 py-1 inline-block">
            Kitsilano Rink
          </Link>
        </div>
        <p className="text-slate-600 font-normal">
          Schedules and spot availability are synced periodically from municipal recreation
          portals. Times, capacity, and holiday hours are subject to change. Please confirm
          directly with the host facility or city booking page prior to heading to the rink.
        </p>
        <p className="text-xs font-medium text-slate-600">
          Data from Metro Vancouver Municipalities, Canlan Sports &amp; Planet Ice · icefinder.ca ·
          Built for Metro Vancouver skaters
        </p>
      </div>
    </footer>
  );
}
