import AreasPageClient from "@/components/areas/AreasPageClient";
import { createClient } from "@/utils/supabase/server";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import { getStorageAreasPageAction } from "@/app/actions/server";

export const metadata = createPageMetadata({
  title: "Areas",
  description: "Review and manage storage areas across all household locations.",
  path: "/areas",
  robots: NO_INDEX_ROBOTS,
});

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);

  const [areasResult, { data: filterLocations = [] }] = await Promise.all([
    getStorageAreasPageAction({ offset: 0, limit: 24 }),
    supabase.from("locations").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <main className="page-enter mx-auto max-w-[1560px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <AreasPageClient
        initialAreas={areasResult.data.items}
        initialTotalAreas={areasResult.data.totalCount}
        filterLocations={filterLocations}
        canEditInventory={canEditInventory}
      />
    </main>
  );
}
