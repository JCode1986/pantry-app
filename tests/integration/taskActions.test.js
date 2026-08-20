import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestHousehold,
  createTestLocation,
  createTestMember,
  createTestTask,
  createTestUser,
} from "@/tests/helpers/factories";
import { createSupabaseMock, createSupabaseResponse } from "@/tests/mocks/supabase";
import { HOUSEHOLD_ROLES } from "@/utils/householdRoles";

const taskMocks = vi.hoisted(() => ({
  getVerifiedSession: vi.fn(),
  getHouseholdForUser: vi.fn(),
  createAdminClient: vi.fn(),
  revalidatePath: vi.fn(),
  admin: null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: taskMocks.revalidatePath,
}));

vi.mock("@/lib/verifiedSession", () => ({
  getVerifiedSession: taskMocks.getVerifiedSession,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: taskMocks.createAdminClient,
}));

vi.mock("@/utils/households", async () => {
  const roles = await vi.importActual("@/utils/householdRoles");
  return {
    ...roles,
    getHouseholdForUser: taskMocks.getHouseholdForUser,
    hasHouseholdInviteMetadata: vi.fn(() => false),
  };
});

const {
  completeTaskAction,
  createTaskAction,
  deleteTaskAction,
  getTasksAction,
  reopenTaskAction,
  updateTaskAction,
} = await import("@/app/actions/tasks");

function setTaskContext({
  role = HOUSEHOLD_ROLES.OWNER,
  user = createTestUser(),
} = {}) {
  taskMocks.getVerifiedSession.mockResolvedValue({
    user,
    error: null,
  });
  taskMocks.getHouseholdForUser.mockResolvedValue({
    household: createTestHousehold(),
    member: createTestMember({
      user_id: user.id,
      email: user.email,
      role,
    }),
  });
}

describe("task server actions", () => {
  beforeEach(() => {
    setTaskContext();
    taskMocks.admin = createSupabaseMock();
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);
  });

  it("validates task names before reading session state", async () => {
    const result = await createTaskAction({ title: "   " });

    expect(result).toEqual({
      data: null,
      error: "Task name is required.",
    });
    expect(taskMocks.getVerifiedSession).not.toHaveBeenCalled();
  });

  it("rejects viewer attempts to create tasks", async () => {
    setTaskContext({ role: HOUSEHOLD_ROLES.VIEWER });

    const result = await createTaskAction({ title: "Clean kitchen" });

    expect(result).toEqual({
      data: null,
      error: "You do not have permission to create household tasks.",
    });
    expect(taskMocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("creates tasks scoped to the active household with valid assignment and location", async () => {
    taskMocks.admin = createSupabaseMock({
      household_members: createSupabaseResponse({
        data: { user_id: "user_editor", email: "editor@example.test", role: "editor" },
      }),
      locations: createSupabaseResponse({
        data: createTestLocation(),
      }),
      tasks: createSupabaseResponse({
        data: createTestTask({
          id: "task_created",
          title: "Replace HVAC filter",
          assigned_to: "user_editor",
          priority: "high",
          due_date: "2026-08-25",
          is_recurring: true,
          recurrence_type: "monthly",
          recurrence_interval: 3,
        }),
      }),
      activity_events: createSupabaseResponse(),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await createTaskAction({
      title: " Replace HVAC filter ",
      assignedTo: "user_editor",
      locationId: "location_1",
      priority: "high",
      dueDate: "2026-08-25",
      isRecurring: true,
      recurrenceType: "monthly",
      recurrenceInterval: 3,
    });

    const taskQuery = taskMocks.admin.__queries.get("tasks");
    expect(taskQuery.insert).toHaveBeenCalledWith({
      household_id: "household_1",
      title: "Replace HVAC filter",
      description: null,
      assigned_to: "user_editor",
      location_id: "location_1",
      status: "todo",
      priority: "high",
      due_date: "2026-08-25",
      is_recurring: true,
      recurrence_type: "monthly",
      recurrence_interval: 3,
      created_by: "user_owner",
    });
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      id: "task_created",
      title: "Replace HVAC filter",
      assignedTo: "user_editor",
      recurrenceType: "monthly",
    });
    expect(taskMocks.admin.__queries.get("activity_events").insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: "household_1",
        actor_user_id: "user_owner",
        actor_email: "owner@example.test",
        entity_type: "task",
        entity_id: "task_created",
        action: "added",
        name_at_event: "Replace HVAC filter",
        item_name: "Replace HVAC filter",
        changes: expect.objectContaining({
          assigned_to: "user_editor",
          priority: "high",
          due_date: "2026-08-25",
          recurrence_type: "monthly",
        }),
      })
    );
    expect(taskMocks.revalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("rejects assignment to users outside the household", async () => {
    taskMocks.admin = createSupabaseMock({
      household_members: createSupabaseResponse({ data: null }),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await createTaskAction({
      title: "Clean kitchen",
      assignedTo: "user_other",
    });

    expect(result).toEqual({
      data: null,
      error: "Assignee must belong to your household.",
    });
  });

  it("loads tasks for only the active household", async () => {
    taskMocks.admin = createSupabaseMock({
      tasks: createSupabaseResponse({
        data: [createTestTask({ id: "task_1" })],
      }),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await getTasksAction({ status: "todo" });

    const query = taskMocks.admin.__queries.get("tasks");
    expect(query.eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(query.eq).toHaveBeenCalledWith("status", "todo");
    expect(result).toEqual({
      data: {
        items: [
          expect.objectContaining({
            id: "task_1",
            householdId: "household_1",
          }),
        ],
      },
      error: null,
    });
  });

  it("loads active tasks plus a capped recent completed set by default", async () => {
    taskMocks.admin = createSupabaseMock({
      tasks: [
        createSupabaseResponse({
          data: [createTestTask({ id: "task_open", status: "todo" })],
        }),
        createSupabaseResponse({
          data: [
            createTestTask({
              id: "task_completed",
              status: "completed",
              completed_at: "2026-08-18T12:00:00.000Z",
            }),
          ],
        }),
      ],
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await getTasksAction();
    const taskQueries = taskMocks.admin.__queryHistory.get("tasks");

    expect(taskQueries).toHaveLength(2);
    expect(taskQueries[0].neq).toHaveBeenCalledWith("status", "completed");
    expect(taskQueries[1].eq).toHaveBeenCalledWith("status", "completed");
    expect(taskQueries[1].limit).toHaveBeenCalledWith(10);
    expect(result.data.items.map((task) => task.id)).toEqual([
      "task_open",
      "task_completed",
    ]);
  });

  it("lets editors update and assign household tasks", async () => {
    setTaskContext({
      role: HOUSEHOLD_ROLES.EDITOR,
      user: createTestUser({ id: "user_editor", email: "editor@example.test" }),
    });
    taskMocks.admin = createSupabaseMock({
      tasks: [
        createSupabaseResponse({ data: createTestTask({ id: "task_1" }) }),
        createSupabaseResponse({
          data: createTestTask({
            id: "task_1",
            title: "Clean the kitchen",
            assigned_to: "user_viewer",
            priority: "high",
          }),
        }),
      ],
      household_members: createSupabaseResponse({
        data: { user_id: "user_viewer", email: "viewer@example.test", role: "viewer" },
      }),
      activity_events: createSupabaseResponse(),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await updateTaskAction("task_1", {
      title: "Clean the kitchen",
      assignedTo: "user_viewer",
      priority: "high",
    });

    const taskQueries = taskMocks.admin.__queryHistory.get("tasks");
    expect(taskQueries[0].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(taskQueries[1].update).toHaveBeenCalledWith({
      title: "Clean the kitchen",
      assigned_to: "user_viewer",
      priority: "high",
    });
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      title: "Clean the kitchen",
      assignedTo: "user_viewer",
      priority: "high",
    });
  });

  it("lets assigned viewers complete and reopen their own tasks", async () => {
    setTaskContext({
      role: HOUSEHOLD_ROLES.VIEWER,
      user: createTestUser({ id: "user_viewer", email: "viewer@example.test" }),
    });
    taskMocks.admin = createSupabaseMock({
      tasks: [
        createSupabaseResponse({
          data: createTestTask({ id: "task_1", assigned_to: "user_viewer" }),
        }),
        createSupabaseResponse({
          data: createTestTask({
            id: "task_1",
            assigned_to: "user_viewer",
            status: "completed",
            completed_by: "user_viewer",
          }),
        }),
        createSupabaseResponse({
          data: createTestTask({
            id: "task_1",
            assigned_to: "user_viewer",
            status: "completed",
            completed_by: "user_viewer",
          }),
        }),
        createSupabaseResponse({
          data: createTestTask({
            id: "task_1",
            assigned_to: "user_viewer",
            status: "todo",
          }),
        }),
      ],
      activity_events: createSupabaseResponse(),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const completeResult = await completeTaskAction("task_1");
    const reopenResult = await reopenTaskAction("task_1");
    const taskQueries = taskMocks.admin.__queryHistory.get("tasks");

    expect(taskQueries[1].update).toHaveBeenCalledWith({
      status: "completed",
      completed_at: expect.any(String),
      completed_by: "user_viewer",
    });
    expect(taskQueries[3].update).toHaveBeenCalledWith({
      status: "todo",
      completed_at: null,
      completed_by: null,
    });
    const activityQueries = taskMocks.admin.__queryHistory.get("activity_events");
    expect(activityQueries[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: "household_1",
        actor_user_id: "user_viewer",
        actor_email: "viewer@example.test",
        entity_type: "task",
        entity_id: "task_1",
        action: "completed",
        name_at_event: "Take out trash",
        item_name: "Take out trash",
        changes: expect.objectContaining({
          completed_at: expect.any(String),
        }),
      })
    );
    expect(activityQueries[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: "household_1",
        actor_user_id: "user_viewer",
        actor_email: "viewer@example.test",
        entity_type: "task",
        entity_id: "task_1",
        action: "updated",
        changes: { status: "todo", reopened: true },
      })
    );
    expect(completeResult.error).toBeNull();
    expect(reopenResult.error).toBeNull();
  });

  it("rejects viewer completion of another member's task", async () => {
    setTaskContext({
      role: HOUSEHOLD_ROLES.VIEWER,
      user: createTestUser({ id: "user_viewer", email: "viewer@example.test" }),
    });
    taskMocks.admin = createSupabaseMock({
      tasks: createSupabaseResponse({
        data: createTestTask({ id: "task_1", assigned_to: "user_other" }),
      }),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await completeTaskAction("task_1");

    expect(result).toEqual({
      data: null,
      error: "You do not have permission to complete this task.",
    });
  });

  it("lets household members complete unassigned tasks", async () => {
    setTaskContext({
      role: HOUSEHOLD_ROLES.VIEWER,
      user: createTestUser({ id: "user_viewer", email: "viewer@example.test" }),
    });
    taskMocks.admin = createSupabaseMock({
      tasks: [
        createSupabaseResponse({
          data: createTestTask({ id: "task_1", assigned_to: null }),
        }),
        createSupabaseResponse({
          data: createTestTask({
            id: "task_1",
            assigned_to: null,
            status: "completed",
            completed_by: "user_viewer",
          }),
        }),
      ],
      activity_events: createSupabaseResponse(),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await completeTaskAction("task_1");
    const taskQueries = taskMocks.admin.__queryHistory.get("tasks");

    expect(taskQueries[1].update).toHaveBeenCalledWith({
      status: "completed",
      completed_at: expect.any(String),
      completed_by: "user_viewer",
    });
    expect(result.error).toBeNull();
  });

  it("rejects editor completion of another member's assigned task", async () => {
    setTaskContext({
      role: HOUSEHOLD_ROLES.EDITOR,
      user: createTestUser({ id: "user_editor", email: "editor@example.test" }),
    });
    taskMocks.admin = createSupabaseMock({
      tasks: createSupabaseResponse({
        data: createTestTask({ id: "task_1", assigned_to: "user_other" }),
      }),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await completeTaskAction("task_1");

    expect(result).toEqual({
      data: null,
      error: "You do not have permission to complete this task.",
    });
  });

  it("generates the next occurrence when completing recurring tasks", async () => {
    taskMocks.admin = createSupabaseMock({
      tasks: [
        createSupabaseResponse({
          data: createTestTask({
            id: "task_1",
            due_date: "2026-08-18",
            is_recurring: true,
            recurrence_type: "weekly",
            recurrence_interval: 1,
          }),
        }),
        createSupabaseResponse({
          data: createTestTask({
            id: "task_1",
            status: "completed",
            due_date: "2026-08-18",
            is_recurring: true,
            recurrence_type: "weekly",
            recurrence_interval: 1,
          }),
        }),
        createSupabaseResponse({ data: null }),
        createSupabaseResponse({
          data: createTestTask({
            id: "task_2",
            due_date: "2026-08-25",
            recurring_parent_task_id: "task_1",
            is_recurring: true,
            recurrence_type: "weekly",
          }),
        }),
      ],
      activity_events: createSupabaseResponse(),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await completeTaskAction("task_1");
    const taskQueries = taskMocks.admin.__queryHistory.get("tasks");

    expect(taskQueries[3].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: "household_1",
        due_date: "2026-08-25",
        recurring_parent_task_id: "task_1",
        status: "todo",
      })
    );
    expect(result.error).toBeNull();
    expect(result.data.nextTask).toMatchObject({
      id: "task_2",
      dueDate: "2026-08-25",
      recurringParentTaskId: "task_1",
    });
  });

  it("deletes only tasks from the active household", async () => {
    taskMocks.admin = createSupabaseMock({
      tasks: createSupabaseResponse({ data: createTestTask({ id: "task_1" }) }),
      activity_events: createSupabaseResponse(),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await deleteTaskAction("task_1");

    const taskQueries = taskMocks.admin.__queryHistory.get("tasks");
    expect(taskQueries[0].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(taskQueries[1].delete).toHaveBeenCalled();
    expect(taskQueries[1].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(result).toEqual({
      data: { deletedId: "task_1" },
      error: null,
    });
    expect(taskMocks.admin.__queries.get("activity_events").insert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: "household_1",
        actor_user_id: "user_owner",
        actor_email: "owner@example.test",
        entity_type: "task",
        entity_id: "task_1",
        action: "deleted",
        name_at_event: "Take out trash",
        item_name: "Take out trash",
        changes: { deleted: true },
      })
    );
  });

  it("rejects cross-household task ids that do not resolve in the active household", async () => {
    taskMocks.admin = createSupabaseMock({
      tasks: createSupabaseResponse({ data: null }),
    });
    taskMocks.createAdminClient.mockReturnValue(taskMocks.admin);

    const result = await updateTaskAction("task_other", { title: "Nope" });

    const query = taskMocks.admin.__queries.get("tasks");
    expect(query.eq).toHaveBeenCalledWith("id", "task_other");
    expect(query.eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(result).toEqual({
      data: null,
      error: "Task not found for this household.",
    });
  });
});
