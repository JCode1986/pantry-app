'use client';

import { SessionProvider } from "@/lib/SessionContext";
import { HeroUIProvider } from "@heroui/react";

export function Providers({ children }) {
  return (
    <HeroUIProvider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </HeroUIProvider>
  );
}
