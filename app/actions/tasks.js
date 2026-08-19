"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/verifiedSession";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getHouseholdForUser,
  hasHouseholdInviteMetadata,
} from "@/utils/households";
import {
  TASK_STATUS,
  calculateNextTaskDueDate,
  canCompleteTask,
  canCreateTask,
  canDeleteTask,
  canEditTask,
  canReopenTask,
  normalizeTaskId,
  validateTaskPayload,
} from "@/utils/tasks";

function validationError(message) {
  return { data: null, error: message };
}

function taskPayloadFromData(data = {}) {
  const payload = {};

  if ("title" in data) payload.title = data.title;
  if ("description" in data) payload.description = data.description;
  if ("assignedTo" in data) payload.assigned_to = data.assignedTo;
  if ("locationId" in data) payload.location_id = data.locationId;
  if ("status" in data) payload.status = data.status;
  if ("priority" in data) payload.priority = data.priority;
  if ("dueDate" in data) payload.due_date = data.dueDate;
  if ("isRecurring" in data) payload.is_recurring = data.isRecurring;
  if ("recurrenceType" in data) payload.recurrence_type = data.recurrenceType;
  if ("recurrenceInterval" in data) {
    payload.recurrence_interval = data.recurrenceInterval;
  }

  return payload;
}

function mapTaskRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    householdId: row.household_id,
    title: row.title,
    description: row.description ?? null,
    assignedTo: row.assigned_to ?? null,
    createdBy: row.created_by ?? null,
    locationId: row.location_id ?? null,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? null,
    isRecurring: Boolean(row.is_recurring),
    recurrenceType: row.recurrence_type ?? null,
    recurrenceInterval: row.recurrence_interval ?? 1,
    recurringParentTaskId: row.recurring_parent_task_id ?? null,
    completedAt: row.completed_at ?? null,
    completedBy: row.completed_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function revalidateTaskPaths() {
  for (const path of ["/tasks", "/dashboard", "/activity"]) {
    revalidatePath(path);
  }
}

async function getTaskContext() {
  const { user, error } = await getVerifiedSession();

  if (error || !user?.id) {
    return {
      user: null,
      household: null,
      member: null,
      error: error || "Your session has expired. Please log in again.",
    };
  }

  const { household, member } = await getHouseholdForUser({
    userId: user.id,
    email: user.email,
    createIfMissing: !hasHouseholdInviteMetadata(user),
  });

  if (!household?.id || !member?.household_id) {
    return {
      user,
      household: null,
      member: null,
      error: "You are not a member of a household.",
    };
  }

  return { user, household, member, error: null };
}

async function validateAssignedMember(admin, householdId, assignedTo) {
  if (!assignedTo) return { data: null, error: null };

  const { data, error } = await admin
    .from("household_members")
    .select("user_id, email, role")
    .eq("household_id", householdId)
    .eq("user_id", assignedTo)
    .maybeSingle();

  if (error) return { data: null, error: error.message || "Could not validate assignee." };
  if (!data?.user_id) return { data: null, error: "Assignee must belong to your household." };

  return { data, error: null };
}

async function validateTaskLocation(admin, householdId, locationId) {
  if (!locationId) return { data: null, error: null };

  const { data, error } = await admin
    .from("locations")
    .select("id, name, household_id")
    .eq("id", locationId)
    .maybeSingle();

  if (error) return { data: null, error: error.message || "Could not validate location." };
  if (!data?.id || String(data.household_id) !== String(householdId)) {
    return { data: null, error: "Location must belong to your household." };
  }

  return { data, error: null };
}

async function getTaskForHousehold(admin, taskId, householdId) {
  if (!taskId || !householdId) return { data: null, error: "Task is required." };

  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("household_id", householdId)
    .maybeSingle();

  if (error) return { data: null, error: error.message || "Could not load task." };
  if (!data?.id) return { data: null, error: "Task not found for this household." };

  return { data, error: null };
}

async function recordTaskActivity({
  admin,
  household,
  user,
  task,
  action,
  changes = {},
}) {
  try {
    const { error } = await admin.from("activity_events").insert({
      household_id: household?.id ?? null,
      actor_user_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      entity_type: "task",
      entity_id: task?.id ?? null,
      action,
      name_at_event: task?.title ?? null,
      item_name: task?.title ?? null,
      location_name: changes.locationName ?? null,
      changes,
    });
    if (error) throw error;
  } catch (err) {
    console.error("recordTaskActivity error:", err);
  }
}

async function validateTaskRelations(admin, householdId, payload) {
  const assignedResult = await validateAssignedMember(
    admin,
    householdId,
    payload.assigned_to
  );
  if (assignedResult.error) return assignedResult.error;

  const locationResult = await validateTaskLocation(
    admin,
    householdId,
    payload.location_id
  );
  if (locationResult.error) return locationResult.error;

  return null;
}

export async function getTasksAction(filters = {}) {
  const context = await getTaskContext();
  if (context.error) {
    return { data: { items: [] }, error: context.error };
  }

  try {
    const admin = createAdminClient();
    let query = admin
      .from("tasks")
      .select("*")
      .eq("household_id", context.household.id)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    const status = normalizeTaskId(filters.status);
    const assignedTo = normalizeTaskId(filters.assignedTo ?? filters.assigned_to);
    const locationId = normalizeTaskId(filters.locationId ?? filters.location_id);

    if (status && status !== "all") query = query.eq("status", status);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    if (locationId) query = query.eq("location_id", locationId);

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: {
        items: (data ?? []).map(mapTaskRow),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { items: [] },
      error: err?.message || "Could not load tasks.",
    };
  }
}

export async function createTaskAction(values = {}) {
  const validation = validateTaskPayload(values);
  if (validation.error) return validationError(validation.error);

  const context = await getTaskContext();
  if (context.error) return validationError(context.error);
  if (!canCreateTask(context.member)) {
    return validationError("You do not have permission to create household tasks.");
  }

  const admin = createAdminClient();
  const payload = {
    ...taskPayloadFromData(validation.data),
    household_id: context.household.id,
    created_by: context.user.id,
  };

  const relationError = await validateTaskRelations(
    admin,
    context.household.id,
    payload
  );
  if (relationError) return validationError(relationError);

  try {
    const { data, error } = await admin
      .from("tasks")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    await recordTaskActivity({
      admin,
      household: context.household,
      user: context.user,
      task: data,
      action: "added",
      changes: {
        assigned_to: data.assigned_to ?? null,
        priority: data.priority,
        due_date: data.due_date ?? null,
        recurrence_type: data.recurrence_type ?? null,
      },
    });
    revalidateTaskPaths();

    return { data: mapTaskRow(data), error: null };
  } catch (err) {
    return validationError(err?.message || "Could not create task.");
  }
}

export async function updateTaskAction(taskId, values = {}) {
  const safeTaskId = normalizeTaskId(taskId);
  const validation = validateTaskPayload(values, {
    patch: true,
    requireTitle: false,
  });
  if (validation.error) return validationError(validation.error);

  const context = await getTaskContext();
  if (context.error) return validationError(context.error);
  if (!canEditTask(context.member)) {
    return validationError("You do not have permission to edit household tasks.");
  }

  const admin = createAdminClient();
  const existingResult = await getTaskForHousehold(
    admin,
    safeTaskId,
    context.household.id
  );
  if (existingResult.error) return validationError(existingResult.error);

  const payload = taskPayloadFromData(validation.data);
  if ("status" in payload && payload.status !== existingResult.data.status) {
    return validationError("Use the task completion controls to change completion state.");
  }

  if ("assigned_to" in payload) {
    const assignedResult = await validateAssignedMember(
      admin,
      context.household.id,
      payload.assigned_to
    );
    if (assignedResult.error) return validationError(assignedResult.error);
  }

  if ("location_id" in payload) {
    const locationResult = await validateTaskLocation(
      admin,
      context.household.id,
      payload.location_id
    );
    if (locationResult.error) return validationError(locationResult.error);
  }

  if (Object.keys(payload).length === 0) {
    return { data: mapTaskRow(existingResult.data), error: null };
  }

  try {
    const { data, error } = await admin
      .from("tasks")
      .update(payload)
      .eq("id", safeTaskId)
      .eq("household_id", context.household.id)
      .select("*")
      .single();

    if (error) throw error;

    await recordTaskActivity({
      admin,
      household: context.household,
      user: context.user,
      task: data,
      action: "updated",
      changes: payload,
    });
    revalidateTaskPaths();

    return { data: mapTaskRow(data), error: null };
  } catch (err) {
    return validationError(err?.message || "Could not update task.");
  }
}

async function createNextRecurringTask({ admin, householdId, task }) {
  if (!task?.is_recurring || !task.recurrence_type || !task.due_date) {
    return null;
  }

  const nextDueDate = calculateNextTaskDueDate(
    task.due_date,
    task.recurrence_type,
    task.recurrence_interval
  );
  if (!nextDueDate) return null;

  const parentTaskId = task.recurring_parent_task_id ?? task.id;
  const { data: existingNext } = await admin
    .from("tasks")
    .select("id")
    .eq("household_id", householdId)
    .eq("recurring_parent_task_id", parentTaskId)
    .eq("due_date", nextDueDate)
    .maybeSingle();

  if (existingNext?.id) return null;

  const { data, error } = await admin
    .from("tasks")
    .insert({
      household_id: task.household_id,
      title: task.title,
      description: task.description ?? null,
      assigned_to: task.assigned_to ?? null,
      created_by: task.created_by,
      location_id: task.location_id ?? null,
      status: TASK_STATUS.TODO,
      priority: task.priority,
      due_date: nextDueDate,
      is_recurring: true,
      recurrence_type: task.recurrence_type,
      recurrence_interval: task.recurrence_interval ?? 1,
      recurring_parent_task_id: parentTaskId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function completeTaskAction(taskId) {
  const safeTaskId = normalizeTaskId(taskId);
  const context = await getTaskContext();
  if (context.error) return validationError(context.error);

  const admin = createAdminClient();
  const existingResult = await getTaskForHousehold(
    admin,
    safeTaskId,
    context.household.id
  );
  if (existingResult.error) return validationError(existingResult.error);

  if (!canCompleteTask(context.member, context.user.id, existingResult.data)) {
    return validationError("You do not have permission to complete this task.");
  }

  if (existingResult.data.status === TASK_STATUS.COMPLETED) {
    return {
      data: { task: mapTaskRow(existingResult.data), nextTask: null },
      error: null,
    };
  }

  try {
    const completedAt = new Date().toISOString();
    const { data, error } = await admin
      .from("tasks")
      .update({
        status: TASK_STATUS.COMPLETED,
        completed_at: completedAt,
        completed_by: context.user.id,
      })
      .eq("id", safeTaskId)
      .eq("household_id", context.household.id)
      .select("*")
      .single();

    if (error) throw error;

    let nextTask = null;
    try {
      nextTask = await createNextRecurringTask({
        admin,
        householdId: context.household.id,
        task: data,
      });
    } catch (err) {
      console.error("createNextRecurringTask error:", err);
    }

    await recordTaskActivity({
      admin,
      household: context.household,
      user: context.user,
      task: data,
      action: "completed",
      changes: {
        completed_at: completedAt,
        next_due_date: nextTask?.due_date ?? null,
      },
    });
    revalidateTaskPaths();

    return {
      data: {
        task: mapTaskRow(data),
        nextTask: mapTaskRow(nextTask),
      },
      error: null,
    };
  } catch (err) {
    return validationError(err?.message || "Could not complete task.");
  }
}

export async function reopenTaskAction(taskId) {
  const safeTaskId = normalizeTaskId(taskId);
  const context = await getTaskContext();
  if (context.error) return validationError(context.error);

  const admin = createAdminClient();
  const existingResult = await getTaskForHousehold(
    admin,
    safeTaskId,
    context.household.id
  );
  if (existingResult.error) return validationError(existingResult.error);

  if (!canReopenTask(context.member, context.user.id, existingResult.data)) {
    return validationError("You do not have permission to reopen this task.");
  }

  try {
    const { data, error } = await admin
      .from("tasks")
      .update({
        status: TASK_STATUS.TODO,
        completed_at: null,
        completed_by: null,
      })
      .eq("id", safeTaskId)
      .eq("household_id", context.household.id)
      .select("*")
      .single();

    if (error) throw error;

    await recordTaskActivity({
      admin,
      household: context.household,
      user: context.user,
      task: data,
      action: "updated",
      changes: { status: TASK_STATUS.TODO, reopened: true },
    });
    revalidateTaskPaths();

    return { data: mapTaskRow(data), error: null };
  } catch (err) {
    return validationError(err?.message || "Could not reopen task.");
  }
}

export async function deleteTaskAction(taskId) {
  const safeTaskId = normalizeTaskId(taskId);
  const context = await getTaskContext();
  if (context.error) return validationError(context.error);
  if (!canDeleteTask(context.member)) {
    return validationError("You do not have permission to delete household tasks.");
  }

  const admin = createAdminClient();
  const existingResult = await getTaskForHousehold(
    admin,
    safeTaskId,
    context.household.id
  );
  if (existingResult.error) return validationError(existingResult.error);

  try {
    const { error } = await admin
      .from("tasks")
      .delete()
      .eq("id", safeTaskId)
      .eq("household_id", context.household.id);

    if (error) throw error;

    await recordTaskActivity({
      admin,
      household: context.household,
      user: context.user,
      task: existingResult.data,
      action: "deleted",
      changes: { deleted: true },
    });
    revalidateTaskPaths();

    return { data: { deletedId: safeTaskId }, error: null };
  } catch (err) {
    return validationError(err?.message || "Could not delete task.");
  }
}
