import CategoriesPageClient from "@/components/categories/CategoriesPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import { getInventoryImageUrls } from "@/utils/inventoryImages";

export const metadata = createPageMetadata({
    title: "Categories",
    description: "Organize inventory categories across every location and storage area.",
    path: "/categories",
    robots: NO_INDEX_ROBOTS,
});

export default async function Page() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const canEditInventory = await getCanEditInventoryForUser(user);

    let { data, error } = await supabase
        .from("storage_categories")
        .select(`
            id,
            name,
            image_path,
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

    if (error?.code === "42703" && error?.message?.includes("image_path")) {
        const retry = await supabase
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

        data = retry.data;
        error = retry.error;
    }

    if (error) {
        console.error("Categories fetch error:", error);
    }

    const urlsByPath = await getInventoryImageUrls(
        (data ?? []).map((category) => category.image_path)
    );

    const categories = (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        image_path: c.image_path ?? null,
        imageUrl: urlsByPath.get(c.image_path) ?? null,
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
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <CategoriesPageClient
        initialCategories={categories}
        canEditInventory={canEditInventory}
      />
    </main>
  );
}
