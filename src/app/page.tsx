import { Suspense } from "react";
import { IceFinderApp } from "@/components/IceFinderApp";
import { getFeed } from "@/lib/queries";

export const dynamic = "force-dynamic";

async function FeedContent() {
  const feed = await getFeed();
  return <IceFinderApp initialFeed={feed} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center p-8 text-slate-500">
          <div className="flex items-center gap-3">
            <span className="size-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            <span className="text-sm font-medium">Loading live ice schedules...</span>
          </div>
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
