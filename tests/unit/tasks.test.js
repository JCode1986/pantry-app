import { describe, expect, it } from "vitest";
import { createTestMember, createTestTask } from "@/tests/helpers/factories";
import { HOUSEHOLD_ROLES } from "@/utils/householdRoles";
import {
  TASK_PRIORITY,
  TASK_STATUS,
  calculateNextTaskDueDate,
  canCompleteTask,
  canCreateTask,
  canDeleteTask,
  canEditTask,
  groupTasksByDate,
  isTaskDueToday,
  isTaskOverdue,
  isTaskUpcoming,
  sortTasks,
  summarizeTasks,
  validateTaskPayload,
} from "@/utils/tasks";

const TODAY = new Date("2026-08-17T15:30:00");

describe("task utilities", () => {
  it("groups tasks by overdue, today, upcoming, and completed", () => {
    const overdue = createTestTask({ id: "overdue", due_date: "2026-08-16" });
    const today = createTestTask({ id: "today", due_date: "2026-08-17" });
    const upcoming = createTestTask({ id: "upcoming", due_date: "2026-08-20" });
    const completed = createTestTask({
      id: "completed",
      status: TASK_STATUS.COMPLETED,
      due_date: "2026-08-15",
      completed_at: "2026-08-17T12:00:00.000Z",
    });

    expect(isTaskOverdue(overdue, TODAY)).toBe(true);
    expect(isTaskDueToday(today, TODAY)).toBe(true);
    expect(isTaskUpcoming(upcoming, TODAY, 7)).toBe(true);

    expect(groupTasksByDate([overdue, today, upcoming, completed], TODAY)).toEqual({
      overdue: [overdue],
      today: [today],
      upcoming: [upcoming],
      completed: [completed],
    });
  });

  it("summarizes active, due-today, upcoming, and completed-this-month tasks", () => {
    const tasks = [
      createTestTask({ id: "today", due_date: "2026-08-17" }),
      createTestTask({ id: "tomorrow", due_date: "2026-08-18" }),
      createTestTask({ id: "later", due_date: "2026-09-01" }),
      createTestTask({
        id: "completed",
        status: TASK_STATUS.COMPLETED,
        completed_at: "2026-08-10T00:00:00.000Z",
      }),
    ];

    expect(summarizeTasks(tasks, TODAY)).toEqual({
      active: 3,
      dueToday: 1,
      upcoming: 1,
      completedThisMonth: 1,
    });
  });

  it("sorts by priority and due date", () => {
    const low = createTestTask({ id: "low", title: "C", priority: TASK_PRIORITY.LOW });
    const high = createTestTask({ id: "high", title: "B", priority: TASK_PRIORITY.HIGH });
    const medium = createTestTask({
      id: "medium",
      title: "A",
      priority: TASK_PRIORITY.MEDIUM,
    });

    expect(sortTasks([low, high, medium], "priority").map((task) => task.id)).toEqual([
      "high",
      "medium",
      "low",
    ]);

    expect(
      sortTasks(
        [
          createTestTask({ id: "no_due", due_date: null }),
          createTestTask({ id: "soon", due_date: "2026-08-18" }),
          createTestTask({ id: "today", due_date: "2026-08-17" }),
        ],
        "due_date"
      ).map((task) => task.id)
    ).toEqual(["today", "soon", "no_due"]);
  });

  it("calculates recurring due dates with month and leap-year edges", () => {
    expect(calculateNextTaskDueDate("2026-08-17", "daily", 1)).toBe("2026-08-18");
    expect(calculateNextTaskDueDate("2026-08-17", "weekly", 2)).toBe("2026-08-31");
    expect(calculateNextTaskDueDate("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(calculateNextTaskDueDate("2024-01-31", "monthly", 1)).toBe("2024-02-29");
    expect(calculateNextTaskDueDate("2024-02-29", "yearly", 1)).toBe("2025-02-28");
  });

  it("validates task payloads and recurrence fields", () => {
    expect(validateTaskPayload({ title: "   " })).toEqual({
      data: null,
      error: "Task name is required.",
    });

    expect(
      validateTaskPayload({
        title: "  Clean kitchen  ",
        priority: "unknown",
        dueDate: "2026-08-17",
        isRecurring: true,
        recurrenceType: "weekly",
        recurrenceInterval: "2",
      })
    ).toEqual({
      data: {
        title: "Clean kitchen",
        description: null,
        assignedTo: null,
        locationId: null,
        status: "todo",
        priority: "medium",
        dueDate: "2026-08-17",
        isRecurring: true,
        recurrenceType: "weekly",
        recurrenceInterval: 2,
      },
      error: null,
    });
  });

  it("enforces task permissions by household role and assignment", () => {
    const owner = createTestMember({ role: HOUSEHOLD_ROLES.OWNER });
    const editor = createTestMember({ role: HOUSEHOLD_ROLES.EDITOR });
    const viewer = createTestMember({
      role: HOUSEHOLD_ROLES.VIEWER,
      user_id: "user_viewer",
    });
    const assignedTask = createTestTask({ assigned_to: "user_viewer" });
    const otherTask = createTestTask({ assigned_to: "user_other" });
    const unassignedTask = createTestTask({ assigned_to: null });

    expect(canCreateTask(owner)).toBe(true);
    expect(canEditTask(editor)).toBe(true);
    expect(canDeleteTask(editor)).toBe(true);
    expect(canCreateTask(viewer)).toBe(false);
    expect(canEditTask(viewer)).toBe(false);
    expect(canCompleteTask(viewer, "user_viewer", assignedTask)).toBe(true);
    expect(canCompleteTask(viewer, "user_viewer", unassignedTask)).toBe(true);
    expect(canCompleteTask(viewer, "user_viewer", otherTask)).toBe(false);
    expect(canCompleteTask(editor, "user_editor", otherTask)).toBe(false);
    expect(canCompleteTask(editor, "user_editor", unassignedTask)).toBe(true);
  });
});
