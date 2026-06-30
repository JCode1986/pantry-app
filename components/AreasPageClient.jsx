"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { FaSearch, FaWarehouse } from "react-icons/fa";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
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
import OpenGlobalAddItemButton from "@/components/OpenGlobalAddItemButton";

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

export default function AreasPageClient({ initialAreas }) {
  const [areas, setAreas] = useState(initialAreas ?? []);
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState(null);

  const [renameValue, setRenameValue] = useState("");

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    payload: null,
    isDeleting: false,
  });

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
    if (!activeArea) return;
    const name = renameValue.trim();
    if (!name) return;

    const result = await updateStorageArea(activeArea.id, name);
    if (result?.error) {
      console.error("updateStorageArea error:", result.error);
      return;
    }

    setAreas((prev) => prev.map((a) => (a.id === activeArea.id ? { ...a, name } : a)));
  };

  const openDelete = () => {
    if (!activeArea) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      payload: {
        areaId: activeArea.id,
        name: activeArea.name,
        locationName: activeArea.location?.name,
        categoriesCount: activeArea.categoriesCount,
        itemsCount: activeArea.itemsCount,
      },
    });
  };

  const closeDelete = () => {
    setDeleteDialog({ open: false, payload: null, isDeleting: false });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.payload) return;

    setDeleteDialog((p) => ({ ...p, isDeleting: true }));
    const { areaId } = deleteDialog.payload;

    const result = await deleteStorageArea(areaId);
    if (result?.error) {
      console.error("deleteStorageArea error:", result.error);
      closeDelete();
      return;
    }

    setAreas((prev) => prev.filter((a) => a.id !== areaId));
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
      {/* Header */}
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-4 md:p-5 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3 text-white bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sm border border-gray-300">
              <FaWarehouse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stocksense-teal">
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
      </motion.div>

      {/* List */}
      <motion.div
        variants={pageSectionVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence initial={false}>
          {filtered.map((a) => (
          <motion.button
            key={a.id}
            layout
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            onClick={() => openDrawer(a)}
            className="flex flex-col justify-between rounded-2xl border border-stocksense-gray bg-white p-4 text-left shadow-sm transition hover:bg-gray-50 cursor-pointer"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-stocksense-teal truncate">{a.name}</div>
                <div className="text-sm text-gray-500 truncate">{a.location?.name}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
                  {a.categoriesCount} {a.categoriesCount === 1 ? "category" : "categories"}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
                  {a.itemsCount} {a.itemsCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
          </motion.button>
          ))}

          {filtered.length === 0 && (
          <motion.div
            key="empty"
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center sm:col-span-2 lg:col-span-3"
          >
            <p className="text-gray-500">No storage areas match your search.</p>
            <div className="mt-4 flex justify-center">
              <OpenGlobalAddItemButton
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
              <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
                <div className="text-lg font-semibold text-[var(--stocksense-brand)]">
                  {activeArea?.name || "Storage Area"}
                </div>
                <div className="text-sm text-gray-500">{activeArea?.location?.name}</div>
              </ModalHeader>

              <ModalBody className={`space-y-5 ${modalBodyClass}`}>
                {/* Rename */}
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
                    className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                  >
                    Save name
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
                    {activeArea?.categoriesCount ?? 0}{" "}
                    {(activeArea?.categoriesCount ?? 0) === 1 ? "category" : "categories"}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
                    {activeArea?.itemsCount ?? 0}{" "}
                    {(activeArea?.itemsCount ?? 0) === 1 ? "item" : "items"}
                  </span>
                </div>

                {/* Categories preview */}
                <div>
                  <div className="text-sm font-semibold text-stocksense-teal mb-2">
                    Categories
                  </div>

                  <div className="space-y-2">
                    {(activeArea?.categories || []).slice(0, 10).map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-stocksense-gray bg-white p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-stocksense-teal truncate">{c.name}</div>
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

              <ModalFooter className={modalFooterClass}>
                <Button variant="light" className="rounded-xl" onClick={closeDrawer}>
                  Close
                </Button>
                <Button className="rounded-xl bg-rose-600 text-white" onClick={openDelete}>
                  Delete area
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={
          deleteDialog.payload
            ? `Delete storage area "${deleteDialog.payload.name}"?`
            : "Delete storage area?"
        }
        description={
          deleteDialog.payload
            ? `This will remove "${deleteDialog.payload.name}" in ${deleteDialog.payload.locationName}, including ${deleteDialog.payload.categoriesCount} categor${
                deleteDialog.payload.categoriesCount === 1 ? "y" : "ies"
              } and ${deleteDialog.payload.itemsCount} item${
                deleteDialog.payload.itemsCount === 1 ? "" : "s"
              }. This action cannot be undone.`
            : ""
        }
      />
    </motion.div>
  );
}
