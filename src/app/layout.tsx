import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { FACILITIES } from "@/lib/domain";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://icefinder.ca"),
  title: {
    default: "IceFinder | Metro Vancouver Ice Times, Drop-in Hockey & Figure Skating",
    template: "%s | IceFinder",
  },
  description:
    "Find real-time ice times, adult drop-in hockey, stick & puck, and figure skating buy-ons across Burnaby, Vancouver, Richmond, Coquitlam, and Delta arenas.",
  keywords: [
    "Vancouver ice times",
    "Burnaby drop in hockey",
    "Rosemary Brown ice schedule",
    "figure skating buy on Vancouver",
    "stick and puck Burnaby",
    "Scotia Barn shinny",
    "Kensington arena schedule",
    "Poirier ice drop in",
    "Richmond Ice Centre schedules",
  ],
  authors: [{ name: "IceFinder" }],
  creator: "IceFinder",
  openGraph: {
    title: "IceFinder | Real-Time Metro Vancouver Ice Tracker",
    description:
      "Live drop-in hockey, public skate, and figure skating buy-on availability across Metro Vancouver arenas.",
    url: "https://icefinder.ca",
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
    canonical: "https://icefinder.ca",
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
      "@id": "https://icefinder.ca/#website",
      url: "https://icefinder.ca",
      name: "IceFinder",
      description:
        "Find real-time ice times, adult drop-in hockey, stick & puck, and figure skating buy-ons across Burnaby, Vancouver, Richmond, Coquitlam, and Delta arenas.",
      inLanguage: "en-CA",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://icefinder.ca/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    ...FACILITIES.map((facility) => ({
      "@type": "SportsActivityLocation",
      "@id": `https://icefinder.ca/#${facility.slug}`,
      name: facility.name,
      alternateName: facility.shortName,
      url: "https://icefinder.ca",
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
