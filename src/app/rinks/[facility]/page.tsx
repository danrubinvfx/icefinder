import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IceFinderApp } from "@/components/IceFinderApp";
import { CATEGORY_LABELS, FACILITIES, municipalityToTab } from "@/lib/domain";
import { FACILITY_CONTACTS, getFacilitySheets } from "@/lib/facilities";
import { getFeed } from "@/lib/queries";
import { buildSportsEventSchema } from "@/lib/schema";
import { formatDayHeading, formatTimeRange } from "@/lib/time";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return Object.keys(FACILITY_CONTACTS).map((slug) => ({
    facility: slug,
  }));
}

interface RouteProps {
  params: Promise<{ facility: string }>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { facility: facilityParam } = await params;
  const facilitySlug = facilityParam?.toLowerCase();
  const facility = FACILITY_CONTACTS[facilitySlug];

  if (!facility) return {};

  const title = `${facility.name} Ice Schedule & Drop-In Times | IceFinder`;
  const description = `Real-time ice schedule, stick & puck, drop-in hockey, and public skating times for ${facility.name}. Check live spots and book directly.`;
  const canonical = `https://www.icefinder.ca/rinks/${facilitySlug}`;

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
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

export default async function RinkPage({ params }: RouteProps) {
  const { facility: facilityParam } = await params;
  const facilitySlug = facilityParam?.toLowerCase();
  const contact = FACILITY_CONTACTS[facilitySlug];

  if (!contact) {
    notFound();
  }

  const facilitySeed = FACILITIES.find((f) => f.slug === facilitySlug);
  const facilityMunicipality = facilitySeed?.municipality ?? "Metro Vancouver";
  const facilityAddress = facilitySeed?.address ?? `${contact.name}, ${facilityMunicipality}, BC`;
  const sheets = facilitySeed?.sheets ?? getFacilitySheets(facilitySlug);
  const municipalityTab = municipalityToTab(facilityMunicipality);

  const feed = await getFeed();

  // Upcoming sessions for the next 7 days in Supabase/feed filtered strictly to this facility
  const now = Date.now();
  const in7Days = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingSessions = feed.sessions.filter((s) => {
    const startMs = new Date(s.startTime).getTime();
    const endMs = new Date(s.endTime).getTime();
    return s.facilitySlug === facilitySlug && endMs > now && startMs <= in7Days;
  });

  const title = `${contact.name} Ice Schedule & Drop-In Times | IceFinder`;
  const description = `Real-time ice schedule, stick & puck, drop-in hockey, and public skating times for ${contact.name}. Check live spots and book directly.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://www.icefinder.ca/rinks/${facilitySlug}#webpage`,
        url: `https://www.icefinder.ca/rinks/${facilitySlug}`,
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
        "@type": "SportsActivityLocation",
        "@id": `https://www.icefinder.ca/rinks/${facilitySlug}#location`,
        name: contact.name,
        url: `https://www.icefinder.ca/rinks/${facilitySlug}`,
        telephone: contact.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: facilityAddress.split(",")[0].trim(),
          addressLocality: facilityMunicipality,
          addressRegion: "BC",
          addressCountry: "CA",
        },
        ...(facilitySeed?.lat && facilitySeed?.lng
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: facilitySeed.lat,
                longitude: facilitySeed.lng,
              },
            }
          : {}),
        sport: ["Ice Hockey", "Figure Skating", "Ice Skating"],
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
            name: "Rinks",
            item: "https://www.icefinder.ca/#rinks",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: contact.name,
            item: `https://www.icefinder.ca/rinks/${facilitySlug}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${contact.name} Upcoming Drop-In Ice Schedule`,
        itemListElement: upcomingSessions.slice(0, 25).map((session, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: session.rawTitle,
          description: `${session.facilityName} - ${CATEGORY_LABELS[session.category] ?? session.category}`,
          url: session.bookingUrl || `https://www.icefinder.ca/rinks/${facilitySlug}`,
        })),
      },
      ...upcomingSessions
        .slice(0, 15)
        .map((session) =>
          buildSportsEventSchema(session, {
            name: contact.name,
            slug: facilitySlug,
            municipality: facilityMunicipality,
          })
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
        aria-label={`Upcoming ${contact.name} Ice Sessions and Drop-In Schedule`}
      >
        <h1>{contact.name}</h1>
        <p>{facilityAddress}</p>
        {sheets !== undefined && <p>{sheets} Ice Sheets</p>}
        <p>Phone: {contact.phone}</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <p>
          Upcoming drop-in hockey, stick &amp; puck, figure skating buy-ons, and public skating
          sessions at {contact.name} in the next 7 days:
        </p>
        {upcomingSessions.length === 0 ? (
          <p>
            No drop-in sessions currently scheduled at {contact.name} for the next 7 days. Live
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

      {/* Interactive live app pre-filtered to this facility with interactive date toggles */}
      <IceFinderApp
        initialFeed={feed}
        initialFacility={facilitySlug}
        initialMunicipality={municipalityTab}
        initialDateMode="week"
        facilityInfo={{
          name: contact.name,
          address: facilityAddress,
          phone: contact.phone,
          sheets,
          scheduleUrl: contact.scheduleUrl,
          municipality: facilityMunicipality,
        }}
        seoTitle={`${contact.name} Ice Schedule`}
        seoDescription={description}
      />
    </>
  );
}
