import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { FACILITIES } from "@/lib/domain";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.icefinder.ca"),
  title: {
    default: "Metro Vancouver Ice Times & Drop-In Tracker (Live Spots) | IceFinder",
    template: "%s | IceFinder",
  },
  description:
    "Find real-time drop-in hockey, stick & puck, figure skating buy-ons, and public skates across Burnaby, Vancouver, Richmond, Coquitlam & Delta. Check live open spots and register directly.",
  keywords: [
    "drop in hockey richmond",
    "burnaby stick and puck",
    "vancouver drop in hockey",
    "coquitlam drop in hockey",
    "delta drop in hockey",
    "Vancouver ice times",
    "Burnaby drop in hockey",
    "Rosemary Brown ice schedule",
    "figure skating buy on Vancouver",
    "stick and puck Burnaby",
    "Scotia Barn shinny",
    "Kensington arena schedule",
    "Poirier ice drop in",
    "Richmond Ice Centre schedules",
    "Surrey drop in hockey",
    "North Vancouver skate schedule",
    "Harry Jerome arena drop in",
    "West Vancouver ice arena",
    "Moody Park arena drop in",
  ],
  authors: [{ name: "IceFinder" }],
  creator: "IceFinder",
  openGraph: {
    title: "Metro Vancouver Ice Times & Drop-In Tracker (Live Spots) | IceFinder",
    description:
      "Find real-time drop-in hockey, stick & puck, figure skating buy-ons, and public skates across Burnaby, Vancouver, Richmond, Coquitlam & Delta. Check live open spots and register directly.",
    url: "https://www.icefinder.ca",
    siteName: "IceFinder",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.icefinder.ca",
  },
  applicationName: "IceFinder",
  appleWebApp: {
    capable: true,
    title: "IceFinder",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c2a43",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.icefinder.ca/#website",
      url: "https://www.icefinder.ca",
      name: "IceFinder",
      description:
        "Find real-time drop-in hockey, stick & puck, figure skating buy-ons, and public skates across Burnaby, Vancouver, Richmond, Coquitlam & Delta. Check live open spots and register directly.",
      inLanguage: "en-CA",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://www.icefinder.ca/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    ...FACILITIES.map((facility) => ({
      "@type": "SportsActivityLocation",
      "@id": `https://www.icefinder.ca/#${facility.slug}`,
      name: facility.name,
      alternateName: facility.shortName,
      url: "https://www.icefinder.ca",
      address: {
        "@type": "PostalAddress",
        streetAddress: facility.address.split(",")[0].trim(),
        addressLocality: facility.municipality,
        addressRegion: "BC",
        addressCountry: "CA",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: facility.lat,
        longitude: facility.lng,
      },
      sport: ["Ice Hockey", "Figure Skating", "Ice Skating"],
    })),
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-dvh font-sans">
        <FeedbackBanner />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
