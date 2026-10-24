import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IceFinder — Metro Vancouver Ice Times",
    short_name: "IceFinder",
    description: "Live drop-in hockey, stick & puck, figure buy-on and public skate availability across Metro Vancouver.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0c2a43",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
