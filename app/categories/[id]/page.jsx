import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CategoryDetailClient from "@/components/categories/CategoryDetailClient";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";
import { getCanEditInventoryForUser } from "@/utils/households";
import { getInventoryImageUrl } from "@/utils/inventoryImages";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("storage_categories")
    .select(
      `
      name,
      storage_area:storage_areas!fk_storage_area (
        name,
        location:locations ( name )
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  const name = category?.name ?? "Category";
  const areaName = category?.storage_area?.name;
  const locationName = category?.storage_area?.location?.name;
  const description =
    areaName && locationName
      ? `View items in ${name}, stored in ${areaName} at ${locationName}.`
      : `View and manage items in ${name}.`;

  return createPageMetadata({
    title: name,
    description,
    path: `/categories/${id}`,
    robots: NO_INDEX_ROBOTS,
  });
}

export default async function CategoryDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);

  let { data: category, error } = await supabase
    .from("storage_categories")
    .select(
      `
      id,
      name,
      image_path,
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
        expiration_date,
        barcode,
        category_id,
        image_path
      )
    `
    )
    .eq("id", id)
    .single();

  const categoryImageColumnMissing =
    error?.code === "42703" && error?.message?.includes("image_path");

  if (categoryImageColumnMissing) {
    const fallback = await supabase
      .from("storage_categories")
      .select(
        `
        id,
        name,
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
          expiration_date,
          barcode,
          category_id,
          image_path
        )
      `
      )
      .eq("id", id)
      .single();

    category = fallback.data;
    error = fallback.error;
  }

  if (error || !category) {
    console.error("Category fetch error:", error?.message || error);
    notFound();
  }

  const items = await Promise.all(
    (category.items ?? []).map(async (item) => ({
      ...item,
      imageUrl: await getInventoryImageUrl(item.image_path),
    }))
  );
  const area = category.storage_area;
  const location = area?.location;

  return (
    <CategoryDetailClient
      category={{
        id: category.id,
        name: category.name,
        image_path: category.image_path ?? null,
        imageUrl: categoryImageColumnMissing
          ? null
          : await getInventoryImageUrl(category.image_path),
      }}
      area={area ? { id: area.id, name: area.name } : null}
      location={location ? { id: location.id, name: location.name } : null}
      initialItems={items}
      canEditInventory={canEditInventory}
    />
  );
}
