import React from "react";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";

const { default: NativeDropdown } = await import(
  "@/components/ui/NativeDropdown"
);

describe("NativeDropdown", () => {
  it("opens upward when the trigger is near the bottom of the viewport", async () => {
    const originalInnerHeight = window.innerHeight;
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 800,
    });

    try {
      const { user } = renderWithProviders(
        <NativeDropdown
          ariaLabel="Task actions"
          items={[
            { key: "edit", label: "Edit", onSelect: () => {} },
            { key: "delete", label: "Delete", onSelect: () => {} },
          ]}
        />
      );
      const trigger = screen.getByRole("button", { name: /task actions/i });
      trigger.getBoundingClientRect = () => ({
        x: 744,
        y: 584,
        top: 584,
        bottom: 620,
        left: 744,
        right: 780,
        width: 36,
        height: 36,
        toJSON: () => {},
      });

      await user.click(trigger);

      const menu = await screen.findByRole("menu", { name: /task actions/i });
      expect(Number.parseFloat(menu.style.top)).toBeLessThan(584);
      expect(Number.parseFloat(menu.style.maxHeight)).toBeLessThanOrEqual(288);
    } finally {
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });
});
