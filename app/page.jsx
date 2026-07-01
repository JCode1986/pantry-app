import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getSessionForLayout } from './actions/auth';
import LandingPage from '@/components/marketing/LandingPage';
import { createPageMetadata, siteConfig } from '@/utils/metadata';
import { BILLING_PLANS } from '@/utils/billingPlans';

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

export default async function HomePage() {
  const session = await getSessionForLayout();
  const token = session?.user?.access_token;

  if (!token) {
    return (
      <>
        <LandingStructuredData />
        <LandingPage />
      </>
    );
  }

  if (session?.user?.user?.user_metadata?.requires_password_setup) {
    redirect('/profile?setup=password');
  }

  const [
    { default: StatsCards },
    { default: RecentActivity },
    { default: ItemsDonut },
    { getActivityFilterOptionsAction, getRecentActivityAction },
  ] = await Promise.all([
    import('@/components/dashboard/StatsCards'),
    import('@/components/dashboard/RecentActivity'),
    import('@/components/dashboard/ItemsDonut'),
    import('@/app/actions/activity'),
  ]);

  const supabase = await createClient();

  const getCount = async (table) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    return count ?? 0;
  };

  const [locations, areas, categories, items, shoppingListItems] = await Promise.all([
    getCount('locations'),
    getCount('storage_areas'),
    getCount('storage_categories'),
    getCount('items'),
    getCount('shopping_list_items'),
  ]);

  const [activityResult, activityFiltersResult] = await Promise.all([
    getRecentActivityAction({ limit: 12 }),
    getActivityFilterOptionsAction(),
  ]);

  const itemBreakdowns = await getItemBreakdowns(supabase);

  return (
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 space-y-10 pt-8 min-h-[100vh]">
      <header className='md:text-left text-center'>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-stocksense-teal">Stock Overview</h1>
        <p className="text-gray-500 mt-1">Snapshot of your data and what is new.</p>
      </header>

      <StatsCards
        totals={{ locations, areas, categories, items, shoppingListItems }}
      />

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
  );
}
