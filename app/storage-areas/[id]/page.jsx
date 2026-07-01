import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import CategoriesGrid from '@/components/categories/CategoriesGrid';
import { notFound } from 'next/navigation';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';

export async function generateMetadata({ params }) {
  const supabase = await createClient();
  const { id } = await params;
  const { data: area } = await supabase
    .from('storage_areas')
    .select('name, locations(name)')
    .eq('id', id)
    .maybeSingle();

  const name = area?.name ?? 'Storage Area';

  return createPageMetadata({
    title: `${name} Categories`,
    description: `View categories inside ${name}.`,
    path: `/storage-areas/${id}`,
    robots: NO_INDEX_ROBOTS,
  });
}

export default async function StorageAreaCategoriesPage({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  // Area + parent location for breadcrumb
  const { data: area, error: areaError } = await supabase
    .from('storage_areas')
    .select('id, name, location_id, locations(name)')
    .eq('id', id)
    .single();

  if (areaError || !area) {
    console.error('Storage area fetch error:', areaError?.message || areaError);
    notFound();
  }

  // Categories in this area
  const { data: categories = [] } = await supabase
    .from('storage_categories')
    .select('id, name, created_at')
    .eq('storage_area_id', id)
    .order('created_at', { ascending: true });

  return (
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 space-y-6">
      <nav className="content-enter text-sm text-gray-500">
        <Link href={`/locations/${area?.location_id}`} className="hover:underline">
          {area.locations?.name ?? 'Unknown location'}
        </Link>{' '}
        / <span className="text-gray-700">{area.name}</span>
      </nav>

      <header className="content-enter">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {area.name} - Categories
        </h1>
        <p className="text-gray-500">All categories inside this storage area</p>
      </header>

      <CategoriesGrid categories={categories} />
    </main>
  );
}
