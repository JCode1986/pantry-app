import { createClient } from '@/utils/supabase/server';
import StorageAreasSection from '@/components/locations/StorageAreasSection';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';
import { getCanEditInventoryForUser } from '@/utils/households';
import { getInventoryImageUrl } from '@/utils/inventoryImages';

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
          image_path
        )
      )
    `)
    .eq('location_id', id);

  if (storageError) {
    console.error('Storage Areas fetch error:', JSON.stringify(storageError, null, 2));
  }

  // Normalize for the client component
  const storageAreas = await Promise.all(
    (storageAreasRaw ?? []).map(async (sa) => ({
      id: sa.id,
      name: sa.name,
      image_path: sa.image_path ?? null,
      imageUrl: await getInventoryImageUrl(sa.image_path),
      categories: await Promise.all(
        (sa.storage_categories ?? []).map(async (cat) => ({
          id: cat.id,
          name: cat.name,
          items: await Promise.all(
            (cat.items ?? []).map(async (item) => ({
              ...item,
              imageUrl: await getInventoryImageUrl(item.image_path),
            }))
          ),
        }))
      ),
    }))
  );

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

  const locationImageUrl = await getInventoryImageUrl(location.image_path);

  return (
    <main className="page-enter max-w-[1500px] mx-auto px-5 py-8 min-h-[100vh]">
      <header className="mb-6 rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm">
        <Link
          href="/locations"
          className="inline-flex items-center text-sm font-medium text-[var(--stocksense-brand)] hover:underline"
        >
          Back to locations
        </Link>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Location
            </p>
            <div className="mt-2 flex items-center gap-3">
              {locationImageUrl && (
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                  <img
                    src={locationImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-stocksense-teal">
                {location.name}
              </h1>
            </div>
          </div>
          <p className="max-w-xl text-sm text-gray-500">
            Organize this location by storage area, category, and item.
          </p>
        </div>
      </header>
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
