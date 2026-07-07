"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import {
  FaChevronRight,
  FaSearch,
  FaTags,
  FaTrash,
} from "react-icons/fa";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";
import { updateCategoryName, deleteCategory } from "@/app/actions/server";
import { containsQuery } from "@/utils/pantry/search";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { emitInventoryChange } from "@/utils/clientEvents";

const pageSectionVariants = {
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

export default function CategoriesPageClient({
  initialCategories,
  canEditInventory = true,
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories ?? []);
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [renameValue, setRenameValue] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    payload: null,
    isDeleting: false,
    mode: "single",
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const activeCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(activeCategoryId)) || null,
    [categories, activeCategoryId]
  );

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.categoryId) return;

      setCategories((prev) => {
        const existingCategory = prev.find(
          (category) => String(category.id) === String(item.categoryId)
        );

        const itemSummary = {
          id: item.id,
          name: item.name,
          quantity: item.quantity ?? 0,
          expiration_date: item.expiration_date ?? null,
        };

        if (!existingCategory) {
          return [
            ...prev,
            {
              id: item.categoryId,
              name: item.categoryName ?? "Category",
              image_path: null,
              imageUrl: null,
              insertedAt: null,
              storageArea: {
                id: item.storageAreaId ?? null,
                name: item.storageAreaName ?? "Unknown area",
              },
              location: {
                id: item.locationId ?? null,
                name: item.locationName ?? "Unknown location",
              },
              items: [itemSummary],
              itemsCount: 1,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        }

        return prev.map((category) => {
          if (String(category.id) !== String(item.categoryId)) return category;
          if ((category.items ?? []).some((i) => String(i.id) === String(item.id))) {
            return category;
          }

          const items = [...(category.items ?? []), itemSummary];

          return {
            ...category,
            items,
            itemsCount: items.length,
          };
        });
      });
    };

    window.addEventListener("stocksense:item-added", handleItemAdded);

    return () => {
      window.removeEventListener("stocksense:item-added", handleItemAdded);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((c) => {
      const nameMatch = containsQuery(c.name, q);
      const locMatch = containsQuery(c.location?.name, q);
      const areaMatch = containsQuery(c.storageArea?.name, q);
      const itemMatch = (c.items || []).some((i) => containsQuery(i.name, q));
      return nameMatch || locMatch || areaMatch || itemMatch;
    });
  }, [categories, search]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((category) => selectedIds.has(String(category.id)));

  const toggleSelect = (id) => {
    if (!canEditInventory) return;
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelectAllVisible = () => {
    if (!canEditInventory) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((category) => next.delete(String(category.id)));
      } else {
        filtered.forEach((category) => next.add(String(category.id)));
      }
      return next;
    });
  };

  const openDrawer = (cat) => {
    setActiveCategoryId(cat.id);
    setRenameValue(cat.name);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveCategoryId(null);
    setRenameValue("");
  };

  const handleRename = async () => {
    if (!canEditInventory) return;
    if (!activeCategory) return;
    const name = renameValue.trim();
    if (!name) return;

    const result = await updateCategoryName(activeCategory.id, name);
    if (result?.error) {
      console.error(result.error);
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === activeCategory.id ? { ...c, name } : c))
    );
    emitInventoryChange({
      entity: "category",
      action: "updated",
      id: activeCategory.id,
    });
  };

  const handleCategoryImageChange = ({ imagePath, imageUrl }) => {
    if (!activeCategory?.id) return;

    setCategories((prev) =>
      prev.map((category) =>
        category.id === activeCategory.id
          ? {
              ...category,
              image_path: imagePath ?? null,
              imageUrl: imageUrl ?? null,
            }
          : category
      )
    );

    emitInventoryChange({
      entity: "category",
      action: imagePath ? "image_updated" : "image_removed",
      id: activeCategory.id,
    });
  };

  const openDelete = () => {
    if (!canEditInventory) return;
    if (!activeCategory) return;
    openDeleteForCategory(activeCategory);
  };

  const openDeleteForCategory = (category) => {
    if (!canEditInventory || !category) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: "single",
      payload: {
        categoryId: category.id,
        name: category.name,
        storageAreaName: category.storageArea?.name,
        locationName: category.location?.name,
      },
    });
  };

  const openBulkDelete = () => {
    if (!canEditInventory) return;
    if (selectedIds.size === 0) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: "bulk",
      payload: {
        categoryIds: Array.from(selectedIds),
        count: selectedIds.size,
      },
    });
  };

  const closeDelete = () => {
    setDeleteDialog({ open: false, payload: null, isDeleting: false, mode: "single" });
  };

  const confirmDelete = async () => {
    if (!canEditInventory) return;
    if (!deleteDialog.payload) return;

    setDeleteDialog((p) => ({ ...p, isDeleting: true }));

    if (deleteDialog.mode === "bulk") {
      const ids = deleteDialog.payload.categoryIds ?? [];
      const results = await Promise.all(ids.map((id) => deleteCategory(id)));
      const hasError = results.some((result) => result?.error);
      if (hasError) {
        console.error("bulk deleteCategory error:", results);
        closeDelete();
        return;
      }

      const deleted = new Set(ids.map(String));
      setCategories((prev) =>
        prev.filter((category) => !deleted.has(String(category.id)))
      );
      clearSelection();
      if (activeCategoryId && deleted.has(String(activeCategoryId))) closeDrawer();
      emitInventoryChange({
        entity: "category",
        action: "deleted",
        ids,
      });
      closeDelete();
      return;
    }

    const { categoryId } = deleteDialog.payload;
    const result = await deleteCategory(categoryId);
    if (result?.error) {
      console.error(result.error);
      closeDelete();
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(categoryId));
      return next;
    });
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    emitInventoryChange({
      entity: "category",
      action: "deleted",
      id: categoryId,
    });
    closeDelete();
    closeDrawer();
  };

  return (
    <motion.div
      variants={pageSectionVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.section variants={pageItemVariants} className="md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Categories
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Groups of items across every location
            </p>
          </div>
        </div>

        <div className="relative mt-4">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[var(--stocksense-brand)]"
          />
        </div>
      </motion.section>

      <motion.section variants={pageSectionVariants} className="grid gap-3 md:hidden">
        {filtered.length === 0 ? (
          <motion.div
            key="mobile-empty"
            variants={pageItemVariants}
            className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-7 text-center shadow-sm"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
              <FaTags className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No categories found
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Try a different search or add an item to create a category.
            </p>
            {canEditInventory && (
              <div className="mt-5 flex justify-center">
                <OpenGlobalAddItemButton canEditInventory={canEditInventory} />
              </div>
            )}
          </motion.div>
        ) : (
          filtered.map((category) => (
            <motion.article
              key={category.id}
              layout
              variants={pageItemVariants}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => router.push(`/categories/${category.id}`)}
                className="flex min-h-[112px] w-full items-center gap-4 p-4 text-left transition active:scale-[0.99]"
              >
                {category.imageUrl ? (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-category-border)] bg-white">
                    <img
                      src={category.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                    <FaTags className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold leading-6 text-gray-950">
                    {category.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {category.location?.name}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {category.storageArea?.name}
                  </p>
                  <div className="mt-2 text-sm leading-5 text-gray-500">
                    {category.itemsCount ?? 0}{" "}
                    {(category.itemsCount ?? 0) === 1 ? "item" : "items"}
                  </div>
                </div>

                <FaChevronRight className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
              </button>

              {canEditInventory && (
                <div className="grid grid-cols-2 gap-2 border-t border-gray-200 bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={() => openDrawer(category)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteForCategory(category)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </motion.article>
          ))
        )}
      </motion.section>

      {/* Header */}
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm max-md:hidden md:p-5"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-accent)] p-3 text-white shadow-sm">
              <FaTags className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
                Categories
              </h1>
              <p className="text-sm text-gray-500">
                View categories across all locations. Click one to view details.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search categories, locations, areas, items…"
              startContent={<FaSearch className="text-gray-400" />}
              classNames={{
                inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
              }}
            />
          </div>
        </div>

        {canEditInventory && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                disabled={filtered.length === 0 || deleteDialog.isDeleting}
                className="h-5 w-5 cursor-pointer rounded border border-stocksense-gray"
              />
              Select all visible
            </label>

            <Button
              size="sm"
              variant="flat"
              className="w-fit rounded-xl"
              isDisabled={selectedCount === 0 || deleteDialog.isDeleting}
              onPress={clearSelection}
            >
              Clear selection
            </Button>
          </div>
        )}

        {canEditInventory && <AnimatePresence initial={false}>
          {selectedCount > 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-4 overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-700">
                  Bulk actions for <span className="font-semibold">{selectedCount}</span>{" "}
                  categor{selectedCount === 1 ? "y" : "ies"}
                </p>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  className="w-fit rounded-xl"
                  isDisabled={deleteDialog.isDeleting}
                  onPress={openBulkDelete}
                  startContent={<FaTrash />}
                >
                  Delete selected
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>}
      </motion.div>

      {/* List */}
      <motion.div
        variants={pageSectionVariants}
        className="grid grid-cols-1 gap-4 max-md:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence initial={false}>
          {filtered.map((c) => (
          <motion.article
            key={c.id}
            layout
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            onClick={() => openDrawer(c)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") openDrawer(c);
            }}
            role="button"
            tabIndex={0}
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stocksense-gray bg-white p-3.5 pt-4 text-left shadow-sm transition hover:bg-gray-50 cursor-pointer sm:p-4"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--entity-category-accent)]" />
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                {canEditInventory && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(String(c.id))}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={() => toggleSelect(c.id)}
                    aria-label={`Select ${c.name}`}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border border-stocksense-gray"
                  />
                )}
                {c.imageUrl ? (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                    <FaTags className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold leading-5 text-gray-950 sm:text-base">
                    {c.name}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 truncate">
                    {c.location?.name} → {c.storageArea?.name}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] px-2.5 py-1 text-xs text-[var(--entity-category-accent)]">
                  {c.itemsCount} {c.itemsCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
          </motion.article>
          ))}

          {filtered.length === 0 && (
          <motion.div
            key="empty"
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4"
          >
            <p className="text-gray-500">No categories match your search.</p>
            <div className="mt-4 flex justify-center">
              <OpenGlobalAddItemButton canEditInventory={canEditInventory} />
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Drawer (HeroUI Modal styled as right drawer) */}
      <Modal
        isOpen={drawerOpen}
        onOpenChange={(open) => (open ? null : closeDrawer())}
        placement="right"
        size="lg"
        classNames={{
          base: "rounded-none md:rounded-l-2xl h-full md:h-[calc(100vh-24px)] md:my-3",
          wrapper: "items-stretch justify-end",
        }}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {() => (
            <>
              <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass} max-md:flex-row max-md:gap-3`}>
                <div className="min-w-0 flex-1 truncate text-lg font-semibold text-[var(--stocksense-brand)]">
                  {activeCategory?.name || "Category"}
                </div>
                <div className="text-sm text-gray-500 max-md:hidden">
                  {activeCategory?.location?.name} → {activeCategory?.storageArea?.name}
                </div>
                <MobileSheetCloseButton onPress={closeDrawer} />
              </ModalHeader>

              <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                {canEditInventory && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Category name</div>
                    <Input
                      value={renameValue}
                      onValueChange={setRenameValue}
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                    <Button
                      onClick={handleRename}
                      isDisabled={!renameValue.trim()}
                      className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    >
                      Save name
                    </Button>
                  </div>
                )}

                {canEditInventory && activeCategory?.id && (
                  <EntityImageManager
                    entityType="category"
                    entityId={activeCategory.id}
                    imageUrl={activeCategory.imageUrl}
                    label="Category photo"
                    onChange={handleCategoryImageChange}
                  />
                )}

                {canEditInventory && activeCategory?.id && (
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onClick={openDelete}
                    >
                      Delete category
                    </Button>
                  </div>
                )}

                {/* Items preview */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-gray-950">
                    Items ({activeCategory?.itemsCount ?? 0})
                  </div>

                  <div className="space-y-2">
                    {(activeCategory?.items || []).slice(0, 8).map((it) => (
                      <div
                        key={it.id}
                        className="rounded-xl border border-stocksense-gray bg-white p-3 flex justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-950">{it.name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            Qty: {it.quantity ?? 0} • Exp: {it.expiration_date || "—"}
                          </div>
                        </div>
                      </div>
                    ))}

                    {(activeCategory?.items || []).length === 0 && (
                      <div className="text-sm text-gray-500">
                        No items in this category yet.
                      </div>
                    )}

                    {(activeCategory?.items || []).length > 8 && (
                      <div className="text-xs text-gray-400">
                        Showing first 8 items…
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button variant="light" className="rounded-xl max-md:hidden" onClick={closeDrawer}>
                  Close
                </Button>
                {canEditInventory && (
                  <Button
                    className="rounded-xl bg-rose-600 text-white max-md:hidden"
                    onClick={openDelete}
                  >
                    Delete category
                  </Button>
                )}
                {canEditInventory && (
                  <Button
                    onClick={handleRename}
                    isDisabled={!renameValue.trim()}
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white md:hidden"
                  >
                    Save changes
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete confirmation */}
      {canEditInventory && <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={
          deleteDialog.mode === "bulk"
            ? `Delete ${deleteDialog.payload?.count ?? 0} categor${
                deleteDialog.payload?.count === 1 ? "y" : "ies"
              }?`
            : deleteDialog.payload
            ? `Delete category "${deleteDialog.payload.name}"?`
            : "Delete category?"
        }
        description={
          deleteDialog.mode === "bulk"
            ? "This will delete the selected categories, including all items inside them. This cannot be undone."
            : deleteDialog.payload
            ? `This will delete "${deleteDialog.payload.name}" in ${deleteDialog.payload.locationName} → ${deleteDialog.payload.storageAreaName}, including all items inside it. This cannot be undone.`
            : ""
        }
      />}
    </motion.div>
  );
}
