import { canEditHouseholdInventory } from "@/utils/householdRoles";
import { addDays, parsePantryDate, toDateString } from "@/utils/pantry/date";

export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const TASK_RECURRENCE = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

export const TASK_SORT = {
  DUE_DATE: "due_date",
  NEWEST: "newest",
  OLDEST: "oldest",
  PRIORITY: "priority",
  ALPHABETICAL: "alphabetical",
};

const VALID_STATUSES = new Set(Object.values(TASK_STATUS));
const VALID_PRIORITIES = new Set(Object.values(TASK_PRIORITY));
const VALID_RECURRENCES = new Set(Object.values(TASK_RECURRENCE));
const PRIORITY_WEIGHT = {
  [TASK_PRIORITY.HIGH]: 0,
  [TASK_PRIORITY.MEDIUM]: 1,
  [TASK_PRIORITY.LOW]: 2,
};

export function normalizeTaskTitle(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizeTaskDescription(value) {
  const description = typeof value === "string" ? value.trim() : "";
  return description || null;
}

export function normalizeTaskStatus(value, fallback = TASK_STATUS.TODO) {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  return VALID_STATUSES.has(status) ? status : fallback;
}

export function normalizeTaskPriority(value, fallback = TASK_PRIORITY.MEDIUM) {
  const priority = typeof value === "string" ? value.trim().toLowerCase() : "";
  return VALID_PRIORITIES.has(priority) ? priority : fallback;
}

export function normalizeTaskRecurrenceType(value) {
  const recurrence = typeof value === "string" ? value.trim().toLowerCase() : "";
  return VALID_RECURRENCES.has(recurrence) ? recurrence : null;
}

export function normalizeTaskRecurrenceInterval(value, fallback = 1) {
  const interval = Number.parseInt(String(value), 10);
  return Number.isFinite(interval) && interval >= 1 ? interval : fallback;
}

export function normalizeTaskDate(value) {
  const date = parsePantryDate(value);
  return date ? toDateString(date) : null;
}

export function normalizeTaskId(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

export function validateTaskPayload(values = {}, options = {}) {
  const requireTitle = options.requireTitle !== false;
  const patch = options.patch === true;
  const data = {};

  if (!patch || "title" in values) {
    const title = normalizeTaskTitle(values.title);
    if (requireTitle && !title) {
      return { data: null, error: "Task name is required." };
    }
    if (title) data.title = title;
  }

  if (!patch || "description" in values) {
    data.description = normalizeTaskDescription(values.description);
  }

  if (!patch || "assignedTo" in values || "assigned_to" in values) {
    data.assignedTo = normalizeTaskId(values.assignedTo ?? values.assigned_to);
  }

  if (!patch || "locationId" in values || "location_id" in values) {
    data.locationId = normalizeTaskId(values.locationId ?? values.location_id);
  }

  if (!patch || "status" in values) {
    data.status = normalizeTaskStatus(values.status);
  }

  if (!patch || "priority" in values) {
    data.priority = normalizeTaskPriority(values.priority);
  }

  if (!patch || "dueDate" in values || "due_date" in values) {
    const rawDueDate = values.dueDate ?? values.due_date;
    if (rawDueDate) {
      const dueDate = normalizeTaskDate(rawDueDate);
      if (!dueDate) return { data: null, error: "Enter a valid due date." };
      data.dueDate = dueDate;
    } else {
      data.dueDate = null;
    }
  }

  if (
    !patch ||
    "isRecurring" in values ||
    "is_recurring" in values ||
    "recurrenceType" in values ||
    "recurrence_type" in values ||
    "recurrenceInterval" in values ||
    "recurrence_interval" in values
  ) {
    const isRecurring = Boolean(values.isRecurring ?? values.is_recurring);
    const recurrenceType = normalizeTaskRecurrenceType(
      values.recurrenceType ?? values.recurrence_type
    );
    const recurrenceInterval = normalizeTaskRecurrenceInterval(
      values.recurrenceInterval ?? values.recurrence_interval,
      1
    );

    if (isRecurring && !recurrenceType) {
      return { data: null, error: "Choose how often this task repeats." };
    }

    data.isRecurring = isRecurring;
    data.recurrenceType = isRecurring ? recurrenceType : null;
    data.recurrenceInterval = isRecurring ? recurrenceInterval : 1;
  }

  return { data, error: null };
}

export function canViewTasks(member) {
  return Boolean(member?.household_id || member?.householdId);
}

export function canCreateTask(member) {
  return canEditHouseholdInventory(member);
}

export function canEditTask(member) {
  return canEditHouseholdInventory(member);
}

export function canDeleteTask(member) {
  return canEditHouseholdInventory(member);
}

export function isTaskAssignedToUser(task, userId) {
  const assignedTo = task?.assigned_to ?? task?.assignedTo;
  return Boolean(assignedTo && userId && String(assignedTo) === String(userId));
}

export function isTaskUnassigned(task) {
  const assignedTo = task?.assigned_to ?? task?.assignedTo;
  return !assignedTo;
}

export function canCompleteTask(member, userId, task) {
  if (!canViewTasks(member) || !userId) return false;
  return isTaskUnassigned(task) || isTaskAssignedToUser(task, userId);
}

export function canReopenTask(member, userId, task) {
  return canCompleteTask(member, userId, task);
}

export function isTaskCompleted(task) {
  return normalizeTaskStatus(task?.status) === TASK_STATUS.COMPLETED;
}

function startOfLocalDay(value) {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function compareDateOnly(left, right) {
  const leftDate = parsePantryDate(left);
  const rightDate = startOfLocalDay(right);
  if (!leftDate) return null;
  leftDate.setHours(0, 0, 0, 0);
  return leftDate.getTime() - rightDate.getTime();
}

export function isTaskOverdue(task, today = new Date()) {
  if (isTaskCompleted(task)) return false;
  const diff = compareDateOnly(task?.due_date ?? task?.dueDate, today);
  return diff !== null && diff < 0;
}

export function isTaskDueToday(task, today = new Date()) {
  if (isTaskCompleted(task)) return false;
  const diff = compareDateOnly(task?.due_date ?? task?.dueDate, today);
  return diff === 0;
}

export function isTaskUpcoming(task, today = new Date(), days = 7) {
  if (isTaskCompleted(task)) return false;
  const dueDate = task?.due_date ?? task?.dueDate;
  if (!dueDate) return false;
  const diff = compareDateOnly(dueDate, today);
  if (diff === null || diff <= 0) return false;
  const maxDiff = addDays(startOfLocalDay(today), days).getTime() - startOfLocalDay(today).getTime();
  return diff <= maxDiff;
}

export function getTaskDateSection(task, today = new Date()) {
  if (isTaskCompleted(task)) return "completed";
  if (isTaskOverdue(task, today)) return "overdue";
  if (isTaskDueToday(task, today)) return "today";
  return "upcoming";
}

export function groupTasksByDate(tasks = [], today = new Date()) {
  return (tasks ?? []).reduce(
    (groups, task) => {
      groups[getTaskDateSection(task, today)].push(task);
      return groups;
    },
    { overdue: [], today: [], upcoming: [], completed: [] }
  );
}

export function summarizeTasks(tasks = [], today = new Date()) {
  const startOfMonth = new Date(today);
  startOfMonth.setHours(0, 0, 0, 0);
  startOfMonth.setDate(1);
  const nextMonth = new Date(startOfMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return (tasks ?? []).reduce(
    (summary, task) => {
      if (!isTaskCompleted(task)) summary.active += 1;
      if (isTaskDueToday(task, today)) summary.dueToday += 1;
      if (isTaskUpcoming(task, today, 7)) summary.upcoming += 1;

      const completedAt = task.completed_at ?? task.completedAt;
      const completedDate = completedAt ? new Date(completedAt) : null;
      if (
        isTaskCompleted(task) &&
        completedDate &&
        completedDate >= startOfMonth &&
        completedDate < nextMonth
      ) {
        summary.completedThisMonth += 1;
      }

      return summary;
    },
    { active: 0, dueToday: 0, upcoming: 0, completedThisMonth: 0 }
  );
}

export function sortTasks(tasks = [], sortBy = TASK_SORT.DUE_DATE) {
  const safeSort = Object.values(TASK_SORT).includes(sortBy)
    ? sortBy
    : TASK_SORT.DUE_DATE;

  return [...(tasks ?? [])].sort((left, right) => {
    if (safeSort === TASK_SORT.NEWEST || safeSort === TASK_SORT.OLDEST) {
      const leftTime = new Date(left.created_at ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.created_at ?? right.createdAt ?? 0).getTime();
      return safeSort === TASK_SORT.NEWEST ? rightTime - leftTime : leftTime - rightTime;
    }

    if (safeSort === TASK_SORT.PRIORITY) {
      const leftPriority = PRIORITY_WEIGHT[normalizeTaskPriority(left.priority)];
      const rightPriority = PRIORITY_WEIGHT[normalizeTaskPriority(right.priority)];
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    }

    if (safeSort === TASK_SORT.ALPHABETICAL) {
      return String(left.title || "").localeCompare(String(right.title || ""));
    }

    const leftDue = parsePantryDate(left.due_date ?? left.dueDate);
    const rightDue = parsePantryDate(right.due_date ?? right.dueDate);
    if (leftDue && rightDue && leftDue.getTime() !== rightDue.getTime()) {
      return leftDue.getTime() - rightDue.getTime();
    }
    if (leftDue && !rightDue) return -1;
    if (!leftDue && rightDue) return 1;

    return String(left.title || "").localeCompare(String(right.title || ""));
  });
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsClamped(date, months) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const target = new Date(year, month + months, 1);
  target.setDate(Math.min(day, lastDayOfMonth(target.getFullYear(), target.getMonth())));
  return target;
}

export function calculateNextTaskDueDate(dueDate, recurrenceType, interval = 1) {
  const date = parsePantryDate(dueDate);
  const type = normalizeTaskRecurrenceType(recurrenceType);
  const safeInterval = normalizeTaskRecurrenceInterval(interval);
  if (!date || !type) return null;

  if (type === TASK_RECURRENCE.DAILY) {
    return toDateString(addDays(date, safeInterval));
  }

  if (type === TASK_RECURRENCE.WEEKLY) {
    return toDateString(addDays(date, safeInterval * 7));
  }

  if (type === TASK_RECURRENCE.MONTHLY) {
    return toDateString(addMonthsClamped(date, safeInterval));
  }

  if (type === TASK_RECURRENCE.YEARLY) {
    return toDateString(addMonthsClamped(date, safeInterval * 12));
  }

  return null;
}
