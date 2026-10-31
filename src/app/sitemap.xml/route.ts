export const dynamic = "force-dynamic";

export async function GET() {
  const lastModified = new Date().toISOString();

  const routes = [
    { loc: "https://www.icefinder.ca/", priority: "1.0", changefreq: "hourly" },
    { loc: "https://www.icefinder.ca/burnaby", priority: "0.8", changefreq: "hourly" },
    { loc: "https://www.icefinder.ca/vancouver", priority: "0.8", changefreq: "hourly" },
    { loc: "https://www.icefinder.ca/richmond", priority: "0.8", changefreq: "hourly" },
    { loc: "https://www.icefinder.ca/coquitlam", priority: "0.8", changefreq: "hourly" },
    { loc: "https://www.icefinder.ca/delta", priority: "0.8", changefreq: "hourly" },
    { loc: "https://www.icefinder.ca/schedules/coquitlam-poirier", priority: "0.7", changefreq: "daily" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`.trim();

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
