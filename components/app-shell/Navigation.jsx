"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { INVENTORY_CHANGE_EVENT } from "@/utils/clientEvents";
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import {
  DEFAULT_PREFERENCES,
  readStoredPreferences,
  saveStoredPreferences,
} from "@/utils/appPreferences";
import { clearBrowserLogoutStorage } from "@/utils/logoutStorage";
import { cx } from "@/components/ui/classNames";
import {
  FaBell,
  FaMapMarkedAlt,
  FaBolt,
  FaWarehouse,
  FaTags,
  FaBoxOpen,
  FaSpinner,
  FaHome,
  FaPlus,
  FaSearch,
  FaShoppingBasket,
  FaUserCircle,
  FaBars,
} from "react-icons/fa";
import {
  LuActivity,
  LuChevronRight,
  LuHouse,
  LuLifeBuoy,
  LuLogOut,
  LuMapPin,
  LuPackage,
  LuPalette,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuShoppingBasket,
  LuTags,
  LuCircleUser,
  LuUsers,
  LuWarehouse,
} from "react-icons/lu";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: FaHome },
  { href: "/activity", label: "Activity", menuLabel: "Recent Activity", icon: FaBolt, mobileOnly: true },
  { href: "/locations", label: "Locations", icon: FaMapMarkedAlt },
  { href: "/areas", label: "Areas", icon: FaWarehouse },
  { href: "/categories", label: "Categories", icon: FaTags },
  { href: "/items", label: "Items", icon: FaBoxOpen },
  { href: "/shopping-list", label: "Shopping List", icon: FaShoppingBasket },
  { href: "/profile", label: "Profile", icon: FaUserCircle },
];

const PRIMARY_PREFETCH_ROUTES = [
  "/dashboard",
  "/locations",
  "/areas",
  "/categories",
  "/items",
  "/shopping-list",
  "/profile",
];

const GlobalAddItemModal = dynamic(
  () => import("@/components/items/GlobalAddItemModal"),
  { ssr: false }
);

const GlobalItemSearchModal = dynamic(
  () => import("@/components/items/GlobalItemSearchModal"),
  { ssr: false }
);

const NavigationAddActionSheet = dynamic(
  () => import("@/components/app-shell/NavigationAddActionSheet"),
  { ssr: false }
);

const NavigationRemoveMemberModal = dynamic(
  () => import("@/components/app-shell/NavigationRemoveMemberModal"),
  { ssr: false }
);

const NavigationLogoutModal = dynamic(
  () => import("@/components/app-shell/NavigationLogoutModal"),
  { ssr: false }
);

const HouseholdSharingPanel = dynamic(
  () =>
    import("@/components/app-shell/NavigationPanels").then(
      (module) => module.HouseholdSharingPanel
    ),
  { ssr: false }
);

const PreferencesPanel = dynamic(
  () =>
    import("@/components/app-shell/NavigationPanels").then(
      (module) => module.PreferencesPanel
    ),
  { ssr: false }
);

const MobileMenu = dynamic(
  () =>
    import("@/components/app-shell/NavigationOverlays").then(
      (module) => module.MobileMenu
    ),
  { ssr: false }
);

const AttentionSheet = dynamic(
  () =>
    import("@/components/app-shell/NavigationOverlays").then(
      (module) => module.AttentionSheet
    ),
  { ssr: false }
);

function addDays(date, days) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error) {
  if (!error) return null;
  return error.message || error.code || String(error);
}

function logNavigationWarning(message, details) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(message, details);
}

async function fetchAttentionCounts() {
  const supabase = createBrowserSupabaseClient();
  try {
    const { data, error } = await supabase.rpc(
      "wherekeep_inventory_summary_counts",
      { p_within_days: 3 }
    );
    const row = Array.isArray(data) ? data[0] : data;

    if (!error && row) {
      return {
        expiredCount: Number(row.expired_count ?? 0),
        expiringSoonCount: Number(row.expiring_soon_count ?? 0),
        shoppingListNeededItems: Number(row.shopping_list_needed_items ?? 0),
        shoppingListItemsCount: Number(row.shopping_list_items_count ?? 0),
        locationsCount: Number(row.locations_count ?? 0),
        storageAreasCount: Number(row.storage_areas_count ?? 0),
        categoriesCount: Number(row.categories_count ?? 0),
        itemsCount: Number(row.items_count ?? 0),
        lowStockCount: Number(row.low_stock_count ?? 0),
        summaryCountsLoaded: true,
      };
    }
  } catch {
    // Fall through to the existing count queries while the RPC is not installed.
  }

  const today = toDateString(new Date());
  const cutoff = toDateString(addDays(new Date(), 3));

  const [
    { count: expiredCount = 0, error: expiredError },
    { count: expiringSoonCount = 0, error: expiringSoonError },
    { count: shoppingListNeededItems = 0, error: shoppingListError },
    { count: locationsCount = 0, error: locationsError },
    { count: storageAreasCount = 0, error: storageAreasError },
    { count: categoriesCount = 0, error: categoriesError },
    { count: itemsCount = 0, error: itemsError },
  ] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .lt("expiration_date", today),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .gte("expiration_date", today)
      .lte("expiration_date", cutoff),
    supabase
      .from("shopping_list_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "needed"),
    supabase.from("locations").select("id", { count: "exact", head: true }),
    supabase.from("storage_areas").select("id", { count: "exact", head: true }),
    supabase.from("storage_categories").select("id", { count: "exact", head: true }),
    supabase.from("items").select("id", { count: "exact", head: true }),
  ]);

  if (
    expiredError ||
    expiringSoonError ||
    shoppingListError ||
    locationsError ||
    storageAreasError ||
    categoriesError ||
    itemsError
  ) {
    logNavigationWarning("Navigation attention counts unavailable.", {
      expiredError: getErrorMessage(expiredError),
      expiringSoonError: getErrorMessage(expiringSoonError),
      shoppingListError: getErrorMessage(shoppingListError),
      locationsError: getErrorMessage(locationsError),
      storageAreasError: getErrorMessage(storageAreasError),
      categoriesError: getErrorMessage(categoriesError),
      itemsError: getErrorMessage(itemsError),
    });
    return null;
  }

  return {
    expiredCount: expiredCount ?? 0,
    expiringSoonCount: expiringSoonCount ?? 0,
    shoppingListNeededItems: shoppingListNeededItems ?? 0,
    locationsCount: locationsCount ?? 0,
    storageAreasCount: storageAreasCount ?? 0,
    categoriesCount: categoriesCount ?? 0,
    itemsCount: itemsCount ?? 0,
  };
}

function MobileTopBar({ attentionCount, onOpenMenu, onOpenAttention }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white px-5 py-2 shadow-sm backdrop-blur lg:hidden">
      <div className="grid min-h-11 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
        >
          <FaBars className="h-4 w-4" />
        </button>

        <Link href="/dashboard" className="flex min-w-0 items-center justify-center gap-2">
          <WhereKeepLogo showWordmark={false} markClassName="h-8" />
          <span className="truncate bg-gradient-to-r from-[var(--stocksense-brand-border)] via-[var(--stocksense-brand)] to-[var(--stocksense-brand-dark)] bg-clip-text text-lg font-bold text-transparent">
            WhereKeep
          </span>
        </Link>

        <button
          type="button"
          aria-label="Notifications"
          onClick={onOpenAttention}
          className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
        >
          <FaBell className="h-4 w-4" />
          {attentionCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {attentionCount > 99 ? "99+" : attentionCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function DesktopGlobalActions({
  attentionCount,
  canEditInventory,
  onOpenSearch,
  onOpenAddItem,
  onOpenAttention,
}) {
  return (
    <div
      className="fixed right-0 top-0 z-40 hidden h-[var(--wherekeep-desktop-commandbar-height)] border-b border-white/70 bg-white/80 shadow-sm backdrop-blur transition-[left] duration-200 lg:block"
      style={{
        left: "var(--wherekeep-sidebar-offset)",
      }}
    >
      <div className="mx-auto flex h-full max-w-[1500px] items-center justify-end gap-3 px-5 py-3 lg:px-6 xl:px-8">
        <button
          type="button"
          onClick={onOpenSearch}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--stocksense-brand-border)] bg-white px-4 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm transition hover:bg-[var(--stocksense-brand-soft)]"
        >
          <FaSearch className="h-4 w-4 shrink-0" />
          <span className="truncate">Search item</span>
        </button>

        {canEditInventory && (
          <button
            type="button"
            onClick={onOpenAddItem}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            <FaPlus className="h-4 w-4" />
            Add Item
          </button>
        )}

        <button
          type="button"
          aria-label="Notifications"
          onClick={onOpenAttention}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] shadow-sm transition hover:bg-[var(--stocksense-brand-soft)]"
        >
          <FaBell className="h-4 w-4" />
          {attentionCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {attentionCount > 99 ? "99+" : attentionCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

const desktopSidebarSections = [
  {
    title: "HOME",
    items: [
      { href: "/dashboard", label: "Overview", icon: LuHouse },
      { href: "/activity", label: "Activities", icon: LuActivity },
      { href: "/locations", label: "Locations", icon: LuMapPin, countKey: "locationsCount" },
      { href: "/areas", label: "Storage Areas", icon: LuWarehouse, countKey: "storageAreasCount" },
      { href: "/categories", label: "Categories", icon: LuTags, countKey: "categoriesCount" },
      { href: "/items", label: "Items", icon: LuPackage, countKey: "itemsCount" },
      {
        href: "/shopping-list",
        label: "Shopping List",
        icon: LuShoppingBasket,
        countKey: "shoppingListNeededItems",
      },
    ],
  },
  {
    title: "Household",
    items: [
      { panel: "members", label: "Members", icon: LuUsers, countKey: "memberCount", hideZeroCount: true },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: LuCircleUser },
      { panel: "preferences", label: "Preferences", icon: LuPalette },
      { href: "/support", label: "Help & Support", icon: LuLifeBuoy },
    ],
  },
];


function SidebarCountBadge({ value }) {
  if (value === null || value === undefined || value <= 0) return null;

  return (
    <span className="ml-auto min-w-7 shrink-0 rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-center text-[11px] font-semibold leading-5 text-[var(--stocksense-brand)]">
      {value > 999 ? "999+" : value}
    </span>
  );
}

function formatHouseholdRole(role) {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  if (role === "editor") return "Editor";
  return "";
}

function DesktopSidebar({
  activeHref,
  activeHash,
  activePanel,
  counts = {},
  navigationSummary = {},
  isCollapsed,
  onToggleCollapsed,
  onOpenSharingPanel,
  loggingOut,
  onLogout,
}) {
  const householdName = navigationSummary.householdName || "Household inventory";
  const householdRole = formatHouseholdRole(navigationSummary.householdRole) || "Member";
  const accountName = navigationSummary.displayName || householdName;
  const accountMeta = navigationSummary.displayName ? householdName : householdRole;
  const ToggleIcon = isCollapsed ? LuPanelLeftOpen : LuPanelLeftClose;

  return (
    <aside
      className={cx(
        "fixed inset-y-0 left-0 z-50 hidden h-dvh max-h-dvh min-h-0 border-r border-[var(--stocksense-brand-border)] bg-white/95 py-5 shadow-xl backdrop-blur transition-[width,padding] duration-200 lg:flex lg:flex-col",
        isCollapsed ? "w-24 px-4" : "w-60 px-4"
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-5 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] shadow-lg ring-4 ring-white/80 transition hover:bg-[var(--stocksense-brand-soft)] hover:brightness-95"
      >
        <ToggleIcon className="h-4 w-4" />
      </button>

      <div className={cx("shrink-0 flex items-center", isCollapsed ? "justify-center" : "px-2")}>
        <Link
          href="/dashboard"
          className={cx(
            "flex min-w-0 items-center",
            isCollapsed ? "justify-center" : "flex-1 px-1"
          )}
          aria-label="WhereKeep home"
        >
          {isCollapsed ? (
            <WhereKeepLogo showWordmark={false} markClassName="h-10" />
          ) : (
            <span className="block truncate bg-gradient-to-r from-[var(--stocksense-brand-border)] via-[var(--stocksense-brand)] to-[var(--stocksense-brand-dark)] bg-clip-text text-2xl font-extrabold tracking-normal text-transparent">
              WhereKeep
            </span>
          )}
        </Link>
      </div>

      <div
        className={cx(
          "mt-7 min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]",
          isCollapsed ? "pr-0" : "pr-1"
        )}
      >
        {desktopSidebarSections.map((section) => (
          <section key={section.title}>
            {!isCollapsed && (
              <h2 className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                {section.title}
              </h2>
            )}
            <div className="grid gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isPanelItem = Boolean(item.panel);
                const [hrefBase, hashValue] = item.href?.split("#") ?? [];
                const hrefHash = hashValue ? `#${hashValue}` : "";
                const profileSidebarHashes = [
                  "#members",
                ];
                const isActive =
                  isPanelItem
                    ? activePanel === item.panel ||
                      (activeHref === "/profile" && activeHash === `#${item.panel}`)
                    : item.match !== false &&
                      hrefBase &&
                      activeHref === hrefBase &&
                      (!hrefHash
                        ? activeHref !== "/profile" ||
                          !profileSidebarHashes.includes(activeHash)
                        : activeHash === hrefHash);
                const count =
                  item.countKey && counts[item.countKey] !== undefined
                    ? counts[item.countKey]
                    : null;
                const shouldShowCount =
                  count !== null && (!item.hideZeroCount || count > 0);
                const className = cx(
                  "group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition",
                  isCollapsed && "mx-auto h-12 min-h-12 w-12 justify-center gap-0 px-0 py-0",
                  isActive
                    ? "border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] shadow-sm"
                    : "border border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-[var(--stocksense-brand)]"
                );
                const content = (
                  <>
                    <span
                      className={cx(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition",
                        isCollapsed && "h-9 w-9",
                        isActive
                          ? "border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                          : "border-gray-200 bg-white text-gray-500 group-hover:border-[var(--stocksense-brand-border)] group-hover:text-[var(--stocksense-brand)]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {!isCollapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {shouldShowCount && <SidebarCountBadge value={count} />}
                        {isPanelItem && (
                          <LuChevronRight
                            className={cx(
                              "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ease-out group-hover:text-[var(--stocksense-brand)]",
                              isActive && "rotate-90 text-[var(--stocksense-brand)]"
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </>
                );

                if (isPanelItem) {
                  return (
                    <button
                      key={`${item.panel}-${item.label}`}
                      type="button"
                      onClick={() => onOpenSharingPanel(item.panel)}
                      className={className}
                      title={isCollapsed ? item.label : undefined}
                      aria-pressed={isActive}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={className}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="shrink-0 space-y-3 border-t border-gray-100 pt-4">
        <div className={cx("rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3", isCollapsed && "p-2")}>
          <div className={cx("flex items-center gap-3", isCollapsed && "justify-center")}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
              <LuHouse className="h-5 w-5" />
            </span>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-950">
                  {accountName}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-[var(--stocksense-brand)]">
                  {accountMeta}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className={cx(
            "flex min-h-10 w-full items-center gap-3 rounded-2xl border border-transparent bg-white px-3 py-2 text-left text-sm font-medium text-gray-500 transition hover:border-gray-200 hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-70",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Sign out" : undefined}
        >
          {loggingOut ? (
            <FaSpinner className="h-4 w-4 animate-spin" />
          ) : (
            <LuLogOut className="h-4 w-4" />
          )}
          {!isCollapsed && <span className="min-w-0 truncate">{loggingOut ? "Logging out..." : "Sign out"}</span>}
        </button>
      </div>
    </aside>
  );
}

export default function Navigation({
  canEditInventory = true,
  attentionCounts = {},
  navigationSummary = {},
  initialPreferredName = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddActionSheet, setShowAddActionSheet] = useState(false);
  const [showItemSearchModal, setShowItemSearchModal] = useState(false);
  const [isAttentionOpen, setIsAttentionOpen] = useState(false);
  const [attentionAnchor, setAttentionAnchor] = useState(null);
  const [addItemContext, setAddItemContext] = useState(null);
  const [routeAddItemContext, setRouteAddItemContext] = useState(null);
  const [addItemNotice, setAddItemNotice] = useState(null);
  const [liveAttentionCounts, setLiveAttentionCounts] =
    useState(attentionCounts);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [activeHash, setActiveHash] = useState("");
  const [sharingPanel, setSharingPanel] = useState(null);
  const [sharingTab, setSharingTab] = useState("members");
  const [sharingData, setSharingData] = useState(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingError, setSharingError] = useState("");
  const [sharingActionLoading, setSharingActionLoading] = useState("");
  const [sharingMessage, setSharingMessage] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [removeMemberCandidate, setRemoveMemberCandidate] = useState(null);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferredName, setPreferredName] = useState(initialPreferredName);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState(null);
  const canCustomizeAppearance =
    (navigationSummary?.effectivePlanId || "free") !== "free";

  const activeHref = useMemo(() => {
    const desktopItems = desktopSidebarSections.flatMap((section) => section.items);
    const routeItems = [...navItems, ...desktopItems]
      .map((item) => item.href?.split("#")[0])
      .filter(Boolean);
    const uniqueRoutes = [...new Set(routeItems)];
    const match =
      uniqueRoutes
        .filter((href) => href !== "/dashboard" && pathname?.startsWith(href))
        .sort((a, b) => b.length - a.length)[0] ||
      uniqueRoutes.find((href) => href === "/dashboard");

    return match || "/dashboard";
  }, [pathname]);

  useEffect(() => {
    const syncHash = () => {
      setActiveHash(window.location.hash || "");
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, [pathname]);
  const expiredCount = liveAttentionCounts.expiredCount ?? 0;
  const expiringSoonCount = liveAttentionCounts.expiringSoonCount ?? 0;
  const shoppingListNeededItems =
    liveAttentionCounts.shoppingListNeededItems ?? 0;
  const attentionCount =
    expiredCount + expiringSoonCount + shoppingListNeededItems;
  const bottomNavItemClass = (isActive = false) =>
    cx(
      "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border transition",
      isActive
        ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] shadow-sm"
        : "border-transparent text-gray-500 hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
    );

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      clearBrowserLogoutStorage();
      window.location.replace("/logout");
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.replace("/logout");
    }
  };

  const openAttentionSheet = (event) => {
    const button = event?.currentTarget;
    const rect =
      button && typeof button.getBoundingClientRect === "function"
        ? button.getBoundingClientRect()
        : null;
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;

    if (rect && isDesktop) {
      const right = Math.max(16, Math.round(window.innerWidth - rect.right));

      setAttentionAnchor({
        top: Math.round(rect.bottom + 10),
        right,
        arrowRight: Math.max(8, Math.round(rect.width / 2 - 8)),
      });
    } else {
      setAttentionAnchor(null);
    }

    setIsAttentionOpen(true);
  };

  const openSharingPanel = async (panel) => {
    if (sharingPanel === panel) {
      setSharingPanel(null);
      return;
    }

    setSharingPanel(panel);
    setPreferenceMessage(null);

    if (panel === "preferences") return;

    setSharingTab("members");
    setSharingMessage(null);

    if (sharingData && !sharingError) return;
    if (sharingLoading) return;

    setSharingLoading(true);
    setSharingError("");

    const { getHouseholdSharingAction } = await import("@/app/actions/household");
    const result = await getHouseholdSharingAction();
    if (result?.error) {
      setSharingError(result.error);
      setSharingData(null);
      setSharingLoading(false);
      return;
    }

    const nextSharing = result?.data ?? null;
    setSharingData(nextSharing);
    setLiveAttentionCounts((current) => ({
      ...current,
      memberCount: nextSharing?.memberCount ?? nextSharing?.members?.length ?? 0,
    }));
    setSharingLoading(false);
  };

  const updateSidebarPreferences = async (nextPreferences) => {
    if (!canCustomizeAppearance) {
      const defaults = saveStoredPreferences(DEFAULT_PREFERENCES);
      setPreferences(defaults);
      setPreferenceMessage({
        type: "error",
        text: "Appearance customization requires a Plus or Family plan.",
      });
      return;
    }

    const normalized = saveStoredPreferences({
      ...preferences,
      ...nextPreferences,
    });

    setPreferences(normalized);
    setPreferenceSaving(true);
    setPreferenceMessage(null);

    const { updateUserPreferencesAction } = await import("@/app/actions/preferences");
    const result = await updateUserPreferencesAction(normalized);

    setPreferenceSaving(false);

    if (result?.error) {
      setPreferenceMessage({ type: "error", text: result.error });
      return;
    }

    const saved = saveStoredPreferences(result?.data ?? normalized);
    setPreferences(saved);
    setPreferenceMessage({
      type: "success",
      text: "Appearance saved to your account.",
    });
  };

  const handleSidebarThemeChange = (value) => {
    const themeId = value;
    if (!themeId || themeId === preferences.themeId) return;
    updateSidebarPreferences({ themeId: String(themeId) });
  };

  const handleSidebarFontChange = (value) => {
    const fontId = value;
    if (!fontId || fontId === preferences.fontId) return;
    updateSidebarPreferences({ fontId: String(fontId) });
  };

  const handleSavePreferredName = async (event) => {
    event.preventDefault();
    const normalizedName = preferredName.trim();
    setPreferredName(normalizedName);
    setPreferenceSaving(true);
    setPreferenceMessage(null);

    const { updatePreferredNameAction } = await import("@/app/actions/preferences");
    const result = await updatePreferredNameAction(normalizedName);

    setPreferenceSaving(false);

    if (result?.error) {
      setPreferenceMessage({ type: "error", text: result.error });
      return;
    }

    const savedName = result?.data?.name ? String(result.data.name).trim() : "";
    setPreferredName(savedName);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wherekeep:preferred-name-change", {
          detail: { name: savedName },
        })
      );
    }

    setPreferenceMessage({
      type: "success",
      text: savedName
        ? "Name preference saved to your account."
        : "Name preference cleared from your account.",
    });
    router.refresh();
  };

  const handleCreateSidebarInvite = async (event) => {
    event.preventDefault();

    if (sharingData?.effectivePlanId !== "family") {
      setSharingMessage({
        type: "error",
        text: "Upgrade to Family before inviting household members.",
      });
      return;
    }

    if (!sharingData?.canInvite) {
      setSharingMessage({
        type: "error",
        text: "This household is at the Family member limit.",
      });
      return;
    }

    setSharingActionLoading("invite");
    setSharingMessage(null);

    const { createHouseholdInviteAction } = await import("@/app/actions/household");
    const result = await createHouseholdInviteAction(inviteEmail, inviteRole);
    setSharingActionLoading("");

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    const invite = result?.data?.invite;
    if (!invite) return;

    setSharingData((current) => ({
      ...current,
      invites: [invite, ...(current?.invites ?? [])],
    }));
    setInviteEmail("");
    setInviteRole("editor");

    const sentExistingUserLink = result?.data?.emailType === "magic_link";
    setSharingMessage({
      type: result?.data?.emailSent ? "success" : "error",
      text: result?.data?.emailSent
        ? sentExistingUserLink
          ? "Invite email sent as a login link because that email already has an account."
          : "Invite email sent."
        : `Invite link created, but the email was not sent: ${result?.data?.emailError || "Unknown email error"}.`,
    });
  };

  const handleCopySidebarInvite = async (invite) => {
    if (!invite?.link || !navigator?.clipboard) return;

    await navigator.clipboard.writeText(invite.link);
    setCopiedInviteId(invite.id);
    window.setTimeout(() => setCopiedInviteId(null), 1800);
  };

  const handleResendSidebarInvite = async (inviteId) => {
    setSharingActionLoading(`resend:${inviteId}`);
    setSharingMessage(null);

    const { resendHouseholdInviteAction } = await import("@/app/actions/household");
    const result = await resendHouseholdInviteAction(inviteId);
    setSharingActionLoading("");

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    const invite = result?.data?.invite;
    if (!invite) return;

    setSharingData((current) => ({
      ...current,
      invites: (current?.invites ?? []).map((existing) =>
        existing.id === invite.id ? invite : existing
      ),
    }));

    const sentExistingUserLink = result?.data?.emailType === "magic_link";
    setSharingMessage({
      type: result?.data?.emailSent ? "success" : "error",
      text: result?.data?.emailSent
        ? sentExistingUserLink
          ? "Invite resent as a login link because that email already has an account."
          : "Invite email resent."
        : `Invite was refreshed, but the email was not sent: ${result?.data?.emailError || "Unknown email error"}.`,
    });
  };

  const handleRevokeSidebarInvite = async (inviteId) => {
    setSharingActionLoading(`revoke:${inviteId}`);
    setSharingMessage(null);

    const { revokeHouseholdInviteAction } = await import("@/app/actions/household");
    const result = await revokeHouseholdInviteAction(inviteId);
    setSharingActionLoading("");

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    setSharingData((current) => ({
      ...current,
      invites: (current?.invites ?? []).filter((invite) => invite.id !== inviteId),
    }));
    setSharingMessage({ type: "success", text: "Invite revoked." });
  };

  const handleUpdateSidebarMemberRole = async (member, role) => {
    if (!member?.userId || !role || member.role === role) return;

    setSharingActionLoading(`role:${member.userId}`);
    setSharingMessage(null);

    const { updateHouseholdMemberRoleAction } = await import("@/app/actions/household");
    const result = await updateHouseholdMemberRoleAction(member.userId, role);
    setSharingActionLoading("");

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    const updatedMember = result?.data?.member;
    if (!updatedMember) return;

    setSharingData((current) => ({
      ...current,
      members: (current?.members ?? []).map((item) =>
        item.userId === updatedMember.userId ? updatedMember : item
      ),
    }));
    setSharingMessage({
      type: "success",
      text: `${updatedMember.displayName || updatedMember.email} is now a ${formatHouseholdRole(updatedMember.role).toLowerCase()}.`,
    });
  };

  const handleRequestSidebarRemoveMember = (member) => {
    if (!member?.userId) return;
    setSharingMessage(null);
    setRemoveMemberCandidate(member);
  };

  const handleCancelSidebarRemoveMember = () => {
    if (sharingActionLoading?.startsWith("remove:")) return;
    setRemoveMemberCandidate(null);
  };

  const handleConfirmSidebarRemoveMember = async (member) => {
    if (!member?.userId) return;

    setSharingActionLoading(`remove:${member.userId}`);
    setSharingMessage(null);

    const { removeHouseholdMemberAction } = await import("@/app/actions/household");
    const result = await removeHouseholdMemberAction(member.userId);
    setSharingActionLoading("");
    setRemoveMemberCandidate(null);

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    setSharingData((current) => {
      const nextMembers = (current?.members ?? []).filter(
        (item) => item.userId !== member.userId
      );
      const nextSharing = {
        ...current,
        members: nextMembers,
        memberCount: nextMembers.length,
        canInvite:
          current?.currentUserRole === "owner" &&
          current?.effectivePlanId === "family" &&
          (current?.maxMembers === null || nextMembers.length < current?.maxMembers),
      };
      return nextSharing;
    });
    setLiveAttentionCounts((current) => ({
      ...current,
      memberCount: Math.max((current.memberCount ?? 1) - 1, 0),
    }));

    setSharingMessage({
      type: "success",
      text: `${member.displayName || member.email} was removed from this household.`,
    });
  };

  useEffect(() => {
    setLiveAttentionCounts(attentionCounts);
  }, [
    attentionCounts.expiredCount,
    attentionCounts.expiringSoonCount,
    attentionCounts.shoppingListNeededItems,
    attentionCounts.locationsCount,
    attentionCounts.storageAreasCount,
    attentionCounts.categoriesCount,
    attentionCounts.itemsCount,
    attentionCounts.memberCount,
  ]);

  const updateDesktopSidebarState = (collapsed) => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.wherekeepSidebar = collapsed
      ? "collapsed"
      : "expanded";
  };

  useLayoutEffect(() => {
    updateDesktopSidebarState(isDesktopSidebarCollapsed);
  }, [isDesktopSidebarCollapsed]);

  useEffect(() => {
    setPreferences(readStoredPreferences());
    setPreferredName(initialPreferredName || "");
  }, [initialPreferredName]);

  useEffect(() => {
    const connection = navigator?.connection;
    if (connection?.saveData || connection?.effectiveType === "2g") return;

    let cancelled = false;
    let idleCallbackId = null;
    let timeoutId = null;

    const prefetchRoutes = () => {
      if (cancelled) return;

      for (const href of PRIMARY_PREFETCH_ROUTES) {
        if (href === pathname) continue;
        router.prefetch(href);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(prefetchRoutes, {
        timeout: 3000,
      });
    } else {
      timeoutId = window.setTimeout(prefetchRoutes, 1500);
    }

    return () => {
      cancelled = true;
      if (
        idleCallbackId !== null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimerId = null;

    const refreshAttentionCounts = async () => {
      const nextCounts = await fetchAttentionCounts();
      if (!cancelled && nextCounts) {
        setLiveAttentionCounts((current) => ({ ...current, ...nextCounts }));
      }
    };

    const scheduleAttentionCountsRefresh = () => {
      if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
      refreshTimerId = window.setTimeout(() => {
        refreshTimerId = null;
        void refreshAttentionCounts();
      }, 450);
    };

    window.addEventListener(INVENTORY_CHANGE_EVENT, scheduleAttentionCountsRefresh);

    return () => {
      cancelled = true;
      if (refreshTimerId !== null) {
        window.clearTimeout(refreshTimerId);
      }
      window.removeEventListener(
        INVENTORY_CHANGE_EVENT,
        scheduleAttentionCountsRefresh
      );
    };
  }, [pathname]);

  useEffect(() => {
    if (!addItemNotice) return;

    const timeout = window.setTimeout(() => {
      setAddItemNotice(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [addItemNotice]);

  useEffect(() => {
    const openAddItem = (event) => {
      if (!canEditInventory) return;
      const explicitContext = event.detail ?? null;
      const nextContext =
        routeAddItemContext || explicitContext
          ? {
              ...(routeAddItemContext ?? {}),
              ...(explicitContext ?? {}),
            }
          : null;
      setAddItemContext(nextContext);
      setShowAddItemModal(true);
    };

    window.addEventListener("stocksense:open-add-item", openAddItem);

    return () => {
      window.removeEventListener("stocksense:open-add-item", openAddItem);
    };
  }, [canEditInventory, routeAddItemContext]);

  useEffect(() => {
    const setDefaultAddItemContext = (event) => {
      setRouteAddItemContext(event.detail ?? null);
    };

    window.addEventListener(
      "stocksense:set-add-item-context",
      setDefaultAddItemContext
    );

    return () => {
      window.removeEventListener(
        "stocksense:set-add-item-context",
        setDefaultAddItemContext
      );
    };
  }, []);

  useEffect(() => {
    const openItemSearch = () => {
      setShowItemSearchModal(true);
    };

    window.addEventListener("stocksense:open-item-search", openItemSearch);

    return () => {
      window.removeEventListener("stocksense:open-item-search", openItemSearch);
    };
  }, []);

  useEffect(() => {
    const openLogoutConfirm = () => {
      setIsMenuOpen(false);
      setShowLogoutModal(true);
    };

    window.addEventListener("stocksense:open-logout-confirm", openLogoutConfirm);

    return () => {
      window.removeEventListener(
        "stocksense:open-logout-confirm",
        openLogoutConfirm
      );
    };
  }, []);

  useEffect(() => {
    let refreshTimer = null;

    const refreshCurrentRoute = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        router.refresh();
        refreshTimer = null;
      }, 150);
    };

    window.addEventListener(INVENTORY_CHANGE_EVENT, refreshCurrentRoute);

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.removeEventListener(INVENTORY_CHANGE_EVENT, refreshCurrentRoute);
    };
  }, [router]);

  return (
    <>
      <MobileTopBar
        attentionCount={attentionCount}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenAttention={openAttentionSheet}
      />

      <DesktopSidebar
        activeHref={activeHref}
        activeHash={activeHash}
        activePanel={sharingPanel}
        counts={liveAttentionCounts}
        navigationSummary={navigationSummary}
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapsed={() =>
          setIsDesktopSidebarCollapsed((current) => !current)
        }
        onOpenSharingPanel={openSharingPanel}
        loggingOut={loggingOut}
        onLogout={() => setShowLogoutModal(true)}
      />

      <DesktopGlobalActions
        attentionCount={attentionCount}
        canEditInventory={canEditInventory}
        onOpenSearch={() => setShowItemSearchModal(true)}
        onOpenAddItem={() => {
          if (!canEditInventory) return;
          setAddItemContext(routeAddItemContext);
          setShowAddItemModal(true);
        }}
        onOpenAttention={openAttentionSheet}
      />

      {sharingPanel === "members" && (
        <HouseholdSharingPanel
          activePanel={sharingPanel}
          activeTab={sharingTab}
          sharing={sharingData}
          loading={sharingLoading}
          actionLoading={sharingActionLoading}
          error={sharingError}
          message={sharingMessage}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          copiedInviteId={copiedInviteId}
          onClose={() => setSharingPanel(null)}
          onSelectTab={setSharingTab}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onCreateInvite={handleCreateSidebarInvite}
          onCopyInvite={handleCopySidebarInvite}
          onResendInvite={handleResendSidebarInvite}
          onRevokeInvite={handleRevokeSidebarInvite}
          onUpdateMemberRole={handleUpdateSidebarMemberRole}
          onRequestRemoveMember={handleRequestSidebarRemoveMember}
        />
      )}

      {sharingPanel === "preferences" && (
        <PreferencesPanel
          isOpen={sharingPanel === "preferences"}
          preferences={preferences}
          preferredName={preferredName}
          saving={preferenceSaving}
          canCustomizeAppearance={canCustomizeAppearance}
          message={preferenceMessage}
          onClose={() => setSharingPanel(null)}
          onThemeChange={handleSidebarThemeChange}
          onFontChange={handleSidebarFontChange}
          onPreferredNameChange={setPreferredName}
          onSavePreferredName={handleSavePreferredName}
        />
      )}

      {isMenuOpen && (
        <MobileMenu
          isOpen={isMenuOpen}
          activeHref={activeHref}
          loggingOut={loggingOut}
          navigationSummary={navigationSummary}
          counts={liveAttentionCounts}
          onClose={() => setIsMenuOpen(false)}
          onLogout={() => {
            setIsMenuOpen(false);
            setShowLogoutModal(true);
          }}
        />
      )}

      {isAttentionOpen && (
        <AttentionSheet
          isOpen={isAttentionOpen}
          onClose={() => setIsAttentionOpen(false)}
          anchor={attentionAnchor}
          expiredCount={expiredCount}
          expiringSoonCount={expiringSoonCount}
          shoppingListItems={shoppingListNeededItems}
        />
      )}

      <nav
        className={cx(
          "fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden",
          showItemSearchModal ? "z-[80]" : "z-40"
        )}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          <Link
            href="/dashboard"
            className={bottomNavItemClass(activeHref === "/dashboard")}
            aria-current={activeHref === "/dashboard" ? "page" : undefined}
          >
            <FaHome className="h-4 w-4" />
            <span className="text-[11px] font-medium">Home</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setShowItemSearchModal(true);
            }}
            className={bottomNavItemClass(showItemSearchModal)}
            aria-current={showItemSearchModal ? "page" : undefined}
          >
            <FaSearch className="h-4 w-4" />
            <span className="text-[11px] font-medium">Search</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canEditInventory) return;
              setIsMenuOpen(false);
              setAddItemContext(routeAddItemContext);
              setShowAddItemModal(true);
            }}
            disabled={!canEditInventory}
            className="mx-auto grid h-14 w-14 -translate-y-3 place-items-center rounded-full bg-[var(--stocksense-brand)] text-white shadow-lg transition hover:brightness-95 disabled:opacity-50"
            aria-label="Add"
          >
            <FaPlus className="h-5 w-5" />
          </button>

          <Link
            href="/shopping-list"
            className={bottomNavItemClass(activeHref === "/shopping-list")}
            aria-current={activeHref === "/shopping-list" ? "page" : undefined}
          >
            <FaShoppingBasket className="h-4 w-4" />
            <span className="text-[11px] font-medium">Shopping</span>
          </Link>

          <Link
            href="/profile"
            className={bottomNavItemClass(activeHref === "/profile")}
            aria-current={activeHref === "/profile" ? "page" : undefined}
          >
            <FaUserCircle className="h-4 w-4" />
            <span className="text-[11px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>

      {canEditInventory && showAddItemModal && (
        <GlobalAddItemModal
          isOpen={showAddItemModal}
          initialContext={addItemContext}
          onClose={() => setShowAddItemModal(false)}
          onAdded={({ itemName, destinationName }) =>
            setAddItemNotice({ itemName, destinationName })
          }
        />
      )}

      {showItemSearchModal && (
        <GlobalItemSearchModal
          isOpen={showItemSearchModal}
          onClose={() => setShowItemSearchModal(false)}
        />
      )}

      {showAddActionSheet && (
        <NavigationAddActionSheet
          isOpen={showAddActionSheet}
          onOpenChange={setShowAddActionSheet}
          onAddItem={() => {
            setAddItemContext(routeAddItemContext);
            setShowAddItemModal(true);
          }}
          onAddLocation={() => router.push("/locations?create=location")}
          onAddArea={() => router.push("/locations")}
          onAddCategory={() => router.push("/locations")}
        />
      )}

      {addItemNotice && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
          <div className="text-sm font-semibold text-gray-950">
            Item added
          </div>
          <div className="text-sm text-gray-600">
            {addItemNotice.itemName} was added to {addItemNotice.destinationName}.
          </div>
        </div>
      )}

      {removeMemberCandidate && (
        <NavigationRemoveMemberModal
          candidate={removeMemberCandidate}
          actionLoading={sharingActionLoading}
          onCancel={handleCancelSidebarRemoveMember}
          onConfirm={handleConfirmSidebarRemoveMember}
        />
      )}

      {showLogoutModal && (
        <NavigationLogoutModal
          isOpen={showLogoutModal}
          onOpenChange={setShowLogoutModal}
          loggingOut={loggingOut}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
