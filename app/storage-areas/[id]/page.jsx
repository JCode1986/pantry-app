import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import CategoriesGrid from '@/components/CategoriesGrid';

export default async function StorageAreaCategoriesPage({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  // Area + parent location for breadcrumb
  const { data: area } = await supabase
    .from('storage_areas')
    .select('id, name, location_id, locations(name)')
    .eq('id', id)
    .single();

  // Categories in this area
  const { data: categories = [] } = await supabase
    .from('storage_categories')
    .select('id, name, created_at')
    .eq('storage_area_id', id)
    .order('created_at', { ascending: true });

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href={`/locations/${area?.location_id}`} className="hover:underline">
          {area?.locations?.name}
        </Link>{' '}
        / <span className="text-gray-700">{area?.name}</span>
      </nav>

      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {area?.name} – Categories
        </h1>
        <p className="text-gray-500">All categories inside this storage area</p>
      </header>

      <CategoriesGrid categories={categories} />
    </main>
  );
}
