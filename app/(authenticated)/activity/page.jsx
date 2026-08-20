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

const ACTIVITY_ACTIONS = new Set(["added", "updated", "deleted", "moved", "completed"]);
const ACTIVITY_ENTITY_TYPES = new Set([
  "location",
  "storage_area",
  "category",
  "item",
  "shopping_list_item",
  "task",
]);

function normalizedSearchValue(searchParams, key, allowedValues) {
  const value = searchParams?.[key];
  const normalized = Array.isArray(value) ? value[0] : value;
  return allowedValues.has(normalized) ? normalized : "all";
}

export default async function ActivityPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const initialAction = normalizedSearchValue(
    resolvedSearchParams,
    "action",
    ACTIVITY_ACTIONS
  );
  const initialEntityType = normalizedSearchValue(
    resolvedSearchParams,
    "entityType",
    ACTIVITY_ENTITY_TYPES
  );
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
    getRecentActivityAction({
      limit: 12,
      action: initialAction,
      entityType: initialEntityType,
    }),
    getActivityFilterOptionsAction(),
  ]);

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] max-md:pb-0 max-md:pt-4">
      <div className="mb-5">
        <p className="text-sm font-semibold text-[var(--stocksense-brand)]">
          Household log
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Recent activity
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review additions, updates, moves, removals, completed tasks, and shopping list changes.
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
        initialAction={initialAction}
        initialEntityType={initialEntityType}
      />
    </main>
  );
}
