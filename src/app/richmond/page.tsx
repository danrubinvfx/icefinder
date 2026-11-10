import type { Metadata } from "next";
import MunicipalityPage, {
  generateMetadata as generateMunicipalityMetadata,
} from "../city/[municipality]/page";

interface PageProps {
  searchParams?: Promise<{ category?: string; [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return generateMunicipalityMetadata({
    params: Promise.resolve({ municipality: "richmond" }),
  });
}

export default async function RichmondPage({ searchParams }: PageProps) {
  return (
    <MunicipalityPage
      params={Promise.resolve({ municipality: "richmond" })}
      searchParams={searchParams}
    />
  );
}
