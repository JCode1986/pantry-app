"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Input,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import {
  FaChevronRight,
  FaSearch,
  FaTrash,
  FaWarehouse,
} from "react-icons/fa";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";
import { updateStorageArea, deleteStorageArea } from "@/app/actions/server";
import { containsQuery } from "@/utils/pantry/search";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { emitInventoryChange } from "@/utils/clientEvents";
import EntityImageManager from "@/components/inventory/EntityImageManager";

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

export default function AreasPageClient({ initialAreas, canEditInventory = true }) {
  const router = useRouter();
  const [areas, setAreas] = useState(initialAreas ?? []);
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState(null);

  const [renameValue, setRenameValue] = useState("");

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    payload: null,
    isDeleting: false,
    mode: "single",
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const activeArea = useMemo(
    () => areas.find((a) => String(a.id) === String(activeAreaId)) || null,
    [areas, activeAreaId]
  );

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.storageAreaId) return;

      setAreas((prev) => {
        const existingArea = prev.find(
          (area) => String(area.id) === String(item.storageAreaId)
        );

        if (!existingArea) {
          return [
            ...prev,
            {
              id: item.storageAreaId,
              name: item.storageAreaName ?? "Storage area",
              location: {
                id: item.locationId ?? null,
                name: item.locationName ?? "Unknown location",
              },
              categories: [
                {
                  id: item.categoryId,
                  name: item.categoryName ?? "Category",
                  itemsCount: 1,
                },
              ],
              categoriesCount: 1,
              itemsCount: 1,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        }

        return prev.map((area) => {
          if (String(area.id) !== String(item.storageAreaId)) return area;

          const categories = area.categories ?? [];
          const existingCategory = categories.find(
            (category) => String(category.id) === String(item.categoryId)
          );

          const nextCategories = existingCategory
            ? categories.map((category) =>
                String(category.id) === String(item.categoryId)
                  ? {
                      ...category,
                      itemsCount: (category.itemsCount ?? 0) + 1,
                    }
                  : category
              )
            : [
                ...categories,
                {
                  id: item.categoryId,
                  name: item.categoryName ?? "Category",
                  itemsCount: 1,
                },
              ];

          return {
            ...area,
            categories: nextCategories,
            categoriesCount: nextCategories.length,
            itemsCount: (area.itemsCount ?? 0) + 1,
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
    if (!q) return areas;

    return areas.filter((a) => {
      const areaMatch = containsQuery(a.name, q);
      const locMatch = containsQuery(a.location?.name, q);
      const catMatch = (a.categories || []).some((c) =>
        containsQuery(c.name, q)
      );
      return areaMatch || locMatch || catMatch;
    });
  }, [areas, search]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((area) => selectedIds.has(String(area.id)));

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
        filtered.forEach((area) => next.delete(String(area.id)));
      } else {
        filtered.forEach((area) => next.add(String(area.id)));
      }
      return next;
    });
  };

  const openDrawer = (area) => {
    setActiveAreaId(area.id);
    setRenameValue(area.name);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveAreaId(null);
    setRenameValue("");
  };

  const handleRename = async () => {
    if (!canEditInventory) return;
    if (!activeArea) return;
    const name = renameValue.trim();
    if (!name) return;

    const result = await updateStorageArea(activeArea.id, name);
    if (result?.error) {
      console.error("updateStorageArea error:", result.error);
      return;
    }

    setAreas((prev) => prev.map((a) => (a.id === activeArea.id ? { ...a, name } : a)));
    emitInventoryChange({
      entity: "storage_area",
      action: "updated",
      id: activeArea.id,
    });
  };

  const handleAreaImageChange = ({ imagePath, imageUrl }) => {
    if (!activeArea?.id) return;
    setAreas((prev) =>
      prev.map((area) =>
        area.id === activeArea.id
          ? { ...area, image_path: imagePath ?? null, imageUrl: imageUrl ?? null }
          : area
      )
    );
    emitInventoryChange({
      entity: "storage_area",
      action: imagePath ? "image_updated" : "image_removed",
      id: activeArea.id,
    });
  };

  const openDelete = () => {
    if (!canEditInventory) return;
    if (!activeArea) return;

    openDeleteForArea(activeArea);
  };

  const openDeleteForArea = (area) => {
    if (!canEditInventory || !area) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: "single",
      payload: {
        areaId: area.id,
        name: area.name,
        locationName: area.location?.name,
        categoriesCount: area.categoriesCount,
        itemsCount: area.itemsCount,
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
        areaIds: Array.from(selectedIds),
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
      const ids = deleteDialog.payload.areaIds ?? [];
      const results = await Promise.all(ids.map((id) => deleteStorageArea(id)));
      const hasError = results.some((result) => result?.error);
      if (hasError) {
        console.error("bulk deleteStorageArea error:", results);
        closeDelete();
        return;
      }

      const deleted = new Set(ids.map(String));
      setAreas((prev) => prev.filter((area) => !deleted.has(String(area.id))));
      clearSelection();
      if (activeAreaId && deleted.has(String(activeAreaId))) closeDrawer();
      emitInventoryChange({
        entity: "storage_area",
        action: "deleted",
        ids,
      });
      closeDelete();
      return;
    }

    const { areaId } = deleteDialog.payload;
    const result = await deleteStorageArea(areaId);
    if (result?.error) {
      console.error("deleteStorageArea error:", result.error);
      closeDelete();
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(areaId));
      return next;
    });
    setAreas((prev) => prev.filter((a) => a.id !== areaId));
    emitInventoryChange({
      entity: "storage_area",
      action: "deleted",
      id: areaId,
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
              Storage Areas
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Where items sit inside each location
            </p>
          </div>
        </div>

        <div className="relative mt-4">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search areas..."
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
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
              <FaWarehouse className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No storage areas found
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Try a different search or add an item to create a storage area.
            </p>
            {canEditInventory && (
              <div className="mt-5 flex justify-center">
                <OpenGlobalAddItemButton canEditInventory={canEditInventory} />
              </div>
            )}
          </motion.div>
        ) : (
          filtered.map((area) => (
            <motion.article
              key={area.id}
              layout
              variants={pageItemVariants}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => router.push(`/areas/${area.id}`)}
                className="flex min-h-[112px] w-full items-center gap-4 p-4 text-left transition active:scale-[0.99]"
              >
                {area.imageUrl ? (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-area-border)] bg-white">
                    <img src={area.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
                    <FaWarehouse className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold leading-6 text-gray-950">
                    {area.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {area.location?.name}
                  </p>
                  <div className="mt-2 grid gap-0.5 text-sm leading-5 text-gray-500">
                    <span>
                      {area.categoriesCount ?? 0}{" "}
                      {(area.categoriesCount ?? 0) === 1 ? "category" : "categories"}
                    </span>
                    <span>
                      {area.itemsCount ?? 0}{" "}
                      {(area.itemsCount ?? 0) === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>

                <FaChevronRight className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
              </button>

              {canEditInventory && (
                <div className="grid grid-cols-2 gap-2 border-t border-gray-200 bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={() => openDrawer(area)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteForArea(area)}
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
            <div className="rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-accent)] p-3 text-white shadow-sm">
              <FaWarehouse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-950 md:text-2xl">
                Storage Areas
              </h1>
              <p className="text-sm text-gray-500">
                View storage areas across all locations. Click one to manage it.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search areas, locations, categories…"
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
                  storage area{selectedCount === 1 ? "" : "s"}
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
          {filtered.map((a) => (
          <motion.article
            key={a.id}
            layout
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            onClick={() => openDrawer(a)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") openDrawer(a);
            }}
            role="button"
            tabIndex={0}
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stocksense-gray bg-white p-3.5 pt-4 text-left shadow-sm transition hover:bg-gray-50 cursor-pointer sm:p-4"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--entity-area-accent)]" />
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                {canEditInventory && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(String(a.id))}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={() => toggleSelect(a.id)}
                    aria-label={`Select ${a.name}`}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border border-stocksense-gray"
                  />
                )}
                {a.imageUrl ? (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                    <img
                      src={a.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
                    <FaWarehouse className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold leading-5 text-gray-950 sm:text-base">{a.name}</div>
                  <div className="mt-1 text-sm text-gray-500 truncate">{a.location?.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <span className="rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] px-2.5 py-1 text-center text-xs text-[var(--entity-area-accent)]">
                  {a.categoriesCount} {a.categoriesCount === 1 ? "category" : "categories"}
                </span>
                <span className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1 text-center text-xs text-gray-600 md:border-[var(--stocksense-brand-border)] md:bg-[var(--stocksense-brand-soft)] md:text-[var(--stocksense-brand)]">
                  {a.itemsCount} {a.itemsCount === 1 ? "item" : "items"}
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
            <p className="text-gray-500">No storage areas match your search.</p>
            <div className="mt-4 flex justify-center">
              <OpenGlobalAddItemButton
                canEditInventory={canEditInventory}
                context={
                  activeArea
                    ? {
                        locationId: activeArea.location?.id,
                        storageAreaId: activeArea.id,
                      }
                    : undefined
                }
              />
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Drawer */}
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
              <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold text-[var(--stocksense-brand)]">
                    {activeArea?.name || "Storage Area"}
                  </div>
                  <div className="truncate text-sm text-gray-500">{activeArea?.location?.name}</div>
                </div>
                {canEditInventory && (
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onClick={handleRename}
                    isDisabled={!renameValue.trim()}
                  >
                    Save
                  </Button>
                )}
                <MobileSheetCloseButton onPress={closeDrawer} />
              </ModalHeader>

              <ModalBody className={`space-y-5 ${modalBodyClass}`}>
                {canEditInventory && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Area name</div>
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

                {canEditInventory && activeArea?.id && (
                  <EntityImageManager
                    entityType="storage_area"
                    entityId={activeArea.id}
                    imageUrl={activeArea.imageUrl}
                    label="Storage area photo"
                    onChange={handleAreaImageChange}
                  />
                )}

                {canEditInventory && activeArea?.id && (
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onClick={openDelete}
                    >
                      Delete storage area
                    </Button>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-600 border border-gray-200">
                    {activeArea?.categoriesCount ?? 0}{" "}
                    {(activeArea?.categoriesCount ?? 0) === 1 ? "category" : "categories"}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-600 border border-gray-200">
                    {activeArea?.itemsCount ?? 0}{" "}
                    {(activeArea?.itemsCount ?? 0) === 1 ? "item" : "items"}
                  </span>
                </div>

                {/* Categories preview */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-gray-950">
                    Categories
                  </div>

                  <div className="space-y-2">
                    {(activeArea?.categories || []).slice(0, 10).map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-stocksense-gray bg-white p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-950">{c.name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {c.itemsCount} {c.itemsCount === 1 ? "item" : "items"}
                          </div>
                        </div>
                      </div>
                    ))}

                    {(activeArea?.categories || []).length === 0 && (
                      <div className="text-sm text-gray-500">
                        No categories in this area yet.
                      </div>
                    )}

                    {(activeArea?.categories || []).length > 10 && (
                      <div className="text-xs text-gray-400">Showing first 10 categories…</div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                <Button variant="light" className="rounded-xl max-md:hidden" onClick={closeDrawer}>
                  Close
                </Button>
                {canEditInventory && (
                  <Button
                    className="rounded-xl bg-rose-600 text-white max-md:hidden"
                    onClick={openDelete}
                  >
                    Delete area
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
            ? `Delete ${deleteDialog.payload?.count ?? 0} storage area${
                deleteDialog.payload?.count === 1 ? "" : "s"
              }?`
            : deleteDialog.payload
            ? `Delete storage area "${deleteDialog.payload.name}"?`
            : "Delete storage area?"
        }
        description={
          deleteDialog.mode === "bulk"
            ? "This will remove the selected storage areas, including categories and items inside them. This action cannot be undone."
            : deleteDialog.payload
            ? `This will remove "${deleteDialog.payload.name}" in ${deleteDialog.payload.locationName}, including ${deleteDialog.payload.categoriesCount} categor${
                deleteDialog.payload.categoriesCount === 1 ? "y" : "ies"
              } and ${deleteDialog.payload.itemsCount} item${
                deleteDialog.payload.itemsCount === 1 ? "" : "s"
              }. This action cannot be undone.`
            : ""
        }
      />}
    </motion.div>
  );
}
