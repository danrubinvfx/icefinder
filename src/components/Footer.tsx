import React from "react";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-200/80 pt-6 pb-4 text-center text-xs leading-relaxed text-slate-500">
      <div className="mx-auto max-w-2xl space-y-2 px-4">
        <p className="text-slate-500">
          Schedules and spot availability are synced periodically from municipal recreation portals. Times, capacity, and holiday hours are subject to change. Please confirm directly with the host facility or city booking page prior to heading to the rink.
        </p>
        <p className="text-[11px] font-medium text-slate-400">
          Data from Burnaby, Vancouver, Richmond, Coquitlam, Delta &amp; Canlan Sports · icefinder.ca · Built for Metro Vancouver skaters
        </p>
      </div>
    </footer>
  );
}
