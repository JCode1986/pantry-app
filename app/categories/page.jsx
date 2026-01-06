import CategoriesPageClient from "@/components/CategoriesPageClient";
import { createClient } from "@/utils/supabase/server";

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
    `);



    if (error) {
        console.error("Categories fetch error:", error);
    }

    const categories = (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        insertedAt: c.inserted_at,
        storageArea: {
            id: c.storage_area?.id,
            name: c.storage_area?.name,
        },
        location: {
            id: c.storage_area?.location?.id,
            name: c.storage_area?.location?.name,
        },
        items: c.items ?? [],
        itemsCount: (c.items ?? []).length,
    }));

  return (
    <main className="max-w-[1300px] mx-auto p-6 pt-8 min-h-[100vh]">
      <CategoriesPageClient initialCategories={categories} />
    </main>
  );
}
