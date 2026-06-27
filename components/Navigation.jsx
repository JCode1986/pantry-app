"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import GlobalAddItemModal from "@/components/GlobalAddItemModal";
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
} from "react-icons/fa";

const navItems = [
  { href: "/", label: "Overview", icon: FaHome },
  { href: "/locations", label: "Locations", icon: FaMapMarkedAlt },
  { href: "/areas", label: "Areas", icon: FaWarehouse },
  { href: "/categories", label: "Categories", icon: FaTags },
  { href: "/items", label: "Items", icon: FaBoxOpen },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
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
      await logoutAction();
      localStorage.clear();
      window.location.href = "/login";
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
      setAddItemContext(event.detail ?? null);
      setShowAddItemModal(true);
    };

    window.addEventListener("stocksense:open-add-item", openAddItem);

    return () => {
      window.removeEventListener("stocksense:open-add-item", openAddItem);
    };
  }, []);

  return (
    <>
      <Navbar
        isBordered
        maxWidth="xl"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        className="bg-white"
      >
        <NavbarContent justify="start" className="gap-3">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden"
          />

        <NavbarBrand>
            <Link href="/">
                <div className="relative h-[120px] w-[130px]">
                    <Image
                        src="/stocksense-logo-2.png"
                        alt="StockSense logo"
                        fill
                        sizes="130px"
                        priority
                    />
                </div>
            </Link>
        </NavbarBrand>

          <NavbarContent className="hidden sm:flex gap-2" justify="start">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;

              return (
                <NavbarItem key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]"
                        : "text-gray-600 hover:text-[#0E7488] hover:bg-gray-50"
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
          <NavbarItem className="hidden sm:flex">
            <Button
              className="rounded-xl bg-[#0E7488] text-white"
              onPress={() => {
                setAddItemContext(null);
                setShowAddItemModal(true);
              }}
              startContent={<FaPlus />}
            >
              Add Item
            </Button>
          </NavbarItem>

          <NavbarItem className="hidden sm:flex">
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
                      ? "bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]"
                      : "text-gray-700 hover:bg-gray-50"
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
              className="w-full justify-start rounded-xl bg-[#0E7488] text-white"
              onPress={() => {
                setIsMenuOpen(false);
                setAddItemContext(null);
                setShowAddItemModal(true);
              }}
              startContent={<FaPlus />}
            >
              Add Item
            </Button>

            <Button
              variant="flat"
              className={cx(
                "mt-2 w-full justify-start rounded-xl border",
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

      <GlobalAddItemModal
        isOpen={showAddItemModal}
        initialContext={addItemContext}
        onClose={() => setShowAddItemModal(false)}
        onAdded={({ itemName, destinationName }) =>
          setAddItemNotice({ itemName, destinationName })
        }
      />

      {addItemNotice && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-xl border border-[#9FE7D7] bg-white px-4 py-3 shadow-lg">
          <div className="text-sm font-semibold text-stocksense-teal">
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
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirm logout
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-600">
                  Are you sure you want to log out?
                </p>
              </ModalBody>
              <ModalFooter>
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
