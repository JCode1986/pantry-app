import { createAdminClient } from "@/utils/supabase/admin";

export const INVENTORY_IMAGE_BUCKET = "inventory-images";

export const INVENTORY_IMAGE_ENTITY = {
  LOCATION: "location",
  STORAGE_AREA: "storage_area",
  CATEGORY: "category",
  ITEM: "item",
  SHOPPING_LIST_ITEM: "shopping_list_item",
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getInventoryImageUrl(path) {
  if (!path) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(INVENTORY_IMAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("getInventoryImageUrl error:", error);
      return null;
    }

    return data?.signedUrl ?? null;
  } catch (err) {
    console.error("getInventoryImageUrl error:", err);
    return null;
  }
}

export async function addInventoryImageUrls(rows, pathKey = "image_path") {
  return Promise.all(
    (rows ?? []).map(async (row) => ({
      ...row,
      imageUrl: await getInventoryImageUrl(row?.[pathKey]),
    }))
  );
}
