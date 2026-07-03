'use client';

import { SessionProvider } from "@/lib/SessionContext";
import { HeroUIProvider } from "@heroui/react";
import AppPreferences from "@/components/app-shell/AppPreferences";
import InactivityLogout from "@/components/app-shell/InactivityLogout";

export function Providers({ children, isAuthenticated = false }) {
  return (
    <HeroUIProvider>
      <SessionProvider>
        <AppPreferences />
        <InactivityLogout isAuthenticated={isAuthenticated} />
        {children}
      </SessionProvider>
    </HeroUIProvider>
  );
}
