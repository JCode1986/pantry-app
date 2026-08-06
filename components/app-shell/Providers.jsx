'use client';

import dynamic from "next/dynamic";
import { SessionProvider } from "@/lib/SessionContext";
import AppPreferences from "@/components/app-shell/AppPreferences";
import MobileViewportInsets from "@/components/app-shell/MobileViewportInsets";

const InactivityLogout = dynamic(
  () => import("@/components/app-shell/InactivityLogout"),
  { ssr: false }
);

export function Providers({ children, isAuthenticated = false }) {
  return (
    <SessionProvider>
      <MobileViewportInsets />
      <AppPreferences />
      <InactivityLogout isAuthenticated={isAuthenticated} />
      {children}
    </SessionProvider>
  );
}
