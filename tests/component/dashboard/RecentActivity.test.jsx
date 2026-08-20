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
});
