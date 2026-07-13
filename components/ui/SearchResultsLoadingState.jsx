"use client";

import { FaSpinner } from "react-icons/fa";

export default function SearchResultsLoadingState({
  label = "Loading results",
  detail = "Restoring everything.",
  className = "",
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border border-[var(--stocksense-brand-border)] bg-white px-5 py-7 text-center shadow-sm ${className}`}
    >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
        <FaSpinner className="h-5 w-5 animate-spin" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-950">{label}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-gray-500">
        {detail}
      </p>
    </div>
  );
}
