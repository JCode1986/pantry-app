import LocationsSection from '@/components/locations/LocationsSection';
import { createClient } from '@/utils/supabase/server';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';
import { getCanEditInventoryForUser } from '@/utils/households';
import { addInventoryImageUrls } from '@/utils/inventoryImages';

export const metadata = createPageMetadata({
  title: 'Locations',
  description: 'Create and manage inventory locations for your household.',
  path: '/locations',
  robots: NO_INDEX_ROBOTS,
});

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);

  // Pull nested relations, then count in JS (works with RLS and NULL-safe)
  const { data: locationsRaw = [] } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      image_path,
      created_at,
      storage_areas (
        id,
        storage_categories (
          id,
          items:items!items_category_id_fkey ( id )
        )
      )
    `)
    .order('created_at', { ascending: true });

  // Flatten counts
  const locations = await addInventoryImageUrls(locationsRaw.map((loc) => {
    const areas = loc.storage_areas ?? [];
    const categories = areas.reduce(
      (sum, a) => sum + (a.storage_categories?.length ?? 0),
      0
    );
    const items = areas.reduce(
      (sum, a) =>
        sum +
        (a.storage_categories ?? []).reduce(
          (sub, c) => sub + (c.items?.length ?? 0),
          0
        ),
      0
    );

    return {
      id: loc.id,
      name: loc.name,
      image_path: loc.image_path ?? null,
      created_at: loc.created_at,
      areasCount: areas.length,
      categoriesCount: categories,
      itemsCount: items,
    };
  }));

  return (
    <LocationsSection
      locations={locations}
      canEditInventory={canEditInventory}
    />
  );
}
