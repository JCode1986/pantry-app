export const modalContentStyle = {
  fontFamily: "var(--stocksense-font-family)",
};

export const modalContentClass =
  "wherekeep-modal-content flex w-[calc(100vw-1rem)] max-h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl sm:w-full max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none";

export const mobileSheetModalClassNames = {
  wrapper:
    "max-md:items-stretch max-md:justify-stretch max-md:overflow-hidden max-md:p-0",
  base: "max-md:m-0 max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none",
};

export const modalHeaderClass =
  "shrink-0 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)] max-md:sticky max-md:top-0 max-md:z-20 max-md:px-4 max-md:pb-3 max-md:pt-[max(1rem,calc(env(safe-area-inset-top)+var(--wherekeep-visual-viewport-top,0px)+0.75rem))]";

export const modalTitleClass =
  "min-w-0 whitespace-normal break-words text-lg font-semibold leading-6 text-[var(--stocksense-brand)] max-md:text-base max-md:leading-5";

export const modalSubtitleClass =
  "mt-1 min-w-0 whitespace-normal break-words text-sm font-normal leading-5 text-gray-500 max-md:text-xs max-md:leading-4";

export const modalBodyClass =
  "wherekeep-modal-body min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain pt-5 max-md:px-4 max-md:pb-40 max-md:pt-4";

export const modalFooterClass =
  "wherekeep-modal-footer flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)] sm:flex-row sm:justify-end max-md:sticky max-md:bottom-0 max-md:z-20 max-md:px-4 max-md:pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+1rem))] max-md:pt-3";

export const modalInputClassNames = {
  inputWrapper:
    "border-gray-200 bg-white shadow-none focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
  label: "text-gray-700",
  input: "text-gray-900 placeholder:text-gray-400",
};
