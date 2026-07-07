import ItemsPageClient from "@/components/items/ItemPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import { getInventoryImageUrl } from "@/utils/inventoryImages";

export const metadata = createPageMetadata({
  title: "Items",
  description: "Search, filter, move, and manage inventory items across all locations.",
  path: "/items",
  robots: NO_INDEX_ROBOTS,
});

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);

  // 1) Fetch items (no embeds)
  const { data: itemsRaw, error: itemsError } = await supabase
    .from("items")
    .select("id, name, quantity, expiration_date, category_id, image_path, barcode")
    .order("name", { ascending: true });

  if (itemsError) {
    console.error("Items fetch error (message):", itemsError?.message);
    console.error("Items fetch error (details):", itemsError?.details);
    console.error("Items fetch error (hint):", itemsError?.hint);
    console.error("Items fetch error (code):", itemsError?.code);
    console.error("Items fetch error (full):", JSON.stringify(itemsError, null, 2));
  }

  // 2) Fetch categories (no embeds)
  const { data: categoriesRaw, error: categoriesError } = await supabase
    .from("storage_categories")
    .select("id, name, storage_area_id")
    .order("name", { ascending: true });

  if (categoriesError) {
    console.error("Categories fetch error (message):", categoriesError?.message);
    console.error("Categories fetch error (details):", categoriesError?.details);
    console.error("Categories fetch error (hint):", categoriesError?.hint);
    console.error("Categories fetch error (code):", categoriesError?.code);
    console.error(
      "Categories fetch error (full):",
      JSON.stringify(categoriesError, null, 2)
    );
  }

  // 3) Fetch storage areas (no embeds)
  const { data: areasRaw, error: areasError } = await supabase
    .from("storage_areas")
    .select("id, name, location_id, image_path")
    .order("name", { ascending: true });

  if (areasError) {
    console.error("Areas fetch error (message):", areasError?.message);
    console.error("Areas fetch error (details):", areasError?.details);
    console.error("Areas fetch error (hint):", areasError?.hint);
    console.error("Areas fetch error (code):", areasError?.code);
    console.error("Areas fetch error (full):", JSON.stringify(areasError, null, 2));
  }

  // 4) Fetch locations (no embeds)
  const { data: locationsRaw, error: locationsError } = await supabase
    .from("locations")
    .select("id, name, image_path")
    .order("name", { ascending: true });

  if (locationsError) {
    console.error("Locations fetch error (message):", locationsError?.message);
    console.error("Locations fetch error (details):", locationsError?.details);
    console.error("Locations fetch error (hint):", locationsError?.hint);
    console.error("Locations fetch error (code):", locationsError?.code);
    console.error(
      "Locations fetch error (full):",
      JSON.stringify(locationsError, null, 2)
    );
  }

  // ---- Build maps ----
  const categoryMap = new Map((categoriesRaw ?? []).map((c) => [String(c.id), c]));
  const areaMap = new Map((areasRaw ?? []).map((a) => [String(a.id), a]));
  const locationMap = new Map((locationsRaw ?? []).map((l) => [String(l.id), l]));

  // ---- Build move hierarchy (locations -> areas -> categories) ----
  const categoriesByArea = new Map();
  for (const c of categoriesRaw ?? []) {
    const key = String(c.storage_area_id);
    if (!categoriesByArea.has(key)) categoriesByArea.set(key, []);
    categoriesByArea.get(key).push({ id: c.id, name: c.name });
  }

  const areasByLocation = new Map();
  for (const a of areasRaw ?? []) {
    const key = String(a.location_id);
    if (!areasByLocation.has(key)) areasByLocation.set(key, []);
    areasByLocation.get(key).push({
      id: a.id,
      name: a.name,
      categories: categoriesByArea.get(String(a.id)) ?? [],
    });
  }

  const moveLocations = (locationsRaw ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    storage_areas: areasByLocation.get(String(l.id)) ?? [],
  }));

  // ---- Normalize items for UI ----
  const items = await Promise.all((itemsRaw ?? []).map(async (it) => {
    const cat = it.category_id ? categoryMap.get(String(it.category_id)) : null;
    const area = cat?.storage_area_id ? areaMap.get(String(cat.storage_area_id)) : null;
    const loc = area?.location_id ? locationMap.get(String(area.location_id)) : null;

    return {
      id: it.id,
      name: it.name,
      quantity: it.quantity ?? 0,
      expiration_date: it.expiration_date ?? null,
      barcode: it.barcode ?? null,
      image_path: it.image_path ?? null,
      imageUrl: await getInventoryImageUrl(it.image_path),

      // used for move/edit
      category_id: it.category_id ?? null,

      // breadcrumb display
      category: cat ? { id: cat.id, name: cat.name } : null,
      area: area
        ? {
            id: area.id,
            name: area.name,
            image_path: area.image_path ?? null,
            imageUrl: await getInventoryImageUrl(area.image_path),
          }
        : null,
      location: loc
        ? {
            id: loc.id,
            name: loc.name,
            image_path: loc.image_path ?? null,
            imageUrl: await getInventoryImageUrl(loc.image_path),
          }
        : null,
    };
  }));

  return (
    <main className="page-enter max-w-[1500px] mx-auto p-6 pt-8 min-h-[100vh] max-md:px-4 max-md:pb-32 max-md:pt-4">
      <ItemsPageClient
        initialItems={items}
        moveLocations={moveLocations}
        canEditInventory={canEditInventory}
        initialExpirationFilter={params?.expiration}
        initialExpirationDays={params?.days}
      />
    </main>
  );
}
