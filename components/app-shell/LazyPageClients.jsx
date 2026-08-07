"use client";

import dynamic from "next/dynamic";

export const LazyProfileClient = dynamic(
  () => import("@/components/profile/ProfileClient"),
  {
    ssr: false,
  }
);

export const LazyItemsPageClient = dynamic(
  () => import("@/components/items/ItemPageClient"),
  {
    ssr: false,
  }
);

export const LazyStorageAreasSection = dynamic(
  () => import("@/components/locations/StorageAreasSection"),
  {
    ssr: false,
  }
);

export const LazyAreaDetailClient = dynamic(
  () => import("@/components/areas/AreaDetailClient"),
  {
    ssr: false,
  }
);

export const LazyCategoryDetailClient = dynamic(
  () => import("@/components/categories/CategoryDetailClient"),
  {
    ssr: false,
  }
);
