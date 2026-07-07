export const modalContentStyle = {
  fontFamily: "var(--stocksense-font-family)",
};

export const modalContentClass =
  "flex w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl sm:w-full";

export const modalHeaderClass =
  "shrink-0 border-b border-gray-200 bg-white text-base font-semibold text-gray-950";

export const modalBodyClass =
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5";

export const modalFooterClass =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white sm:flex-row sm:justify-end";

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
