"use client";

export default function MobileSuggestionChips({ suggestions = [], onSelect }) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 md:hidden" aria-label="Suggestions">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect?.(suggestion)}
          className="min-h-9 rounded-full border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-medium text-[var(--stocksense-brand)] shadow-sm"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

