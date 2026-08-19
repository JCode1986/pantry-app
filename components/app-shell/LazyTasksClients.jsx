"use client";

import dynamic from "next/dynamic";

export const LazyTasksPageClient = dynamic(
  () => import("@/components/tasks/TasksPageClient"),
  {
    ssr: false,
  }
);
