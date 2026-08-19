"use client";

import Link from "next/link";
import {
  FaBell,
  FaBolt,
  FaBoxOpen,
  FaCheckCircle,
  FaHome,
  FaMapMarkedAlt,
  FaShoppingBasket,
  FaSignOutAlt,
  FaSpinner,
  FaTasks,
  FaTags,
  FaTimes,
  FaUserCircle,
  FaWarehouse,
} from "react-icons/fa";
import { LuLifeBuoy } from "react-icons/lu";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import { cx } from "@/components/ui/classNames";
import useTransitionMount from "@/components/ui/useTransitionMount";

function CountBadge({ value }) {
  if (value === null || value === undefined || value <= 0) return null;

  return (
    <span className="ml-auto grid min-w-7 place-items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold leading-5 text-gray-500">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function formatHouseholdRole(role) {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  if (role === "editor") return "Editor";
  return "";
}

const iconTones = {
  warning: {
    accent: "var(--entity-warning-accent)",
    soft: "var(--entity-warning-soft)",
    border: "var(--entity-warning-border)",
  },
  brand: {
    accent: "var(--stocksense-brand)",
    soft: "var(--stocksense-brand-soft)",
    border: "var(--stocksense-brand-border)",
  },
};

function IconCircle({ icon: Icon, tone = "brand", className = "" }) {
  const colors = iconTones[tone] || iconTones.brand;

  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${className}`}
      style={{
        background: colors.soft,
        borderColor: colors.border,
        color: colors.accent,
      }}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

const mobileMenuSections = [
  {
    title: "Dashboard",
    items: [
      { href: "/dashboard", label: "Overview", icon: FaHome },
      { href: "/activity", label: "Recent Activity", icon: FaBolt },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/locations", label: "Locations", icon: FaMapMarkedAlt, countKey: "locationsCount" },
      { href: "/areas", label: "Storage Areas", icon: FaWarehouse, countKey: "storageAreasCount" },
      { href: "/categories", label: "Categories", icon: FaTags, countKey: "categoriesCount" },
      { href: "/items", label: "Items", icon: FaBoxOpen, countKey: "itemsCount" },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        href: "/tasks",
        label: "Tasks",
        icon: FaTasks,
        countKey: "tasksAttentionCount",
      },
      {
        href: "/shopping-list",
        label: "Shopping List",
        icon: FaShoppingBasket,
        countKey: "shoppingListNeededItems",
      },
      {
        href: "/support/chat",
        label: "Ask WhereKeep",
        icon: LuLifeBuoy,
      },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/profile", label: "Profile", icon: FaUserCircle }],
  },
];

export function MobileMenu({
  isOpen,
  activeHref,
  loggingOut,
  onClose,
  onLogout,
  navigationSummary = {},
  counts = {},
}) {
  const householdName = navigationSummary.householdName || "Household inventory";
  const householdRole = navigationSummary.isFamilyPlan
    ? formatHouseholdRole(navigationSummary.householdRole)
    : "";
  const accountName = navigationSummary.displayName || householdName;
  const accountMeta = navigationSummary.displayName ? householdName : householdRole;
  const itemCount = counts.itemsCount ?? 0;
  const locationCount = counts.locationsCount ?? 0;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/20 lg:hidden"
        >
          <div
            className="flex h-full w-full flex-col overflow-y-auto bg-white px-5 pt-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div
              className="mb-5 flex items-center justify-between gap-3"
            >
              <Link
                href="/dashboard"
                onClick={onClose}
                className="flex min-w-0 items-center gap-2"
              >
                <WhereKeepLogo showWordmark={false} markClassName="h-9" />
                <span className="truncate bg-gradient-to-r from-[var(--stocksense-brand-border)] via-[var(--stocksense-brand)] to-[var(--stocksense-brand-dark)] bg-clip-text text-lg font-bold text-transparent">
                  WhereKeep
                </span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            <div
              className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <p className="truncate text-base font-semibold text-gray-950">
                {accountName}
              </p>
              {accountMeta ? (
                <p className="mt-2 inline-flex rounded-full border border-[var(--stocksense-brand-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                  {accountMeta}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-gray-600">
                {itemCount} item{itemCount === 1 ? "" : "s"} organized
              </p>
              <p className="mt-2 inline-flex rounded-full border border-[var(--stocksense-brand-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                {locationCount} location{locationCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid flex-1 content-start gap-5">
              {mobileMenuSections.map((section) => (
                <section key={section.title}>
                  <h2 className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    {section.title}
                  </h2>
                  <div className="grid gap-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeHref === item.href;
                      const count =
                        item.countKey && counts[item.countKey] !== undefined
                          ? counts[item.countKey]
                          : null;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cx(
                            "relative flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                            isActive
                              ? "border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] shadow-sm"
                              : "border border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50 hover:text-[var(--stocksense-brand)]"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[var(--stocksense-brand)]" />
                          )}
                          <span
                            className={cx(
                              "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                              isActive
                                ? "border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                                : "border-gray-200 bg-white text-gray-500"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {count !== null && <CountBadge value={count} />}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div
              className="mt-6 border-t border-gray-200 pt-4"
            >
              <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
                <Link
                  href="/terms"
                  onClick={onClose}
                  className="transition hover:text-[var(--stocksense-brand)]"
                >
                  Terms
                </Link>
                <span>•</span>
                <Link
                  href="/privacy"
                  onClick={onClose}
                  className="transition hover:text-[var(--stocksense-brand)]"
                >
                  Privacy
                </Link>
              </div>
              <button
                type="button"
                onClick={onLogout}
                disabled={loggingOut}
                className={cx(
                  "mt-3 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                  loggingOut
                    ? "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-700 opacity-70"
                    : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                )}
              >
                {loggingOut ? (
                  <FaSpinner className="h-4 w-4 animate-spin" />
                ) : (
                  <FaSignOutAlt className="h-4 w-4" />
                )}
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AttentionSheet({
  isOpen,
  onClose,
  anchor,
  expiredCount,
  expiringSoonCount,
  shoppingListItems,
  taskAttentionCount = 0,
}) {
  const { isVisible, shouldRender } = useTransitionMount(isOpen, 240);
  const hasAttention =
    expiredCount > 0 ||
    expiringSoonCount > 0 ||
    shoppingListItems > 0 ||
    taskAttentionCount > 0;
  const anchoredStyle = anchor
    ? {
        top: `${anchor.top}px`,
        right: `${anchor.right}px`,
        left: "auto",
      }
    : undefined;
  const arrowStyle =
    anchor?.arrowRight !== undefined
      ? { right: `${anchor.arrowRight}px` }
      : undefined;

  return (
    <>
      {shouldRender && (
        <div
          className={cx(
            "fixed inset-0 z-50 bg-slate-950/25 transition-opacity duration-200 ease-out md:bg-transparent motion-reduce:transition-none",
            isVisible ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={onClose}
        >
          <div
            className={cx(
              "absolute left-4 right-4 top-[4.25rem] ml-auto max-h-[calc(100svh-5.25rem)] max-w-md origin-top overflow-visible rounded-2xl border border-[var(--stocksense-brand-border)] bg-white shadow-2xl transition duration-200 ease-out motion-reduce:transition-none md:left-auto md:right-5 md:top-[4.5rem] md:w-[390px]",
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "-translate-y-4 scale-95 opacity-0"
            )}
            style={anchoredStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="absolute -top-2 right-5 h-4 w-4 rotate-45 border-l border-t border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]"
              style={arrowStyle}
            />
            <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-4">
              <div className="flex items-center gap-3">
                <IconCircle
                  icon={hasAttention ? FaBell : FaCheckCircle}
                  tone="warning"
                  className="h-11 w-11"
                />
                <div>
                  <h2 className="text-base font-semibold text-[var(--stocksense-brand)]">
                    Notifications
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {hasAttention
                      ? "Household updates that need a quick look."
                      : "Everything looks good."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            {hasAttention ? (
              <div className="grid gap-2 p-4">
                {expiringSoonCount > 0 && (
                  <Link
                    href="/items?expiration=soon&days=3"
                    onClick={onClose}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-[var(--entity-warning-border)] bg-[var(--entity-warning-soft)] px-3 py-2 text-sm font-medium text-[var(--entity-warning-accent)]"
                  >
                    <span>
                      {expiringSoonCount} item{expiringSoonCount === 1 ? "" : "s"} expire soon
                    </span>
                    <span>View</span>
                  </Link>
                )}
                {expiredCount > 0 && (
                  <Link
                    href="/items?expiration=expired"
                    onClick={onClose}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                  >
                    <span>
                      {expiredCount} expired item{expiredCount === 1 ? "" : "s"}
                    </span>
                    <span>View</span>
                  </Link>
                )}
                {shoppingListItems > 0 && (
                  <Link
                    href="/shopping-list"
                    onClick={onClose}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    <span>
                      {shoppingListItems} shopping item{shoppingListItems === 1 ? "" : "s"} needed
                    </span>
                    <span className="font-semibold text-[var(--stocksense-brand)]">Open</span>
                  </Link>
                )}
                {taskAttentionCount > 0 && (
                  <Link
                    href="/tasks"
                    onClick={onClose}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)]"
                  >
                    <span>
                      {taskAttentionCount} task{taskAttentionCount === 1 ? "" : "s"} overdue or due today
                    </span>
                    <span className="font-semibold">Open</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No expired items, urgent expirations, needed shopping list items, or tasks due today.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
