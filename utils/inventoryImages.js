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

export const INVENTORY_IMAGE_VARIANT = {
  ORIGINAL: "original",
  THUMBNAIL: "thumbnail",
  CARD: "card",
  DETAIL: "detail",
};

const IMAGE_TRANSFORMS = {
  [INVENTORY_IMAGE_VARIANT.THUMBNAIL]: {
    width: 160,
    height: 160,
    resize: "cover",
    quality: 70,
  },
  [INVENTORY_IMAGE_VARIANT.CARD]: {
    width: 320,
    height: 320,
    resize: "cover",
    quality: 72,
  },
  [INVENTORY_IMAGE_VARIANT.DETAIL]: {
    width: 960,
    resize: "contain",
    quality: 82,
  },
};

function normalizeImageVariant(variant) {
  return Object.values(INVENTORY_IMAGE_VARIANT).includes(variant)
    ? variant
    : INVENTORY_IMAGE_VARIANT.ORIGINAL;
}

function cacheKeyForPath(path, variant) {
  return `${variant}:${path}`;
}

function getCachedSignedUrl(path, variant, now = Date.now()) {
  const cached = signedUrlCache.get(cacheKeyForPath(path, variant));
  if (!cached) return undefined;

  if (cached.expiresAt <= now) {
    signedUrlCache.delete(cacheKeyForPath(path, variant));
    return undefined;
  }

  return cached.url;
}

function setCachedSignedUrl(path, variant, url, now = Date.now()) {
  signedUrlCache.set(cacheKeyForPath(path, variant), {
    url,
    expiresAt: now + SIGNED_URL_CACHE_MS,
  });
}

export async function getInventoryImageUrls(paths = [], options = {}) {
  const variant = normalizeImageVariant(options?.variant);
  const uniquePaths = [...new Set((paths ?? []).filter(Boolean))];
  const urlsByPath = new Map();
  if (uniquePaths.length === 0) return urlsByPath;

  const now = Date.now();
  const missingPaths = [];

  for (const path of uniquePaths) {
    const cachedUrl = getCachedSignedUrl(path, variant, now);
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
    const transform = IMAGE_TRANSFORMS[variant];

    if (transform) {
      const failedPaths = [];

      await Promise.all(
        missingPaths.map(async (path) => {
          const { data, error } = await bucket.createSignedUrl(
            path,
            SIGNED_URL_TTL_SECONDS,
            { transform }
          );

          if (error) {
            failedPaths.push(path);
            return;
          }

          const signedUrl = data?.signedUrl ?? null;
          urlsByPath.set(path, signedUrl);
          setCachedSignedUrl(path, variant, signedUrl, now);
        })
      );

      if (failedPaths.length) {
        console.error(
          `getInventoryImageUrls ${variant} transform failed for ${failedPaths.length} image(s). Falling back to originals.`
        );
        const fallbackUrlsByPath = await getInventoryImageUrls(failedPaths, {
          variant: INVENTORY_IMAGE_VARIANT.ORIGINAL,
        });

        for (const path of failedPaths) {
          const fallbackUrl = fallbackUrlsByPath.get(path) ?? null;
          urlsByPath.set(path, fallbackUrl);
          setCachedSignedUrl(path, variant, fallbackUrl, now);
        }
      }

      return urlsByPath;
    }

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
      setCachedSignedUrl(path, variant, signedUrl, now);
    }
  } catch (err) {
    console.error("getInventoryImageUrls error:", err);
  }

  return urlsByPath;
}

export async function getInventoryImageUrl(path, options = {}) {
  if (!path) return null;
  const urlsByPath = await getInventoryImageUrls([path], options);
  return urlsByPath.get(path) ?? null;
}

export async function addInventoryImageUrls(rows, pathKey = "image_path", options = {}) {
  const urlsByPath = await getInventoryImageUrls(
    (rows ?? []).map((row) => row?.[pathKey]),
    options
  );
  const imageUrlKey = options?.imageUrlKey ?? "imageUrl";

  return (rows ?? []).map((row) => ({
    ...row,
    [imageUrlKey]: urlsByPath.get(row?.[pathKey]) ?? null,
  }));
}
