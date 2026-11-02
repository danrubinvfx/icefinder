import { CATEGORY_LABELS } from "./domain";
import { getFacilityScheduleUrl } from "./facilities";
import type { FacilityDTO, SessionDTO } from "./queries";

function safeIsoDate(val: string | null | undefined, fallback?: string): string {
  const fb = fallback || new Date().toISOString();
  if (!val) return fb;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fb;
    return d.toISOString();
  } catch {
    return fb;
  }
}

/**
 * Builds Schema.org SportsEvent structured data adhering strictly to Google Search Console
 * and icefinder-audit guidelines with all recommended properties satisfied.
 */
export function buildSportsEventSchema(
  session: SessionDTO,
  facility?: Partial<FacilityDTO> | null
) {
  const scheduleUrl = getFacilityScheduleUrl(session.facilitySlug);
  let organizerUrl = "https://icefinder.ca";
  if (scheduleUrl) {
    if (scheduleUrl.startsWith("http://") || scheduleUrl.startsWith("https://")) {
      organizerUrl = scheduleUrl;
    } else {
      organizerUrl = `https://icefinder.ca${scheduleUrl.startsWith("/") ? "" : "/"}${scheduleUrl}`;
    }
  }

  const facilityName = facility?.name || session.facilityName;
  const facilityMunicipality = facility?.municipality || session.municipality;
  const facilitySlug = facility?.slug || session.facilitySlug;

  const bookingUrl =
    session.bookingUrl ||
    (facilitySlug ? `https://icefinder.ca/${facilitySlug}` : "https://icefinder.ca");

  const startDateIso = safeIsoDate(session.startTime);
  const endDateIso = safeIsoDate(session.endTime);
  const validFromIso = safeIsoDate(session.updatedAt || session.startTime, startDateIso);

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: session.rawTitle || CATEGORY_LABELS[session.category] || "Drop-In Ice Session",
    startDate: startDateIso,
    endDate: endDateIso,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: facilityName,
      address: {
        "@type": "PostalAddress",
        addressLocality: facilityMunicipality,
        addressRegion: "BC",
        addressCountry: "CA",
      },
    },
    image: ["https://icefinder.ca/og-image.png"],
    organizer: {
      "@type": "Organization",
      name: facilityName,
      url: organizerUrl,
    },
    performer: {
      "@type": "PerformingGroup",
      name: "Community Skaters",
    },
    offers: {
      "@type": "Offer",
      url: bookingUrl,
      price: session.cost != null ? String(session.cost) : "0",
      priceCurrency: "CAD",
      availability:
        session.openSpots > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      validFrom: validFromIso,
    },
  };
}
