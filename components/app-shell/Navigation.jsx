"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { INVENTORY_CHANGE_EVENT } from "@/utils/clientEvents";
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
  FaMapMarkedAlt,
  FaWarehouse,
  FaTags,
  FaBoxOpen,
  FaSignOutAlt,
  FaSpinner,
  FaHome,
  FaPlus,
  FaSearch,
  FaShoppingBasket,
  FaUserCircle,
} from "react-icons/fa";

const navItems = [
  { href: "/", label: "Overview", icon: FaHome },
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

export default function Navigation({ canEditInventory = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showItemSearchModal, setShowItemSearchModal] = useState(false);
  const [addItemContext, setAddItemContext] = useState(null);
  const [addItemNotice, setAddItemNotice] = useState(null);

  const activeHref = useMemo(() => {
    // Handle nested routes like /locations/[id]
    const match =
      navItems.find((i) => i.href !== "/" && pathname?.startsWith(i.href)) ||
      navItems.find((i) => i.href === "/");
    return match?.href || "/";
  }, [pathname]);

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
      <Navbar
        isBordered
        maxWidth="2xl"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        className="bg-white"
      >
        <NavbarContent justify="start" className="gap-3">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="xl:hidden"
          />

          <NavbarBrand className="grow-0">
            <Link href="/" className="flex items-center gap-2">
              <WhereKeepLogo markClassName="h-11 max-w-[190px]" />
            </Link>
          </NavbarBrand>

          <NavbarContent className="hidden gap-1 xl:flex" justify="start">
            {navItems.map((item) => {
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
          <NavbarItem key="mobile-actions" className="flex gap-2 xl:hidden">
            <button
              type="button"
              aria-label="Search items"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stocksense-gray bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
              onClick={() => {
                setIsMenuOpen(false);
                setShowItemSearchModal(true);
              }}
            >
              <FaSearch className="h-4 w-4" />
            </button>

            {canEditInventory && (
              <button
                type="button"
                aria-label="Add item"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--stocksense-brand)] text-white transition hover:brightness-95"
                onClick={() => {
                  setIsMenuOpen(false);
                  setAddItemContext(null);
                  setShowAddItemModal(true);
                }}
              >
                <FaPlus className="h-4 w-4" />
              </button>
            )}
          </NavbarItem>

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

      {addItemNotice && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-4 py-3 shadow-lg">
          <div className="text-sm font-semibold text-[var(--stocksense-brand)]">
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
