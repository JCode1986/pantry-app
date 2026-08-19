import React from "react";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";

const { default: NativeSelect } = await import("@/components/ui/NativeSelect");

describe("NativeSelect", () => {
  it("opens upward when the trigger is near the bottom of the viewport", async () => {
    const originalInnerHeight = window.innerHeight;
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });

    try {
      const { user } = renderWithProviders(
        <NativeSelect
          aria-label="Task priority"
          label="Priority"
          value="medium"
          onChange={() => {}}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      );
      const trigger = screen.getByRole("button", { name: /task priority/i });
      trigger.getBoundingClientRect = () => ({
        x: 16,
        y: 570,
        top: 570,
        bottom: 626,
        left: 16,
        right: 374,
        width: 358,
        height: 56,
        toJSON: () => {},
      });

      await user.click(trigger);

      const menu = await screen.findByRole("listbox", { name: /task priority/i });
      expect(Number.parseFloat(menu.style.top)).toBeLessThan(570);
      expect(Number.parseFloat(menu.style.maxHeight)).toBeLessThanOrEqual(288);
      expect(Number.parseFloat(menu.style.left)).toBeGreaterThanOrEqual(12);
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
