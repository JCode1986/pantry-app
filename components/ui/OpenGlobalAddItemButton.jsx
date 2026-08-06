"use client";


import NativeButton from "@/components/ui/NativeButton";
import { FaPlus } from "react-icons/fa";

export default function OpenGlobalAddItemButton({
  children = "Add Item",
  className = "",
  variant,
  context,
  canEditInventory = true,
}) {
  if (!canEditInventory) return null;

  return (
    <NativeButton
      variant={variant}
      className={className || "rounded-xl bg-[var(--stocksense-brand)] text-white"}
      startContent={<FaPlus />}
      onPress={() => {
        window.dispatchEvent(
          new CustomEvent("stocksense:open-add-item", {
            detail: context ?? null,
          })
        );
      }}
    >
      {children}
    </NativeButton>
  );
}
