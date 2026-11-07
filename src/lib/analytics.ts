import { track } from "@vercel/analytics";

export function trackOutboundBooking(payload: {
  facilitySlug: string;
  category: string;
  municipality?: string;
  bookingUrl: string;
  buttonType: "register" | "book_city_site" | "schedule_fallback";
}) {
  try {
    track("outbound_click", {
      facility: payload.facilitySlug,
      category: payload.category,
      municipality: payload.municipality ?? "unknown",
      destination: payload.bookingUrl,
      button_type: payload.buttonType,
    });
  } catch (err) {
    console.warn("Analytics tracking error:", err);
  }
}
