"use client";

import { Button } from "@heroui/react";
import { FaPlus } from "react-icons/fa";

export default function OpenGlobalAddItemButton({
  children = "Add Item",
  className = "",
  variant,
  context,
}) {
  return (
    <Button
      variant={variant}
      className={className || "rounded-xl bg-[#0E7488] text-white"}
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
    </Button>
  );
}
