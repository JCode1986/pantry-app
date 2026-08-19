import Link from "next/link";
import { LuClipboardCheck, LuClock3, LuMapPin } from "react-icons/lu";
import { parsePantryDate } from "@/utils/pantry/date";

function formatDueDate(value) {
  const date = parsePantryDate(value);
  if (!date) return "No due date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function TasksDueCard({ tasks = [], dueTodayCount = 0 }) {
  const visibleTasks = tasks.slice(0, 5);

  return (
    <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Tasks</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            {dueTodayCount.toLocaleString()} due today
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
          <LuClipboardCheck className="h-4 w-4" />
        </span>
      </div>

      {visibleTasks.length ? (
        <ul className="mt-5 grid gap-2">
          {visibleTasks.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border border-gray-100 bg-gray-50/40 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gray-300 bg-white">
                  <span className="h-2 w-2 rounded-full bg-[var(--stocksense-brand)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900" title={task.title}>
                    {task.title}
                  </p>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <LuClock3 className="h-3 w-3 text-[var(--stocksense-brand)]" />
                      {formatDueDate(task.dueDate)}
                    </span>
                    {task.locationName ? (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <LuMapPin className="h-3 w-3 shrink-0 text-[var(--stocksense-brand)]" />
                        <span className="truncate">{task.locationName}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/60 p-4 text-sm text-gray-600">
          No urgent tasks right now.
        </div>
      )}

      <Link
        href="/tasks"
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white px-4 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
      >
        View all tasks
      </Link>
    </section>
  );
}
