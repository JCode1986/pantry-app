import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getSessionForLayout } from './actions/auth';
import LandingPage from '@/components/LandingPage';
import StatsCards from '@/components/StatsCards';
import RecentActivity from '@/components/RecentActivity';
import ItemsDonut from '@/components/ItemsDonut';
import { createPageMetadata } from '@/utils/metadata';
import {
  getActivityFilterOptionsAction,
  getRecentActivityAction,
} from '@/app/actions/activity';

export const metadata = createPageMetadata({
  title: 'Household Inventory Tracker',
  description:
    'WhereKeep helps families track pantry, household, and storage inventory across every location.',
  path: '/',
});

async function getItemsByLocation(supabase) {
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
    console.error('items by location error:', errors);
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
  const countsByLocation = new Map(
    locationsRaw.map((location) => [String(location.id), 0])
  );

  for (const item of itemsRaw) {
    const locationId = categoryToLocation.get(String(item.category_id));
    if (!locationId) continue;

    const key = String(locationId);
    countsByLocation.set(key, (countsByLocation.get(key) ?? 0) + 1);
  }

  return locationsRaw.map((location) => ({
    location_id: location.id,
    location_name: location.name,
    item_count: countsByLocation.get(String(location.id)) ?? 0,
  }));
}

export default async function HomePage() {
  const session = await getSessionForLayout();
  const token = session?.user?.access_token;

  if (!token) {
    return <LandingPage />;
  }

  if (session?.user?.user?.user_metadata?.requires_password_setup) {
    redirect('/profile?setup=password');
  }

  const supabase = await createClient();

  const getCount = async (table) => {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    return count ?? 0;
  };

  const [locations, areas, categories, items] = await Promise.all([
    getCount('locations'),
    getCount('storage_areas'),
    getCount('storage_categories'),
    getCount('items'),
  ]);

  const [activityResult, activityFiltersResult] = await Promise.all([
    getRecentActivityAction({ limit: 12 }),
    getActivityFilterOptionsAction(),
  ]);

  const perLocation = await getItemsByLocation(supabase);

  return (
    <main className="page-enter mx-auto max-w-6xl px-5 py-8 space-y-10 pt-8 min-h-[100vh]">
      <header className='md:text-left text-center'>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-stocksense-teal">Stock Overview</h1>
        <p className="text-gray-500 mt-1">Snapshot of your data and what is new.</p>
      </header>

      <StatsCards totals={{ locations, areas, categories, items }} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity
            items={activityResult.data.items}
            members={activityFiltersResult.data.members}
            initialCursor={activityResult.data.nextCursor}
            initialHasMore={activityResult.data.hasMore}
            initialError={activityResult.error || activityFiltersResult.error}
          />
        </div>
        <div className="lg:col-span-1 flex items-start">
          <div className="min-h-[350px] w-full">
            <ItemsDonut data={perLocation} />
          </div>    
        </div>
      </section>
    </main>
  );
}
