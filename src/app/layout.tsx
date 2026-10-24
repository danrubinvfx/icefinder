import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "IceFinder — Drop-in Hockey, Stick & Puck & Public Skate in Burnaby",
  description:
    "Real-time ice schedules, open spots and drop-in availability for Burnaby rinks: Rosemary Brown, Kensington, Bill Copeland and Scotia Barn.",
  metadataBase: new URL("https://icefinder.ca"),
  applicationName: "IceFinder",
  appleWebApp: { capable: true, title: "IceFinder", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0c2a43",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <FeedbackBanner />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
