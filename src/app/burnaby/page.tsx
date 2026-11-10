import type { Metadata } from "next";
import MunicipalityPage, {
  generateMetadata as generateMunicipalityMetadata,
} from "../city/[municipality]/page";

interface PageProps {
  searchParams?: Promise<{ category?: string; [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return generateMunicipalityMetadata({
    params: Promise.resolve({ municipality: "burnaby" }),
  });
}

export default async function BurnabyPage({ searchParams }: PageProps) {
  return (
    <MunicipalityPage
      params={Promise.resolve({ municipality: "burnaby" })}
      searchParams={searchParams}
    />
  );
}
