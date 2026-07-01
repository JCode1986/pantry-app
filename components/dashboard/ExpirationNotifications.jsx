import Link from "next/link";
import { FaBell, FaClock, FaExclamationTriangle } from "react-icons/fa";
import { daysUntil } from "@/utils/pantry/date";

function formatExpirationLabel(expirationDate) {
  const days = daysUntil(expirationDate);

  if (days < 0) {
    const count = Math.abs(days);
    return `Expired ${count} day${count === 1 ? "" : "s"} ago`;
  }

  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function itemPath(item) {
  return [item.locationName, item.areaName, item.categoryName]
    .filter(Boolean)
    .join(" / ");
}

export default function ExpirationNotifications({
  items = [],
  expiredCount = 0,
  expiringSoonCount = 0,
  withinDays = 3,
}) {
  const total = expiredCount + expiringSoonCount;

  if (total === 0) {
    return (
      <section className="rounded-2xl border border-[var(--entity-warning-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--entity-warning-soft)] text-[var(--entity-warning-accent)]">
            <FaBell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">Expiration watch</h2>
            <p className="mt-1 text-sm text-gray-500">
              Nothing is expired or expiring in the next {withinDays} days.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--entity-warning-border)] bg-white shadow-sm">
      <div className="border-t-4 border-[var(--entity-warning-accent)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--entity-warning-soft)] text-[var(--entity-warning-accent)]">
              <FaExclamationTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">Expiration watch</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {expiredCount > 0
                  ? `${expiredCount} expired item${expiredCount === 1 ? "" : "s"}`
                  : "No expired items"}
                {" and "}
                {expiringSoonCount} item{expiringSoonCount === 1 ? "" : "s"} expiring
                in the next {withinDays} days.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {expiredCount > 0 && (
              <Link
                href="/items?expiration=expired"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--entity-warning-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--entity-warning-accent)] transition hover:bg-[var(--entity-warning-soft)]"
              >
                Review expired
              </Link>
            )}
            <Link
              href={`/items?expiration=soon&days=${withinDays}`}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--entity-warning-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Review expiring soon
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href={`/items?expiration=${daysUntil(item.expirationDate) < 0 ? "expired" : "soon"}&days=${withinDays}`}
              className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-3 transition hover:border-[var(--entity-warning-border)] hover:bg-[var(--entity-warning-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold text-gray-900">
                    {item.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Qty: {item.quantity ?? 0}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--entity-warning-border)] bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--entity-warning-accent)]">
                  {formatExpirationLabel(item.expirationDate)}
                </span>
              </div>
              {itemPath(item) && (
                <div className="mt-2 inline-flex max-w-full items-start gap-1.5 text-xs text-gray-500">
                  <FaClock className="mt-0.5 h-3 w-3 shrink-0 text-[var(--entity-warning-accent)]" />
                  <span className="break-words">{itemPath(item)}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
