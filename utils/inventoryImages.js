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
const SIGNED_URL_CACHE_MS = 5 * 60 * 1000;
const signedUrlCache = new Map();

function getCachedSignedUrl(path, now = Date.now()) {
  const cached = signedUrlCache.get(path);
  if (!cached) return undefined;

  if (cached.expiresAt <= now) {
    signedUrlCache.delete(path);
    return undefined;
  }

  return cached.url;
}

function setCachedSignedUrl(path, url, now = Date.now()) {
  signedUrlCache.set(path, {
    url,
    expiresAt: now + SIGNED_URL_CACHE_MS,
  });
}

export async function getInventoryImageUrls(paths = []) {
  const uniquePaths = [...new Set((paths ?? []).filter(Boolean))];
  const urlsByPath = new Map();
  if (uniquePaths.length === 0) return urlsByPath;

  const now = Date.now();
  const missingPaths = [];

  for (const path of uniquePaths) {
    const cachedUrl = getCachedSignedUrl(path, now);
    if (cachedUrl !== undefined) {
      urlsByPath.set(path, cachedUrl);
    } else {
      missingPaths.push(path);
    }
  }

  if (missingPaths.length === 0) return urlsByPath;

  try {
    const admin = createAdminClient();
    const bucket = admin.storage.from(INVENTORY_IMAGE_BUCKET);
    const { data, error } = await bucket.createSignedUrls(
      missingPaths,
      SIGNED_URL_TTL_SECONDS
    );

    if (error) {
      console.error("getInventoryImageUrls error:", error);
      return urlsByPath;
    }

    for (const [index, item] of (data ?? []).entries()) {
      const path = item?.path ?? missingPaths[index];
      const signedUrl = item?.signedUrl ?? null;
      if (!path) continue;
      urlsByPath.set(path, signedUrl);
      setCachedSignedUrl(path, signedUrl, now);
    }
  } catch (err) {
    console.error("getInventoryImageUrls error:", err);
  }

  return urlsByPath;
}

export async function getInventoryImageUrl(path) {
  if (!path) return null;
  const urlsByPath = await getInventoryImageUrls([path]);
  return urlsByPath.get(path) ?? null;
}

export async function addInventoryImageUrls(rows, pathKey = "image_path") {
  const urlsByPath = await getInventoryImageUrls(
    (rows ?? []).map((row) => row?.[pathKey])
  );

  return (rows ?? []).map((row) => ({
    ...row,
    imageUrl: urlsByPath.get(row?.[pathKey]) ?? null,
  }));
}
