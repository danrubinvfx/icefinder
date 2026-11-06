import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IceFinderApp } from "@/components/IceFinderApp";
import { CATEGORY_LABELS, matchesMunicipalityFilter, type Municipality } from "@/lib/domain";
import { getFeed } from "@/lib/queries";
import { buildSportsEventSchema } from "@/lib/schema";
import { formatDayHeading, formatTimeRange } from "@/lib/time";
import { hasGoalieNeeded, isGoalieFree } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

const VALID_MUNICIPALITIES: Record<string, string> = {
  burnaby: "Burnaby",
  vancouver: "Vancouver",
  "north-shore": "North Shore",
  "new-west": "New West",
  richmond: "Richmond",
  coquitlam: "Tri-Cities",
  "tri-cities": "Tri-Cities",
  delta: "Delta",
  surrey: "Surrey",
  langley: "Langley",
  "maple-ridge": "Maple Ridge",
};

interface CityMeta {
  title: string;
  description: string;
  tab: Municipality;
}

const CITY_DETAILS: Record<string, CityMeta> = {
  burnaby: {
    title: "Burnaby Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in ice schedules for Rosemary Brown, Kensington, Bill Copeland, and Scotia Barn.",
    tab: "Burnaby",
  },
  vancouver: {
    title: "Vancouver Ice Times & Drop-In Hockey Schedule | IceFinder",
    description:
      "Live drop-in hockey, stick & puck, and public skating schedules for Britannia, Hillcrest, Kitsilano, Trout Lake, Sunset, and Killarney rinks.",
    tab: "Vancouver",
  },
  "north-shore": {
    title: "North Shore Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in ice schedules for Karen Magnussen, Harry Jerome, and West Vancouver Ice Arena.",
    tab: "North Shore",
  },
  "new-west": {
    title: "New Westminster Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in ice schedules for Moody Park Arena in New Westminster.",
    tab: "New West",
  },
  richmond: {
    title: "Richmond Ice Times & Drop-In Hockey Schedule | IceFinder",
    description:
      "Live drop-in hockey, stick & puck, and public skating schedules for Richmond Ice Centre and Minoru Arenas. Updated every 30 minutes.",
    tab: "Richmond",
  },
  coquitlam: {
    title: "Tri-Cities Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in hockey, stick & puck, and public skating schedules for Poirier Sport & Leisure Complex and Planet Ice in Coquitlam.",
    tab: "Tri-Cities",
  },
  "tri-cities": {
    title: "Tri-Cities Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in hockey, stick & puck, and public skating schedules for Poirier Sport & Leisure Complex and Planet Ice in Coquitlam.",
    tab: "Tri-Cities",
  },
  delta: {
    title: "Delta Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Live drop-in hockey, stick & puck, and public skating schedules for Sungod, North Delta, South Delta, Tilbury Ice, and Planet Ice Delta.",
    tab: "Delta",
  },
  surrey: {
    title: "Surrey Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in ice schedules for North Surrey, Surrey Sport & Leisure, Cloverdale, South Surrey, and Newton Arena.",
    tab: "Surrey",
  },
  langley: {
    title: "Langley Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in hockey, stick & puck, and public skating schedules for George Preston Recreation Centre and Aldergrove Credit Union Community Centre.",
    tab: "Langley",
  },
  "maple-ridge": {
    title: "Maple Ridge Ice Times & Drop-In Hockey Schedule | IceFinder",
    description:
      "Real-time drop-in hockey, stick & puck, and public skating schedules for Planet Ice Maple Ridge.",
    tab: "Tri-Cities",
  },
};

export function generateStaticParams() {
  return Object.keys(VALID_MUNICIPALITIES).map((slug) => ({
    municipality: slug,
  }));
}

interface RouteProps {
  params: Promise<{ municipality: string }>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { municipality } = await params;
  const slug = municipality?.toLowerCase();
  const cityName = VALID_MUNICIPALITIES[slug];

  if (!cityName) return {};

  const details = CITY_DETAILS[slug];
  const title = details?.title ?? `${cityName} Ice Times & Drop-In Hockey Schedule | IceFinder`;
  const description =
    details?.description ??
    `Live drop-in hockey, stick & puck, and skating schedules in ${cityName}.`;

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: `https://www.icefinder.ca/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.icefinder.ca/${slug}`,
      siteName: "IceFinder",
      locale: "en_CA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MunicipalityPage({ params }: RouteProps) {
  const { municipality } = await params;
  const slug = municipality?.toLowerCase();

  if (!VALID_MUNICIPALITIES[slug]) {
    notFound();
  }

  const cityName = VALID_MUNICIPALITIES[slug];
  const details = CITY_DETAILS[slug];
  const title = details?.title ?? `${cityName} Ice Times & Drop-In Hockey Schedule | IceFinder`;
  const description =
    details?.description ??
    `Live drop-in hockey, stick & puck, and skating schedules in ${cityName}.`;
  const tab = details?.tab ?? (cityName as Municipality);

  const feed = await getFeed();
  const facilityMap = new Map(feed.facilities.map((f) => [f.slug, f]));

  // Upcoming 48 hours filter for this municipality
  const now = Date.now();
  const in48Hours = now + 48 * 60 * 60 * 1000;
  const upcomingSessions = feed.sessions.filter((s) => {
    const startMs = new Date(s.startTime).getTime();
    const endMs = new Date(s.endTime).getTime();
    const matchesCity =
      s.municipality.toLowerCase() === slug ||
      matchesMunicipalityFilter(s.municipality, tab);
    return matchesCity && endMs > now && startMs <= in48Hours;
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://www.icefinder.ca/${slug}#webpage`,
        url: `https://www.icefinder.ca/${slug}`,
        name: title,
        description,
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://www.icefinder.ca/#website",
          name: "IceFinder",
          url: "https://www.icefinder.ca",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.icefinder.ca",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: cityName,
            item: `https://www.icefinder.ca/${slug}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${cityName} Upcoming Drop-In Ice Schedule`,
        itemListElement: upcomingSessions.slice(0, 25).map((session, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: session.rawTitle,
          description: `${session.facilityName} - ${CATEGORY_LABELS[session.category] ?? session.category}`,
          url: session.bookingUrl || `https://www.icefinder.ca/${slug}`,
        })),
      },
      ...upcomingSessions
        .slice(0, 15)
        .map((session) =>
          buildSportsEventSchema(session, facilityMap.get(session.facilitySlug))
        ),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Accessible SSR list for search engine crawlers (Googlebot) & screen readers */}
      <section
        className="sr-only"
        aria-label={`Upcoming ${cityName} Ice Sessions and Drop-In Schedule`}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        <p>
          Upcoming drop-in hockey, stick &amp; puck, figure skating buy-ons, and public skating
          sessions across {cityName} arenas in the next 48 hours:
        </p>
        {upcomingSessions.length === 0 ? (
          <p>
            No drop-in sessions currently scheduled in {cityName} for the next 48 hours. Live
            schedules update automatically as municipal recreation centres release open ice.
          </p>
        ) : (
          <ul>
            {upcomingSessions.map((session) => (
              <li key={session.id}>
                <article>
                  <h3>{session.rawTitle}</h3>
                  <p>
                    <strong>Facility:</strong> {session.facilityName}
                    {session.rink ? ` (${session.rink})` : ""}
                  </p>
                  <p>
                    <strong>Category:</strong>{" "}
                    {CATEGORY_LABELS[session.category] ?? session.category}
                  </p>
                  <p>
                    <strong>Time:</strong>{" "}
                    <time dateTime={session.startTime}>
                      {formatDayHeading(session.startTime)},{" "}
                      {formatTimeRange(session.startTime, session.endTime)}
                    </time>
                  </p>
                  <p>
                    <strong>Spots:</strong>{" "}
                    {session.openSpots > 0
                      ? `${session.openSpots} spots open`
                      : "Full / Waitlist only"}
                    {hasGoalieNeeded(session) ? " · Goalie Spot Available" : ""}
                    {isGoalieFree(session) ? " · Free for goalies" : ""}
                  </p>
                  {session.bookingUrl && (
                    <p>
                      <a href={session.bookingUrl}>
                        Register directly for {session.rawTitle} at {session.facilityName}
                      </a>
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Interactive live app pre-filtered for this municipality */}
      <IceFinderApp
        initialFeed={feed}
        initialMunicipality={tab}
        seoTitle={title.replace(" | IceFinder", "")}
        seoDescription={description}
      />
    </>
  );
}
