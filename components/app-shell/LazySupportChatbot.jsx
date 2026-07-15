"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const SupportChatbot = dynamic(() => import("@/components/app-shell/SupportChatbot"), {
  ssr: false,
});

export default function LazySupportChatbot() {
  const [shouldLoad, setShouldLoad] = useState(false);

  if (shouldLoad) {
    return <SupportChatbot defaultOpen />;
  }

  return (
    <div className="fixed bottom-[6.25rem] right-4 z-[60] md:bottom-6 lg:right-6">
      <button
        type="button"
        onClick={() => setShouldLoad(true)}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--stocksense-brand)] text-xl font-bold text-white shadow-xl transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)] focus:ring-offset-2"
        aria-label="Open help chat"
      >
        ?
      </button>
    </div>
  );
}
