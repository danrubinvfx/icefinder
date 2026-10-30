import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Download,
  MapPin,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Poirier Sport & Leisure Complex Arena Schedule | IceFinder",
  description:
    "Complete Poirier Sport & Leisure Complex Fall arena drop-in timetable for stick & puck, adult hockey, toonie skates, and figure skating buy-ons in Coquitlam, BC.",
  alternates: {
    canonical: "https://icefinder.ca/schedules/coquitlam-poirier",
  },
  openGraph: {
    title: "Poirier Sport & Leisure Complex Arena Schedule | IceFinder",
    description:
      "Fall arena drop-in schedule for Poirier Sport & Leisure Complex in Coquitlam, BC. View stick & puck, adult hockey, public skate, and figure skating timetable.",
    url: "https://icefinder.ca/schedules/coquitlam-poirier",
    siteName: "IceFinder",
    locale: "en_CA",
    type: "article",
  },
};

interface ScheduleItem {
  time: string;
  title: string;
  category: "figure_buyon" | "hockey_dropin" | "stick_and_puck" | "public_skate";
  price: string;
  notes?: string;
  rink?: string;
  preReg?: boolean;
  adultParticipation?: boolean;
}

interface DaySchedule {
  day: string;
  dayShort: string;
  id: string;
  badge?: string;
  items: ScheduleItem[];
}

const SCHEDULE_DAYS: DaySchedule[] = [
  {
    day: "Monday",
    dayShort: "Mon",
    id: "monday",
    items: [
      {
        time: "8:15 AM – 9:15 AM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
      {
        time: "11:00 AM – 12:00 PM",
        title: "*Toonie Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$2.00",
        preReg: true,
        notes: "Pre-registration required · Helmets mandatory",
      },
      {
        time: "12:15 PM – 1:15 PM",
        title: "Adult & Child Toonie Skate (0–6 yrs)**",
        category: "public_skate",
        price: "$2.00",
        adultParticipation: true,
        notes: "Adult participation required (16+) · Maximum 100 skaters",
      },
      {
        time: "1:00 PM – 2:00 PM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
      {
        time: "1:30 PM – 2:30 PM",
        title: "50+ Toonie Skate (50+ yrs)",
        category: "public_skate",
        price: "$2.00",
        notes: "Reserved for seniors and adults aged 50+",
      },
      {
        time: "3:30 PM – 4:30 PM",
        title: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Pre-registration required · Gloves, stick, puck, and CSA helmet mandatory",
      },
      {
        time: "8:15 PM – 9:15 PM",
        title: "Toonie Skate (All Ages)",
        category: "public_skate",
        price: "$2.00",
        notes: "Open to all ages · First-come, first-served at the front desk",
      },
    ],
  },
  {
    day: "Tuesday",
    dayShort: "Tue",
    id: "tuesday",
    items: [
      {
        time: "8:00 AM – 9:00 AM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
      {
        time: "10:00 AM – 11:15 AM",
        title: "*Toonie Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$2.00",
        preReg: true,
        notes: "Pre-registration required · 1 hour 15 min ice session",
      },
      {
        time: "11:30 AM – 12:45 PM",
        title: "Toonie Skate (All Ages)",
        category: "public_skate",
        price: "$2.00",
        notes: "Open to all ages · Walk-in admission",
      },
      {
        time: "1:00 PM – 2:00 PM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
    ],
  },
  {
    day: "Wednesday",
    dayShort: "Wed",
    id: "wednesday",
    badge: "Note: No sessions on Sept 30",
    items: [
      {
        time: "8:15 AM – 9:15 AM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
      {
        time: "9:30 AM – 10:30 AM",
        title: "*Toonie Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$2.00",
        preReg: true,
        notes: "Pre-registration required · Early season block (Ends Oct 28)",
      },
      {
        time: "11:00 AM – 12:00 PM",
        title: "Toonie Skate (All Ages)",
        category: "public_skate",
        price: "$2.00",
        notes: "Early season block (Ends Oct 28)",
      },
      {
        time: "1:00 PM – 2:00 PM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
      {
        time: "3:30 PM – 4:30 PM",
        title: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Pre-registration required",
      },
    ],
  },
  {
    day: "Thursday",
    dayShort: "Thu",
    id: "thursday",
    items: [
      {
        time: "10:00 AM – 11:15 AM",
        title: "*Toonie Adult Drop-in Hockey (19+ yrs)",
        category: "hockey_dropin",
        price: "$2.00",
        preReg: true,
        notes: "Full equipment required · Goalies Free · Pre-registration mandatory",
      },
      {
        time: "11:30 AM – 12:45 PM",
        title: "Toonie Skate (All Ages)",
        category: "public_skate",
        price: "$2.00",
        notes: "Open to all ages · Walk-in admission",
      },
      {
        time: "1:00 PM – 2:00 PM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
    ],
  },
  {
    day: "Friday",
    dayShort: "Fri",
    id: "friday",
    items: [
      {
        time: "8:15 AM – 9:15 AM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
      {
        time: "9:30 AM – 10:30 AM",
        title: "*Adult Figure Skating (19+ yrs)",
        category: "figure_buyon",
        price: "$11.00",
        preReg: true,
        notes: "Adult ice dancers & figure skaters only · Pre-registration required",
      },
      {
        time: "11:00 AM – 12:00 PM",
        title: "Adult & Child Toonie Skate (0–6 yrs)**",
        category: "public_skate",
        price: "$2.00",
        adultParticipation: true,
        notes: "Adult participation required (16+)",
      },
      {
        time: "12:15 PM – 1:30 PM",
        title: "Toonie Skate (All Ages)",
        category: "public_skate",
        price: "$2.00",
        notes: "Open to all ages",
      },
      {
        time: "1:00 PM – 2:00 PM",
        title: "Figure Skating Buy-On",
        category: "figure_buyon",
        price: "$9.00",
        rink: "Poirier Ice Arena 2",
        notes: "Coquitlam Skate Club partnership · Coaches Free · Pay at arena office",
      },
      {
        time: "3:45 PM – 4:45 PM",
        title: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Pre-registration required",
      },
      {
        time: "8:30 PM – 9:30 PM",
        title: "Youth Toonie Skate (11–18 yrs)",
        category: "public_skate",
        price: "$2.00",
        notes: "Designated youth-only toonie skate session",
      },
      {
        time: "9:45 PM – 11:00 PM",
        title: "*Adult Hockey (19+ yrs)",
        category: "hockey_dropin",
        price: "$9.00",
        preReg: true,
        notes: "Full equipment & both jerseys required · Goalies Free",
      },
      {
        time: "10:00 PM – 11:00 PM",
        title: "*Adult Stick, Ring & Puck (19+ yrs)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Adults 19+ only · Pre-registration required",
      },
    ],
  },
  {
    day: "Saturday",
    dayShort: "Sat",
    id: "saturday",
    badge: "Cancelled Oct 10 & Nov 14 (Special Events)",
    items: [
      {
        time: "10:00 AM – 11:15 AM",
        title: "*30+ Drop-in Hockey (30+ yrs)",
        category: "hockey_dropin",
        price: "$9.00",
        preReg: true,
        notes: "Cancelled Oct 10 & Nov 14 · Full gear · Goalies Free",
      },
      {
        time: "11:30 AM – 12:30 PM",
        title: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Cancelled Oct 10 & Nov 14 · Pre-registration required",
      },
      {
        time: "5:45 PM – 7:15 PM",
        title: "Public Skate (All Ages)",
        category: "public_skate",
        price: "$6.80",
        notes: "Runs weekly including Oct 10 & Nov 14",
      },
      {
        time: "7:30 PM – 8:30 PM",
        title: "*Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Cancelled Oct 10 & Nov 14 · Pre-registration required",
      },
      {
        time: "8:45 PM – 9:45 PM",
        title: "*Adult Stick, Ring & Puck (19+ yrs)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Cancelled Oct 10 & Nov 14 · Adults 19+ only",
      },
    ],
  },
  {
    day: "Sunday",
    dayShort: "Sun",
    id: "sunday",
    items: [
      {
        time: "9:15 AM – 10:15 AM",
        title: "Adult & Child Toonie Skate (0–6 yrs)**",
        category: "public_skate",
        price: "$2.00",
        adultParticipation: true,
        notes: "Adult participation required (16+) · Max 100 skaters",
      },
      {
        time: "2:45 PM – 4:00 PM",
        title: "Family Skate (All Ages)",
        category: "public_skate",
        price: "$6.80",
        notes: "Regular family drop-in (Nov 8: Optimist Community Skate by food donation)",
      },
      {
        time: "5:30 PM – 6:30 PM",
        title: "*Family Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Pre-registration required · Family-friendly pace",
      },
      {
        time: "6:45 PM – 7:45 PM",
        title: "*Female's Stick, Ring & Puck (All Ages)",
        category: "stick_and_puck",
        price: "$7.50",
        preReg: true,
        notes: "Women, girls & gender non-conforming skaters · Pre-registration required",
      },
      {
        time: "8:00 PM – 9:15 PM",
        title: "*Adult Hockey (19+ yrs)",
        category: "hockey_dropin",
        price: "$9.00",
        preReg: true,
        notes: "Adults 19+ · Full equipment · Goalies Free",
      },
    ],
  },
];

const CATEGORY_TAG_STYLES = {
  figure_buyon: "bg-pink-100 text-pink-800 ring-pink-300",
  hockey_dropin: "bg-blue-100 text-blue-800 ring-blue-300",
  stick_and_puck: "bg-amber-100 text-amber-900 ring-amber-300",
  public_skate: "bg-teal-100 text-teal-800 ring-teal-300",
};

const CATEGORY_NAMES = {
  figure_buyon: "Figure Buy-on",
  hockey_dropin: "Drop-in Hockey",
  stick_and_puck: "Stick & Puck",
  public_skate: "Public Skate",
};

export default function PoirierSchedulePage() {
  return (
    <div className="mx-auto min-h-dvh max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Top Breadcrumb Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-ice-600 transition hover:text-ice-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to Live IceFinder Tracker
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          <Calendar className="size-3.5 text-slate-500" aria-hidden />
          Fall 2026 Timetable
        </span>
      </div>

      {/* Main Facility Header Card */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-ice-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl ring-1 ring-white/10">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md">
              <span className="size-2 rounded-full bg-emerald-400" />
              City of Coquitlam Recreation
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
              Poirier Sport &amp; Leisure Complex
            </h1>
            <div className="flex flex-col gap-1.5 text-sm text-slate-300 sm:flex-row sm:items-center sm:gap-4">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Poirier+Sport+%26+Leisure+Complex%2C+633+Poirier+St%2C+Coquitlam%2C+BC"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-white transition"
              >
                <MapPin className="size-4 shrink-0 text-cyan-400" aria-hidden />
                633 Poirier St, Coquitlam, BC V3J 6A9
              </a>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Clock className="size-4 shrink-0 text-cyan-400" aria-hidden />
                In Effect: Sept. 7 – Nov. 19, 2026
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              Complete weekly schedule for public skating, toonie skates, adult hockey drop-in, stick &amp; puck, and official figure skating buy-on sessions.
            </p>
          </div>

          {/* Action Download Button */}
          <div className="flex flex-col gap-2.5 sm:items-end shrink-0 pt-2 sm:pt-0">
            <a
              href="/schedules/poirier-fall-2026.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <Download className="size-4" aria-hidden />
              Download Original PDF 📄
            </a>
            <a
              href={COQUITLAM_PERFECTMIND_ARENA_DROPIN_CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3.5 text-xs font-semibold text-slate-200 transition hover:bg-white/20 hover:text-white"
            >
              Coquitlam WebReg Portal
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      {/* Prominent Callout Banner: Figure Skating Buy-Ons */}
      <section className="mt-8 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="rounded-xl bg-amber-500/20 p-2 text-amber-900 ring-1 ring-amber-400/40 shrink-0">
            <Sparkles className="size-6 text-amber-700" aria-hidden />
          </div>
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-amber-950">
                Special Information · Figure Skating Buy-Ons
              </h2>
              <span className="rounded-full bg-amber-200/80 px-3 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300">
                Offline Facility Notice
              </span>
            </div>

            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
              Run in partnership with the <strong>Coquitlam Skating Club</strong>. This program is <strong>not bookable on the city’s online registration portal</strong>. Skaters must purchase admission at the arena reception counter or club skate office prior to stepping onto the ice.
            </p>

            {/* Time Slot Matrix */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
              <div className="rounded-xl bg-white/90 p-3 ring-1 ring-amber-300/80 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Mon, Wed &amp; Fri Morning</span>
                <p className="text-sm font-extrabold text-slate-900">8:15 AM – 9:15 AM</p>
                <p className="text-xs text-slate-600">Poirier Ice Arena 2</p>
              </div>

              <div className="rounded-xl bg-white/90 p-3 ring-1 ring-amber-300/80 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Tuesday Morning</span>
                <p className="text-sm font-extrabold text-slate-900">8:00 AM – 9:00 AM</p>
                <p className="text-xs text-slate-600">Poirier Ice Arena 2</p>
              </div>

              <div className="rounded-xl bg-white/90 p-3 ring-1 ring-amber-300/80 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Monday through Friday</span>
                <p className="text-sm font-extrabold text-slate-900">1:00 PM – 2:00 PM</p>
                <p className="text-xs text-slate-600">Poirier Ice Arena 2</p>
              </div>
            </div>

            {/* Key Terms */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-amber-950 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-700" />
                Admission: <strong>$9.00 / session</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-700" />
                Coaches: <strong>Free of charge</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-700" />
                Requirements: <strong>Figure skates only · Prior StarSkate / figure skating experience</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-900 font-bold">
                ⚠️ Cancelled on statutory holidays (Sept 7, Oct 12, Nov 11)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Anchor Bar */}
      <nav aria-label="Schedule Day Navigation" className="mt-8 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-bold uppercase tracking-wider pr-1 text-[11px]">Jump to day:</span>
        {SCHEDULE_DAYS.map((d) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            className="rounded-lg bg-white px-3 py-1.5 font-bold text-slate-700 shadow-2xs ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-ice-500"
          >
            {d.dayShort}
          </a>
        ))}
        <a
          href="#holiday-overrides"
          className="rounded-lg bg-amber-50 px-3 py-1.5 font-bold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Holiday Overrides
        </a>
      </nav>

      {/* Weekly Schedule Day-by-Day Section */}
      <section className="mt-6 space-y-8">
        {SCHEDULE_DAYS.map((dayData) => (
          <div
            key={dayData.id}
            id={dayData.id}
            className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">{dayData.day}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {dayData.items.length} sessions
                </span>
              </div>
              {dayData.badge && (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                  {dayData.badge}
                </span>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th scope="col" className="py-2.5 pr-4">Time Window</th>
                    <th scope="col" className="py-2.5 px-3">Session &amp; Category</th>
                    <th scope="col" className="py-2.5 px-3">Price</th>
                    <th scope="col" className="py-2.5 px-3">Arena Sheet / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 pr-4 font-bold tabular-nums text-slate-900 whitespace-nowrap">
                        {item.time}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${
                              CATEGORY_TAG_STYLES[item.category]
                            }`}
                          >
                            {CATEGORY_NAMES[item.category]}
                          </span>
                          <span className="font-bold text-slate-900">{item.title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {item.price}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        {item.notes}
                        {item.rink && <span className="block font-medium text-slate-700">{item.rink}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
              {dayData.items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold tabular-nums text-slate-900 text-sm">{item.time}</span>
                    <span className="font-bold text-slate-900 text-xs rounded-md bg-white px-2 py-0.5 ring-1 ring-slate-200">
                      {item.price}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                        CATEGORY_TAG_STYLES[item.category]
                      }`}
                    >
                      {CATEGORY_NAMES[item.category]}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.title}</h4>
                  </div>
                  {item.notes && <p className="text-xs text-slate-600 leading-relaxed">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Statutory Holiday & Special Event Overrides Section */}
      <section
        id="holiday-overrides"
        className="mt-8 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Calendar className="size-5 text-amber-600" aria-hidden />
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Statutory Holiday &amp; Special Event Schedules
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Sept 7 & Oct 12 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Labour Day &amp; Thanksgiving
              </span>
              <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                Sept. 7 &amp; Oct. 12, 2026
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex justify-between border-b border-slate-200/60 pb-1">
                <span>*Stick, Ring &amp; Puck</span>
                <span className="font-bold">12:00 PM – 1:00 PM</span>
              </li>
              <li className="flex justify-between border-b border-slate-200/60 pb-1">
                <span>Family Skates (All Ages)</span>
                <span className="font-bold">1:15 PM – 2:30 PM &amp; 2:45 PM – 4:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>*Adult Stick, Ring &amp; Puck (19+)</span>
                <span className="font-bold">4:15 PM – 5:15 PM</span>
              </li>
            </ul>
          </div>

          {/* Nov 11 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Remembrance Day
              </span>
              <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                Nov. 11, 2026
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex justify-between border-b border-slate-200/60 pb-1">
                <span>*Stick, Ring &amp; Puck</span>
                <span className="font-bold">3:30 PM – 4:30 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Family Skates (All Ages)</span>
                <span className="font-bold">4:45 PM – 6:00 PM &amp; 6:15 PM – 7:30 PM</span>
              </li>
            </ul>
          </div>

          {/* Nov 8 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Optimist Community Skate
              </span>
              <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                Sunday, Nov. 8, 2026
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>2:45 PM – 4:00 PM</strong> · All Ages. Replaces the regular Sunday Family Skate.
              Admission is by non-perishable food donation for local food banks.
            </p>
          </div>

          {/* Sept 30 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Truth &amp; Reconciliation Day
              </span>
              <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-rose-200">
                Sept. 30, 2026
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Facility Closed / No Drop-in Programming</strong>. Regular Wednesday ice sessions are blacked out for the statutory holiday.
            </p>
          </div>
        </div>
      </section>

      {/* Program Policies & Guidelines Footnotes */}
      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-100/70 p-5 sm:p-6 text-xs text-slate-600 space-y-3">
        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-slate-500" aria-hidden />
          General Poirier Arena Drop-In Guidelines &amp; Policies
        </h4>
        <ul className="space-y-1.5 leading-relaxed list-disc list-inside">
          <li>
            <strong>* Pre-registration required:</strong> Sessions marked with an asterisk require online pre-registration through Coquitlam&apos;s BookMe4 / PerfectMind portal. Pre-registration opens 48 hours in advance for Coquitlam residents and 24 hours in advance for non-residents.
          </li>
          <li>
            <strong>** Adult participation required:</strong> Children under 7 years old must be actively accompanied on the ice by a paying registered adult (16+).
          </li>
          <li>
            <strong>Equipment rules:</strong> CSA-approved hockey helmets are mandatory for all children under 12, all stick &amp; puck participants, and anyone using skating aids. Full hockey gear (including full face cage or visor) is required for adult drop-in hockey.
          </li>
          <li>
            <strong>Schedule changes:</strong> Schedules are subject to change without notice due to tournaments, ice maintenance, or special events. Always verify real-time status on the live tracker.
          </li>
        </ul>

        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-500 text-[11px]">
          <span>City of Coquitlam Parks, Recreation &amp; Culture Services · Poirier Sport &amp; Leisure Complex</span>
          <a
            href="https://www.coquitlam.ca/384/Poirier-Sport-and-Leisure-Complex"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-800 transition underline underline-offset-2"
          >
            Official City Facility Website ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
