"use client";

import { useEffect, useState, useId } from "react";
import {
  X,
  Bell,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDayHeading, formatTimeRange } from "@/lib/time";
import { resolveBookingUrl } from "@/lib/links";
import type { SessionDTO } from "@/lib/queries";

export interface SpotAlertModalProps {
  session: SessionDTO;
  isOpen: boolean;
  onClose: () => void;
}

export function SpotAlertModal({ session, isOpen, onClose }: SpotAlertModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const emailInputId = useId();

  // Reset modal state whenever opened
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setStatus("idle");
      setErrorMessage("");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Auto-close on success
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      onClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, [status, onClose]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          sessionKey: session.id,
          sessionTitle: session.rawTitle,
          facilityName: session.facilityName,
          startTime: session.startTime,
          bookingUrl: destinationUrl || session.bookingUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register alert.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again.",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`alert-modal-title-${session.id}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Bell className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3
                id={`alert-modal-title-${session.id}`}
                className="text-base font-bold text-slate-900"
              >
                Spot Drop Alert
              </h3>
              <p className="text-xs font-medium text-emerald-800">
                Instant notification when ice opens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-white/80 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {status === "success" ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
                <CheckCircle2 className="size-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Alert Activated!</h4>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">
                We&apos;ll email <span className="font-semibold text-slate-900">{email}</span> the moment a spot opens up for this session.
              </p>
              <p className="text-xs text-slate-500 pt-2">
                This window will close automatically...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Session Summary Card */}
              <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80 space-y-2">
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {session.rawTitle}
                </p>
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-slate-500" />
                    <span>
                      {session.facilityName}
                      {session.rink ? ` • ${session.rink}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0 text-slate-500" />
                    <span>{formatDayHeading(session.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 shrink-0 text-slate-500" />
                    <span className="font-medium text-slate-800">
                      {formatTimeRange(session.startTime, session.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explanatory Note */}
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50/80 p-3 ring-1 ring-amber-200/80 text-xs text-amber-900 leading-relaxed">
                <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  Prime ice sells out quickly, but cancellations happen. Enter your email and we will notify you immediately if someone drops out.
                </p>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                <div>
                  <label
                    htmlFor={emailInputId}
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Your Email Address
                  </label>
                  <input
                    id={emailInputId}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="skater@example.com"
                    autoFocus
                    disabled={status === "loading"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:opacity-75"
                  />
                </div>

                {status === "error" && errorMessage && (
                  <p className="text-xs font-medium text-rose-600">
                    {errorMessage}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={status === "loading"}
                    className="w-1/3 min-h-[44px] rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "loading" || !email.trim()}
                    className="w-2/3 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <Bell className="size-3.5" />
                        Activate Alert
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
