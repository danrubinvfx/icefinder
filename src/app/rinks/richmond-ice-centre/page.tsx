import type { Metadata } from "next";
import RinkPage, { generateMetadata as generateRinkMetadata } from "../[facility]/page";

export async function generateMetadata(): Promise<Metadata> {
  return generateRinkMetadata({
    params: Promise.resolve({ facility: "richmond-ice-centre" }),
  });
}

export default async function RichmondIceCentrePage() {
  return <RinkPage params={Promise.resolve({ facility: "richmond-ice-centre" })} />;
}
