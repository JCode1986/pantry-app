import { createClient } from '@/utils/supabase/server';
import StatsCards from '@/components/StatsCards';
import RecentActivity from '@/components/RecentActivity';
import ItemsDonut from '@/components/ItemsDonut';

export default async function HomePage() {
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

  // Recent activity: latest 12 items (you can bump this)
  const { data: recent = [] } = await supabase
    .from('items_with_paths')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(12);

  // Donut data: items per location
  const { data: perLocation = [] } = await supabase
    .from('items_count_per_location')
    .select('*');

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 space-y-10">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Pantry Overview</h1>
        <p className="text-gray-500 mt-1">Snapshot of your data and what’s new.</p>
      </header>

      <StatsCards totals={{ locations, areas, categories, items }} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity items={recent} />
        </div>
        <div className="lg:col-span-1">
          <ItemsDonut data={perLocation} />
        </div>
      </section>
    </main>
  );
}
