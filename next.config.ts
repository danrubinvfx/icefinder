import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    fallbackNodePolyfills: false,
    optimizePackageImports: ["lucide-react", "date-fns", "date-fns-tz"],
  },
  async rewrites() {
    return [
      {
        source:
          "/:municipality(burnaby|vancouver|north-shore|new-west|richmond|coquitlam|delta|surrey|maple-ridge)",
        destination: "/city/:municipality",
      },
    ];
  },
};

export default nextConfig;
