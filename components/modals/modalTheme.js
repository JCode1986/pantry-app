export const modalContentStyle = {
  fontFamily: "var(--stocksense-font-family)",
};

export const modalContentClass =
  "flex w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl sm:w-full max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none";

export const modalHeaderClass =
  "shrink-0 border-b border-gray-200 bg-white text-base font-semibold text-gray-950 max-md:sticky max-md:top-0 max-md:z-20 max-md:px-4 max-md:py-3";

export const modalBodyClass =
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5 max-md:px-4 max-md:pb-28 max-md:pt-4";

export const modalFooterClass =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white sm:flex-row sm:justify-end max-md:sticky max-md:bottom-0 max-md:z-20 max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pt-3";

export const modalInputClassNames = {
  inputWrapper:
    "border-gray-200 bg-white shadow-none focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
  label: "text-gray-700",
  input: "text-gray-900 placeholder:text-gray-400",
};

export const themedSelectClassNames = {
  trigger:
    "border-gray-200 bg-white text-gray-900 shadow-none data-[hover=true]:border-[var(--stocksense-brand)] data-[open=true]:border-[var(--stocksense-brand)] data-[focus=true]:border-[var(--stocksense-brand)] data-[focus=true]:ring-1 data-[focus=true]:ring-[var(--stocksense-brand-border)]",
  label: "text-gray-700 group-data-[focus=true]:text-[var(--stocksense-brand)]",
  value: "text-gray-900",
  selectorIcon: "text-[var(--stocksense-brand)]",
  popoverContent:
    "border border-gray-200 bg-white text-gray-900 shadow-lg",
  listbox: "text-gray-900",
};
