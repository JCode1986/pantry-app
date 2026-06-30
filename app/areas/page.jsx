import AreasPageClient from "@/components/areas/AreasPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata } from "@/utils/metadata";

export const metadata = createPageMetadata({
  title: "Areas",
  description: "Review and manage storage areas across all household locations.",
  path: "/areas",
});

export default async function Page() {
  const supabase = await createClient();

  const { data: areasRaw, error: areasError } = await supabase
    .from("storage_areas")
    .select(`
      id,
      name,
      location_id,
      storage_categories:storage_categories!fk_storage_area (
        id,
        name,
        items:items!fk_items_category ( id )
      )
    `)
    .order("name", { ascending: true });

  if (areasError) {
    console.error("Areas fetch error (message):", areasError?.message);
    console.error("Areas fetch error (details):", areasError?.details);
    console.error("Areas fetch error (hint):", areasError?.hint);
    console.error("Areas fetch error (code):", areasError?.code);
    console.error(
      "Areas fetch error (full):",
      JSON.stringify(areasError, null, 2)
    );
  }

  // Fetch referenced locations in one request
  const locationIds = [
    ...new Set((areasRaw ?? []).map((a) => a.location_id).filter(Boolean)),
  ];

  const { data: locationsRaw, error: locationsError } = locationIds.length
    ? await supabase.from("locations").select("id, name").in("id", locationIds)
    : { data: [], error: null };

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

  const locationMap = new Map(
    (locationsRaw ?? []).map((l) => [String(l.id), l])
  );

  // Normalize for the client component
  const areas = (areasRaw ?? []).map((a) => {
    const categories = a.storage_categories ?? [];
    const categoriesCount = categories.length;
    const itemsCount = categories.reduce(
      (sum, c) => sum + ((c.items ?? []).length),
      0
    );

    const loc = a.location_id ? locationMap.get(String(a.location_id)) : null;

    return {
      id: a.id,
      name: a.name,
      location: loc
        ? { id: loc.id, name: loc.name }
        : { id: null, name: "Unknown location" },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        itemsCount: (c.items ?? []).length,
      })),
      categoriesCount,
      itemsCount,
    };
  });

  return (
    <main className="page-enter max-w-[1300px] mx-auto p-6 pt-8 min-h-[100vh]">
      <AreasPageClient initialAreas={areas} />
    </main>
  );
}
