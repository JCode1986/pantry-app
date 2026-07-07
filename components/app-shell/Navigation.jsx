"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { logoutAction } from "@/app/actions/auth";
import { INVENTORY_CHANGE_EVENT } from "@/utils/clientEvents";
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
} from "@/components/modals/modalTheme";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_STORAGE_KEY,
  applyAppPreferences,
} from "@/utils/appPreferences";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import {
  FaBell,
  FaMapMarkedAlt,
  FaBolt,
  FaWarehouse,
  FaTags,
  FaBoxOpen,
  FaCheckCircle,
  FaSignOutAlt,
  FaSpinner,
  FaHome,
  FaPlus,
  FaSearch,
  FaShoppingBasket,
  FaTimes,
  FaUserCircle,
  FaBars,
} from "react-icons/fa";

const navItems = [
  { href: "/", label: "Overview", icon: FaHome },
  { href: "/activity", label: "Activity", menuLabel: "Recent Activity", icon: FaBolt, mobileOnly: true },
  { href: "/locations", label: "Locations", icon: FaMapMarkedAlt },
  { href: "/areas", label: "Areas", icon: FaWarehouse },
  { href: "/categories", label: "Categories", icon: FaTags },
  { href: "/items", label: "Items", icon: FaBoxOpen },
  { href: "/shopping-list", label: "Shopping List", icon: FaShoppingBasket },
  { href: "/profile", label: "Profile", icon: FaUserCircle },
];

const GlobalAddItemModal = dynamic(
  () => import("@/components/items/GlobalAddItemModal"),
  { ssr: false }
);

const GlobalItemSearchModal = dynamic(
  () => import("@/components/items/GlobalItemSearchModal"),
  { ssr: false }
);

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

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

async function fetchAttentionCounts() {
  const supabase = createBrowserSupabaseClient();
  const today = toDateString(new Date());
  const cutoff = toDateString(addDays(new Date(), 3));

  const [
    { count: expiredCount = 0, error: expiredError },
    { count: expiringSoonCount = 0, error: expiringSoonError },
    { count: shoppingListNeededItems = 0, error: shoppingListError },
  ] = await Promise.all([
    supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .lt("expiration_date", today),
    supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .gte("expiration_date", today)
      .lte("expiration_date", cutoff),
    supabase
      .from("shopping_list_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "needed"),
  ]);

  if (expiredError || expiringSoonError || shoppingListError) {
    console.error("Navigation attention count error:", {
      expiredError,
      expiringSoonError,
      shoppingListError,
    });
    return null;
  }

  return {
    expiredCount: expiredCount ?? 0,
    expiringSoonCount: expiringSoonCount ?? 0,
    shoppingListNeededItems: shoppingListNeededItems ?? 0,
  };
}

const menuBackdropVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: "easeIn" } },
};

const menuPanelVariants = {
  hidden: { opacity: 0, y: -14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.045,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
};

const sheetPanelVariants = {
  hidden: { opacity: 0, y: -12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: 0.16, ease: "easeIn" },
  },
};

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

function MobileTopBar({ attentionCount, onOpenMenu, onOpenAttention }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white px-5 py-2 shadow-sm backdrop-blur md:hidden">
      <div className="grid min-h-11 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
        >
          <FaBars className="h-4 w-4" />
        </button>

        <Link href="/" className="flex min-w-0 items-center justify-center gap-2">
          <WhereKeepLogo showWordmark={false} markClassName="h-8" />
          <span className="truncate text-lg font-bold text-[var(--stocksense-brand)]">
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

function MobileMenu({ isOpen, activeHref, loggingOut, onClose, onLogout }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] bg-slate-950/20 md:hidden"
          variants={menuBackdropVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <motion.div
            className="h-full w-full overflow-y-auto bg-gray-50 px-5 pt-5 shadow-2xl"
            variants={menuPanelVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <motion.div
              variants={menuItemVariants}
              className="mb-5 flex items-center justify-between gap-3"
            >
              <Link
                href="/"
                onClick={onClose}
                className="flex min-w-0 items-center gap-2"
              >
                <WhereKeepLogo showWordmark={false} markClassName="h-9" />
                <span className="truncate text-lg font-bold text-[var(--stocksense-brand)]">
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
            </motion.div>

            <motion.div
              variants={menuItemVariants}
              className="px-2 pb-2 text-xs font-medium text-gray-400"
            >
              Navigation
            </motion.div>
            <div className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeHref === item.href;

                return (
                  <motion.div key={item.href} variants={menuItemVariants}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cx(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                        isActive
                          ? "border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                          : "text-gray-700 hover:bg-white/70 hover:text-[var(--stocksense-brand)]"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {item.menuLabel || item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              variants={menuItemVariants}
              className="mt-3 border-t border-gray-200 pt-3"
            >
              <div className="px-2 pb-2 text-xs font-medium text-gray-400">
                Legal
              </div>
              <div className="grid gap-1">
                <Link
                  href="/terms"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-white/70 hover:text-[var(--stocksense-brand)]"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-white/70 hover:text-[var(--stocksense-brand)]"
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
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AttentionSheet({
  isOpen,
  onClose,
  expiredCount,
  expiringSoonCount,
  shoppingListItems,
}) {
  const hasAttention =
    expiredCount > 0 || expiringSoonCount > 0 || shoppingListItems > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-slate-950/25 md:hidden"
          variants={menuBackdropVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="absolute left-4 right-4 top-[4.25rem] ml-auto max-h-[calc(100dvh-5.25rem)] max-w-md overflow-visible rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
            variants={sheetPanelVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute -top-2 right-5 h-4 w-4 rotate-45 border-l border-t border-gray-200 bg-white" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IconCircle
                  icon={hasAttention ? FaBell : FaCheckCircle}
                  tone="warning"
                  className="h-11 w-11"
                />
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Notifications
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {hasAttention
                      ? "Items that need a quick look."
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
              <div className="mt-4 grid gap-2">
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
                    className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-[var(--entity-warning-border)] bg-[var(--entity-warning-soft)] px-3 py-2 text-sm font-medium text-[var(--entity-warning-accent)]"
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
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                No expired items, urgent expirations, or needed shopping list items.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Navigation({
  canEditInventory = true,
  attentionCounts = {},
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
  const [addItemContext, setAddItemContext] = useState(null);
  const [addItemNotice, setAddItemNotice] = useState(null);
  const [liveAttentionCounts, setLiveAttentionCounts] =
    useState(attentionCounts);

  const activeHref = useMemo(() => {
    // Handle nested routes like /locations/[id]
    const match =
      navItems.find((i) => i.href !== "/" && pathname?.startsWith(i.href)) ||
      navItems.find((i) => i.href === "/");
    return match?.href || "/";
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
      localStorage.removeItem(PREFERENCE_STORAGE_KEY);
      applyAppPreferences(DEFAULT_PREFERENCES);
      const result = await logoutAction();
      window.location.href = result?.redirectTo || "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    setLiveAttentionCounts(attentionCounts);
  }, [
    attentionCounts.expiredCount,
    attentionCounts.expiringSoonCount,
    attentionCounts.shoppingListNeededItems,
  ]);

  useEffect(() => {
    let cancelled = false;

    const refreshAttentionCounts = async () => {
      const nextCounts = await fetchAttentionCounts();
      if (!cancelled && nextCounts) {
        setLiveAttentionCounts(nextCounts);
      }
    };

    refreshAttentionCounts();
    window.addEventListener(INVENTORY_CHANGE_EVENT, refreshAttentionCounts);

    return () => {
      cancelled = true;
      window.removeEventListener(INVENTORY_CHANGE_EVENT, refreshAttentionCounts);
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
      setAddItemContext(event.detail ?? null);
      setShowAddItemModal(true);
    };

    window.addEventListener("stocksense:open-add-item", openAddItem);

    return () => {
      window.removeEventListener("stocksense:open-add-item", openAddItem);
    };
  }, [canEditInventory]);

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
        onOpenAttention={() => setIsAttentionOpen(true)}
      />

      <Navbar
        isBordered
        maxWidth="2xl"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        className="sticky top-0 z-50 bg-white/90 backdrop-blur max-md:hidden md:bg-white"
      >
        <NavbarContent justify="start" className="gap-3">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="hidden md:flex xl:hidden"
          />

          <NavbarBrand className="absolute left-1/2 z-10 grow-0 -translate-x-1/2 xl:static xl:translate-x-0">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <WhereKeepLogo showWordmark={false} markClassName="h-9" />
              <span className="truncate bg-gradient-to-r from-[var(--stocksense-brand-border)] via-[var(--stocksense-brand)] to-[var(--stocksense-brand-dark)] bg-clip-text text-xl font-extrabold text-transparent">
                WhereKeep
              </span>
            </Link>
          </NavbarBrand>

          <NavbarContent className="hidden gap-1 xl:flex" justify="start">
            {navItems.filter((item) => !item.mobileOnly).map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;

              return (
                <NavbarItem key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition",
                      isActive
                        ? "border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                        : "text-gray-600 hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </NavbarItem>
              );
            })}
          </NavbarContent>
        </NavbarContent>

        <NavbarContent justify="end" className="gap-2">
          <NavbarItem key="desktop-search" className="hidden xl:flex">
            <Button
              variant="flat"
              className="rounded-xl border border-stocksense-gray bg-white text-[var(--stocksense-brand)]"
              onPress={() => setShowItemSearchModal(true)}
              startContent={<FaSearch />}
            >
              Search
            </Button>
          </NavbarItem>

          {canEditInventory && (
            <NavbarItem key="desktop-add-item" className="hidden xl:flex">
              <Button
                className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                onPress={() => {
                  setAddItemContext(null);
                  setShowAddItemModal(true);
                }}
                startContent={<FaPlus />}
              >
                Add Item
              </Button>
            </NavbarItem>
          )}

          <NavbarItem key="desktop-logout" className="hidden xl:flex">
            <Button
              variant="flat"
              className={cx(
                "rounded-xl border",
                loggingOut
                  ? "cursor-not-allowed opacity-70"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              )}
              onPress={() => setShowLogoutModal(true)}
              isDisabled={loggingOut}
              startContent={
                loggingOut ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSignOutAlt />
                )
              }
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </NavbarItem>
        </NavbarContent>

        {/* Mobile menu */}
        <NavbarMenu className="pt-6">
          <div className="px-2 pb-2 text-xs font-medium text-gray-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;

            return (
              <NavbarMenuItem key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                    isActive
                      ? "border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                      : "text-gray-700 hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </NavbarMenuItem>
            );
          })}

          <div className="mt-3 border-t border-gray-200 pt-3">
            <div className="px-2 pb-2 text-xs font-medium text-gray-400">
              Legal
            </div>
            <div className="grid gap-1 pb-3">
              <Link
                href="/terms"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
              >
                Privacy
              </Link>
            </div>
            <Button
              variant="flat"
              className={cx(
                "w-full justify-start rounded-xl border",
                loggingOut
                  ? "cursor-not-allowed opacity-70"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              )}
              onPress={() => setShowLogoutModal(true)}
              isDisabled={loggingOut}
              startContent={
                loggingOut ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSignOutAlt />
                )
              }
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </NavbarMenu>
      </Navbar>

      <MobileMenu
        isOpen={isMenuOpen}
        activeHref={activeHref}
        loggingOut={loggingOut}
        onClose={() => setIsMenuOpen(false)}
        onLogout={() => {
          setIsMenuOpen(false);
          setShowLogoutModal(true);
        }}
      />

      <AttentionSheet
        isOpen={isAttentionOpen}
        onClose={() => setIsAttentionOpen(false)}
        expiredCount={expiredCount}
        expiringSoonCount={expiringSoonCount}
        shoppingListItems={shoppingListNeededItems}
      />

      <nav
        className={cx(
          "fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden",
          showItemSearchModal ? "z-[80]" : "z-40"
        )}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          <Link
            href="/"
            className={bottomNavItemClass(activeHref === "/")}
            aria-current={activeHref === "/" ? "page" : undefined}
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
              setAddItemContext(null);
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

      {canEditInventory && (
        <GlobalAddItemModal
          isOpen={showAddItemModal}
          initialContext={addItemContext}
          onClose={() => setShowAddItemModal(false)}
          onAdded={({ itemName, destinationName }) =>
            setAddItemNotice({ itemName, destinationName })
          }
        />
      )}

      <GlobalItemSearchModal
        isOpen={showItemSearchModal}
        onClose={() => setShowItemSearchModal(false)}
      />

      <Modal
        isOpen={showAddActionSheet}
        onOpenChange={setShowAddActionSheet}
        placement="bottom"
        classNames={{
          base: "mx-0 mb-0 rounded-b-none rounded-t-2xl sm:mx-auto sm:mb-4 sm:rounded-2xl",
        }}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {(onClose) => (
            <>
              <ModalHeader className={modalHeaderClass}>
                Add to WhereKeep
              </ModalHeader>
              <ModalBody className={`${modalBodyClass} grid gap-2`}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setAddItemContext(null);
                    setShowAddItemModal(true);
                  }}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-item-border)] hover:bg-gray-50"
                >
                  <FaBoxOpen className="h-4 w-4 shrink-0 text-[var(--entity-item-accent)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Add item</span>
                    <span className="block text-xs text-gray-600">
                      Scan, upload, or type item details.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/locations?create=location");
                  }}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-location-border)] hover:bg-gray-50"
                >
                  <FaMapMarkedAlt className="h-4 w-4 shrink-0 text-[var(--entity-location-accent)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Add location</span>
                    <span className="block text-xs text-gray-600">
                      Create the place that holds storage areas.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/locations");
                  }}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-area-border)] hover:bg-gray-50"
                >
                  <FaWarehouse className="h-4 w-4 shrink-0 text-[var(--entity-area-accent)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Add storage area</span>
                    <span className="block text-xs text-gray-600">
                      Choose a location, then add its room, shelf, or bin.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/locations");
                  }}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-category-border)] hover:bg-gray-50"
                >
                  <FaTags className="h-4 w-4 shrink-0 text-[var(--entity-category-accent)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Add category</span>
                    <span className="block text-xs text-gray-600">
                      Choose a location and storage area, then add its category.
                    </span>
                  </span>
                </button>
              </ModalBody>
              <ModalFooter className={modalFooterClass}>
                <Button variant="light" className="rounded-xl" onPress={onClose}>
                  Cancel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

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

      {/* Logout confirmation modal */}
      <Modal
        isOpen={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        placement="center"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {(onClose) => (
            <>
              <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
                Confirm logout
              </ModalHeader>
              <ModalBody className={modalBodyClass}>
                <p className="text-sm text-gray-600">
                  Are you sure you want to log out?
                </p>
              </ModalBody>
              <ModalFooter className={modalFooterClass}>
                <Button
                  variant="light"
                  className="rounded-xl"
                  onPress={onClose}
                  isDisabled={loggingOut}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-rose-600 text-white"
                  onPress={async () => {
                    onClose();
                    await handleLogout();
                  }}
                  isDisabled={loggingOut}
                  startContent={
                    loggingOut ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSignOutAlt />
                    )
                  }
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
