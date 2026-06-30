'use client';

import { SessionProvider } from "@/lib/SessionContext";
import { HeroUIProvider } from "@heroui/react";
import AppPreferences from "@/components/AppPreferences";

export function Providers({ children }) {
  return (
    <HeroUIProvider>
      <SessionProvider>
        <AppPreferences />
        {children}
      </SessionProvider>
    </HeroUIProvider>
  );
}
