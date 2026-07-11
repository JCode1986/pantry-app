import Link from "next/link";
import { LuPackage, LuPackageOpen } from "react-icons/lu";
import { daysUntil } from "@/utils/pantry/date";

function itemPath(item) {
  return [item.locationName, item.areaName, item.categoryName]
    .filter(Boolean)
    .join(" / ");
}

function expirationLabel(expirationDate) {
  if (!expirationDate) return null;

  const days = daysUntil(expirationDate);
  if (days < 0) {
    const count = Math.abs(days);
    return `Expired ${count} day${count === 1 ? "" : "s"} ago`;
  }

  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function ItemThumb({ item }) {
  if (item.imageUrl) {
    return (
      <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <img
          src={item.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
      <LuPackage className="h-4 w-4" />
    </span>
  );
}

export default function AttentionItemsCard({
  title,
  count = 0,
  items = [],
  href,
  emptyText,
  icon: Icon = LuPackageOpen,
  detailType = "expiration",
}) {
  const visibleItems = items.slice(0, 3);
  const hasMoreItems = count > visibleItems.length;

  return (
    <section className="min-w-0 rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            {count.toLocaleString()} item{count === 1 ? "" : "s"}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {visibleItems.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/60 p-4 text-sm text-gray-600">
          {emptyText}
        </div>
      ) : (
        <ul className="mt-5 grid gap-2">
          {visibleItems.map((item) => {
            const path = itemPath(item);
            const itemHref = item.categoryId
              ? `/categories/${item.categoryId}`
              : "/items";
            const detail =
              detailType === "stock"
                ? `Qty ${item.quantity ?? 0}`
                : expirationLabel(item.expirationDate);

            return (
              <Link
                key={item.id}
                href={itemHref}
                className="block min-w-0 rounded-2xl border border-gray-100 bg-gray-50/40 px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]/50 hover:shadow-sm"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ItemThumb item={item} />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-semibold text-gray-900"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      {path ? (
                        <p
                          className="mt-1 truncate text-xs text-gray-500"
                          title={path}
                        >
                          {path}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {detail ? (
                    <span
                      className="max-w-[7.5rem] shrink-0 truncate rounded-full border border-[var(--stocksense-brand-border)] bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--stocksense-brand)]"
                      title={detail}
                    >
                      {detail}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </ul>
      )}

      {hasMoreItems ? (
        <Link
          href={href}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white px-4 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
        >
          View all
        </Link>
      ) : null}
    </section>
  );
}
