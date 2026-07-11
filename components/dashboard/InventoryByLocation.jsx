import Link from "next/link";
import { LuMapPin, LuPlus } from "react-icons/lu";

export default function InventoryByLocation({ locations = [] }) {
  const visibleLocations = locations.slice(0, 4);
  const remainingCount = Math.max(locations.length - visibleLocations.length, 0);

  return (
    <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-950">
          Inventory by Location
        </h2>
        <Link
          href="/locations"
          className="text-sm font-semibold text-[var(--stocksense-brand)] transition hover:text-[var(--stocksense-brand-dark)]"
        >
          View all locations
        </Link>
      </div>

      {locations.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-950">
                No locations yet
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Create your first location to start organizing your home.
              </p>
            </div>
            <Link
              href="/locations?create=location"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              <LuPlus className="h-4 w-4" />
              Add location
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {visibleLocations.map((location) => (
            <Link
              key={location.id}
              href={`/locations/${location.id}`}
              className="group min-w-0 rounded-2xl border border-gray-100 bg-gray-50/40 p-4 transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]/50 hover:shadow-md"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] transition group-hover:bg-white">
                <LuMapPin className="h-4 w-4" />
              </span>
              <h3 className="mt-4 truncate text-sm font-semibold text-gray-950">
                {location.name}
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {location.itemCount.toLocaleString()} item
                {location.itemCount === 1 ? "" : "s"}
              </p>
            </Link>
          ))}

          {remainingCount > 0 ? (
            <Link
              href="/locations"
              className="group flex min-w-0 flex-col justify-between rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/60 p-4 transition hover:-translate-y-0.5 hover:bg-[var(--stocksense-brand-soft)] hover:shadow-md"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-bold text-[var(--stocksense-brand)] shadow-sm">
                +{remainingCount}
              </span>
              <div className="mt-4">
                <h3 className="truncate text-sm font-semibold text-gray-950">
                  More locations
                </h3>
                <p className="mt-1 text-xs font-medium text-[var(--stocksense-brand)]">
                  View all locations
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
