import ItemsPageClient from "@/components/items/ItemPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import {
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
  const [itemsResult, { count: locationCount = 0 }] = await Promise.all([
    getItemsPageAction({
      offset: 0,
      limit: 24,
      filters: {
        expirationFilter: params?.expiration,
        expirationDays: params?.days,
        stockFilter: params?.stock,
      },
    }),
    supabase.from("locations").select("id", { count: "exact", head: true }),
  ]);

  if (itemsResult?.error) {
    console.error("Items fetch error:", itemsResult.error);
  }

  return (
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <ItemsPageClient
        initialItems={itemsResult?.data?.items ?? []}
        initialTotalItems={itemsResult?.data?.totalCount ?? 0}
        initialLocationCount={locationCount ?? 0}
        canEditInventory={canEditInventory}
        initialExpirationFilter={params?.expiration}
        initialExpirationDays={params?.days}
        initialStockFilter={params?.stock}
      />
    </main>
  );
}
