"use client";

export default function MobileSheetCloseButton({ onPress, label = "Close" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="relative z-30 ml-auto inline-flex h-10 min-h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold leading-none text-gray-700 shadow-sm md:hidden"
    >
      X
    </button>
  );
}
