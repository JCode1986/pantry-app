"use client";

import dynamic from "next/dynamic";
import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

function PageClientLoading() {
  return (
    <div className="grid min-h-[50svh] place-items-center px-4">
      <WhereKeepLoader label="Loading page..." />
    </div>
  );
}

export const LazyProfileClient = dynamic(
  () => import("@/components/profile/ProfileClient"),
  {
    ssr: false,
    loading: PageClientLoading,
  }
);

export const LazyItemsPageClient = dynamic(
  () => import("@/components/items/ItemPageClient"),
  {
    ssr: false,
    loading: PageClientLoading,
  }
);

export const LazyStorageAreasSection = dynamic(
  () => import("@/components/locations/StorageAreasSection"),
  {
    ssr: false,
    loading: PageClientLoading,
  }
);

export const LazyAreaDetailClient = dynamic(
  () => import("@/components/areas/AreaDetailClient"),
  {
    ssr: false,
    loading: PageClientLoading,
  }
);

export const LazyCategoryDetailClient = dynamic(
  () => import("@/components/categories/CategoryDetailClient"),
  {
    ssr: false,
    loading: PageClientLoading,
  }
);
