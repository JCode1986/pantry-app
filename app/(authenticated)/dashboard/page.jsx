import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MobileDashboardHome from '@/components/dashboard/MobileDashboardHome';
import DesktopDashboardToolbar from '@/components/dashboard/DesktopDashboardToolbar';
import AttentionItemsCard from '@/components/dashboard/AttentionItemsCard';
import InventoryByLocation from '@/components/dashboard/InventoryByLocation';
import { getAuthenticatedAppShellState } from '@/components/app-shell/authenticatedShellState';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';
import {
  getHouseholdForUser,
} from '@/utils/households';
import {
  INVENTORY_IMAGE_VARIANT,
  getInventoryImageUrls,
} from '@/utils/inventoryImages';
import { addDays, toDateString } from '@/utils/pantry/date';
import { LuClock3, LuPackageMinus, LuTriangleAlert } from 'react-icons/lu';

export const metadata = createPageMetadata({
  title: 'Dashboard',
  description: 'View your household inventory overview and items needing attention.',
  path: '/dashboard',
  robots: NO_INDEX_ROBOTS,
});

function getDisplayName(user) {
  const metadata = user?.user_metadata ?? {};
  const name =
    metadata.preferred_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split('@')[0];

  return name ? String(name).split(' ')[0] : 'there';
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getPendingInviteToken(user) {
  const token = user?.user_metadata?.household_invite_token;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

function uniqueIds(rows = [], key = 'id') {
  return [
    ...new Set((rows ?? []).map((row) => row?.[key]).filter(Boolean).map(String)),
  ];
}

async function getItemLocationMaps(supabase, itemsRaw = []) {
  const categoryIds = uniqueIds(itemsRaw, 'category_id');

  if (categoryIds.length === 0) {
    return {
      categoryMap: new Map(),
      areaMap: new Map(),
      locationMap: new Map(),
    };
  }

  const { data: categoriesRaw = [] } = await supabase
    .from('storage_categories')
    .select('id, name, storage_area_id')
    .in('id', categoryIds);
  const areaIds = uniqueIds(categoriesRaw, 'storage_area_id');

  const { data: areasRaw = [] } = areaIds.length
    ? await supabase
        .from('storage_areas')
        .select('id, name, location_id')
        .in('id', areaIds)
    : { data: [] };
  const locationIds = uniqueIds(areasRaw, 'location_id');

  const { data: locationsRaw = [] } = locationIds.length
    ? await supabase.from('locations').select('id, name').in('id', locationIds)
    : { data: [] };

  return {
    categoryMap: new Map((categoriesRaw ?? []).map((category) => [String(category.id), category])),
    areaMap: new Map((areasRaw ?? []).map((area) => [String(area.id), area])),
    locationMap: new Map((locationsRaw ?? []).map((location) => [String(location.id), location])),
  };
}

function getItemLocationPath(item, { categoryMap, areaMap, locationMap }) {
  const category = item.category_id
    ? categoryMap.get(String(item.category_id))
    : null;
  const area = category?.storage_area_id
    ? areaMap.get(String(category.storage_area_id))
    : null;
  const location = area?.location_id
    ? locationMap.get(String(area.location_id))
    : null;

  return {
    categoryId: category?.id ?? item.category_id ?? null,
    categoryName: category?.name ?? null,
    areaName: area?.name ?? null,
    locationName: location?.name ?? null,
  };
}

async function getExpirationNotifications(
  supabase,
  withinDays = 3,
  counts = {}
) {
  const cutoff = toDateString(addDays(new Date(), withinDays));

  const { data: itemsRaw = [], error: itemsError } = await supabase
    .from('items')
    .select('id, name, quantity, expiration_date, category_id')
    .not('expiration_date', 'is', null)
    .lte('expiration_date', cutoff)
    .order('expiration_date', { ascending: true })
    .limit(50);

  if (itemsError) {
    console.error('expiration notifications error:', { itemsError });
    return {
      items: [],
      expiredCount: 0,
      expiringSoonCount: 0,
      withinDays,
    };
  }

  if (itemsRaw.length === 0) {
    return {
      items: [],
      expiredCount: counts.expiredCount ?? 0,
      expiringSoonCount: counts.expiringSoonCount ?? 0,
      withinDays,
    };
  }

  const locationMaps = await getItemLocationMaps(supabase, itemsRaw);

  return {
    items: itemsRaw.map((item) => {
      const path = getItemLocationPath(item, locationMaps);

      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 0,
        expirationDate: item.expiration_date,
        categoryName: path.categoryName,
        areaName: path.areaName,
        locationName: path.locationName,
      };
    }),
    expiredCount: counts.expiredCount ?? 0,
    expiringSoonCount: counts.expiringSoonCount ?? 0,
    withinDays,
  };
}

async function hydrateDashboardItems(supabase, itemsRaw = []) {
  if (itemsRaw.length === 0) return [];

  const [imageUrlsByPath, locationMaps] = await Promise.all([
    getInventoryImageUrls(
      itemsRaw.map((item) => item.image_path),
      { variant: INVENTORY_IMAGE_VARIANT.CARD }
    ),
    getItemLocationMaps(supabase, itemsRaw),
  ]);

  return itemsRaw.map((item) => {
    const path = getItemLocationPath(item, locationMaps);

    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? 0,
      expirationDate: item.expiration_date,
      imageUrl: imageUrlsByPath.get(item.image_path) ?? null,
      imageThumbUrl: imageUrlsByPath.get(item.image_path) ?? null,
      categoryId: path.categoryId,
      categoryName: path.categoryName,
      areaName: path.areaName,
      locationName: path.locationName,
    };
  });
}

async function getDashboardAttentionItems(supabase, withinDays = 3, counts = {}) {
  const today = toDateString(new Date());
  const cutoff = toDateString(addDays(new Date(), withinDays));
  const hasLowStockCount =
    counts.summaryCountsLoaded && Number.isFinite(Number(counts.lowStockCount));

  const [
    { data: expiredRaw = [], error: expiredError },
    { data: expiringSoonRaw = [], error: expiringSoonError },
    { data: lowStockRaw = [], error: lowStockError },
    { count: lowStockCount = 0, error: lowStockCountError },
  ] = await Promise.all([
    supabase
      .from('items')
      .select('id, name, quantity, expiration_date, category_id, image_path')
      .not('expiration_date', 'is', null)
      .lt('expiration_date', today)
      .order('expiration_date', { ascending: true })
      .limit(3),
    supabase
      .from('items')
      .select('id, name, quantity, expiration_date, category_id, image_path')
      .not('expiration_date', 'is', null)
      .gte('expiration_date', today)
      .lte('expiration_date', cutoff)
      .order('expiration_date', { ascending: true })
      .limit(3),
    supabase
      .from('items')
      .select('id, name, quantity, expiration_date, category_id, image_path')
      .lte('quantity', 1)
      .order('quantity', { ascending: true })
      .order('name', { ascending: true })
      .limit(3),
    hasLowStockCount
      ? Promise.resolve({ count: Number(counts.lowStockCount), error: null })
      : supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .lte('quantity', 1),
  ]);

  const errors = [
    expiredError,
    expiringSoonError,
    lowStockError,
    lowStockCountError,
  ].filter(Boolean);

  if (errors.length) {
    console.error('dashboard attention items error:', errors);
    return {
      expiredItems: [],
      expiringSoonItems: [],
      lowStockItems: [],
      lowStockCount: 0,
    };
  }

  const hydratedItems = await hydrateDashboardItems(supabase, [
    ...expiredRaw,
    ...expiringSoonRaw,
    ...lowStockRaw,
  ]);
  const hydratedById = new Map(
    hydratedItems.map((item) => [String(item.id), item])
  );
  const pickHydratedItems = (rows = []) =>
    rows
      .map((item) => hydratedById.get(String(item.id)))
      .filter(Boolean);

  return {
    expiredItems: pickHydratedItems(expiredRaw),
    expiringSoonItems: pickHydratedItems(expiringSoonRaw),
    lowStockItems: pickHydratedItems(lowStockRaw),
    lowStockCount: lowStockCount ?? 0,
  };
}

async function getInventoryByLocation(supabase) {
  try {
    const { data, error } = await supabase.rpc("wherekeep_inventory_by_location");
    if (!error && Array.isArray(data)) {
      return data.map((location) => ({
        id: location.id,
        name: location.name,
        itemCount: Number(location.item_count ?? 0),
      }));
    }
    if (error) {
      console.error('inventory by location RPC unavailable:', error);
    }
  } catch (err) {
    console.error('inventory by location RPC failed:', err);
  }

  const [
    { data: joinedLocationsRaw = [], error: joinedLocationsError },
    { data: joinedItemsRaw = [], error: joinedItemsError },
  ] = await Promise.all([
    supabase.from('locations').select('id, name').order('name', { ascending: true }),
    supabase
      .from('items')
      .select(
        `
        id,
        category:storage_categories!fk_items_category (
          storage_area:storage_areas!fk_storage_area (
            location_id
          )
        )
      `
      ),
  ]);

  if (!joinedLocationsError && !joinedItemsError) {
    const itemCountByLocation = new Map();

    for (const item of joinedItemsRaw ?? []) {
      const locationId = item.category?.storage_area?.location_id;
      if (!locationId) continue;
      const key = String(locationId);
      itemCountByLocation.set(key, (itemCountByLocation.get(key) ?? 0) + 1);
    }

    return (joinedLocationsRaw ?? [])
      .map((location) => ({
        id: location.id,
        name: location.name,
        itemCount: itemCountByLocation.get(String(location.id)) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.itemCount - a.itemCount ||
          String(a.name || '').localeCompare(String(b.name || ''))
      );
  }

  if (joinedItemsError) {
    console.error('inventory by location joined item error:', joinedItemsError);
  }

  const [
    { data: locationsRaw = [], error: locationsError },
    { data: areasRaw = [], error: areasError },
    { data: categoriesRaw = [], error: categoriesError },
    { data: itemsRaw = [], error: itemsError },
  ] = await Promise.all([
    supabase.from('locations').select('id, name').order('name', { ascending: true }),
    supabase.from('storage_areas').select('id, location_id'),
    supabase.from('storage_categories').select('id, storage_area_id'),
    supabase.from('items').select('id, category_id'),
  ]);

  const errors = [locationsError, areasError, categoriesError, itemsError].filter(Boolean);
  if (errors.length) {
    console.error('inventory by location error:', errors);
    return [];
  }

  const areaToLocation = new Map(
    areasRaw.map((area) => [String(area.id), area.location_id])
  );
  const categoryToLocation = new Map(
    categoriesRaw.map((category) => [
      String(category.id),
      areaToLocation.get(String(category.storage_area_id)),
    ])
  );
  const itemCountByLocation = new Map();

  for (const item of itemsRaw) {
    const locationId = categoryToLocation.get(String(item.category_id));
    if (!locationId) continue;
    const key = String(locationId);
    itemCountByLocation.set(key, (itemCountByLocation.get(key) ?? 0) + 1);
  }

  return locationsRaw
    .map((location) => ({
      id: location.id,
      name: location.name,
      itemCount: itemCountByLocation.get(String(location.id)) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.itemCount - a.itemCount ||
        String(a.name || '').localeCompare(String(b.name || ''))
    );
}

export default async function HomePage() {
  const shellState = await getAuthenticatedAppShellState();
  const supabase = await createClient();
  const currentUser = shellState.currentUser;

  if (!currentUser?.id) {
    redirect("/login?redirectTo=/dashboard");
  }

  const pendingInviteToken = getPendingInviteToken(currentUser);
  if (pendingInviteToken) {
    const { member } = await getHouseholdForUser({
      userId: currentUser.id,
      email: currentUser.email,
      createIfMissing: false,
    });

    if (!member?.household_id) {
      redirect(`/invite/${encodeURIComponent(pendingInviteToken)}`);
    }
  }

  const [
    { default: StatsCards },
    { default: RecentActivity },
    { getActivityFilterOptionsAction, getRecentActivityAction },
  ] = await Promise.all([
    import('@/components/dashboard/StatsCards'),
    import('@/components/dashboard/RecentActivity'),
    import('@/app/actions/activity'),
  ]);

  const shoppingListItems = shellState.attentionCounts.summaryCountsLoaded
    ? shellState.attentionCounts.shoppingListItemsCount
    : (
        await supabase
          .from('shopping_list_items')
          .select('id', { count: 'exact', head: true })
      ).count ?? 0;

  const [activityResult, activityFiltersResult] = await Promise.all([
    getRecentActivityAction({ limit: 5 }),
    getActivityFilterOptionsAction(),
  ]);

  const [
    expirationNotifications,
    dashboardAttentionItems,
    inventoryByLocation,
  ] = await Promise.all([
    getExpirationNotifications(supabase, 3, shellState.attentionCounts),
    getDashboardAttentionItems(supabase, 3, shellState.attentionCounts),
    getInventoryByLocation(supabase),
  ]);

  const totals = {
    locations: shellState.attentionCounts.locationsCount,
    areas: shellState.attentionCounts.storageAreasCount,
    categories: shellState.attentionCounts.categoriesCount,
    items: shellState.attentionCounts.itemsCount,
    shoppingListItems,
    shoppingListNeededItems: shellState.attentionCounts.shoppingListNeededItems,
    tasksDue: shellState.attentionCounts.tasksAttentionCount,
    expiringSoonItems: expirationNotifications.expiringSoonCount,
    lowStockItems: dashboardAttentionItems.lowStockCount,
  };

  return (
    <>
      <div className="md:hidden">
        <MobileDashboardHome
          userName={getDisplayName(currentUser)}
          greeting={getGreeting()}
          totals={totals}
          expirationNotifications={expirationNotifications}
          recentActivityItems={activityResult.data.items}
          canEditInventory={shellState.canEditInventory}
        />
      </div>

      <main className="mx-auto hidden min-h-[100vh] max-w-[1500px] space-y-5 px-5 py-8 md:block lg:px-6 xl:px-8">
        <DesktopDashboardToolbar
          greeting={getGreeting()}
          userName={getDisplayName(currentUser)}
        />

        <StatsCards
          totals={totals}
        />

        <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.85fr)]">
          <div className="min-w-0 space-y-5">
            <RecentActivity
              items={activityResult.data.items}
              members={activityFiltersResult.data.members}
              effectivePlanId={activityFiltersResult.data.effectivePlanId}
              initialCursor={activityResult.data.nextCursor}
              initialHasMore={activityResult.data.hasMore}
              initialError={activityResult.error || activityFiltersResult.error}
            />
            <InventoryByLocation locations={inventoryByLocation} />
          </div>
          <div className="min-w-0">
            <div className="w-full min-w-0 space-y-5">
              <AttentionItemsCard
                title="Expired"
                count={expirationNotifications.expiredCount}
                items={dashboardAttentionItems.expiredItems}
                href="/items?expiration=expired"
                emptyText="No expired items."
                icon={LuTriangleAlert}
              />
              <AttentionItemsCard
                title="Expiring soon"
                count={expirationNotifications.expiringSoonCount}
                items={dashboardAttentionItems.expiringSoonItems}
                href="/items?expiration=soon&days=3"
                emptyText="Nothing is expiring in the next 3 days."
                icon={LuClock3}
              />
              <AttentionItemsCard
                title="Low stock"
                count={dashboardAttentionItems.lowStockCount}
                items={dashboardAttentionItems.lowStockItems}
                href="/items?stock=low_or_empty"
                emptyText="No low-stock items."
                icon={LuPackageMinus}
                detailType="stock"
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
