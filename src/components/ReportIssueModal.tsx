"use client";

import { useEffect, useState, useId } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { formatDayHeading, formatTimeRange } from "@/lib/time";
import type { SessionDTO } from "@/lib/queries";

export interface ReportIssueModalProps {
  session: SessionDTO;
  isOpen: boolean;
  onClose: () => void;
}

const ISSUE_OPTIONS = [
  { value: "wrong_link", label: "Wrong link / 404 error" },
  { value: "wrong_time", label: "Session time incorrect or cancelled" },
  { value: "wrong_category", label: "Wrong category (e.g., figure vs stick & puck)" },
  { value: "other", label: "Other" },
] as const;

export function ReportIssueModal({ session, isOpen, onClose }: ReportIssueModalProps) {
  const [issueType, setIssueType] = useState<string>("wrong_link");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const issueSelectId = useId();
  const detailsInputId = useId();
  const emailInputId = useId();

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setIssueType("wrong_link");
      setDetails("");
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

  // Auto-close on successful report
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      onClose();
    }, 2500);
    return () => clearTimeout(timer);
  }, [status, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueType) {
      setStatus("error");
      setErrorMessage("Please select an issue type.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: session.id,
          sessionTitle: session.rawTitle,
          facilitySlug: session.facilitySlug,
          startTime: session.startTime,
          issueType,
          details: details.trim() || undefined,
          reporterEmail: email.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report.");
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
      aria-labelledby={`report-modal-title-${session.id}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
              <AlertTriangle className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3
                id={`report-modal-title-${session.id}`}
                className="text-base font-bold text-slate-900"
              >
                Report an Issue
              </h3>
              <p className="text-xs font-medium text-amber-800">
                Help us keep schedule &amp; link data accurate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/80 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
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
              <h4 className="text-lg font-bold text-slate-900">Thank You!</h4>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">
                We have received your report and our team will investigate immediately.
              </p>
              <p className="text-xs text-slate-400 pt-2">
                This window will close automatically...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Session Summary Card */}
              <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Session
                </p>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {session.rawTitle}
                </p>
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-slate-400" />
                    <span>
                      {session.facilityName}
                      {session.rink ? ` • ${session.rink}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0 text-slate-400" />
                    <span>{formatDayHeading(session.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-800">
                      {formatTimeRange(session.startTime, session.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
                {/* Issue Selection */}
                <div>
                  <label
                    htmlFor={issueSelectId}
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    What&apos;s wrong?
                  </label>
                  <div className="space-y-1.5">
                    {ISSUE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition ${
                          issueType === opt.value
                            ? "border-amber-500 bg-amber-50/50 text-slate-900 ring-1 ring-amber-500/30"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="issueType"
                          value={opt.value}
                          checked={issueType === opt.value}
                          onChange={(e) => setIssueType(e.target.value)}
                          className="size-4 text-amber-600 focus:ring-amber-500 border-slate-300"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <label
                    htmlFor={detailsInputId}
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Additional details <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id={detailsInputId}
                    rows={2}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="e.g., The registration link leads to an expired catalog activity"
                    disabled={status === "loading"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:opacity-75 resize-none"
                  />
                </div>

                {/* Optional Email */}
                <div>
                  <label
                    htmlFor={emailInputId}
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Your email <span className="text-slate-400 font-normal">(optional, if you&apos;d like an update)</span>
                  </label>
                  <input
                    id={emailInputId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="skater@example.com"
                    disabled={status === "loading"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:opacity-75"
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
                    className="w-1/3 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-2/3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        Submit Report
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
