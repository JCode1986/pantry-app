import CategoriesPageClient from "@/components/CategoriesPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata } from "@/utils/metadata";

export const metadata = createPageMetadata({
    title: "Categories",
    description: "Organize inventory categories across every location and storage area.",
    path: "/categories",
});

export default async function Page() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("storage_categories")
        .select(`
            id,
            name,
            inserted_at,
            storage_area:storage_areas!fk_storage_area (
            id,
            name,
            location:locations (
                id,
                name
            )
            ),
            items:items!fk_items_category (
            id,
            name,
            quantity,
            expiration_date
        )
    `)
        .order("name", { ascending: true });



    if (error) {
        console.error("Categories fetch error:", error);
    }

    const categories = (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        insertedAt: c.inserted_at,
        storageArea: {
            id: c.storage_area?.id ?? null,
            name: c.storage_area?.name ?? "Unknown area",
        },
        location: {
            id: c.storage_area?.location?.id ?? null,
            name: c.storage_area?.location?.name ?? "Unknown location",
        },
        items: c.items ?? [],
        itemsCount: (c.items ?? []).length,
    }));

  return (
    <main className="page-enter max-w-[1300px] mx-auto p-6 pt-8 min-h-[100vh]">
      <CategoriesPageClient initialCategories={categories} />
    </main>
  );
}
