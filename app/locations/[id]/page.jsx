import { createClient } from '@/utils/supabase/server';
import StorageAreasSection from '@/components/StorageAreasSection';
import { notFound } from 'next/navigation';

export default async function page({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  // Fetch the location details
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name')
    .eq('id', id)
    .single();

  if (locationError || !location) {
    console.error('Location fetch error:', locationError || 'Not found');
    notFound();
  }

  // Fetch storage areas along with their categories
  const { data: storageAreasRaw, error: storageError } = await supabase
    .from('storage_areas')
    .select('id, name, storage_categories(id, name)')
    .eq('location_id', id);

  if (storageError) {
    console.error('Storage Areas fetch error:', storageError);
  }

  // Format nested data
  const storageAreas = (storageAreasRaw || []).map(area => ({
    id: area.id,
    name: area.name,
    categories: area.storage_categories || [],
  }));

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📦 {location.name}</h1>

        <StorageAreasSection
          locationId={location.id}
          initialStorageAreas={storageAreas}
        />
    </main>
  );
}
