import React from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={typeof href === "string" ? href : href?.pathname ?? ""} {...props}>
      {children}
    </a>
  ),
}));

const { default: StatsCards } = await import("@/components/dashboard/StatsCards");

describe("StatsCards", () => {
  it("renders dashboard totals with the expected navigation targets", () => {
    renderWithProviders(
      <StatsCards
        totals={{
          items: 1234,
          expiringSoonItems: 3,
          lowStockItems: 2,
          locations: 5,
          shoppingListNeededItems: 7,
        }}
      />
    );

    expect(screen.getByRole("link", { name: /total items/i })).toHaveAttribute(
      "href",
      "/items"
    );
    expect(screen.getByRole("link", { name: /expiring soon/i })).toHaveAttribute(
      "href",
      "/items?expiration=soon&days=3"
    );
    expect(screen.getByRole("link", { name: /locations/i })).toHaveAttribute(
      "href",
      "/locations"
    );
    expect(screen.getByRole("link", { name: /shopping list/i })).toHaveAttribute(
      "href",
      "/shopping-list"
    );
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("defaults missing totals to zero", () => {
    renderWithProviders(<StatsCards totals={{}} />);

    expect(screen.getAllByText("0")).toHaveLength(5);
  });

  it("shows loading placeholders instead of interactive links while loading", () => {
    const { container } = renderWithProviders(<StatsCards isLoading />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(15);
  });
});
