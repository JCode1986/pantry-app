import { createClient } from '@/utils/supabase/server';
import StorageAreasSection from '@/components/locations/StorageAreasSection';
import LocationDetailHeaderClient from '@/components/locations/LocationDetailHeaderClient';
import { notFound } from 'next/navigation';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';
import { getCanEditInventoryForUser } from '@/utils/households';
import {
  INVENTORY_IMAGE_VARIANT,
  getInventoryImageUrls,
} from '@/utils/inventoryImages';
import { getLocationStorageAreasPageAction } from '@/app/actions/server';

// export const dynamic = 'force-dynamic'; // optional if you want fresh data on each request

function firstRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

async function getLocationStats(supabase, locationId, fallbackAreas = []) {
  try {
    const { data, error } = await supabase.rpc('wherekeep_location_page_summaries', {
      p_location_ids: [String(locationId)],
    });
    const row = firstRpcRow(data);

    if (!error && row) {
      return {
        totalAreas: Number(row.areas_count ?? 0),
        totalCategories: Number(row.categories_count ?? 0),
        totalItems: Number(row.items_count ?? 0),
      };
    }
  } catch {
    // Fall through to the page-data fallback while the RPC is not installed.
  }

  return {
    totalAreas: fallbackAreas.length,
    totalCategories: fallbackAreas.reduce(
      (sum, area) => sum + (area.categories?.length ?? 0),
      0
    ),
    totalItems: fallbackAreas.reduce(
      (sum, area) =>
        sum +
        (area.categories ?? []).reduce(
          (categorySum, category) =>
            categorySum + (category.itemsCount ?? category.items?.length ?? 0),
          0
        ),
      0
    ),
  };
}

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

  // 2) Fetch the first storage-area page for THIS location
  const storageAreasResult = await getLocationStorageAreasPageAction({
    locationId: id,
    offset: 0,
    limit: 12,
  });
  const storageAreas = storageAreasResult.data.items ?? [];

  const locationImageUrl =
    (
      await getInventoryImageUrls([location.image_path], {
        variant: INVENTORY_IMAGE_VARIANT.DETAIL,
      })
    ).get(location.image_path) ?? null;
  const locationStats = await getLocationStats(supabase, id, storageAreas);

  return (
    <main className="page-enter mx-auto max-w-[1560px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <LocationDetailHeaderClient
        location={location}
        imageUrl={locationImageUrl}
        canEditInventory={canEditInventory}
        stats={{
          totalAreas: locationStats.totalAreas,
          totalCategories: locationStats.totalCategories,
          totalItems: locationStats.totalItems,
        }}
      />
      <StorageAreasSection
        locationName={location?.name}
        locationId={location.id}
        initialStorageAreas={storageAreas}
        initialTotalStorageAreas={storageAreasResult.data.totalCount}
        canEditInventory={canEditInventory}
      />
    </main>
  );
}
