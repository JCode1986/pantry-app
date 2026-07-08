"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardBody,
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Skeleton,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import {
  FaBoxOpen,
  FaChevronLeft,
  FaEdit,
  FaEllipsisV,
  FaPlus,
  FaSearch,
  FaTag,
  FaTags,
  FaTrash,
  FaWarehouse,
} from "react-icons/fa";

import {
  addCategory,
  deleteStorageArea,
  updateCategoryName,
  deleteCategory,
  updateStorageArea,
} from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import useDesktopAutoFocus from "@/components/modals/useDesktopAutoFocus";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import { containsQuery } from "@/utils/pantry/search";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { emitInventoryChange } from "@/utils/clientEvents";

const CATEGORY_SUGGESTIONS = ["Food", "Documents", "Tools", "Medicine", "Clothes", "Electronics"];

function StatPill({ label, value }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
      <strong>{value}</strong> {label}
    </span>
  );
}

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const pageItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, type: "spring", stiffness: 120 },
  },
};

export default function AreaDetailClient({
  area,
  initialCategories,
  canEditInventory = true,
}) {
  const router = useRouter();
  const [areaName, setAreaName] = useState(area?.name ?? "");
  const [areaImageUrl, setAreaImageUrl] = useState(area?.imageUrl ?? null);
  const [categories, setCategories] = useState(initialCategories ?? []);
  const [search, setSearch] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [mobileAddOpen, setMobileAddOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [editAreaOpen, setEditAreaOpen] = useState(false);
  const [editAreaName, setEditAreaName] = useState(area?.name ?? "");
  const [deleteAreaOpen, setDeleteAreaOpen] = useState(false);
  const [isDeletingArea, setIsDeletingArea] = useState(false);

  const [renameModal, setRenameModal] = useState({
    open: false,
    id: null,
    name: "",
    imageUrl: null,
  });
  const shouldAutoFocus = useDesktopAutoFocus(
    mobileAddOpen || editAreaOpen || renameModal.open
  );

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
    busy: false,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => containsQuery(c.name, q));
  }, [categories, search]);

  const totals = useMemo(() => {
    return {
      categories: categories.length,
      items: categories.reduce((sum, c) => sum + (c.itemsCount || 0), 0),
    };
  }, [categories]);

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.categoryId || String(item.storageAreaId) !== String(area?.id)) {
        return;
      }

      setCategories((prev) => {
        const categoryExists = prev.some(
          (category) => String(category.id) === String(item.categoryId)
        );

        if (!categoryExists) {
          return [
            ...prev,
            {
              id: item.categoryId,
              name: item.categoryName ?? "Category",
              itemsCount: 1,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        }

        return prev.map((category) =>
          String(category.id) === String(item.categoryId)
            ? {
                ...category,
                itemsCount: (category.itemsCount ?? 0) + 1,
              }
            : category
        );
      });
    };

    window.addEventListener("stocksense:item-added", handleItemAdded);

    return () => {
      window.removeEventListener("stocksense:item-added", handleItemAdded);
    };
  }, [area?.id]);

  // ---------------- Actions ----------------

  const handleRenameArea = async () => {
    if (!canEditInventory) return;
    const name = editAreaName.trim();
    if (!name || !area?.id) return;

    const previousName = areaName;
    setIsSaving(true);
    setAreaName(name);

    try {
      const result = await updateStorageArea(area.id, name);
      if (result?.error) throw result.error;
      setEditAreaOpen(false);
      emitInventoryChange({
        entity: "storage_area",
        action: "updated",
        id: area.id,
      });
      router.refresh();
    } catch (e) {
      console.error("updateStorageArea failed:", e);
      setAreaName(previousName);
      setEditAreaName(previousName);
      alert("Failed to update storage area. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAreaImageChange = ({ imageUrl }) => {
    setAreaImageUrl(imageUrl ?? null);
    emitInventoryChange({
      entity: "storage_area",
      action: imageUrl ? "image_updated" : "image_removed",
      id: area?.id,
    });
  };

  const handleDeleteArea = async () => {
    if (!canEditInventory || !area?.id) return;

    setIsDeletingArea(true);
    try {
      const result = await deleteStorageArea(area.id);
      if (result?.error) throw result.error;
      emitInventoryChange({
        entity: "storage_area",
        action: "deleted",
        id: area.id,
      });
      router.replace("/areas");
    } catch (e) {
      console.error("deleteStorageArea failed:", e);
      setIsDeletingArea(false);
      alert("Failed to delete storage area. Please try again.");
    }
  };

  const handleAddCategory = async () => {
    if (!canEditInventory) return;
    const name = newCategory.trim();
    if (!name) return;

    setIsSaving(true);

    // Optimistic insert (temp id)
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      name,
      image_path: null,
      imageUrl: null,
      itemsCount: 0,
      _optimistic: true,
    };

    setCategories((prev) =>
      [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewCategory("");

    try {
      const result = await addCategory(area.id, name);

      if (result?.error) {
        throw result.error;
      }

      const created = result?.data;
      if (!created?.id) throw new Error("Category create failed: no id returned");

      setCategories((prev) =>
        prev
          .map((c) =>
            c.id === tempId
              ? {
                  id: created.id,
                  name: created.name,
                  image_path: created.image_path ?? null,
                  imageUrl: null,
                  itemsCount: 0,
                }
              : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      emitInventoryChange({
        entity: "category",
        action: "added",
        id: created.id,
      });
      setMobileAddOpen(false);
    } catch (e) {
      console.error("addCategory failed:", e);

      // rollback optimistic
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      alert("Failed to add category. Please try again.");
      setNewCategory(name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRename = async () => {
    if (!canEditInventory) return;
    const name = renameModal.name.trim();
    if (!name || !renameModal.id) return;

    const id = renameModal.id;
    const prevName = categories.find((c) => c.id === id)?.name;

    setIsSaving(true);

    // optimistic rename
    setCategories((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, name } : c))
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    try {
      const result = await updateCategoryName(id, name);
      if (result?.error) throw result.error;

      setRenameModal({ open: false, id: null, name: "", imageUrl: null });
      emitInventoryChange({
        entity: "category",
        action: "updated",
        id,
      });
    } catch (e) {
      console.error("updateCategoryName failed:", e);

      // rollback
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, name: prevName || c.name } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      alert("Failed to rename category. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryImageChange = ({ imageUrl }) => {
    const id = renameModal.id;
    if (!id) return;

    setRenameModal((prev) => ({ ...prev, imageUrl: imageUrl ?? null }));
    setCategories((prev) =>
      prev.map((category) =>
        String(category.id) === String(id)
          ? { ...category, imageUrl: imageUrl ?? null }
          : category
      )
    );
    emitInventoryChange({
      entity: "category",
      action: imageUrl ? "image_updated" : "image_removed",
      id,
    });
  };

  const handleDelete = async () => {
    if (!canEditInventory) return;
    if (!deleteModal.id) return;

    const id = deleteModal.id;

    setDeleteModal((p) => ({ ...p, busy: true }));

    // optimistic remove
    const snapshot = categories;
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      const result = await deleteCategory(id);
      if (result?.error) throw result.error;

      setDeleteModal({ open: false, id: null, name: "", busy: false });
      emitInventoryChange({
        entity: "category",
        action: "deleted",
        id,
      });
    } catch (e) {
      console.error("deleteCategory failed:", e);

      // rollback
      setCategories(snapshot);
      setDeleteModal((p) => ({ ...p, busy: false }));

      alert("Failed to delete category. Please try again.");
    }
  };

  // ---------------- UI ----------------

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-5">
      <motion.header variants={pageItemVariants} className="md:hidden">
        <Link
          href="/areas"
          className="inline-flex items-center text-sm font-medium text-[var(--stocksense-brand)]"
        >
          Back to storage areas
        </Link>

        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-slate-900/5">
          <div className="h-44 bg-[var(--entity-area-soft)]">
            {areaImageUrl ? (
              <img src={areaImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[var(--entity-area-accent)]">
                <FaWarehouse className="h-14 w-14" />
              </div>
            )}
          </div>

          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Storage Area
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-950">
              {areaName}
            </h1>
            <p className="mt-1 truncate text-sm text-gray-500">
              {area?.location?.name || "Unknown location"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <FaTags className="h-4 w-4 text-[var(--stocksense-brand)]" />
                <p className="mt-2 text-xl font-semibold leading-none text-gray-950">
                  {totals.categories}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-4 text-gray-500">
                  Categories
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <FaBoxOpen className="h-4 w-4 text-[var(--stocksense-brand)]" />
                <p className="mt-2 text-xl font-semibold leading-none text-gray-950">
                  {totals.items}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-4 text-gray-500">
                  Items
                </p>
              </div>
            </div>

            {canEditInventory && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="flat"
                  className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  onPress={() => {
                    setEditAreaName(areaName);
                    setEditAreaOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit area
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={() => setDeleteAreaOpen(true)}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Header */}
      <motion.div variants={pageItemVariants} className="flex flex-col gap-3 max-md:hidden">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/areas" className="inline-flex items-center gap-2 hover:text-[var(--stocksense-brand)]">
            <FaChevronLeft className="h-3.5 w-3.5" />
            Areas
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600">{area?.location?.name || "Location"}</span>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-800">{areaName || "Area"}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              {areaImageUrl && (
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                  <img
                    src={areaImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
                {areaName}
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              {canEditInventory ? "Manage" : "View"} categories for{" "}
              <span className="font-medium">{area?.location?.name}</span>.
              Click a category to view items.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatPill
                label={totals.categories === 1 ? "Category" : "Categories"}
                value={totals.categories}
              />
              <StatPill
                label={totals.items === 1 ? "Item" : "Items"}
                value={totals.items}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search categories…"
              startContent={<FaSearch className="text-gray-400" />}
              className="sm:w-[320px]"
              radius="lg"
              variant="bordered"
            />
            <OpenGlobalAddItemButton
              canEditInventory={canEditInventory}
              context={{
                locationId: area?.location?.id,
                storageAreaId: area?.id,
              }}
            />
            {canEditInventory && (
              <>
                <Button
                  variant="flat"
                  className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700"
                  onPress={() => {
                    setEditAreaName(areaName);
                    setEditAreaOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={() => setDeleteAreaOpen(true)}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <motion.section variants={pageItemVariants} className="md:hidden">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              Categories
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse the groups inside this storage area.
            </p>
          </div>
          {canEditInventory && (
            <button
              type="button"
              onClick={() => setMobileAddOpen(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
            >
              <FaPlus className="h-3 w-3" /> Add
            </button>
          )}
        </div>
      </motion.section>

      <section className="grid gap-3 md:hidden">
        {filtered.map((cat) => (
          <article
            key={cat.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <Link
              href={`/categories/${cat.id}`}
              className="flex min-h-[96px] w-full items-center gap-4 p-4 text-left transition active:scale-[0.99]"
            >
              {cat.imageUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-category-border)] bg-white">
                  <img src={cat.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                  <FaTag className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold leading-6 text-gray-950">
                  {cat.name}
                </p>
                <p className="mt-2 text-sm leading-5 text-gray-500">
                  {cat.itemsCount} {cat.itemsCount === 1 ? "item" : "items"}
                </p>
              </div>
            </Link>

            {canEditInventory && (
              <div className="grid grid-cols-2 gap-2 border-t border-gray-200 bg-gray-50 p-3">
                <button
                  type="button"
                  onClick={() =>
                    setRenameModal({
                      open: true,
                      id: cat.id,
                      name: cat.name,
                      imageUrl: cat.imageUrl ?? null,
                    })
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal({
                      open: true,
                      id: cat.id,
                      name: cat.name,
                      busy: false,
                    })
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700"
                >
                  Delete
                </button>
              </div>
            )}
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-7 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
              <FaTag className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No categories found
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {canEditInventory
                ? "Try a different search, or add a new category."
                : "Try a different search."}
            </p>
          </div>
        )}
      </section>

      {/* Add Category */}
      {canEditInventory && <motion.div variants={pageItemVariants} className="max-md:hidden">
        <Card className="border border-stocksense-gray shadow-sm">
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              value={newCategory}
              onValueChange={setNewCategory}
              placeholder={`Add a category in ${areaName} (e.g., Fruits, Snacks)`}
              radius="lg"
              variant="bordered"
              className="w-full"
              isDisabled={isSaving}
            />
            <Button
              className="rounded-xl bg-[var(--stocksense-brand)] text-white"
              onPress={handleAddCategory}
              isDisabled={isSaving || !newCategory.trim()}
              startContent={<FaPlus />}
            >
              Add Category
            </Button>
          </div>

          {/* saving hint */}
          {isSaving && (
            <div className="mt-3">
              <Skeleton className="rounded-lg">
                <div className="h-3 w-44" />
              </Skeleton>
            </div>
          )}
        </CardBody>
        </Card>
      </motion.div>}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-4 max-md:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence>
          {filtered.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
            >
              <Card className="group relative overflow-hidden border border-stocksense-gray shadow-sm transition hover:bg-gray-50 hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--entity-category-accent)]" />
                <CardBody className="p-3.5 pt-4 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/categories/${cat.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {cat.imageUrl ? (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-gray-50">
                            <img
                              src={cat.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-2 text-[var(--stocksense-brand)]">
                            <FaTag />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate text-[15px] font-semibold leading-5 text-gray-950 group-hover:underline sm:text-base">
                            {cat.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {cat.itemsCount} {cat.itemsCount === 1 ? "item" : "items"}
                          </p>
                        </div>
                      </div>
                    </Link>

                    {canEditInventory && (
                      <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                          <Button isIconOnly variant="light" radius="lg" isDisabled={isSaving}>
                            <FaEllipsisV className="text-gray-500" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Category actions">
                          <DropdownItem
                            key="edit"
                            onPress={() =>
                              setRenameModal({
                                open: true,
                                id: cat.id,
                                name: cat.name,
                                imageUrl: cat.imageUrl ?? null,
                              })
                            }
                          >
                            Edit
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            onPress={() =>
                              setDeleteModal({ open: true, id: cat.id, name: cat.name, busy: false })
                            }
                          >
                            Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </div>

                  <div className="mt-3">
                    <Link
                      href={`/categories/${cat.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] px-2.5 text-xs text-[var(--entity-category-accent)] hover:brightness-95"
                    >
                      View items →
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <Card className="border border-dashed border-stocksense-gray">
            <CardBody className="p-8 text-center">
              <p className="text-sm text-gray-600 font-medium">No categories found</p>
              <p className="text-xs text-gray-500 mt-1">
                {canEditInventory
                  ? "Try a different search, or add a new category above."
                  : "Try a different search."}
              </p>
              <div className="mt-4 flex justify-center">
                <OpenGlobalAddItemButton
                  canEditInventory={canEditInventory}
                  context={{
                    locationId: area?.location?.id,
                    storageAreaId: area?.id,
                  }}
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {canEditInventory && (
        <Modal
          isOpen={mobileAddOpen}
          onOpenChange={(open) => {
            if (!open && !isSaving) setMobileAddOpen(false);
          }}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {() => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Create Category</span>
                  <MobileSheetCloseButton onPress={() => setMobileAddOpen(false)} />
                </ModalHeader>
                <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                  <Input
                    label="Category name"
                    value={newCategory}
                    onValueChange={setNewCategory}
                    placeholder={`Category in ${areaName}`}
                    radius="lg"
                    variant="bordered"
                    isDisabled={isSaving}
                    classNames={modalInputClassNames}
                    autoFocus={shouldAutoFocus}
                  />
                  <MobileSuggestionChips
                    suggestions={CATEGORY_SUGGESTIONS}
                    onSelect={setNewCategory}
                  />
                </ModalBody>
                <ModalFooter className={modalFooterClass}>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                    onPress={handleAddCategory}
                    isDisabled={isSaving || !newCategory.trim()}
                    isLoading={isSaving}
                    startContent={!isSaving ? <FaPlus /> : null}
                  >
                    Create Category
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {canEditInventory && (
        <Modal
          isOpen={editAreaOpen}
          onOpenChange={setEditAreaOpen}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Edit storage area</span>
                  <MobileSheetCloseButton onPress={onClose} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Storage area name"
                    value={editAreaName}
                    onValueChange={setEditAreaName}
                    variant="bordered"
                    radius="lg"
                    isDisabled={isSaving}
                    classNames={modalInputClassNames}
                  />
                  <EntityImageManager
                    entityType="storage_area"
                    entityId={area?.id}
                    imageUrl={areaImageUrl}
                    label="Storage area photo"
                    onChange={handleAreaImageChange}
                  />
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={() => {
                        onClose();
                        setDeleteAreaOpen(true);
                      }}
                    >
                      Delete storage area
                    </Button>
                  </div>
                </ModalBody>
                <ModalFooter className={modalFooterClass}>
                  <Button
                    variant="light"
                    onPress={onClose}
                    isDisabled={isSaving}
                    className="max-md:hidden"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                    onPress={handleRenameArea}
                    isLoading={isSaving}
                    isDisabled={!editAreaName.trim()}
                  >
                    Save changes
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {canEditInventory && (
        <ConfirmDeleteModal
          isOpen={deleteAreaOpen}
          isDeleting={isDeletingArea}
          onCancel={() => setDeleteAreaOpen(false)}
          onConfirm={handleDeleteArea}
          title={`Delete storage area "${areaName}"?`}
          description={`This will delete "${areaName}" and all categories and items inside it. This cannot be undone.`}
        />
      )}

      {/* Edit Category Modal */}
      {canEditInventory && <Modal
        isOpen={renameModal.open}
        onOpenChange={(open) => setRenameModal((p) => ({ ...p, open }))}
        placement="center"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {(onClose) => (
            <>
              <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                <span className="min-w-0 flex-1 truncate">Edit category</span>
                <MobileSheetCloseButton onPress={onClose} />
              </ModalHeader>
              <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                <Input
                  value={renameModal.name}
                  onValueChange={(v) => setRenameModal((p) => ({ ...p, name: v }))}
                  variant="bordered"
                  radius="lg"
                  label="Category name"
                  isDisabled={isSaving}
                  classNames={modalInputClassNames}
                />
                <EntityImageManager
                  entityType="category"
                  entityId={renameModal.id}
                  imageUrl={renameModal.imageUrl}
                  label="Category photo"
                  onChange={handleCategoryImageChange}
                />
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <Button
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      const target = {
                        id: renameModal.id,
                        name: renameModal.name,
                        busy: false,
                      };
                      onClose();
                      setDeleteModal({ open: true, ...target });
                    }}
                  >
                    Delete category
                  </Button>
                </div>
              </ModalBody>
              <ModalFooter className={modalFooterClass}>
                <Button
                  variant="light"
                  onPress={onClose}
                  isDisabled={isSaving}
                  className="max-md:hidden"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[var(--stocksense-brand)] text-white"
                  onPress={handleRename}
                  isDisabled={isSaving || !renameModal.name.trim()}
                >
                  Save changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>}

      {canEditInventory && (
        <ConfirmDeleteModal
          isOpen={deleteModal.open}
          isDeleting={deleteModal.busy || isSaving}
          onCancel={() =>
            setDeleteModal({ open: false, id: null, name: "", busy: false })
          }
          onConfirm={handleDelete}
          title={
            deleteModal.name
              ? `Delete category "${deleteModal.name}"?`
              : "Delete category?"
          }
          description={`This will remove "${
            deleteModal.name || "this category"
          }" and all items inside it. This cannot be undone.`}
          confirmLabel="Delete category"
          cancelLabel="Keep category"
        />
      )}
    </motion.div>
  );
}
