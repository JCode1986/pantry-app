import { createClient } from '@/utils/supabase/server';
import StorageAreasSection from '@/components/StorageAreasSection';
import { notFound } from 'next/navigation';

// export const dynamic = 'force-dynamic'; // optional if you want fresh data on each request

export default async function Page({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  // 1) Fetch the current location
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name')
    .eq('id', id)
    .single();

  if (locationError || !location) {
    console.error('Location fetch error:', JSON.stringify(locationError, null, 2));
    notFound();
  }

  // 2) Fetch storage areas + categories + items for THIS location
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
          expiration_date,
          category_id
        )
      )
    `)
    .eq('location_id', id);

  if (storageError) {
    console.error('Storage Areas fetch error:', JSON.stringify(storageError, null, 2));
  }

  // Normalize for the client component
  const storageAreas = (storageAreasRaw ?? []).map((sa) => ({
    id: sa.id,
    name: sa.name,
    categories: (sa.storage_categories ?? []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      items: cat.items ?? [],
    })),
  }));

  // 3) Fetch ALL locations for the "Move items" modal
  const { data: allLocationsRaw, error: allLocationsError } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      storage_areas (
        id,
        name,
        storage_categories (
          id,
          name
        )
      )
    `);

  if (allLocationsError) {
    console.error('All locations fetch error:', JSON.stringify(allLocationsError, null, 2));
  }

  const allLocations = (allLocationsRaw ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    storage_areas: (loc.storage_areas ?? []).map((sa) => ({
      id: sa.id,
      name: sa.name,
      categories: (sa.storage_categories ?? []).map((cat) => ({
        id: cat.id,
        name: cat.name,
      })),
    })),
  }));

  return (
    <main className="max-w-[1300px] mx-auto p-6 pt-8 min-h-[100vh]">
      <h1 className="text-3xl font-bold mb-6 text-center md:text-left">
        📦 {location.name}
      </h1>
      <StorageAreasSection
        locationName={location?.name}
        locationId={location.id}
        initialStorageAreas={storageAreas}
        allLocations={allLocations}
      />
    </main>
  );
}
