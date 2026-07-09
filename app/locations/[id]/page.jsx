import { createClient } from '@/utils/supabase/server';
import StorageAreasSection from '@/components/locations/StorageAreasSection';
import LocationDetailHeaderClient from '@/components/locations/LocationDetailHeaderClient';
import { notFound } from 'next/navigation';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';
import { getCanEditInventoryForUser } from '@/utils/households';
import { getInventoryImageUrls } from '@/utils/inventoryImages';

// export const dynamic = 'force-dynamic'; // optional if you want fresh data on each request

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: location } = await supabase
    .from('locations')
    .select('name')
    .eq('id', id)
    .maybeSingle();

  const name = location?.name ?? 'Location';

  return createPageMetadata({
    title: name,
    description: `Manage storage areas, categories, and items in ${name}.`,
    path: `/locations/${id}`,
    robots: NO_INDEX_ROBOTS,
  });
}

export default async function Page({ params }) {
  const supabase = await createClient();
  const { id } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);

  // 1) Fetch the current location
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name, image_path')
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
      image_path,
      storage_categories:storage_categories!fk_storage_area (
        id,
        name,
        items:items!fk_items_category (
          id,
          name,
          quantity,
          expiration_date,
          category_id,
          barcode,
          image_path
        )
      )
    `)
    .eq('location_id', id);

  if (storageError) {
    console.error('Storage Areas fetch error:', JSON.stringify(storageError, null, 2));
  }

  const imageUrlsByPath = await getInventoryImageUrls([
    location.image_path,
    ...(storageAreasRaw ?? []).map((area) => area.image_path),
    ...(storageAreasRaw ?? []).flatMap((area) =>
      (area.storage_categories ?? []).flatMap((category) =>
        (category.items ?? []).map((item) => item.image_path)
      )
    ),
  ]);

  // Normalize for the client component
  const storageAreas = (storageAreasRaw ?? []).map((sa) => ({
      id: sa.id,
      name: sa.name,
      image_path: sa.image_path ?? null,
      imageUrl: imageUrlsByPath.get(sa.image_path) ?? null,
      categories: (sa.storage_categories ?? []).map((cat) => ({
          id: cat.id,
          name: cat.name,
          items: (cat.items ?? []).map((item) => ({
              ...item,
              imageUrl: imageUrlsByPath.get(item.image_path) ?? null,
            })),
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

  const locationImageUrl = imageUrlsByPath.get(location.image_path) ?? null;
  const totalAreas = storageAreas.length;
  const totalCategories = storageAreas.reduce(
    (sum, area) => sum + (area.categories?.length ?? 0),
    0
  );
  const totalItems = storageAreas.reduce(
    (sum, area) =>
      sum +
      (area.categories ?? []).reduce(
        (categorySum, category) => categorySum + (category.items?.length ?? 0),
        0
      ),
    0
  );

  return (
    <main className="page-enter max-w-[1500px] mx-auto px-5 py-8 md:min-h-[100vh] max-md:px-4 max-md:pb-0 max-md:pt-4">
      <LocationDetailHeaderClient
        location={location}
        imageUrl={locationImageUrl}
        canEditInventory={canEditInventory}
        stats={{
          totalAreas,
          totalCategories,
          totalItems,
        }}
      />
      <StorageAreasSection
        locationName={location?.name}
        locationId={location.id}
        initialStorageAreas={storageAreas}
        allLocations={allLocations}
        canEditInventory={canEditInventory}
      />
    </main>
  );
}
