import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IceFinderApp } from "@/components/IceFinderApp";
import { CATEGORY_LABELS, FACILITIES, municipalityToTab } from "@/lib/domain";
import { FACILITY_CONTACTS, getFacilitySheets } from "@/lib/facilities";
import { getFeed } from "@/lib/queries";
import { buildSportsEventSchema } from "@/lib/schema";
import { formatDayHeading, formatTimeRange } from "@/lib/time";
import { hasGoalieNeeded, isGoalieFree } from "@/lib/sessions";

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

  const facilitySeed = FACILITIES.find((f) => f.slug === facilitySlug);
  const municipality = facility.municipality ?? facilitySeed?.municipality ?? "Metro Vancouver";

  const hasMajorAlias = facility.aliases?.includes("8 Rinks");
  let title = hasMajorAlias
    ? `${facility.name} (Formerly 8 Rinks) Skating Schedule & Drop-In Times | IceFinder`
    : `${facility.name} Skating Schedule & Drop-In Times | IceFinder`;

  let description = `Real-time drop-in hockey, stick & puck, figure skating buy-ons, and public skating times at ${facility.name} in ${municipality}, BC. Check live open spots and register directly.`;

  if (facilitySlug === "bill-copeland") {
    title = "Bill Copeland Arena Skating Schedule & Drop-In Times | IceFinder";
    description =
      "Real-time skating schedule, stick & puck, and drop-in times for Bill Copeland Sports Centre in Burnaby, BC. Check live open spots and register directly.";
  }

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
  const facilityMunicipality = contact.municipality ?? facilitySeed?.municipality ?? "Metro Vancouver";
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

  const hasMajorAlias = contact.aliases?.includes("8 Rinks");
  let title = hasMajorAlias
    ? `${contact.name} (Formerly 8 Rinks) Skating Schedule & Drop-In Times | IceFinder`
    : `${contact.name} Skating Schedule & Drop-In Times | IceFinder`;
  let description = `Real-time drop-in hockey, stick & puck, figure skating buy-ons, and public skating times at ${contact.name} in ${facilityMunicipality}, BC. Check live open spots and register directly.`;

  if (facilitySlug === "bill-copeland") {
    title = "Bill Copeland Arena Skating Schedule & Drop-In Times | IceFinder";
    description =
      "Real-time skating schedule, stick & puck, and drop-in times for Bill Copeland Sports Centre in Burnaby, BC. Check live open spots and register directly.";
  }

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
        alternateName: contact.aliases || [],
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
        itemListElement: upcomingSessions.map((session, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: session.rawTitle,
          description: `${session.facilityName} - ${CATEGORY_LABELS[session.category] ?? session.category}`,
          url: session.bookingUrl || `https://www.icefinder.ca/rinks/${facilitySlug}`,
        })),
      },
      ...upcomingSessions.map((session) =>
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
          <table>
            <caption>Upcoming {contact.name} 7-Day Drop-In Skating &amp; Hockey Schedule</caption>
            <thead>
              <tr>
                <th scope="col">Date &amp; Time</th>
                <th scope="col">Activity</th>
                <th scope="col">Category</th>
                <th scope="col">Rink / Sheet</th>
                <th scope="col">Available Spots</th>
                <th scope="col">Registration</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.map((session) => {
                const sessionWithAliases = {
                  ...session,
                  start_time: session.startTime,
                  facility_slug: session.facilitySlug,
                };
                const categoryLabel = CATEGORY_LABELS[session.category] ?? session.category;
                const spotsLabel =
                  session.openSpots > 0
                    ? `${session.openSpots} spots open`
                    : "Full / Waitlist only";
                const goalieExtra = hasGoalieNeeded(session)
                  ? " · Goalie Spot Available"
                  : isGoalieFree(session)
                  ? " · Free for goalies"
                  : "";

                return (
                  <tr key={session.id}>
                    <td>
                      <time dateTime={sessionWithAliases.start_time}>
                        {formatDayHeading(session.startTime)},{" "}
                        {formatTimeRange(session.startTime, session.endTime)}
                      </time>
                    </td>
                    <td>{session.rawTitle}</td>
                    <td>{categoryLabel}</td>
                    <td>{session.rink ? `${session.facilityName} (${session.rink})` : session.facilityName}</td>
                    <td>
                      {spotsLabel}
                      {goalieExtra}
                    </td>
                    <td>
                      {session.bookingUrl ? (
                        <a href={session.bookingUrl}>
                          Register directly for {session.rawTitle} at {session.facilityName}
                        </a>
                      ) : (
                        "Drop-in at door"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        seoTitle={title}
        seoDescription={description}
      />
    </>
  );
}
