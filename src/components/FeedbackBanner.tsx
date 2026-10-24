"use client";

import { useEffect, useState } from "react";
import { X, MessageSquareHeart } from "lucide-react";

const STORAGE_KEY = "icefinder_feedback_dismissed";
const FEEDBACK_MAILTO =
  "mailto:feedback@icefinder.ca?subject=IceFinder%20Feedback&body=Hi%20IceFinder%20Team,%0A%0AHere%20is%20some%20feedback%20to%20improve%20the%20site:%0A";

export function FeedbackBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        setDismissed(true);
      }
    } catch {
      // Storage unavailable or disabled (e.g., restricted private mode)
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Storage unavailable or disabled
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="User feedback banner"
      className="relative z-30 border-b border-ice-800/80 bg-[#0c2a43] text-slate-100 transition-colors"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-3.5 py-2 text-xs sm:px-4 sm:text-sm">
        <div className="flex flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
            <MessageSquareHeart className="size-4 shrink-0 text-ice-400" aria-hidden="true" />
            <span>Help us make IceFinder better! Found a missing rink or have a feature idea?</span>
          </span>
          <a
            href={FEEDBACK_MAILTO}
            className="inline-flex shrink-0 items-center rounded-full bg-ice-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs transition hover:bg-ice-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Send Feedback
          </a>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss feedback banner"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
