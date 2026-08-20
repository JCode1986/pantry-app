import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";

const activityActionMocks = vi.hoisted(() => ({
  getRecentActivityAction: vi.fn(),
}));

vi.mock("@/app/actions/activity", () => activityActionMocks);

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={typeof href === "string" ? href : href?.pathname ?? ""} {...props}>
      {children}
    </a>
  ),
}));

const { default: RecentActivity } = await import(
  "@/components/dashboard/RecentActivity"
);

function activityRow(index, overrides = {}) {
  return {
    id: `activity_${index}`,
    entity_type: "task",
    entity_id: `task_${index}`,
    action: "completed",
    item_name: `Activity ${index}`,
    created_at: `2026-01-${String(index).padStart(2, "0")}T00:00:00.000Z`,
    changes: {},
    ...overrides,
  };
}

describe("RecentActivity", () => {
  beforeEach(() => {
    activityActionMocks.getRecentActivityAction.mockReset();
    activityActionMocks.getRecentActivityAction.mockResolvedValue({
      data: {
        items: [
          {
            id: "activity_task_1",
            entity_type: "task",
            entity_id: "task_1",
            action: "completed",
            item_name: "Take out trash",
            created_at: "2026-01-05T00:00:00.000Z",
            changes: {},
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
      error: null,
    });
  });

  it("filters full recent activity by activity type", async () => {
    const { user } = renderWithProviders(
      <RecentActivity
        variant="full"
        items={[]}
        members={[]}
        effectivePlanId="free"
      />
    );

    expect(
      screen.getByRole("button", { name: /filter recent activity by type/i })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /filter recent activity by type/i })
    );
    await user.click(await screen.findByRole("option", { name: /tasks/i }));

    await waitFor(() => {
      expect(activityActionMocks.getRecentActivityAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "task",
          action: "all",
        })
      );
    });
    expect(await screen.findByText("Take out trash")).toBeInTheDocument();
  });

  it("opens full recent activity with an initial task filter selected", () => {
    renderWithProviders(
      <RecentActivity
        variant="full"
        items={[
          {
            id: "activity_task_1",
            entity_type: "task",
            entity_id: "task_1",
            action: "completed",
            item_name: "Take out trash",
            created_at: "2026-01-05T00:00:00.000Z",
            changes: {},
          },
        ]}
        members={[]}
        effectivePlanId="free"
        initialEntityType="task"
      />
    );

    expect(screen.getByRole("button", { name: /filter recent activity by type/i }))
      .toHaveTextContent("Tasks");
    expect(screen.getByText("Take out trash")).toBeInTheDocument();
  });

  it("keeps appended activity visible after loading more and rerendering", async () => {
    const initialItems = Array.from({ length: 12 }, (_, index) =>
      activityRow(index + 1)
    );

    activityActionMocks.getRecentActivityAction.mockResolvedValueOnce({
      data: {
        items: [activityRow(13)],
        nextCursor: null,
        hasMore: false,
      },
      error: null,
    });

    const { rerender, user } = renderWithProviders(
      <RecentActivity
        variant="full"
        items={initialItems}
        members={[]}
        effectivePlanId="free"
        initialCursor="2026-01-12T00:00:00.000Z"
        initialHasMore
      />
    );

    await user.click(screen.getByRole("button", { name: /view more/i }));

    expect(await screen.findByText("Activity 13")).toBeInTheDocument();
    expect(screen.getByText("Activity 1")).toBeInTheDocument();

    rerender(
      <RecentActivity
        variant="full"
        items={[...initialItems]}
        members={[]}
        effectivePlanId="free"
        initialCursor="2026-01-12T00:00:00.000Z"
        initialHasMore
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Activity 13")).toBeInTheDocument();
    });
    expect(screen.getByText("13 items")).toBeInTheDocument();
  });
});
