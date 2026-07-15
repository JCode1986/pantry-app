import CategoriesPageClient from "@/components/categories/CategoriesPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import { getCategoriesPageAction } from "@/app/actions/server";

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

    const [
        categoriesResult,
        { data: filterLocations = [] },
        { data: filterAreas = [] },
    ] = await Promise.all([
        getCategoriesPageAction({ offset: 0, limit: 24 }),
        supabase.from("locations").select("id, name").order("name", { ascending: true }),
        supabase
            .from("storage_areas")
            .select("id, name, location_id")
            .order("name", { ascending: true }),
    ]);

  return (
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <CategoriesPageClient
        initialCategories={categoriesResult.data.items}
        initialTotalCategories={categoriesResult.data.totalCount}
        filterLocations={filterLocations}
        filterAreas={filterAreas}
        canEditInventory={canEditInventory}
      />
    </main>
  );
}
