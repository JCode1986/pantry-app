"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { logoutAction } from "@/app/actions/auth";
import {
  updatePreferredNameAction,
  updateUserPreferencesAction,
} from "@/app/actions/preferences";
import {
  createHouseholdInviteAction,
  getHouseholdSharingAction,
  removeHouseholdMemberAction,
  resendHouseholdInviteAction,
  revokeHouseholdInviteAction,
  updateHouseholdMemberRoleAction,
} from "@/app/actions/household";
import { INVENTORY_CHANGE_EVENT } from "@/utils/clientEvents";
import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import {
  DEFAULT_PREFERENCES,
  FONT_OPTIONS,
  PREFERENCE_STORAGE_KEY,
  THEME_OPTIONS,
  applyAppPreferences,
  getFontById,
  getThemeById,
  readStoredPreferences,
  saveStoredPreferences,
} from "@/utils/appPreferences";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
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
  FaCopy,
  FaEnvelope,
  FaTimesCircle,
  FaUserPlus,
} from "react-icons/fa";
import {
  LuActivity,
  LuChevronRight,
  LuHouse,
  LuLifeBuoy,
  LuLogOut,
  LuMail,
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
    { count: locationsCount = 0, error: locationsError },
    { count: storageAreasCount = 0, error: storageAreasError },
    { count: categoriesCount = 0, error: categoriesError },
    { count: itemsCount = 0, error: itemsError },
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
    supabase.from("locations").select("*", { count: "exact", head: true }),
    supabase.from("storage_areas").select("*", { count: "exact", head: true }),
    supabase.from("storage_categories").select("*", { count: "exact", head: true }),
    supabase.from("items").select("*", { count: "exact", head: true }),
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
    console.error("Navigation attention count error:", {
      expiredError,
      expiringSoonError,
      shoppingListError,
      locationsError,
      storageAreasError,
      categoriesError,
      itemsError,
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

        <Link href="/" className="flex min-w-0 items-center justify-center gap-2">
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

const mobileMenuSections = [
  {
    title: "Dashboard",
    items: [
      { href: "/", label: "Overview", icon: FaHome },
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
        href: "/shopping-list",
        label: "Shopping List",
        icon: FaShoppingBasket,
        countKey: "shoppingListNeededItems",
      },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/profile", label: "Profile", icon: FaUserCircle }],
  },
];

const desktopSidebarSections = [
  {
    title: "HOME",
    items: [
      { href: "/", label: "Overview", icon: LuHouse },
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

const HOUSEHOLD_ROLE_OPTIONS = [
  { id: "editor", label: "Editor" },
  { id: "viewer", label: "Viewer" },
];

function CountBadge({ value }) {
  if (value === null || value === undefined || value <= 0) return null;

  return (
    <span className="ml-auto grid min-w-7 place-items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold leading-5 text-gray-500">
      {value > 99 ? "99+" : value}
    </span>
  );
}

function SidebarCountBadge({ value }) {
  if (value === null || value === undefined || value <= 0) return null;

  return (
    <span className="ml-auto min-w-7 rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-center text-[11px] font-semibold leading-5 text-[var(--stocksense-brand)]">
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

function formatPanelDate(value) {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function HouseholdSharingPanel({
  activePanel,
  activeTab,
  sharing,
  loading,
  actionLoading,
  error,
  message,
  inviteEmail,
  inviteRole,
  removeCandidateId,
  copiedInviteId,
  onClose,
  onSelectTab,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onResendInvite,
  onRevokeInvite,
  onUpdateMemberRole,
  onRequestRemoveMember,
  onCancelRemoveMember,
  onConfirmRemoveMember,
}) {
  const members = sharing?.members ?? [];
  const invites = sharing?.invites ?? [];
  const pendingInviteCount = invites.filter((invite) => invite.status === "pending").length;
  const isMembersTab = activeTab === "members";
  const isOwner = sharing?.currentUserRole === "owner";
  const canInvite = Boolean(sharing?.canInvite);
  const title = isMembersTab ? "Household members" : "Household invites";
  const subtitle = isMembersTab
    ? "People who can access this household inventory."
    : "Pending and recent household invitations.";

  return (
    <AnimatePresence>
      {activePanel === "members" && (
        <motion.div
          className="fixed bottom-0 right-0 top-0 z-[45] hidden transition-[left] duration-200 lg:block"
          style={{ left: "var(--wherekeep-sidebar-offset)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <button
            type="button"
            aria-label="Close household panel"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/5"
          />
          <motion.aside
            className="absolute bottom-4 left-4 top-4 flex flex-col overflow-hidden rounded-3xl border border-[var(--stocksense-brand-border)] bg-white shadow-2xl transition-[width] duration-200"
            style={{
              width: "min(420px, calc(100vw - var(--wherekeep-sidebar-offset) - 2rem))",
            }}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="border-b border-gray-100 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                    Household
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                  aria-label="Close panel"
                >
                  <FaTimes className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => onSelectTab("members")}
                  className={cx(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    isMembersTab
                      ? "bg-white text-[var(--stocksense-brand)] shadow-sm"
                      : "text-gray-500 hover:text-[var(--stocksense-brand)]"
                  )}
                >
                  Members
                  {members.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">{members.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab("invites")}
                  className={cx(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    !isMembersTab
                      ? "bg-white text-[var(--stocksense-brand)] shadow-sm"
                      : "text-gray-500 hover:text-[var(--stocksense-brand)]"
                  )}
                >
                  Invites
                  {pendingInviteCount > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      {pendingInviteCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading && (
                <div className="grid min-h-48 place-items-center rounded-2xl border border-gray-100 bg-gray-50 text-sm font-medium text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <FaSpinner className="h-4 w-4 animate-spin text-[var(--stocksense-brand)]" />
                    Loading household details
                  </span>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {!loading && !error && message && (
                <div
                  className={cx(
                    "mb-4 rounded-2xl border px-4 py-3 text-sm",
                    message.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  )}
                  role={message.type === "success" ? "status" : "alert"}
                >
                  {message.text}
                </div>
              )}

              {!loading && !error && isMembersTab && (
                <div className="space-y-3">
                  {members.length > 0 ? (
                    members.map((member) => {
                      const memberLabel = member.displayName || member.email;
                      const showEmail = Boolean(member.displayName && member.email);

                      return (
                        <div
                          key={member.userId || member.email}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-sm font-bold uppercase text-[var(--stocksense-brand)]">
                            {(memberLabel || "?").slice(0, 1)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-950">
                              {memberLabel}
                            </p>
                            {showEmail && (
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {member.email}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-gray-500">
                              Joined {formatPanelDate(member.joinedAt) ?? "recently"}
                            </p>
                            {isOwner && member.role !== "owner" && (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Select
                                  aria-label={`Role for ${memberLabel}`}
                                  size="sm"
                                  selectedKeys={new Set([member.role === "viewer" ? "viewer" : "editor"])}
                                  onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0];
                                    if (value) onUpdateMemberRole(member, String(value));
                                  }}
                                  isDisabled={Boolean(actionLoading)}
                                  variant="bordered"
                                  radius="lg"
                                  className="w-28"
                                  classNames={themedSelectClassNames}
                                >
                                  {HOUSEHOLD_ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role.id}>{role.label}</SelectItem>
                                  ))}
                                </Select>
                                {removeCandidateId === member.userId ? (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="light"
                                      className="rounded-lg px-2"
                                      onPress={onCancelRemoveMember}
                                      isDisabled={actionLoading === `remove:${member.userId}`}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="flat"
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 text-rose-700"
                                      onPress={() => onConfirmRemoveMember(member)}
                                      isLoading={actionLoading === `remove:${member.userId}`}
                                      isDisabled={
                                        Boolean(actionLoading) &&
                                        actionLoading !== `remove:${member.userId}`
                                      }
                                    >
                                      Confirm
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 text-rose-700"
                                    onPress={() => onRequestRemoveMember(member)}
                                    isDisabled={Boolean(actionLoading)}
                                    startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                            {formatHouseholdRole(member.role)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-gray-900">
                        No members yet
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Household members will appear here once they join.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!loading && !error && !isMembersTab && !isOwner && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-900">
                    Owner access required
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Only the household owner can invite and manage members.
                  </p>
                </div>
              )}

              {!loading && !error && !isMembersTab && isOwner && (
                <div className="space-y-3">
                  <form
                    onSubmit={onCreateInvite}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3"
                  >
                    <div className="space-y-3">
                      <Input
                        label="Invite by email"
                        type="email"
                        value={inviteEmail}
                        onValueChange={onInviteEmailChange}
                        isDisabled={Boolean(actionLoading) || !canInvite}
                        classNames={{
                          inputWrapper: "rounded-xl border border-stocksense-gray bg-white shadow-none",
                        }}
                      />
                      <div className="flex items-end gap-2">
                        <Select
                          label="Role"
                          selectedKeys={new Set([inviteRole])}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0];
                            if (value) onInviteRoleChange(String(value));
                          }}
                          isDisabled={Boolean(actionLoading) || !canInvite}
                          variant="bordered"
                          radius="lg"
                          className="min-w-0 flex-1"
                          classNames={themedSelectClassNames}
                        >
                          {HOUSEHOLD_ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role.id}>{role.label}</SelectItem>
                          ))}
                        </Select>
                        <Button
                          type="submit"
                          className="h-14 rounded-xl bg-[var(--stocksense-brand)] px-4 text-white"
                          isLoading={actionLoading === "invite"}
                          isDisabled={Boolean(actionLoading) || !canInvite}
                          startContent={<FaUserPlus className="h-3.5 w-3.5" />}
                        >
                          Send
                        </Button>
                      </div>
                      {!canInvite && (
                        <p className="text-xs text-amber-700">
                          Upgrade to Family or free up a member slot to send invites.
                        </p>
                      )}
                    </div>
                  </form>

                  {invites.length > 0 ? (
                    invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                            <LuMail className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-950">
                              {invite.email}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {formatHouseholdRole(invite.role)} access
                              {invite.expiresAt
                                ? ` - Expires ${formatPanelDate(invite.expiresAt)}`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={cx(
                              "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                              (invite.status ?? "pending") === "pending"
                                ? "border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                                : "border border-gray-200 bg-gray-50 text-gray-500"
                            )}
                          >
                            {invite.status ?? "pending"}
                          </span>
                        </div>
                        {isOwner && (
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            {invite.link && (
                              <Button
                                size="sm"
                                variant="flat"
                                className="rounded-lg border border-gray-200 bg-white text-gray-700"
                                onPress={() => onCopyInvite(invite)}
                                isDisabled={Boolean(actionLoading)}
                                startContent={<FaCopy className="h-3.5 w-3.5" />}
                              >
                                {copiedInviteId === invite.id ? "Copied" : "Copy"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="flat"
                              className="rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                              onPress={() => onResendInvite(invite.id)}
                              isLoading={actionLoading === `resend:${invite.id}`}
                              isDisabled={
                                Boolean(actionLoading) &&
                                actionLoading !== `resend:${invite.id}`
                              }
                              startContent={<FaEnvelope className="h-3.5 w-3.5" />}
                            >
                              Resend
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                              onPress={() => onRevokeInvite(invite.id)}
                              isLoading={actionLoading === `revoke:${invite.id}`}
                              isDisabled={
                                Boolean(actionLoading) &&
                                actionLoading !== `revoke:${invite.id}`
                              }
                              startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                            >
                              Revoke
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-gray-900">
                        No invites
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Pending household invites will appear here.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PreferencesPanel({
  isOpen,
  preferences,
  preferredName,
  saving,
  message,
  onClose,
  onThemeChange,
  onFontChange,
  onPreferredNameChange,
  onSavePreferredName,
}) {
  const selectedTheme = getThemeById(preferences.themeId);
  const selectedFont = getFontById(preferences.fontId);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-0 right-0 top-0 z-[45] hidden transition-[left] duration-200 lg:block"
          style={{ left: "var(--wherekeep-sidebar-offset)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <button
            type="button"
            aria-label="Close preferences panel"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/5"
          />
          <motion.aside
            className="absolute bottom-4 left-4 top-4 flex flex-col overflow-hidden rounded-3xl border border-[var(--stocksense-brand-border)] bg-white shadow-2xl transition-[width] duration-200"
            style={{
              width: "min(420px, calc(100vw - var(--wherekeep-sidebar-offset) - 2rem))",
            }}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Preferences"
          >
            <div className="border-b border-gray-100 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                    Account
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    Preferences
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Set how WhereKeep looks and what it should call you.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                  aria-label="Close panel"
                >
                  <FaTimes className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {message && (
                <div
                  className={cx(
                    "rounded-2xl border px-4 py-3 text-sm",
                    message.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  )}
                  role={message.type === "success" ? "status" : "alert"}
                >
                  {message.text}
                </div>
              )}

              <form
                onSubmit={onSavePreferredName}
                className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3"
              >
                <Input
                  label="What should we call you?"
                  value={preferredName}
                  onValueChange={onPreferredNameChange}
                  placeholder="First name or nickname"
                  classNames={{
                    inputWrapper: "rounded-xl border border-stocksense-gray bg-white shadow-none",
                  }}
                />
                <Button
                  type="submit"
                  className="mt-3 rounded-xl bg-[var(--stocksense-brand)] text-white"
                  isDisabled={saving}
                  isLoading={saving}
                >
                  Save name
                </Button>
              </form>

              <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${selectedTheme.swatch}, ${selectedTheme.border})`,
                    }}
                  >
                    Aa
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-950">
                      {selectedTheme.label} with {selectedFont.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Changes apply across this app when saved.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Select
                    label="Color theme"
                    selectedKeys={new Set([preferences.themeId])}
                    onSelectionChange={onThemeChange}
                    isDisabled={saving}
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    {THEME_OPTIONS.map((theme) => (
                      <SelectItem key={theme.id} textValue={theme.label}>
                        {theme.label} - {theme.description}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    label="Font"
                    selectedKeys={new Set([preferences.fontId])}
                    onSelectionChange={onFontChange}
                    isDisabled={saving}
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.id} textValue={font.label}>
                        {font.label} - {font.description}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
        "fixed inset-y-0 left-0 z-50 hidden border-r border-[var(--stocksense-brand-border)] bg-white/95 py-5 shadow-xl backdrop-blur transition-[width,padding] duration-200 lg:flex lg:flex-col",
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

      <div className={cx("flex items-center", isCollapsed ? "justify-center" : "px-2")}>
        <Link
          href="/"
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

      <div className={cx("mt-7 flex-1 space-y-6 overflow-y-auto", isCollapsed ? "pr-0" : "pr-1")}>
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

      <div className="space-y-3 border-t border-gray-100 pt-4">
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
                <p className="mt-0.5 text-xs font-medium text-[var(--stocksense-brand)]">
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
          {!isCollapsed && <span>{loggingOut ? "Logging out..." : "Sign out"}</span>}
        </button>
      </div>
    </aside>
  );
}

function MobileMenu({
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] bg-slate-950/20 lg:hidden"
          variants={menuBackdropVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <motion.div
            className="flex h-full w-full flex-col overflow-y-auto bg-white px-5 pt-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
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
            </motion.div>

            <motion.div
              variants={menuItemVariants}
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
            </motion.div>

            <div className="grid flex-1 content-start gap-5">
              {mobileMenuSections.map((section) => (
                <motion.section key={section.title} variants={menuItemVariants}>
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
                </motion.section>
              ))}
            </div>

            <motion.div
              variants={menuItemVariants}
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
  anchor,
  expiredCount,
  expiringSoonCount,
  shoppingListItems,
}) {
  const hasAttention =
    expiredCount > 0 || expiringSoonCount > 0 || shoppingListItems > 0;
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-slate-950/25 md:bg-transparent"
          variants={menuBackdropVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="absolute left-4 right-4 top-[4.25rem] ml-auto max-h-[calc(100svh-5.25rem)] max-w-md overflow-visible rounded-2xl border border-[var(--stocksense-brand-border)] bg-white shadow-2xl md:left-auto md:right-5 md:top-[4.5rem] md:w-[390px]"
            style={anchoredStyle}
            variants={sheetPanelVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="absolute -top-2 right-5 h-4 w-4 rotate-45 border-l border-t border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]"
              style={arrowStyle}
            />
            <div className="flex items-start justify-between gap-3 rounded-t-2xl border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-4">
              <div className="flex items-start gap-3">
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
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No expired items, urgent expirations, or needed shopping list items.
                </div>
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
  const [removeMemberCandidateId, setRemoveMemberCandidateId] = useState(null);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferredName, setPreferredName] = useState(initialPreferredName);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState(null);

  const activeHref = useMemo(() => {
    const desktopItems = desktopSidebarSections.flatMap((section) => section.items);
    const routeItems = [...navItems, ...desktopItems]
      .map((item) => item.href?.split("#")[0])
      .filter(Boolean);
    const uniqueRoutes = [...new Set(routeItems)];
    const match =
      uniqueRoutes
        .filter((href) => href !== "/" && pathname?.startsWith(href))
        .sort((a, b) => b.length - a.length)[0] ||
      uniqueRoutes.find((href) => href === "/");

    return match || "/";
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
      localStorage.removeItem(PREFERENCE_STORAGE_KEY);
      applyAppPreferences(DEFAULT_PREFERENCES);
      const result = await logoutAction();
      window.location.href = result?.redirectTo || "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
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
    const normalized = saveStoredPreferences({
      ...preferences,
      ...nextPreferences,
    });

    setPreferences(normalized);
    setPreferenceSaving(true);
    setPreferenceMessage(null);

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

  const handleSidebarThemeChange = (keys) => {
    const themeId = Array.from(keys)[0];
    if (!themeId || themeId === preferences.themeId) return;
    updateSidebarPreferences({ themeId: String(themeId) });
  };

  const handleSidebarFontChange = (keys) => {
    const fontId = Array.from(keys)[0];
    if (!fontId || fontId === preferences.fontId) return;
    updateSidebarPreferences({ fontId: String(fontId) });
  };

  const handleSavePreferredName = async (event) => {
    event.preventDefault();
    const normalizedName = preferredName.trim();
    setPreferredName(normalizedName);
    setPreferenceSaving(true);
    setPreferenceMessage(null);

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
    setSharingActionLoading("invite");
    setSharingMessage(null);

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
    setRemoveMemberCandidateId(member.userId);
  };

  const handleCancelSidebarRemoveMember = () => {
    if (sharingActionLoading?.startsWith("remove:")) return;
    setRemoveMemberCandidateId(null);
  };

  const handleConfirmSidebarRemoveMember = async (member) => {
    if (!member?.userId) return;

    setSharingActionLoading(`remove:${member.userId}`);
    setSharingMessage(null);

    const result = await removeHouseholdMemberAction(member.userId);
    setSharingActionLoading("");
    setRemoveMemberCandidateId(null);

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
    let cancelled = false;

    const refreshAttentionCounts = async () => {
      const nextCounts = await fetchAttentionCounts();
      if (!cancelled && nextCounts) {
        setLiveAttentionCounts((current) => ({ ...current, ...nextCounts }));
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
        removeCandidateId={removeMemberCandidateId}
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
        onCancelRemoveMember={handleCancelSidebarRemoveMember}
        onConfirmRemoveMember={handleConfirmSidebarRemoveMember}
      />

      <PreferencesPanel
        isOpen={sharingPanel === "preferences"}
        preferences={preferences}
        preferredName={preferredName}
        saving={preferenceSaving}
        message={preferenceMessage}
        onClose={() => setSharingPanel(null)}
        onThemeChange={handleSidebarThemeChange}
        onFontChange={handleSidebarFontChange}
        onPreferredNameChange={setPreferredName}
        onSavePreferredName={handleSavePreferredName}
      />

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

      <AttentionSheet
        isOpen={isAttentionOpen}
        onClose={() => setIsAttentionOpen(false)}
        anchor={attentionAnchor}
        expiredCount={expiredCount}
        expiringSoonCount={expiringSoonCount}
        shoppingListItems={shoppingListNeededItems}
      />

      <nav
        className={cx(
          "fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden",
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
          wrapper: "max-md:items-end",
          base: "mx-0 mb-0 max-md:w-screen max-md:max-w-none rounded-b-none rounded-t-2xl sm:mx-auto sm:mb-4 sm:rounded-2xl",
        }}
      >
        <ModalContent
          className={`${modalContentClass} max-md:h-auto max-md:max-h-[85svh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:shadow-2xl`}
          style={modalContentStyle}
        >
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
                    setAddItemContext(routeAddItemContext);
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
        classNames={{
          wrapper: "max-md:items-end",
          base: "max-md:m-0 max-md:w-screen max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl",
        }}
      >
        <ModalContent
          className={`${modalContentClass} max-md:h-auto max-md:max-h-[80svh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:shadow-2xl`}
          style={modalContentStyle}
        >
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
