import ShoppingListPageClient from "@/components/shopping-list/ShoppingListPageClient";
import { getShoppingListAction } from "@/app/actions/shoppingList";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";

export const metadata = createPageMetadata({
  title: "Shopping List",
  description: "Track needed, purchased, and dismissed shopping list items.",
  path: "/shopping-list",
  robots: NO_INDEX_ROBOTS,
});

const SHOPPING_LIST_FILTERS = new Set(["all", "needed", "purchased", "dismissed"]);

function normalizeShoppingListFilter(value) {
  return SHOPPING_LIST_FILTERS.has(value) ? value : "needed";
}

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const initialFilter = normalizeShoppingListFilter(resolvedSearchParams?.status);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);
  const result = await getShoppingListAction({ status: "all" });
  const [
    { data: locationsRaw = [], error: locationsError },
    { data: areasRaw = [], error: areasError },
    { data: categoriesRaw = [], error: categoriesError },
  ] = await Promise.all([
    supabase.from("locations").select("id, name").order("name", { ascending: true }),
    supabase
      .from("storage_areas")
      .select("id, name, location_id")
      .order("name", { ascending: true }),
    supabase
      .from("storage_categories")
      .select("id, name, storage_area_id")
      .order("name", { ascending: true }),
  ]);

  const hierarchyError =
    locationsError?.message || areasError?.message || categoriesError?.message || null;

  const categoriesByArea = new Map();
  for (const category of categoriesRaw ?? []) {
    const key = String(category.storage_area_id);
    if (!categoriesByArea.has(key)) categoriesByArea.set(key, []);
    categoriesByArea.get(key).push({ id: category.id, name: category.name });
  }

  const areasByLocation = new Map();
  for (const area of areasRaw ?? []) {
    const key = String(area.location_id);
    if (!areasByLocation.has(key)) areasByLocation.set(key, []);
    areasByLocation.get(key).push({
      id: area.id,
      name: area.name,
      categories: categoriesByArea.get(String(area.id)) ?? [],
    });
  }

  const moveLocations = (locationsRaw ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    storage_areas: areasByLocation.get(String(location.id)) ?? [],
  }));

  return (
    <main className="page-enter mx-auto max-w-[1500px] p-6 pt-8 md:min-h-[100vh] max-md:px-4 max-md:pb-0 max-md:pt-4">
      <ShoppingListPageClient
        initialItems={result.data?.items ?? []}
        initialError={result.error || hierarchyError}
        initialFilter={initialFilter}
        moveLocations={moveLocations}
        canEditInventory={canEditInventory}
      />
    </main>
  );
}
