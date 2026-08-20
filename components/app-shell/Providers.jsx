'use client';

import dynamic from "next/dynamic";
import AppPreferences from "@/components/app-shell/AppPreferences";
import MobileViewportInsets from "@/components/app-shell/MobileViewportInsets";

const InactivityLogout = dynamic(
  () => import("@/components/app-shell/InactivityLogout"),
  { ssr: false }
);

export function Providers({
  children,
  initialPreferences,
  isAuthenticated = false,
}) {
  return (
    <>
      <MobileViewportInsets />
      <AppPreferences initialPreferences={initialPreferences} />
      <InactivityLogout isAuthenticated={isAuthenticated} />
      {children}
    </>
  );
}
