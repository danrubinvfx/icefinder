import { Suspense } from "react";
import { IceFinderApp } from "@/components/IceFinderApp";
import { getFeed } from "@/lib/queries";

export const dynamic = "force-dynamic";

async function FeedContent() {
  const feed = await getFeed();
  return <IceFinderApp initialFeed={feed} />;
}

function FeedSkeleton() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl animate-pulse px-4 pb-16 pt-4">
      {/* Top Bar Skeleton */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-slate-200" />
          <div className="h-6 w-28 rounded-md bg-slate-200" />
        </div>
        <div className="h-8 w-32 rounded-full bg-slate-200" />
      </div>

      {/* Pill Filters Skeleton */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-3">
        <div className="h-9 w-20 rounded-full bg-slate-200" />
        <div className="h-9 w-24 rounded-full bg-slate-200" />
        <div className="h-9 w-28 rounded-full bg-slate-200" />
        <div className="h-9 w-28 rounded-full bg-slate-200" />
      </div>

      {/* Category Pills Skeleton */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-3">
        <div className="h-9 w-16 rounded-full bg-slate-200" />
        <div className="h-9 w-32 rounded-full bg-slate-200" />
        <div className="h-9 w-28 rounded-full bg-slate-200" />
        <div className="h-9 w-36 rounded-full bg-slate-200" />
      </div>

      {/* Session Cards Skeleton */}
      <div className="mt-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-24 rounded bg-slate-200" />
                  <div className="h-5 w-16 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-48 rounded bg-slate-200" />
                <div className="h-4 w-36 rounded bg-slate-100" />
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <div className="h-7 w-28 rounded-full bg-slate-100" />
                <div className="h-10 w-32 rounded-xl bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent />
    </Suspense>
  );
}
