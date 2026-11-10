import type { Metadata } from "next";
import RinkPage, { generateMetadata as generateRinkMetadata } from "../[facility]/page";

export async function generateMetadata(): Promise<Metadata> {
  return generateRinkMetadata({
    params: Promise.resolve({ facility: "minoru" }),
  });
}

export default async function MinoruPage() {
  return <RinkPage params={Promise.resolve({ facility: "minoru" })} />;
}
