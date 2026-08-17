"use client";

import dynamic from "next/dynamic";

export const LazyLocationsSection = dynamic(
  () => import("@/components/locations/LocationsSection"),
  {
    ssr: false,
  }
);

export const LazyAreasPageClient = dynamic(
  () => import("@/components/areas/AreasPageClient"),
  {
    ssr: false,
  }
);

export const LazyCategoriesPageClient = dynamic(
  () => import("@/components/categories/CategoriesPageClient"),
  {
    ssr: false,
  }
);

export const LazyShoppingListPageClient = dynamic(
  () => import("@/components/shopping-list/ShoppingListPageClient"),
  {
    ssr: false,
  }
);
