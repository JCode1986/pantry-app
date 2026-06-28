import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import AreaDetailClient from "@/components/AreaDetailClient";

export default async function Page({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  // 1) Fetch area + its location
  const { data: area, error: areaError } = await supabase
    .from("storage_areas")
    .select(
      `
      id,
      name,
      location_id,
      location:locations (
        id,
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (areaError || !area) {
    console.error("Area fetch error:", areaError?.message || areaError);
    notFound();
  }

  // 2) Fetch categories under this area + item counts (minimal)
  // IMPORTANT: If you get "more than one relationship" errors, you may need explicit FK names.
  const { data: categoriesRaw, error: categoriesError } = await supabase
    .from("storage_categories")
    .select(
      `
      id,
      name,
      storage_area_id,
      items:items!fk_items_category ( id )
    `
    )
    .eq("storage_area_id", id)
    .order("name", { ascending: true });

  if (categoriesError) {
    console.error("Categories fetch error:", categoriesError?.message || categoriesError);
  }

  const categories = (categoriesRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    itemsCount: (c.items ?? []).length,
  }));

  const totals = {
    categories: categories.length,
    items: categories.reduce((sum, c) => sum + (c.itemsCount || 0), 0),
  };

  return (
    <main className="page-enter max-w-[1300px] mx-auto p-6 pt-8 min-h-[100vh]">
      <AreaDetailClient
        area={{
          id: area.id,
          name: area.name,
          location: {
            id: area.location?.id ?? null,
            name: area.location?.name ?? "Unknown location",
          },
        }}
        initialCategories={categories}
        totals={totals}
      />
    </main>
  );
}
