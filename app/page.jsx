import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getSessionForLayout } from './actions/auth';
import LandingPage from '@/components/marketing/LandingPage';
import MobileDashboardHome from '@/components/dashboard/MobileDashboardHome';
import { createPageMetadata, siteConfig } from '@/utils/metadata';
import { BILLING_PLANS } from '@/utils/billingPlans';
import { getCanEditInventoryForUser } from '@/utils/households';

export const metadata = createPageMetadata({
  title: 'Household Inventory Tracker',
  description:
    'WhereKeep helps households track inventory with barcode-assisted entry, photos, shopping lists, recent activity, and shared access roles.',
  path: '/',
});

function countBy(items, resolveKey) {
  const counts = new Map();

  for (const item of items) {
    const key = resolveKey(item);
    if (!key) continue;
    counts.set(String(key), (counts.get(String(key)) ?? 0) + 1);
  }

  return counts;
}

function mapBreakdown(rows, counts) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    item_count: counts.get(String(row.id)) ?? 0,
  }));
}

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
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
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

async function getItemBreakdowns(supabase) {
  const [
    { data: locationsRaw = [], error: locationsError },
    { data: areasRaw = [], error: areasError },
    { data: categoriesRaw = [], error: categoriesError },
    { data: itemsRaw = [], error: itemsError },
  ] = await Promise.all([
    supabase.from('locations').select('id, name').order('name', { ascending: true }),
    supabase.from('storage_areas').select('id, name, location_id').order('name', { ascending: true }),
    supabase.from('storage_categories').select('id, name, storage_area_id').order('name', { ascending: true }),
    supabase.from('items').select('id, category_id'),
  ]);

  const errors = [locationsError, areasError, categoriesError, itemsError].filter(Boolean);
  if (errors.length) {
    console.error('item breakdowns error:', errors);
    return {
      byLocation: [],
      byStorageArea: [],
      byCategory: [],
    };
  }

  const areaToLocation = new Map(
    areasRaw.map((area) => [String(area.id), area.location_id])
  );
  const categoryToArea = new Map(
    categoriesRaw.map((category) => [String(category.id), category.storage_area_id])
  );
  const categoryToLocation = new Map(
    categoriesRaw.map((category) => {
      const areaId = categoryToArea.get(String(category.id));
      return [String(category.id), areaToLocation.get(String(areaId))];
    })
  );

  const countsByLocation = countBy(itemsRaw, (item) =>
    categoryToLocation.get(String(item.category_id))
  );
  const countsByStorageArea = countBy(itemsRaw, (item) =>
    categoryToArea.get(String(item.category_id))
  );
  const countsByCategory = countBy(itemsRaw, (item) => item.category_id);

  return {
    byLocation: mapBreakdown(locationsRaw, countsByLocation),
    byStorageArea: mapBreakdown(areasRaw, countsByStorageArea),
    byCategory: mapBreakdown(categoriesRaw, countsByCategory),
  };
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
      .select('*', { count: 'exact', head: true })
      .not('expiration_date', 'is', null)
      .lt('expiration_date', today),
    supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
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

export default async function HomePage() {
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
    return (
      <>
        <LandingStructuredData />
        <LandingPage />
      </>
    );
  }

  if (currentUser?.user_metadata?.requires_password_setup) {
    redirect('/profile?setup=password');
  }

  const [
    { default: StatsCards },
    { default: RecentActivity },
    { default: ItemsDonut },
    { default: ExpirationNotifications },
    { getActivityFilterOptionsAction, getRecentActivityAction },
  ] = await Promise.all([
    import('@/components/dashboard/StatsCards'),
    import('@/components/dashboard/RecentActivity'),
    import('@/components/dashboard/ItemsDonut'),
    import('@/components/dashboard/ExpirationNotifications'),
    import('@/app/actions/activity'),
  ]);

  const getCount = async (table) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    return count ?? 0;
  };

  const getShoppingListNeededCount = async () => {
    const { count } = await supabase
      .from('shopping_list_items')
      .select('*', { count: 'exact', head: true })
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
    getRecentActivityAction({ limit: 12 }),
    getActivityFilterOptionsAction(),
  ]);

  const [itemBreakdowns, expirationNotifications, canEditInventory] = await Promise.all([
    getItemBreakdowns(supabase),
    getExpirationNotifications(supabase, 3),
    getCanEditInventoryForUser(currentUser),
  ]);

  const totals = {
    locations,
    areas,
    categories,
    items,
    shoppingListItems,
    shoppingListNeededItems,
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

      <main className="page-enter mx-auto hidden max-w-[1500px] px-5 py-8 space-y-10 pt-8 min-h-[100vh] md:block">
        <header className='md:text-left text-center'>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">Stock Overview</h1>
          <p className="text-gray-500 mt-1">Snapshot of your data and what is new.</p>
        </header>

        <StatsCards
          totals={totals}
        />

        <ExpirationNotifications {...expirationNotifications} />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivity
              items={activityResult.data.items}
              members={activityFiltersResult.data.members}
              effectivePlanId={activityFiltersResult.data.effectivePlanId}
              initialCursor={activityResult.data.nextCursor}
              initialHasMore={activityResult.data.hasMore}
              initialError={activityResult.error || activityFiltersResult.error}
            />
          </div>
          <div className="lg:col-span-1">
            <div className="w-full space-y-6">
              <ItemsDonut
                title="Items by location"
                data={itemBreakdowns.byLocation}
                groupSingular="location"
                groupPlural="locations"
                tooltip="Shows how many items are stored under each location."
              />
              <ItemsDonut
                title="Items by storage areas"
                data={itemBreakdowns.byStorageArea}
                emptyText="No storage area data available."
                groupSingular="storage area"
                groupPlural="storage areas"
                tooltip="Shows how many items are stored under each storage area."
              />
              <ItemsDonut
                title="Items by category"
                data={itemBreakdowns.byCategory}
                emptyText="No category data available."
                groupSingular="category"
                groupPlural="categories"
                tooltip="Shows how many items are stored under each category."
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
