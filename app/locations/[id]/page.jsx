import { createClient } from '@/utils/supabase/server';
import StorageAreasSection from '@/components/StorageAreasSection';
import { notFound } from 'next/navigation';

// (Optional) ensure fresh data on each request
// export const dynamic = 'force-dynamic';

export default async function Page({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  // Location
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name')
    .eq('id', id)
    .single();

  if (locationError || !location) notFound();

  const { data: storageAreasRaw, error: storageError } = await supabase
    .from('storage_areas')
    .select(`
      id,
      name,
      storage_categories:storage_categories!fk_storage_area (
        id,
        name,
        items:items!fk_items_category (
          id,
          name,
          quantity,
          expiration_date
        )
      )
    `)
    .eq('location_id', id);

  if (storageError) {
    console.error('Storage Areas fetch error:', JSON.stringify(storageError, null, 2));
  }

  // Normalize for the client component
  const storageAreas = (storageAreasRaw ?? []).map(sa => ({
    id: sa.id,
    name: sa.name,
    categories: (sa.storage_categories ?? []).map(cat => ({
      id: cat.id,
      name: cat.name,
      items: cat.items ?? [],
    })),
  }));

  return (
    <main className="max-w-[1300px] mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📦 {location.name}</h1>
      <StorageAreasSection
        locationId={location.id}
        initialStorageAreas={storageAreas}
      />
    </main>
  );
}

