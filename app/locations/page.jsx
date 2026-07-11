import LocationsSection from '@/components/locations/LocationsSection';
import { createClient } from '@/utils/supabase/server';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';
import { getCanEditInventoryForUser } from '@/utils/households';
import { addInventoryImageUrls, getInventoryImageUrls } from '@/utils/inventoryImages';

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
        name,
        storage_categories (
          id,
          name,
          items:items!items_category_id_fkey (
            id,
            name,
            image_path,
            created_at
          )
        )
      )
    `)
    .order('created_at', { ascending: true });

  const itemImagePaths = (locationsRaw ?? []).flatMap((loc) =>
    (loc.storage_areas ?? []).flatMap((area) =>
      (area.storage_categories ?? []).flatMap((category) =>
        (category.items ?? []).map((item) => item.image_path).filter(Boolean)
      )
    )
  );
  const itemImageUrlsByPath = await getInventoryImageUrls(itemImagePaths);

  // Flatten counts and card preview data.
  const locations = await addInventoryImageUrls((locationsRaw ?? []).map((loc) => {
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
    const storageAreas = areas.map((area) => {
      const areaItemsCount = (area.storage_categories ?? []).reduce(
        (sum, category) => sum + (category.items?.length ?? 0),
        0
      );

      return {
        id: area.id,
        name: area.name,
        itemsCount: areaItemsCount,
      };
    });
    const recentItems = areas
      .flatMap((area) =>
        (area.storage_categories ?? []).flatMap((category) =>
          (category.items ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            image_path: item.image_path ?? null,
            imageUrl: itemImageUrlsByPath.get(item.image_path) ?? null,
            created_at: item.created_at,
            storagePath: [loc.name, area.name, category.name]
              .filter(Boolean)
              .join(' > '),
          }))
        )
      )
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 3);

    return {
      id: loc.id,
      name: loc.name,
      image_path: loc.image_path ?? null,
      created_at: loc.created_at,
      areasCount: areas.length,
      categoriesCount: categories,
      itemsCount: items,
      storageAreas,
      recentItems,
    };
  }));

  return (
    <LocationsSection
      locations={locations}
      canEditInventory={canEditInventory}
    />
  );
}
