'use client';

import { SessionProvider } from "@/lib/SessionContext";
import { HeroUIProvider } from "@heroui/react";
import AppPreferences from "@/components/app-shell/AppPreferences";
import InactivityLogout from "@/components/app-shell/InactivityLogout";
import MobileViewportInsets from "@/components/app-shell/MobileViewportInsets";

export function Providers({ children, isAuthenticated = false }) {
  return (
    <HeroUIProvider>
      <SessionProvider>
        <MobileViewportInsets />
        <AppPreferences />
        <InactivityLogout isAuthenticated={isAuthenticated} />
        {children}
      </SessionProvider>
    </HeroUIProvider>
  );
}
