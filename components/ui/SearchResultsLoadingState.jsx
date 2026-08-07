"use client";

import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function SearchResultsLoadingState({
  label = "Loading results",
  detail = "Restoring everything.",
  className = "",
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--stocksense-brand-border)] bg-white px-5 py-7 text-center shadow-sm ${className}`}
    >
      <WhereKeepLoader
        className="[&_.wherekeep-loader__mark]:!h-24 [&_.wherekeep-loader__mark]:!w-24"
        label={label}
        detail={detail}
      />
    </div>
  );
}
