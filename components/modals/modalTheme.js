export const modalContentStyle = {
  fontFamily: "var(--stocksense-font-family)",
};

export const modalContentClass =
  "rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-gray-700";

export const modalHeaderClass =
  "border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)]";

export const modalBodyClass = "pt-5";

export const modalFooterClass =
  "border-t border-[var(--stocksense-brand-border)] bg-white";

export const modalInputClassNames = {
  inputWrapper:
    "border-[var(--stocksense-brand-border)] bg-white shadow-none focus-within:border-[var(--stocksense-brand)]",
  label: "text-gray-600",
  input: "text-gray-800",
};

export const themedSelectClassNames = {
  trigger:
    "border-[var(--stocksense-brand-border)] bg-white shadow-none data-[hover=true]:border-[var(--stocksense-brand)] data-[open=true]:border-[var(--stocksense-brand)] data-[focus=true]:border-[var(--stocksense-brand)]",
  label: "text-gray-600 group-data-[focus=true]:text-[var(--stocksense-brand)]",
  value: "text-gray-800",
  selectorIcon: "text-[var(--stocksense-brand)]",
  popoverContent:
    "border border-[var(--stocksense-brand-border)] bg-white text-gray-700 shadow-lg",
  listbox: "text-gray-700",
};
