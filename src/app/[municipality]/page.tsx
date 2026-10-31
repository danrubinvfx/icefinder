import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IceFinderApp } from "@/components/IceFinderApp";
import { CATEGORY_LABELS, matchesMunicipalityFilter, type Municipality } from "@/lib/domain";
import { getFeed } from "@/lib/queries";
import { formatDayHeading, formatTimeRange } from "@/lib/time";

interface CityConfig {
  slug: string;
  name: string;
  tab: Municipality;
  title: string;
  description: string;
  facilities: string[];
}

const CITY_CONFIGS: Record<string, CityConfig> = {
  burnaby: {
    slug: "burnaby",
    name: "Burnaby",
    tab: "Burnaby",
    title: "Burnaby Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in ice schedules for Rosemary Brown, Kensington, Bill Copeland, and Scotia Barn.",
    facilities: [
      "Rosemary Brown Recreation Centre",
      "Kensington Complex",
      "Bill Copeland Sports Centre",
      "Scotia Barn (Canlan Sports Burnaby)",
    ],
  },
  vancouver: {
    slug: "vancouver",
    name: "Vancouver",
    tab: "Vancouver",
    title: "Vancouver Ice Times & Drop-In Hockey Schedule | IceFinder",
    description:
      "Live drop-in hockey, stick & puck, and public skating schedules for Britannia, Hillcrest, Kitsilano, Trout Lake, Sunset, and Killarney rinks.",
    facilities: [
      "Britannia Community Centre Rink",
      "Hillcrest Rink",
      "Kitsilano Community Centre Rink",
      "Trout Lake Rink",
      "Sunset Community Centre Rink",
      "Killarney Rink",
    ],
  },
  richmond: {
    slug: "richmond",
    name: "Richmond",
    tab: "Richmond",
    title: "Richmond Ice Times & Drop-In Hockey Schedule | IceFinder",
    description:
      "Live drop-in hockey, stick & puck, and public skating schedules for Richmond Ice Centre and Minoru Arenas. Updated every 30 minutes.",
    facilities: ["Richmond Ice Centre", "Minoru Arenas"],
  },
  coquitlam: {
    slug: "coquitlam",
    name: "Coquitlam",
    tab: "Tri-Cities",
    title: "Coquitlam Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Real-time drop-in hockey, stick & puck, and public skating schedules for Poirier Sport & Leisure Complex in Coquitlam.",
    facilities: ["Poirier Sport & Leisure Complex"],
  },
  delta: {
    slug: "delta",
    name: "Delta",
    tab: "Delta",
    title: "Delta Ice Times, Stick & Puck & Drop-In Schedule | IceFinder",
    description:
      "Live drop-in hockey, stick & puck, and public skating schedules for Sungod, North Delta, South Delta, and Tilbury Ice.",
    facilities: [
      "North Delta Recreation Centre",
      "Sungod Recreation Centre",
      "South Delta Recreation Centre",
      "Tilbury Ice",
    ],
  },
};

export const dynamicParams = false;
export const revalidate = 60;

export function generateStaticParams() {
  return [
    { municipality: "burnaby" },
    { municipality: "vancouver" },
    { municipality: "richmond" },
    { municipality: "coquitlam" },
    { municipality: "delta" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ municipality: string }>;
}): Promise<Metadata> {
  const { municipality: slug } = await params;
  const city = CITY_CONFIGS[slug.toLowerCase()];
  if (!city) return {};

  return {
    title: {
      absolute: city.title,
    },
    description: city.description,
    alternates: {
      canonical: `https://icefinder.ca/${city.slug}`,
    },
    openGraph: {
      title: city.title,
      description: city.description,
      url: `https://icefinder.ca/${city.slug}`,
      siteName: "IceFinder",
      locale: "en_CA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: city.title,
      description: city.description,
    },
  };
}

export default async function MunicipalityPage({
  params,
}: {
  params: Promise<{ municipality: string }>;
}) {
  const { municipality: slug } = await params;
  const city = CITY_CONFIGS[slug.toLowerCase()];
  if (!city) {
    notFound();
  }

  const feed = await getFeed();

  // Upcoming 48 hours filter for this municipality
  const now = Date.now();
  const in48Hours = now + 48 * 60 * 60 * 1000;
  const upcomingSessions = feed.sessions.filter((s) => {
    const startMs = new Date(s.startTime).getTime();
    const endMs = new Date(s.endTime).getTime();
    const matchesCity =
      s.municipality.toLowerCase() === city.slug.toLowerCase() ||
      matchesMunicipalityFilter(s.municipality, city.tab);
    return matchesCity && endMs > now && startMs <= in48Hours;
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://icefinder.ca/${city.slug}#webpage`,
        url: `https://icefinder.ca/${city.slug}`,
        name: city.title,
        description: city.description,
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://icefinder.ca/#website",
          name: "IceFinder",
          url: "https://icefinder.ca",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://icefinder.ca",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: city.name,
            item: `https://icefinder.ca/${city.slug}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${city.name} Upcoming Drop-In Ice Schedule`,
        itemListElement: upcomingSessions.slice(0, 25).map((session, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: session.rawTitle,
          description: `${session.facilityName} - ${CATEGORY_LABELS[session.category] ?? session.category}`,
          url: session.bookingUrl || `https://icefinder.ca/${city.slug}`,
        })),
      },
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
        aria-label={`Upcoming ${city.name} Ice Sessions and Drop-In Schedule`}
      >
        <h2>{city.title}</h2>
        <p>{city.description}</p>
        <p>
          Upcoming drop-in hockey, stick &amp; puck, figure skating buy-ons, and public skating
          sessions across {city.name} arenas in the next 48 hours:
        </p>
        {upcomingSessions.length === 0 ? (
          <p>
            No drop-in sessions currently scheduled in {city.name} for the next 48 hours. Live
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
                    {session.isGoalieFree ? " · Free for goalies" : ""}
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
        initialMunicipality={city.tab}
        seoTitle={city.title.replace(" | IceFinder", "")}
        seoDescription={city.description}
      />
    </>
  );
}
