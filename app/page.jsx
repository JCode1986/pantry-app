import { createClient } from '@/utils/supabase/server';
import { getSessionForLayout } from './actions/auth';
import LandingPage from '@/components/marketing/LandingPage';
import MobileDashboardHome from '@/components/dashboard/MobileDashboardHome';
import DesktopDashboardToolbar from '@/components/dashboard/DesktopDashboardToolbar';
import AttentionItemsCard from '@/components/dashboard/AttentionItemsCard';
import InventoryByLocation from '@/components/dashboard/InventoryByLocation';
import { createPageMetadata, siteConfig } from '@/utils/metadata';
import { BILLING_PLANS } from '@/utils/billingPlans';
import { getCanEditInventoryForUser } from '@/utils/households';
import { getInventoryImageUrls } from '@/utils/inventoryImages';
import { LuClock3, LuPackageMinus, LuTriangleAlert } from 'react-icons/lu';

export const metadata = createPageMetadata({
  title: 'Household Inventory Tracker',
  description:
    'WhereKeep helps households find what they already own, remember where it lives, use items before they expire, and restock from the same shared system.',
  path: '/',
});

function addDays(date, days) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

function LandingStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: "en-US",
    offers: BILLING_PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      category: plan.id,
      price: plan.monthlyPrice.replace("$", ""),
      priceCurrency: "USD",
      description: plan.description,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

async function getExpirationNotifications(supabase, withinDays = 3) {
  const cutoff = toDateString(addDays(new Date(), withinDays));
  const today = toDateString(new Date());

  const [
    { data: itemsRaw = [], error: itemsError },
    { count: expiredCount = 0, error: expiredCountError },
    { count: expiringSoonCount = 0, error: expiringSoonCountError },
  ] = await Promise.all([
    supabase
      .from('items')
      .select('id, name, quantity, expiration_date, category_id')
      .not('expiration_date', 'is', null)
      .lte('expiration_date', cutoff)
      .order('expiration_date', { ascending: true })
      .limit(50),
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .not('expiration_date', 'is', null)
      .lt('expiration_date', today),
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .gte('expiration_date', today)
      .lte('expiration_date', cutoff),
  ]);

  if (itemsError || expiredCountError || expiringSoonCountError) {
    console.error('expiration notifications error:', {
      itemsError,
      expiredCountError,
      expiringSoonCountError,
    });
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
      expiredCount: 0,
      expiringSoonCount: 0,
      withinDays,
    };
  }

  const categoryIds = [
    ...new Set(itemsRaw.map((item) => item.category_id).filter(Boolean)),
  ];

  const { data: categoriesRaw = [] } = categoryIds.length
    ? await supabase
        .from('storage_categories')
        .select('id, name, storage_area_id')
        .in('id', categoryIds)
    : { data: [] };

  const areaIds = [
    ...new Set((categoriesRaw ?? []).map((category) => category.storage_area_id).filter(Boolean)),
  ];

  const { data: areasRaw = [] } = areaIds.length
    ? await supabase
        .from('storage_areas')
        .select('id, name, location_id')
        .in('id', areaIds)
    : { data: [] };

  const locationIds = [
    ...new Set((areasRaw ?? []).map((area) => area.location_id).filter(Boolean)),
  ];

  const { data: locationsRaw = [] } = locationIds.length
    ? await supabase.from('locations').select('id, name').in('id', locationIds)
    : { data: [] };

  const categoryMap = new Map((categoriesRaw ?? []).map((category) => [String(category.id), category]));
  const areaMap = new Map((areasRaw ?? []).map((area) => [String(area.id), area]));
  const locationMap = new Map((locationsRaw ?? []).map((location) => [String(location.id), location]));

  return {
    items: itemsRaw.map((item) => {
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
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 0,
        expirationDate: item.expiration_date,
        categoryName: category?.name ?? null,
        areaName: area?.name ?? null,
        locationName: location?.name ?? null,
      };
    }),
    expiredCount: expiredCount ?? 0,
    expiringSoonCount: expiringSoonCount ?? 0,
    withinDays,
  };
}

async function hydrateDashboardItems(supabase, itemsRaw = []) {
  if (itemsRaw.length === 0) return [];

  const imageUrlsByPath = await getInventoryImageUrls(
    itemsRaw.map((item) => item.image_path)
  );
  const categoryIds = [
    ...new Set(itemsRaw.map((item) => item.category_id).filter(Boolean)),
  ];

  const { data: categoriesRaw = [] } = categoryIds.length
    ? await supabase
        .from('storage_categories')
        .select('id, name, storage_area_id')
        .in('id', categoryIds)
    : { data: [] };

  const areaIds = [
    ...new Set((categoriesRaw ?? []).map((category) => category.storage_area_id).filter(Boolean)),
  ];

  const { data: areasRaw = [] } = areaIds.length
    ? await supabase
        .from('storage_areas')
        .select('id, name, location_id')
        .in('id', areaIds)
    : { data: [] };

  const locationIds = [
    ...new Set((areasRaw ?? []).map((area) => area.location_id).filter(Boolean)),
  ];

  const { data: locationsRaw = [] } = locationIds.length
    ? await supabase.from('locations').select('id, name').in('id', locationIds)
    : { data: [] };

  const categoryMap = new Map((categoriesRaw ?? []).map((category) => [String(category.id), category]));
  const areaMap = new Map((areasRaw ?? []).map((area) => [String(area.id), area]));
  const locationMap = new Map((locationsRaw ?? []).map((location) => [String(location.id), location]));

  return itemsRaw.map((item) => {
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
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? 0,
      expirationDate: item.expiration_date,
      imageUrl: imageUrlsByPath.get(item.image_path) ?? null,
      categoryId: category?.id ?? item.category_id ?? null,
      categoryName: category?.name ?? null,
      areaName: area?.name ?? null,
      locationName: location?.name ?? null,
    };
  });
}

async function getDashboardAttentionItems(supabase, withinDays = 3) {
  const today = toDateString(new Date());
  const cutoff = toDateString(addDays(new Date(), withinDays));

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
    supabase
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

  const [expiredItems, expiringSoonItems, lowStockItems] = await Promise.all([
    hydrateDashboardItems(supabase, expiredRaw),
    hydrateDashboardItems(supabase, expiringSoonRaw),
    hydrateDashboardItems(supabase, lowStockRaw),
  ]);

  return {
    expiredItems,
    expiringSoonItems,
    lowStockItems,
    lowStockCount: lowStockCount ?? 0,
  };
}

async function getInventoryByLocation(supabase) {
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
  const session = await getSessionForLayout();
  const supabase = await createClient();
  let currentUser = session?.user?.user ?? null;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!userError && user?.id) {
      currentUser = user;
    }
  } catch (err) {
    console.error("Dashboard Supabase user error:", err);
  }

  if (!currentUser?.id) {
    return (
      <>
        <LandingStructuredData />
        <LandingPage />
      </>
    );
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

  const getCount = async (table) => {
    const { count } = await supabase.from(table).select('id', { count: 'exact', head: true });
    return count ?? 0;
  };

  const getShoppingListNeededCount = async () => {
    const { count } = await supabase
      .from('shopping_list_items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'needed');

    return count ?? 0;
  };

  const [
    locations,
    areas,
    categories,
    items,
    shoppingListItems,
    shoppingListNeededItems,
  ] = await Promise.all([
    getCount('locations'),
    getCount('storage_areas'),
    getCount('storage_categories'),
    getCount('items'),
    getCount('shopping_list_items'),
    getShoppingListNeededCount(),
  ]);

  const [activityResult, activityFiltersResult] = await Promise.all([
    getRecentActivityAction({ limit: 5 }),
    getActivityFilterOptionsAction(),
  ]);

  const [
    expirationNotifications,
    dashboardAttentionItems,
    inventoryByLocation,
    canEditInventory,
  ] = await Promise.all([
    getExpirationNotifications(supabase, 3),
    getDashboardAttentionItems(supabase, 3),
    getInventoryByLocation(supabase),
    getCanEditInventoryForUser(currentUser),
  ]);

  const totals = {
    locations,
    areas,
    categories,
    items,
    shoppingListItems,
    shoppingListNeededItems,
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
          canEditInventory={canEditInventory}
        />
      </div>

      <main className="page-enter mx-auto hidden min-h-[100vh] max-w-[1500px] space-y-5 px-5 py-8 md:block lg:px-6 xl:px-8">
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
