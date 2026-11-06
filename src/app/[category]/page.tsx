import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IceFinderApp } from "@/components/IceFinderApp";
import { CATEGORY_LABELS } from "@/lib/domain";
import { getFeed } from "@/lib/queries";
import { buildSportsEventSchema } from "@/lib/schema";
import { formatDayHeading, formatTimeRange } from "@/lib/time";
import { hasGoalieNeeded, isGoalieFree } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

const VALID_CATEGORIES: Record<
  string,
  {
    enumVal: "figure_buyon" | "hockey_dropin" | "stick_and_puck" | "public_skate";
    title: string;
    h1: string;
    description: string;
    metaKeywords: string[];
  }
> = {
  "figure-skating": {
    enumVal: "figure_buyon",
    title: "Metro Vancouver Figure Skating Buy-Ons & Practice Ice | IceFinder",
    h1: "Metro Vancouver Figure Skating Buy-Ons & Freestyle Ice",
    description:
      "Live schedule and open spots for figure skating buy-ons, StarSkate sessions, and club practice ice across Vancouver, Burnaby, Richmond, Coquitlam, Surrey, and North Shore rinks.",
    metaKeywords: [
      "figure skating buy ons",
      "vancouver figure skating drop in",
      "burnaby figure buy on",
      "freestyle ice metro vancouver",
    ],
  },
  "drop-in-hockey": {
    enumVal: "hockey_dropin",
    title: "Metro Vancouver Drop-In Hockey Schedule (Live Spots) | IceFinder",
    h1: "Metro Vancouver Drop-In Hockey & Adult Shinny",
    description:
      "Real-time adult drop-in hockey schedules, open roster spots, and goalie callouts for Scotia Barn, Britannia, Rosemary Brown, Richmond, and Surrey arenas.",
    metaKeywords: [
      "drop in hockey vancouver",
      "adult shinny burnaby",
      "richmond drop in hockey",
      "vancouver drop in hockey schedules",
    ],
  },
  "stick-and-puck": {
    enumVal: "stick_and_puck",
    title: "Metro Vancouver Stick & Puck Ice Times (Today & Weekend) | IceFinder",
    h1: "Metro Vancouver Stick & Puck Ice Times",
    description:
      "Find open stick and puck sessions across Burnaby, Vancouver, Richmond, Delta, and Surrey rinks. Check live capacity and reserve online.",
    metaKeywords: [
      "stick and puck burnaby",
      "vancouver stick and puck",
      "delta stick and puck",
      "stick puck ring schedule",
    ],
  },
  "public-skate": {
    enumVal: "public_skate",
    title: "Metro Vancouver Public Skating Schedules & Free Skates | IceFinder",
    h1: "Metro Vancouver Public Skating & Leisure Ice Times",
    description:
      "Daily public skating hours, toonie skates, and family leisure ice schedules for all community arenas across Metro Vancouver.",
    metaKeywords: [
      "public skating vancouver",
      "burnaby public skate",
      "toonie skate coquitlam",
      "family skating schedules",
    ],
  },
};

export function generateStaticParams() {
  return ["figure-skating", "drop-in-hockey", "stick-and-puck", "public-skate"].map(
    (slug) => ({
      category: slug,
    }),
  );
}

interface RouteProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { category } = await params;
  const slug = category?.toLowerCase();
  const cat = VALID_CATEGORIES[slug];

  if (!cat) return {};

  return {
    title: {
      absolute: cat.title,
    },
    description: cat.description,
    keywords: cat.metaKeywords,
    alternates: {
      canonical: `https://www.icefinder.ca/${slug}`,
    },
    openGraph: {
      title: cat.title,
      description: cat.description,
      url: `https://www.icefinder.ca/${slug}`,
      siteName: "IceFinder",
      locale: "en_CA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: cat.title,
      description: cat.description,
    },
  };
}

export default async function CategoryPage({ params }: RouteProps) {
  const { category } = await params;
  const slug = category?.toLowerCase();

  const cat = VALID_CATEGORIES[slug];
  if (!cat) {
    notFound();
  }

  const feed = await getFeed();

  const facilityMap = new Map(feed.facilities.map((f) => [f.slug, f]));

  // Upcoming sessions for the next 48 hours filtered specifically to category.enumVal
  const now = Date.now();
  const in48Hours = now + 48 * 60 * 60 * 1000;
  const upcomingSessions = feed.sessions.filter((s) => {
    const startMs = new Date(s.startTime).getTime();
    const endMs = new Date(s.endTime).getTime();
    return s.category === cat.enumVal && endMs > now && startMs <= in48Hours;
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://www.icefinder.ca/${slug}#webpage`,
        url: `https://www.icefinder.ca/${slug}`,
        name: cat.title,
        description: cat.description,
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
            name: cat.h1,
            item: `https://www.icefinder.ca/${slug}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${cat.h1} Upcoming Sessions`,
        itemListElement: upcomingSessions.slice(0, 25).map((session, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: session.rawTitle,
          description: `${session.facilityName} (${session.municipality}) - ${
            session.openSpots > 0 ? `${session.openSpots} spots open` : "Full / Waitlist"
          }${hasGoalieNeeded(session) ? " · Goalie Spot Available" : ""}${isGoalieFree(session) ? " · Free for goalies" : ""}`,
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
        aria-label={`${cat.h1} Drop-In Ice Times and Schedule`}
      >
        <h1>{cat.h1}</h1>
        <h2>{cat.title}</h2>
        <p>{cat.description}</p>
        <p>
          Upcoming {cat.h1.toLowerCase()} sessions across Metro Vancouver and Lower
          Mainland community arenas in the next 48 hours:
        </p>
        {upcomingSessions.length === 0 ? (
          <p>
            No sessions currently scheduled for the next 48 hours. Live schedules
            update automatically as municipal recreation centres release open ice.
          </p>
        ) : (
          <ul>
            {upcomingSessions.map((session) => (
              <li key={session.id}>
                <article>
                  <h3>{session.rawTitle}</h3>
                  <p>
                    <strong>Facility:</strong> {session.facilityName}
                    {session.rink ? ` (${session.rink})` : ""} - {session.municipality}
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

      {/* Interactive live app pre-filtered for this category */}
      <IceFinderApp
        initialFeed={feed}
        initialCategory={cat.enumVal}
        seoTitle={cat.h1}
        seoDescription={cat.description}
      />
    </>
  );
}
