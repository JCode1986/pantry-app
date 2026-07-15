import ItemsPageClient from "@/components/items/ItemPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import {
  getInventoryHierarchy,
  getItemsPageAction,
} from "@/app/actions/server";

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
  const [itemsResult, hierarchyResult] = await Promise.all([
    getItemsPageAction({
      offset: 0,
      limit: 25,
      filters: {
        expirationFilter: params?.expiration,
        expirationDays: params?.days,
        stockFilter: params?.stock,
      },
    }),
    getInventoryHierarchy(),
  ]);

  if (itemsResult?.error) {
    console.error("Items fetch error:", itemsResult.error);
  }

  if (hierarchyResult?.error) {
    console.error("Items hierarchy fetch error:", hierarchyResult.error);
  }

  const moveLocations = (hierarchyResult?.data ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    storage_areas: (location.storageAreas ?? []).map((area) => ({
      id: area.id,
      name: area.name,
      categories: area.categories ?? [],
    })),
  }));

  return (
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <ItemsPageClient
        initialItems={itemsResult?.data?.items ?? []}
        initialTotalItems={itemsResult?.data?.totalCount ?? 0}
        moveLocations={moveLocations}
        canEditInventory={canEditInventory}
        initialExpirationFilter={params?.expiration}
        initialExpirationDays={params?.days}
        initialStockFilter={params?.stock}
      />
    </main>
  );
}
