"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LuCalendarClock,
  LuCircleCheck,
  LuCircleUser,
  LuClipboardCheck,
  LuClock3,
  LuFilter,
  LuFlag,
  LuMapPin,
  LuPlus,
  LuRepeat2,
} from "react-icons/lu";
import {
  completeTaskAction,
  createTaskAction,
  deleteTaskAction,
  reopenTaskAction,
  updateTaskAction,
} from "@/app/actions/tasks";
import NativeButton from "@/components/ui/NativeButton";
import NativeDatePicker from "@/components/ui/NativeDatePicker";
import NativeDropdown from "@/components/ui/NativeDropdown";
import NativeInput from "@/components/ui/NativeInput";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import { cx } from "@/components/ui/classNames";
import { emitInventoryChange } from "@/utils/clientEvents";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import {
  modalBodyClass,
  modalContentStyle,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import NativeSelect from "@/components/ui/NativeSelect";
import {
  TASK_PRIORITY,
  TASK_RECURRENCE,
  TASK_SORT,
  TASK_STATUS,
  canCreateTask,
  canDeleteTask,
  canEditTask,
  canCompleteTask,
  groupTasksByDate,
  isTaskDueToday,
  isTaskOverdue,
  isTaskUpcoming,
  sortTasks,
  summarizeTasks,
} from "@/utils/tasks";
import { parsePantryDate } from "@/utils/pantry/date";

const TABS = [
  { value: "all", label: "All", mobileLabel: "All" },
  { value: "assigned", label: "Assigned to Me", mobileLabel: "Mine" },
  { value: "created", label: "Created by Me", hideOnMobile: true },
  { value: "unassigned", label: "Unassigned", hideOnMobile: true },
  { value: "due_today", label: "Due Today", mobileLabel: "Due Today", mobileOnly: true },
  { value: "completed", label: "Completed", mobileLabel: "Completed" },
];

const MOBILE_TAB_OPTIONS = TABS.map((tab) => ({
  value: tab.value,
  label: tab.mobileLabel ?? tab.label,
}));

const PRIORITY_OPTIONS = [
  { value: TASK_PRIORITY.LOW, label: "Low" },
  { value: TASK_PRIORITY.MEDIUM, label: "Medium" },
  { value: TASK_PRIORITY.HIGH, label: "High" },
];

const SORT_OPTIONS = [
  { value: TASK_SORT.DUE_DATE, label: "Due date" },
  { value: TASK_SORT.NEWEST, label: "Newest" },
  { value: TASK_SORT.OLDEST, label: "Oldest" },
  { value: TASK_SORT.PRIORITY, label: "Priority" },
  { value: TASK_SORT.ALPHABETICAL, label: "Alphabetical" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  { value: TASK_STATUS.TODO, label: "To do" },
  { value: TASK_STATUS.IN_PROGRESS, label: "In progress" },
  { value: TASK_STATUS.COMPLETED, label: "Completed" },
];

const DUE_DATE_FILTER_OPTIONS = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No due date" },
];

const RECURRING_FILTER_OPTIONS = [
  { value: "all", label: "Any repeat" },
  { value: "recurring", label: "Recurring only" },
  { value: "one_time", label: "One-time only" },
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "Does not repeat" },
  { value: TASK_RECURRENCE.DAILY, label: "Daily" },
  { value: TASK_RECURRENCE.WEEKLY, label: "Weekly" },
  { value: TASK_RECURRENCE.MONTHLY, label: "Monthly" },
  { value: TASK_RECURRENCE.YEARLY, label: "Yearly" },
];

const SECTION_LABELS = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  completed: "Completed",
};

function memberLabel(member) {
  if (!member) return "Unassigned";
  const displayName =
    member.displayName ||
    member.display_name ||
    member.preferredName ||
    member.preferred_name ||
    member.name ||
    "";
  return (
    String(displayName || "").trim() ||
    member.email ||
    `User ${String(member.user_id || member.userId).slice(0, 8)}`
  );
}

function initialsForMember(member) {
  const label = memberLabel(member);
  return label
    .split("@")[0]
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function formatDate(value) {
  const date = parsePantryDate(value);
  if (!date) return "No due date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function priorityClass(priority) {
  if (priority === TASK_PRIORITY.HIGH) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (priority === TASK_PRIORITY.LOW) {
    return "border-gray-200 bg-gray-50 text-gray-600";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function priorityAccentClass(priority) {
  if (priority === TASK_PRIORITY.HIGH) return "bg-rose-400";
  if (priority === TASK_PRIORITY.LOW) return "bg-gray-300";
  return "bg-amber-400";
}

function priorityText(priority) {
  if (priority === TASK_PRIORITY.HIGH) return "High";
  if (priority === TASK_PRIORITY.LOW) return "Low";
  return "Medium";
}

function dueDateClass(task) {
  if (task.status === TASK_STATUS.COMPLETED) return "text-gray-500";
  if (isTaskOverdue(task)) return "text-rose-700";
  if (isTaskDueToday(task)) return "text-amber-700";
  return "text-gray-500";
}

function taskFormFromTask(task = null) {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    assignedTo: task?.assignedTo ?? "",
    locationId: task?.locationId ?? "",
    dueDate: task?.dueDate ?? "",
    priority: task?.priority ?? TASK_PRIORITY.MEDIUM,
    recurrenceType: task?.recurrenceType ?? "",
    recurrenceInterval: String(task?.recurrenceInterval ?? 1),
  };
}

function upsertTask(tasks, task) {
  if (!task?.id) return tasks;
  const found = tasks.some((item) => item.id === task.id);
  if (!found) return [task, ...tasks];
  return tasks.map((item) => (item.id === task.id ? task : item));
}

function SummaryCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function TaskToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;

    const timeout = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-[90] w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg"
    >
      {message.text}
    </div>
  );
}

function TaskAvatar({ member }) {
  const label = memberLabel(member);

  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-xs font-bold text-[var(--stocksense-brand)]"
      title={label}
    >
      {initialsForMember(member)}
    </span>
  );
}

function TaskAssignee({ member }) {
  const label = memberLabel(member);

  return (
    <span className="flex min-w-0 max-w-36 items-center gap-2 sm:max-w-40" title={label}>
      <TaskAvatar member={member} />
      <span className="min-w-0 truncate text-xs font-semibold text-gray-600">
        {label}
      </span>
    </span>
  );
}

function TaskRow({
  task,
  assignee,
  completedBy,
  location,
  canEdit,
  canDelete,
  canToggle,
  isPending,
  onToggle,
  onEdit,
  onDelete,
}) {
  const completed = task.status === TASK_STATUS.COMPLETED;
  const canOpenEditor = canEdit && !completed;
  const DetailContainer = canOpenEditor ? "button" : "div";
  const completedText =
    completed && task.completedAt
      ? `Completed ${formatDate(task.completedAt)}${
          completedBy ? ` by ${memberLabel(completedBy)}` : ""
        }`
      : formatDate(task.dueDate);
  const menuItems = [
    canEdit && !completed ? { key: "edit", label: "Edit", onSelect: onEdit } : null,
    canToggle
      ? {
          key: "toggle",
          label: completed ? "Reopen" : "Mark complete",
          onSelect: onToggle,
        }
      : null,
    canDelete
      ? {
          key: "delete",
          label: "Delete",
          danger: true,
          onSelect: onDelete,
        }
      : null,
  ].filter(Boolean);
  const hasActionsMenu = canEdit || canDelete;

  return (
    <article
      className={cx(
        "relative overflow-hidden rounded-2xl border bg-white p-3 shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:shadow-md sm:p-4",
        hasActionsMenu ? "pr-12 sm:pr-14" : "pr-3 sm:pr-4",
        completed ? "border-gray-100 opacity-85" : "border-gray-200/80"
      )}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${priorityAccentClass(task.priority)}`}
      />
      {hasActionsMenu ? (
        <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
          <NativeDropdown
            ariaLabel={`${task.title} actions`}
            disabled={isPending}
            items={menuItems}
          />
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 pl-2">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
          <button
            type="button"
            aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`}
            aria-pressed={completed}
            disabled={!canToggle || isPending}
            onClick={onToggle}
            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
              completed
                ? "border-[var(--stocksense-brand)] bg-[var(--stocksense-brand)] text-white"
                : "border-gray-300 bg-white text-transparent hover:border-[var(--stocksense-brand)]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <LuCircleCheck className="h-4 w-4" />
          </button>

          <DetailContainer
            {...(canOpenEditor ? { type: "button" } : {})}
            onClick={canOpenEditor ? onEdit : undefined}
            className="min-w-0 text-left"
            aria-label={canOpenEditor ? `Edit ${task.title}` : undefined}
          >
            <div className="flex min-w-0 items-start gap-2">
              <h3
                className={`min-w-0 truncate text-sm font-semibold leading-6 text-gray-950 sm:text-base ${
                  completed ? "text-gray-500 line-through decoration-gray-400" : ""
                }`}
                title={task.title}
              >
                {task.title}
              </h3>
              {task.isRecurring ? (
                <span
                  className="mt-1 inline-flex shrink-0 items-center rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-1.5 py-0.5 text-[var(--stocksense-brand)]"
                  title="Repeating task"
                >
                  <LuRepeat2 className="h-3 w-3" />
                </span>
              ) : null}
            </div>
            {task.description ? (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-500">
                {task.description}
              </p>
            ) : null}
            <div className="mt-3 grid min-w-0 gap-1.5 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1.5">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-gray-500">
                <LuMapPin className="h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" />
                <span className="min-w-0 truncate">{location?.name ?? "No location"}</span>
              </span>
              <span className={`inline-flex min-w-0 items-center gap-1.5 font-medium ${dueDateClass(task)}`}>
                <LuClock3 className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  {completed ? completedText : `Due: ${completedText}`}
                </span>
              </span>
            </div>
          </DetailContainer>
        </div>

        <div className="flex min-w-0 items-center gap-3 border-t border-gray-100 pt-3">
          <TaskAssignee member={assignee} />
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-gray-200" />
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold ${priorityClass(
              task.priority
            )}`}
          >
            <LuFlag className="h-3.5 w-3.5" />
            {priorityText(task.priority)}
          </span>
        </div>
      </div>
    </article>
  );
}

function TaskEditorModal({
  isOpen,
  mode,
  form,
  setForm,
  members,
  locations,
  isSaving,
  error,
  onClose,
  onSave,
}) {
  const memberOptions = [
    { value: "", label: "Unassigned" },
    ...members.map((member) => ({
      value: member.user_id,
      label: memberLabel(member),
      startContent: <TaskAvatar member={member} />,
    })),
  ];
  const locationOptions = [
    { value: "", label: "No location" },
    ...locations.map((location) => ({ value: location.id, label: location.name })),
  ];
  const repeats = Boolean(form.recurrenceType);

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="2xl"
      classNames={mobileSheetModalClassNames}
    >
      <ModalContent
        style={modalContentStyle}
        className="wherekeep-modal-content flex w-full max-h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none"
      >
        <ModalHeader
          className="flex items-center gap-3 border-b border-gray-100 max-md:sticky max-md:top-0 max-md:z-20 max-md:shrink-0 max-md:border-[var(--stocksense-brand-border)] max-md:bg-[var(--stocksense-brand-soft)] max-md:px-4 max-md:pb-3 max-md:pt-[max(1rem,calc(env(safe-area-inset-top)+0.75rem))] max-md:text-[var(--stocksense-brand)]"
        >
          <span className="inline-flex min-w-0 flex-1 items-center gap-2">
            <LuClipboardCheck className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
            <span className="min-w-0 whitespace-normal break-words text-lg font-semibold leading-6 text-gray-950 max-md:text-base max-md:leading-5 max-md:text-[var(--stocksense-brand)]">
              {mode === "edit" ? "Edit task" : "New task"}
            </span>
          </span>
          <NativeButton
            size="sm"
            className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
            onPress={onSave}
            isLoading={isSaving}
            isDisabled={!form.title.trim()}
          >
            {mode === "edit" ? "Save" : "Create"}
          </NativeButton>
          <MobileSheetCloseButton onPress={onClose} />
        </ModalHeader>
        <ModalBody className={`grid gap-3 overflow-y-auto pt-5 ${modalBodyClass}`}>
          <NativeInput
            label="Task name"
            value={form.title}
            onValueChange={(value) => setValue("title", value)}
            disabled={isSaving}
            classNames={modalInputClassNames}
          />
          <label className="group block rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]">
            <span className="block truncate text-[11px] font-semibold leading-4 text-gray-500 transition duration-200 ease-out group-focus-within:text-[var(--stocksense-brand)] motion-reduce:transition-none">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) => setValue("description", event.target.value)}
              disabled={isSaving}
              rows={3}
              className="mt-0.5 block w-full resize-none bg-transparent text-sm font-medium leading-5 text-gray-900 outline-none disabled:text-gray-400"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <NativeSelect
              aria-label="Assign task"
              label="Assign to"
              value={form.assignedTo}
              onChange={(value) => setValue("assignedTo", value)}
              options={memberOptions}
              disabled={isSaving}
            />
            <NativeSelect
              aria-label="Task location"
              label="Location"
              value={form.locationId}
              onChange={(value) => setValue("locationId", value)}
              options={locationOptions}
              disabled={isSaving}
            />
            <NativeDatePicker
              label="Due date"
              value={form.dueDate}
              onChange={(value) => setValue("dueDate", value?.toString?.() ?? "")}
              disabled={isSaving}
            />
            <NativeSelect
              aria-label="Task priority"
              label="Priority"
              value={form.priority}
              onChange={(value) => setValue("priority", value)}
              options={PRIORITY_OPTIONS}
              disabled={isSaving}
            />
            <NativeSelect
              aria-label="Repeat task"
              label="Repeat"
              value={form.recurrenceType}
              onChange={(value) => setValue("recurrenceType", value)}
              options={RECURRENCE_OPTIONS}
              disabled={isSaving}
            />
            {repeats ? (
              <NativeInput
                label="Every"
                type="number"
                min="1"
                value={form.recurrenceInterval}
                onValueChange={(value) => setValue("recurrenceInterval", value)}
                disabled={isSaving}
                classNames={modalInputClassNames}
              />
            ) : null}
          </div>
          {error ? (
            <p
              role="alert"
              className="w-fit max-w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter className="hidden justify-end gap-2 border-t border-gray-100 md:flex">
          <NativeButton variant="light" onPress={onClose} isDisabled={isSaving}>
            Cancel
          </NativeButton>
          <NativeButton
            className="bg-[var(--stocksense-brand)] text-white"
            onPress={onSave}
            isLoading={isSaving}
            isDisabled={!form.title.trim()}
          >
            {mode === "edit" ? "Save changes" : "Create task"}
          </NativeButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function TasksPageClient({
  initialTasks = [],
  initialError = null,
  members = [],
  locations = [],
  currentUserId = null,
  currentUserRole = "viewer",
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [recurringFilter, setRecurringFilter] = useState("all");
  const [sortBy, setSortBy] = useState(TASK_SORT.DUE_DATE);
  const [showFilters, setShowFilters] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [toastMessage, setToastMessage] = useState(null);
  const [pendingTaskId, setPendingTaskId] = useState(null);
  const [editor, setEditor] = useState({
    open: false,
    mode: "create",
    task: null,
  });
  const [form, setForm] = useState(taskFormFromTask());
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const memberById = useMemo(
    () => new Map(members.map((member) => [String(member.user_id), member])),
    [members]
  );
  const locationById = useMemo(
    () => new Map(locations.map((location) => [String(location.id), location])),
    [locations]
  );
  const currentMemberRecord = memberById.get(String(currentUserId));
  const currentMember = {
    ...(currentMemberRecord ?? {}),
    role: currentMemberRecord?.role ?? currentUserRole,
    household_id:
      currentMemberRecord?.household_id ??
      currentMemberRecord?.householdId ??
      "current",
  };
  const canCreate = canCreateTask(currentMember);
  const assigneeOptions = [
    { value: "all", label: "Any assignee" },
    { value: "unassigned", label: "Unassigned" },
    ...members.map((member) => ({
      value: member.user_id,
      label: memberLabel(member),
    })),
  ];
  const locationOptions = [
    { value: "all", label: "Any location" },
    { value: "none", label: "No location" },
    ...locations.map((location) => ({ value: location.id, label: location.name })),
  ];
  const activeFilterCount = [
    statusFilter !== "all",
    assigneeFilter !== "all",
    priorityFilter !== "all",
    locationFilter !== "all",
    dueDateFilter !== "all",
    recurringFilter !== "all",
  ].filter(Boolean).length;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const assignedTo = task.assignedTo ? String(task.assignedTo) : "";
      const createdBy = task.createdBy ? String(task.createdBy) : "";
      const locationId = task.locationId ? String(task.locationId) : "";
      const currentUserKey = currentUserId ? String(currentUserId) : "";

      if (activeTab === "assigned" && assignedTo !== currentUserKey) return false;
      if (activeTab === "created" && createdBy !== currentUserKey) return false;
      if (activeTab === "unassigned" && task.assignedTo) return false;
      if (activeTab === "due_today" && !isTaskDueToday(task)) return false;
      if (activeTab === "completed" && task.status !== TASK_STATUS.COMPLETED) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (locationFilter === "none" && task.locationId) return false;
      if (
        locationFilter !== "all" &&
        locationFilter !== "none" &&
        locationId !== String(locationFilter)
      ) {
        return false;
      }
      if (dueDateFilter === "overdue" && !isTaskOverdue(task)) return false;
      if (dueDateFilter === "today" && !isTaskDueToday(task)) return false;
      if (dueDateFilter === "upcoming" && !isTaskUpcoming(task)) return false;
      if (dueDateFilter === "none" && task.dueDate) return false;
      if (recurringFilter === "recurring" && !task.isRecurring) return false;
      if (recurringFilter === "one_time" && task.isRecurring) return false;
      if (assigneeFilter === "unassigned" && task.assignedTo) return false;
      if (
        assigneeFilter !== "all" &&
        assigneeFilter !== "unassigned" &&
        assignedTo !== String(assigneeFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [
    activeTab,
    assigneeFilter,
    currentUserId,
    dueDateFilter,
    locationFilter,
    priorityFilter,
    recurringFilter,
    statusFilter,
    tasks,
  ]);
  const summary = useMemo(() => summarizeTasks(tasks), [tasks]);
  const groupedTasks = useMemo(
    () => groupTasksByDate(sortTasks(filteredTasks, sortBy)),
    [filteredTasks, sortBy]
  );

  function showSuccessToast(text) {
    setErrorMessage(null);
    setToastMessage({ id: Date.now(), text });
  }

  function openCreate() {
    setForm(taskFormFromTask());
    setFormError(null);
    setEditor({ open: true, mode: "create", task: null });
  }

  function openEdit(task) {
    setForm(taskFormFromTask(task));
    setFormError(null);
    setEditor({ open: true, mode: "edit", task });
  }

  function closeEditor() {
    if (isSaving) return;
    setEditor({ open: false, mode: "create", task: null });
    setFormError(null);
  }

  async function saveTask() {
    if (isSaving) return;

    setIsSaving(true);
    setFormError(null);

    const payload = {
      ...form,
      isRecurring: Boolean(form.recurrenceType),
      recurrenceInterval: form.recurrenceInterval || 1,
    };
    const result =
      editor.mode === "edit"
        ? await updateTaskAction(editor.task.id, payload)
        : await createTaskAction(payload);

    setIsSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setTasks((current) => upsertTask(current, result.data));
    emitInventoryChange({
      entity: "task",
      action: editor.mode === "edit" ? "updated" : "added",
      task: result.data,
    });
    showSuccessToast(editor.mode === "edit" ? "Task updated." : "Task created.");
    closeEditor();
  }

  async function toggleTask(task) {
    if (pendingTaskId) return;
    setPendingTaskId(task.id);
    setErrorMessage(null);

    const result =
      task.status === TASK_STATUS.COMPLETED
        ? await reopenTaskAction(task.id)
        : await completeTaskAction(task.id);

    setPendingTaskId(null);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    const updatedTask = result.data?.task ?? result.data;
    setTasks((current) => {
      let next = upsertTask(current, updatedTask);
      if (result.data?.nextTask) next = upsertTask(next, result.data.nextTask);
      return next;
    });
    emitInventoryChange({
      entity: "task",
      action: updatedTask.status === TASK_STATUS.COMPLETED ? "completed" : "reopened",
      task: updatedTask,
      nextTask: result.data?.nextTask ?? null,
    });
    showSuccessToast(
      updatedTask.status === TASK_STATUS.COMPLETED
        ? "Task completed."
        : "Task reopened."
    );
  }

  async function deleteTask(task) {
    setPendingTaskId(task.id);
    setErrorMessage(null);
    const result = await deleteTaskAction(task.id);
    setPendingTaskId(null);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== task.id));
    setDeleteCandidate(null);
    emitInventoryChange({ entity: "task", action: "deleted", task });
    showSuccessToast("Task deleted.");
  }

  const hasTasks = filteredTasks.length > 0;

  return (
    <div className="space-y-4 text-gray-700 sm:space-y-5">
      <header className="flex items-center justify-between gap-3 sm:flex-wrap sm:items-start sm:gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            Tasks
          </h1>
          <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-gray-600 sm:block">
            Keep your home running smoothly. Assign chores and stay on top of what matters.
          </p>
        </div>
        {canCreate ? (
          <NativeButton
            onPress={openCreate}
            aria-label="New task"
            className="max-sm:h-10 max-sm:w-10 max-sm:min-w-10 max-sm:rounded-full max-sm:p-0"
            startContent={
              <>
                <LuPlus className="h-4 w-4 sm:hidden" />
                <LuClipboardCheck className="hidden h-4 w-4 sm:block" />
              </>
            }
          >
            <span className="max-sm:sr-only">New Task</span>
          </NativeButton>
        ) : null}
      </header>

      <section className="hidden gap-4 sm:grid md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={LuClipboardCheck}
          label="All Tasks"
          value={summary.active}
          detail="Active household tasks"
        />
        <SummaryCard
          icon={LuClock3}
          label="Due Today"
          value={summary.dueToday}
          detail="Open tasks due today"
        />
        <SummaryCard
          icon={LuCalendarClock}
          label="Upcoming"
          value={summary.upcoming}
          detail="Due in the next 7 days"
        />
        <SummaryCard
          icon={LuCircleCheck}
          label="Completed"
          value={summary.completedThisMonth}
          detail="Finished this month"
        />
      </section>

      <section className="rounded-2xl border border-white/70 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pb-1">
            <NativeSelect
              aria-label="Task view"
              className="sm:hidden"
              value={activeTab}
              onChange={setActiveTab}
              options={MOBILE_TAB_OPTIONS}
            />
            <div className="hidden min-w-0 flex-wrap gap-2 sm:flex">
              {TABS.filter((tab) => !tab.mobileOnly).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cx(
                    "inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl px-3 text-center text-sm font-semibold transition",
                    activeTab === tab.value
                      ? "bg-[var(--stocksense-brand)] text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            aria-expanded={showFilters}
            aria-controls="task-filters-panel"
            className={cx(
              "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
              showFilters || activeFilterCount > 0
                ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <LuFilter className="h-4 w-4" />
            <span>Filter</span>
            {activeFilterCount > 0 ? (
              <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--stocksense-brand)] px-1 text-[10px] font-bold leading-none text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {showFilters ? (
          <div
            id="task-filters-panel"
            className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3"
          >
            <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-7">
              <NativeSelect
                aria-label="Filter by assignee"
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                options={assigneeOptions}
              />
              <NativeSelect
                aria-label="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
              />
              <NativeSelect
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[{ value: "all", label: "Any priority" }, ...PRIORITY_OPTIONS]}
              />
              <NativeSelect
                aria-label="Filter by location"
                value={locationFilter}
                onChange={setLocationFilter}
                options={locationOptions}
              />
              <NativeSelect
                aria-label="Filter by due date"
                value={dueDateFilter}
                onChange={setDueDateFilter}
                options={DUE_DATE_FILTER_OPTIONS}
              />
              <NativeSelect
                aria-label="Filter by recurring tasks"
                value={recurringFilter}
                onChange={setRecurringFilter}
                options={RECURRING_FILTER_OPTIONS}
              />
              <NativeSelect
                aria-label="Sort tasks"
                value={sortBy}
                onChange={setSortBy}
                options={SORT_OPTIONS}
              />
            </div>
          </div>
        ) : null}
      </section>

      {errorMessage ? (
        <p
          role="alert"
          className="w-fit max-w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {errorMessage}
        </p>
      ) : null}

      <section className="space-y-5">
        {Object.entries(groupedTasks).map(([section, sectionTasks]) =>
          sectionTasks.length ? (
            <div key={section} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-400">
                {SECTION_LABELS[section]}
              </h2>
              <div className="grid gap-3">
                {sectionTasks.map((task) => {
                  const assignee = task.assignedTo
                    ? memberById.get(String(task.assignedTo))
                    : null;
                  const completedBy = task.completedBy
                    ? memberById.get(String(task.completedBy))
                    : null;
                  const location = task.locationId
                    ? locationById.get(String(task.locationId))
                    : null;
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      assignee={assignee}
                      completedBy={completedBy}
                      location={location}
                      canEdit={canEditTask(currentMember)}
                      canDelete={canDeleteTask(currentMember)}
                      canToggle={canCompleteTask(currentMember, currentUserId, {
                        assigned_to: task.assignedTo,
                      })}
                      isPending={pendingTaskId === task.id}
                      onToggle={() => toggleTask(task)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => setDeleteCandidate(task)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null
        )}

        {!hasTasks ? (
          <div className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
              {activeTab === "assigned" ? (
                <LuCircleUser className="h-6 w-6" />
              ) : (
                <LuClipboardCheck className="h-6 w-6" />
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              {activeTab === "assigned" ? "Nothing assigned to you" : "No tasks yet"}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
              {activeTab === "assigned"
                ? "You're all caught up."
                : "Create a household task or chore to keep everyone on track."}
            </p>
            {canCreate && activeTab !== "assigned" ? (
              <NativeButton className="mt-5" onPress={openCreate}>
                Create Task
              </NativeButton>
            ) : null}
          </div>
        ) : null}
      </section>

      <TaskEditorModal
        isOpen={editor.open}
        mode={editor.mode}
        form={form}
        setForm={setForm}
        members={members}
        locations={locations}
        isSaving={isSaving}
        error={formError}
        onClose={closeEditor}
        onSave={saveTask}
      />
      <ConfirmDeleteModal
        isOpen={Boolean(deleteCandidate)}
        title="Delete task"
        description={
          deleteCandidate
            ? `Delete "${deleteCandidate.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete task"
        isDeleting={Boolean(deleteCandidate && pendingTaskId === deleteCandidate.id)}
        onCancel={() => {
          if (!pendingTaskId) setDeleteCandidate(null);
        }}
        onConfirm={() => {
          if (deleteCandidate) void deleteTask(deleteCandidate);
        }}
      />
      <TaskToast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </div>
  );
}
