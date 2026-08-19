import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/tests/helpers/render";
import { createTestMember } from "@/tests/helpers/factories";

const actionMocks = vi.hoisted(() => ({
  completeTaskAction: vi.fn(),
  createTaskAction: vi.fn(),
  deleteTaskAction: vi.fn(),
  reopenTaskAction: vi.fn(),
  updateTaskAction: vi.fn(),
}));

vi.mock("@/app/actions/tasks", () => actionMocks);

const { default: TasksPageClient } = await import(
  "@/components/tasks/TasksPageClient"
);

function createClientTask(overrides = {}) {
  return {
    id: "task_1",
    householdId: "household_1",
    title: "Take out trash",
    description: null,
    assignedTo: "user_owner",
    createdBy: "user_owner",
    locationId: "location_1",
    status: "todo",
    priority: "medium",
    dueDate: "2026-08-18",
    isRecurring: false,
    recurrenceType: null,
    recurrenceInterval: 1,
    recurringParentTaskId: null,
    completedAt: null,
    completedBy: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const ownerMember = createTestMember();
const viewerMember = createTestMember({
  user_id: "user_viewer",
  email: "viewer@example.test",
  role: "viewer",
  displayName: "Viewer Name",
});
const locations = [{ id: "location_1", name: "Kitchen" }];

describe("TasksPageClient", () => {
  beforeEach(() => {
    actionMocks.completeTaskAction.mockReset();
    actionMocks.createTaskAction.mockReset();
    actionMocks.deleteTaskAction.mockReset();
    actionMocks.reopenTaskAction.mockReset();
    actionMocks.updateTaskAction.mockReset();
  });

  it("groups household tasks by due date sections", () => {
    vi.useFakeTimers({ now: new Date("2026-08-18T12:00:00.000Z") });
    try {
      renderWithProviders(
        <TasksPageClient
          initialTasks={[
            createClientTask({
              id: "overdue",
              title: "Replace filter",
              dueDate: "2026-08-17",
              priority: "high",
            }),
            createClientTask({
              id: "today",
              title: "Water plants",
              dueDate: "2026-08-18",
            }),
            createClientTask({
              id: "completed",
            title: "Clean counters",
            status: "completed",
            completedAt: "2026-08-18T08:00:00.000Z",
            completedBy: "user_viewer",
          }),
        ]}
        members={[ownerMember, viewerMember]}
          locations={locations}
          currentUserId="user_owner"
          currentUserRole="owner"
        />
      );
    } finally {
      vi.useRealTimers();
    }

    expect(screen.getByRole("heading", { name: "Overdue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed" })).toBeInTheDocument();
    expect(screen.getByText("Replace filter")).toBeInTheDocument();
    expect(screen.getByText("Water plants")).toBeInTheDocument();
    expect(screen.getByText("Clean counters")).toBeInTheDocument();
    expect(screen.getByText(/completed aug 18 by viewer name/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit clean counters/i })).not.toBeInTheDocument();
  });

  it("does not show edit in the actions menu for completed tasks", async () => {
    const { user } = renderWithProviders(
      <TasksPageClient
        initialTasks={[
          createClientTask({
            id: "completed",
            title: "Clean counters",
            status: "completed",
            completedAt: "2026-08-18T08:00:00.000Z",
            completedBy: "user_owner",
          }),
        ]}
        members={[ownerMember]}
        locations={locations}
        currentUserId="user_owner"
        currentUserRole="owner"
      />
    );

    await user.click(screen.getByRole("button", { name: /clean counters actions/i }));

    expect(screen.queryByRole("menuitem", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: /reopen/i })).toBeInTheDocument();
  });

  it("filters tasks from the compact task view dropdown", async () => {
    const { user } = renderWithProviders(
      <TasksPageClient
        initialTasks={[
          createClientTask({
            id: "mine",
            title: "Wash dishes",
            assignedTo: "user_owner",
          }),
          createClientTask({
            id: "other",
            title: "Sweep garage",
            assignedTo: "user_viewer",
          }),
        ]}
        members={[ownerMember, viewerMember]}
        locations={locations}
        currentUserId="user_owner"
        currentUserRole="owner"
      />
    );

    await user.click(screen.getByRole("button", { name: /task view/i }));
    await user.click(await screen.findByRole("option", { name: /mine/i }));

    expect(screen.getByText("Wash dishes")).toBeInTheDocument();
    expect(screen.queryByText("Sweep garage")).not.toBeInTheDocument();
  });

  it("lets household editors create tasks from the modal", async () => {
    const createdTask = createClientTask({
      id: "task_new",
      title: "Water herbs",
      assignedTo: null,
      locationId: null,
    });
    actionMocks.createTaskAction.mockResolvedValue({ data: createdTask, error: null });

    const { user } = renderWithProviders(
      <TasksPageClient
        initialTasks={[]}
        members={[ownerMember]}
        locations={locations}
        currentUserId="user_owner"
        currentUserRole="owner"
      />
    );

    await user.click(screen.getByRole("button", { name: /new task/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/task name/i), "Water herbs");
    await user.click(within(dialog).getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(actionMocks.createTaskAction).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Water herbs",
          priority: "medium",
          isRecurring: false,
        })
      );
    });
    expect(await screen.findByText("Task created.")).toBeInTheDocument();
    expect(screen.getByText("Water herbs")).toBeInTheDocument();
  });

  it("allows viewers to complete only their assigned tasks", async () => {
    const assignedTask = createClientTask({
      id: "viewer_task",
      title: "Wash dishes",
      assignedTo: "user_viewer",
    });
    actionMocks.completeTaskAction.mockResolvedValue({
      data: {
        task: {
          ...assignedTask,
          status: "completed",
          completedAt: "2026-08-18T12:30:00.000Z",
          completedBy: "user_viewer",
        },
        nextTask: null,
      },
      error: null,
    });

    const { user } = renderWithProviders(
      <TasksPageClient
        initialTasks={[
          assignedTask,
          createClientTask({
            id: "other_task",
            title: "Sweep garage",
            assignedTo: "user_owner",
          }),
          createClientTask({
            id: "unassigned_task",
            title: "Take recycling",
            assignedTo: null,
          }),
        ]}
        members={[ownerMember, viewerMember]}
        locations={locations}
        currentUserId="user_viewer"
        currentUserRole="viewer"
      />
    );

    expect(screen.queryByRole("button", { name: /new task/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /complete sweep garage/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /complete take recycling/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /wash dishes actions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /take recycling actions/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /complete wash dishes/i }));

    await waitFor(() => {
      expect(actionMocks.completeTaskAction).toHaveBeenCalledWith("viewer_task");
    });
    expect(await screen.findByText("Task completed.")).toBeInTheDocument();
  });

  it("shows delete success feedback as a toast", async () => {
    actionMocks.deleteTaskAction.mockResolvedValue({ data: { id: "task_1" }, error: null });

    const { user } = renderWithProviders(
      <TasksPageClient
        initialTasks={[createClientTask()]}
        members={[ownerMember]}
        locations={locations}
        currentUserId="user_owner"
        currentUserRole="owner"
      />
    );

    await user.click(screen.getByRole("button", { name: /take out trash actions/i }));
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
    await user.click(await screen.findByRole("button", { name: /delete task/i }));

    await waitFor(() => {
      expect(actionMocks.deleteTaskAction).toHaveBeenCalledWith("task_1");
    });
    expect(within(await screen.findByRole("status")).getByText("Task deleted.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Take out trash")).not.toBeInTheDocument();
  });
});
