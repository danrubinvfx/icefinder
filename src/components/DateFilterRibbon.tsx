"use client";

import React from "react";

export interface DateFilterRibbonProps {
  dateMode: "today" | "tomorrow" | "3days" | "week" | "weekend" | "pick";
  onSelectDateMode: (mode: "today" | "tomorrow" | "weekend") => void;
  className?: string;
}

export function DateFilterRibbon({
  dateMode,
  onSelectDateMode,
  className = "",
}: DateFilterRibbonProps) {
  return (
    <div
      className={`sticky top-14 z-10 -mx-4 mb-3 border-y border-slate-200/80 bg-slate-50/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85 sm:hidden ${className}`}
      aria-label="Mobile Date Quick Filter"
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
          When:
        </span>
        <div className="flex flex-1 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectDateMode("today")}
            aria-pressed={dateMode === "today"}
            className={`flex-1 inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 cursor-pointer ${
              dateMode === "today"
                ? "bg-ice-900 text-white shadow-sm"
                : "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onSelectDateMode("tomorrow")}
            aria-pressed={dateMode === "tomorrow"}
            className={`flex-1 inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 cursor-pointer ${
              dateMode === "tomorrow"
                ? "bg-ice-900 text-white shadow-sm"
                : "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100"
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => onSelectDateMode("weekend")}
            aria-pressed={dateMode === "weekend"}
            className={`flex-1 inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500 cursor-pointer ${
              dateMode === "weekend"
                ? "bg-ice-900 text-white shadow-sm"
                : "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100"
            }`}
          >
            This Weekend
          </button>
        </div>
      </div>
    </div>
  );
}
