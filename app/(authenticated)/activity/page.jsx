import RecentActivity from "@/components/dashboard/RecentActivity";
import {
  getActivityFilterOptionsAction,
  getRecentActivityAction,
} from "@/app/actions/activity";
import { getSessionForLayout } from "@/app/actions/auth";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata({
  title: "Recent Activity",
  description: "Review recent household inventory activity.",
  path: "/activity",
  robots: NO_INDEX_ROBOTS,
});

export default async function ActivityPage() {
  const session = await getSessionForLayout();
  const supabase = await createClient();
  let currentUser = session?.user?.user ?? null;

  if (!currentUser?.id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUser = user ?? null;
  }

  if (!currentUser?.id) {
    redirect("/");
  }

  const [activityResult, filtersResult] = await Promise.all([
    getRecentActivityAction({ limit: 12 }),
    getActivityFilterOptionsAction(),
  ]);

  return (
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] max-md:pb-0 max-md:pt-4">
      <div className="mb-5">
        <p className="text-sm font-semibold text-[var(--stocksense-brand)]">
          Household log
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Recent activity
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review additions, updates, moves, removals, and shopping list changes.
        </p>
      </div>

      <RecentActivity
        variant="full"
        items={activityResult.data.items}
        members={filtersResult.data.members}
        effectivePlanId={filtersResult.data.effectivePlanId}
        initialCursor={activityResult.data.nextCursor}
        initialHasMore={activityResult.data.hasMore}
        initialError={activityResult.error || filtersResult.error}
      />
    </main>
  );
}
