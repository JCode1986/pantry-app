"use client";

import dynamic from "next/dynamic";

export const LazyLocationDetailHeaderClient = dynamic(
  () => import("@/components/locations/LocationDetailHeaderClient"),
  {
    ssr: false,
  }
);

export const LazyLocationStorageAreasSection = dynamic(
  () => import("@/components/locations/StorageAreasSection"),
  {
    ssr: false,
  }
);
