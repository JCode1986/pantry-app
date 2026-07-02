export const modalContentStyle = {
  fontFamily: "var(--stocksense-font-family)",
};

export const modalContentClass =
  "flex w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-gray-700 sm:w-full";

export const modalHeaderClass =
  "shrink-0 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)]";

export const modalBodyClass =
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5";

export const modalFooterClass =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--stocksense-brand-border)] bg-white sm:flex-row sm:justify-end";

export const modalInputClassNames = {
  inputWrapper:
    "border-[var(--stocksense-brand-border)] bg-white shadow-none focus-within:border-[var(--stocksense-brand)]",
  label: "text-gray-700",
  input: "text-gray-900 placeholder:text-gray-400",
};

export const themedSelectClassNames = {
  trigger:
    "border-[var(--stocksense-brand-border)] bg-white text-gray-900 shadow-none data-[hover=true]:border-[var(--stocksense-brand)] data-[open=true]:border-[var(--stocksense-brand)] data-[focus=true]:border-[var(--stocksense-brand)]",
  label: "text-gray-700 group-data-[focus=true]:text-[var(--stocksense-brand)]",
  value: "text-gray-900",
  selectorIcon: "text-[var(--stocksense-brand)]",
  popoverContent:
    "border border-[var(--stocksense-brand-border)] bg-white text-gray-900 shadow-lg",
  listbox: "text-gray-900",
};
