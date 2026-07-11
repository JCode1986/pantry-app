import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import AreaDetailClient from "@/components/areas/AreaDetailClient";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import { getInventoryImageUrls } from "@/utils/inventoryImages";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: area } = await supabase
    .from("storage_areas")
    .select("name, location:locations(name)")
    .eq("id", id)
    .maybeSingle();

  const name = area?.name ?? "Storage Area";
  const locationName = area?.location?.name;

  return createPageMetadata({
    title: name,
    description: locationName
      ? `Manage categories and items in ${name} at ${locationName}.`
      : `Manage categories and items in ${name}.`,
    path: `/areas/${id}`,
    robots: NO_INDEX_ROBOTS,
  });
}

export default async function Page({ params }) {
  const supabase = await createClient();
  const { id } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);

  // 1) Fetch area + its location
  const { data: area, error: areaError } = await supabase
    .from("storage_areas")
    .select(
      `
      id,
      name,
      image_path,
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
  let { data: categoriesRaw, error: categoriesError } = await supabase
    .from("storage_categories")
    .select(
      `
      id,
      name,
      image_path,
      storage_area_id,
      items:items!fk_items_category ( id )
    `
    )
    .eq("storage_area_id", id)
    .order("name", { ascending: true });

  const categoryImageColumnMissing =
    categoriesError?.code === "42703" &&
    categoriesError?.message?.includes("image_path");

  if (categoryImageColumnMissing) {
    const fallback = await supabase
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

    categoriesRaw = fallback.data;
    categoriesError = fallback.error;
  }

  if (categoriesError) {
    console.error("Categories fetch error:", categoriesError?.message || categoriesError);
  }

  const imageUrlsByPath = await getInventoryImageUrls([
    area.image_path,
    ...(categoriesRaw ?? []).map((category) => category.image_path),
  ]);
  const categories = (categoriesRaw ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      image_path: c.image_path ?? null,
      imageUrl: categoryImageColumnMissing
        ? null
        : imageUrlsByPath.get(c.image_path) ?? null,
      itemsCount: (c.items ?? []).length,
    }));

  const totals = {
    categories: categories.length,
    items: categories.reduce((sum, c) => sum + (c.itemsCount || 0), 0),
  };

  return (
    <main className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <AreaDetailClient
        area={{
          id: area.id,
          name: area.name,
          location: {
          id: area.location?.id ?? null,
          name: area.location?.name ?? "Unknown location",
        },
        image_path: area.image_path ?? null,
        imageUrl: imageUrlsByPath.get(area.image_path) ?? null,
      }}
        initialCategories={categories}
        totals={totals}
        canEditInventory={canEditInventory}
      />
    </main>
  );
}
