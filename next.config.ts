import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
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
