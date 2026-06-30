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
  Select,
  SelectItem,
} from "@heroui/react";
import {
  FaBoxOpen,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaSearch,
} from "react-icons/fa";
import { updateItem, deleteItem, updateItemLocation } from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";
import OpenGlobalAddItemButton from "@/components/OpenGlobalAddItemButton";
import {
  daysUntil,
  isExpiringSoon,
  toNonNegativeInteger,
  toPositiveInteger,
} from "@/utils/pantry/date";
import { containsQuery } from "@/utils/pantry/search";

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

const ITEMS_PER_PAGE = 25;

function PaginationControls({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  onPrevious,
  onNext,
}) {
  if (totalItems <= ITEMS_PER_PAGE) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stocksense-gray bg-white px-4 py-3 text-sm text-gray-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        Showing <span className="font-semibold text-gray-800">{startItem}</span>
        {" - "}
        <span className="font-semibold text-gray-800">{endItem}</span>
        {" of "}
        <span className="font-semibold text-gray-800">{totalItems}</span>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Button
          size="sm"
          variant="flat"
          className="rounded-xl"
          onPress={onPrevious}
          isDisabled={currentPage <= 1}
          startContent={<FaChevronLeft className="h-3 w-3" />}
        >
          Previous
        </Button>
        <span className="min-w-[88px] text-center text-xs text-gray-500">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="flat"
          className="rounded-xl"
          onPress={onNext}
          isDisabled={currentPage >= totalPages}
          endContent={<FaChevronRight className="h-3 w-3" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function ItemsPageClient({ initialItems, moveLocations }) {
  const [items, setItems] = useState(initialItems ?? []);

  // filters
  const [search, setSearch] = useState("");
  const [expSoonEnabled, setExpSoonEnabled] = useState(false);
  const [expDays, setExpDays] = useState(7);
  const [currentPage, setCurrentPage] = useState(1);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null);

  // edit form
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editExp, setEditExp] = useState("");

  // bulk selection (Set of item IDs)
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // move modal state (used for both single + bulk)
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState({
    locationId: null,
    areaId: null,
    categoryId: null,
  });

  // delete modal (single/bulk)
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    isDeleting: false,
    mode: null, // "single" | "bulk"
    payload: null,
  });

  const activeItem = useMemo(
    () => items.find((i) => String(i.id) === String(activeItemId)) || null,
    [items, activeItemId]
  );

  const hasItemEditChanges = useMemo(() => {
    if (!activeItem) return false;

    const name = editName.trim();
    if (!name) return false;

    const quantity = toNonNegativeInteger(editQty, 0);
    const expirationDate = editExp ? editExp : null;

    return (
      name !== (activeItem.name || "") ||
      quantity !== (activeItem.quantity ?? 0) ||
      expirationDate !== (activeItem.expiration_date ?? null)
    );
  }, [activeItem, editExp, editName, editQty]);

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.id) return;

      const loc =
        moveLocations.find((l) => String(l.id) === String(item.locationId)) ||
        null;
      const area =
        (loc?.storage_areas || []).find(
          (a) => String(a.id) === String(item.storageAreaId)
        ) || null;
      const cat =
        (area?.categories || []).find(
          (c) => String(c.id) === String(item.categoryId)
        ) || null;

      const normalizedItem = {
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 0,
        expiration_date: item.expiration_date ?? null,
        category_id: item.category_id ?? item.categoryId ?? null,
        location: loc ? { id: loc.id, name: loc.name } : null,
        area: area ? { id: area.id, name: area.name } : null,
        category: cat ? { id: cat.id, name: cat.name } : null,
      };

      setItems((prev) => {
        if (prev.some((existing) => String(existing.id) === String(item.id))) {
          return prev;
        }

        return [...prev, normalizedItem].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
    };

    window.addEventListener("stocksense:item-added", handleItemAdded);

    return () => {
      window.removeEventListener("stocksense:item-added", handleItemAdded);
    };
  }, [moveLocations]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return (items || []).filter((it) => {
      const nameOk = !normalizedSearch || containsQuery(it.name, normalizedSearch);

      const path = `${it.location?.name || ""} ${it.area?.name || ""} ${it.category?.name || ""}`;
      const pathOk = !normalizedSearch || containsQuery(path, normalizedSearch);

      const expOk = !expSoonEnabled || isExpiringSoon(it.expiration_date, expDays);

      return (nameOk || pathOk) && expOk;
    });
  }, [items, normalizedSearch, expSoonEnabled, expDays]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(
    pageStartIndex,
    pageStartIndex + ITEMS_PER_PAGE
  );
  const startItem = filteredItems.length === 0 ? 0 : pageStartIndex + 1;
  const endItem = Math.min(pageStartIndex + paginatedItems.length, filteredItems.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch, expSoonEnabled, expDays]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const selectedCount = selectedIds.size;

  const allFilteredSelected = useMemo(() => {
    if (filteredItems.length === 0) return false;
    for (const it of filteredItems) {
      if (!selectedIds.has(String(it.id))) return false;
    }
    return true;
  }, [filteredItems, selectedIds]);

  const totals = useMemo(() => {
    const total = items?.length ?? 0;
    const expSoon = (items || []).filter((i) => isExpiringSoon(i.expiration_date, expDays)).length;
    return { total, expSoon };
  }, [items, expDays]);

  // ---- selection helpers ----
  const toggleSelect = (id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const it of filteredItems) next.add(String(it.id));
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      // Unselect only the currently filtered items
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const it of filteredItems) next.delete(String(it.id));
        return next;
      });
    } else {
      selectAllFiltered();
    }
  };

  const getSelectedValue = (keys) => {
    const value = Array.from(keys)[0];
    return value ? String(value) : "";
  };

  // ---- drawer helpers ----
  const openDrawer = (it) => {
    setActiveItemId(it.id);
    setEditName(it.name || "");
    setEditQty(String(it.quantity ?? 0));
    setEditExp(it.expiration_date || "");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveItemId(null);
    setEditName("");
    setEditQty("");
    setEditExp("");
    setMoveModalOpen(false);
  };

  const saveEdits = async () => {
    if (!activeItem) return;

    const name = editName.trim();
    if (!name) return;

    const qty = toNonNegativeInteger(editQty, 0);

    const updated = {
      name,
      quantity: qty,
      expiration_date: editExp ? editExp : null,
    };

    const { data, error } = await updateItem(activeItem.id, updated);
    if (error) {
      console.error("updateItem error:", error);
      return;
    }

    setItems((prev) =>
      prev.map((x) =>
        x.id === activeItem.id
          ? {
              ...x,
              name: data?.name ?? name,
              quantity: data?.quantity ?? qty,
              expiration_date: data?.expiration_date ?? updated.expiration_date,
            }
          : x
      )
    );
    closeDrawer();
  };

  // ---- move helpers (single + bulk) ----
  const openMove = (mode) => {
    // mode: "single" or "bulk"
    if (mode === "single" && !activeItem) return;
    if (mode === "bulk" && selectedIds.size === 0) return;

    // Default target:
    // - if single: current item location/area/category
    // - if bulk: first available in hierarchy
    const seed = mode === "single" ? activeItem : null;

    const currentLocId = seed?.location?.id ?? moveLocations?.[0]?.id ?? null;
    const loc = moveLocations.find((l) => String(l.id) === String(currentLocId)) || moveLocations[0];

    const areas = loc?.storage_areas || [];
    const currentAreaId = seed?.area?.id ?? areas?.[0]?.id ?? null;
    const area =
      areas.find((a) => String(a.id) === String(currentAreaId)) || areas?.[0] || null;

    const cats = area?.categories || [];
    const currentCatId = seed?.category?.id ?? cats?.[0]?.id ?? null;

    setMoveTarget({
      locationId: loc?.id ?? null,
      areaId: area?.id ?? null,
      categoryId: currentCatId ?? null,
    });

    setMoveModalOpen(true);
  };

  const currentLocation = useMemo(() => {
    return (
      moveLocations.find((l) => String(l.id) === String(moveTarget.locationId)) || moveLocations[0]
    );
  }, [moveLocations, moveTarget.locationId]);

  const currentAreas = currentLocation?.storage_areas || [];

  const currentArea = useMemo(() => {
    return currentAreas.find((a) => String(a.id) === String(moveTarget.areaId)) || currentAreas[0];
  }, [currentAreas, moveTarget.areaId]);

  const currentCategories = currentArea?.categories || [];

  const canConfirmMove = useMemo(() => {
    if (!moveTarget.categoryId) return false;

    const targetCategoryId = String(moveTarget.categoryId);

    if (drawerOpen && activeItem) {
      const currentCategoryId = activeItem.category?.id ?? activeItem.category_id;
      return String(currentCategoryId) !== targetCategoryId;
    }

    if (selectedIds.size === 0) return false;

    return items.some((item) => {
      if (!selectedIds.has(String(item.id))) return false;
      const currentCategoryId = item.category?.id ?? item.category_id;
      return String(currentCategoryId) !== targetCategoryId;
    });
  }, [activeItem, drawerOpen, items, moveTarget.categoryId, selectedIds]);

  const confirmMoveSingle = async () => {
    if (!activeItem) return;
    if (!moveTarget.categoryId) return;
    if (!canConfirmMove) return;

    const result = await updateItemLocation(activeItem.id, {
      categoryId: moveTarget.categoryId,
    });

    if (result?.error) {
      console.error("updateItemLocation error:", result.error);
      return;
    }

    // Update local breadcrumb based on moveTarget
    const loc =
      moveLocations.find((l) => String(l.id) === String(moveTarget.locationId)) || null;
    const area =
      (loc?.storage_areas || []).find((a) => String(a.id) === String(moveTarget.areaId)) || null;
    const cat =
      (area?.categories || []).find((c) => String(c.id) === String(moveTarget.categoryId)) || null;

    setItems((prev) =>
      prev.map((x) =>
        x.id === activeItem.id
          ? {
              ...x,
              category_id: moveTarget.categoryId,
              location: loc ? { id: loc.id, name: loc.name } : x.location,
              area: area ? { id: area.id, name: area.name } : x.area,
              category: cat ? { id: cat.id, name: cat.name } : x.category,
            }
          : x
      )
    );

    closeDrawer();
  };

  const confirmMoveBulk = async () => {
    if (!moveTarget.categoryId) return;
    if (selectedIds.size === 0) return;
    if (!canConfirmMove) return;

    const ids = Array.from(selectedIds);

    // Update DB for all selected items
    const results = await Promise.all(
      ids.map((id) => updateItemLocation(id, { categoryId: moveTarget.categoryId }))
    );

    const hasError = results.some((r) => r?.error);
    if (hasError) {
      console.error("Bulk move errors:", results);
      alert("There was a problem moving one or more items. Some changes may not have applied.");
      return;
    }

    // Update local breadcrumb based on moveTarget
    const loc =
      moveLocations.find((l) => String(l.id) === String(moveTarget.locationId)) || null;
    const area =
      (loc?.storage_areas || []).find((a) => String(a.id) === String(moveTarget.areaId)) || null;
    const cat =
      (area?.categories || []).find((c) => String(c.id) === String(moveTarget.categoryId)) || null;

    setItems((prev) =>
      prev.map((x) =>
        selectedIds.has(String(x.id))
          ? {
              ...x,
              category_id: moveTarget.categoryId,
              location: loc ? { id: loc.id, name: loc.name } : x.location,
              area: area ? { id: area.id, name: area.name } : x.area,
              category: cat ? { id: cat.id, name: cat.name } : x.category,
            }
          : x
      )
    );

    setMoveModalOpen(false);
    clearSelection();
  };

  // ---- delete helpers (single + bulk) ----
  const openDeleteSingle = () => {
    if (!activeItem) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: "single",
      payload: {
        itemId: activeItem.id,
        name: activeItem.name,
        locationName: activeItem.location?.name,
        areaName: activeItem.area?.name,
        categoryName: activeItem.category?.name,
      },
    });
  };

  const openDeleteBulk = () => {
    if (selectedIds.size === 0) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: "bulk",
      payload: {
        itemIds: Array.from(selectedIds),
        count: selectedIds.size,
      },
    });
  };

  const closeDelete = () => {
    setDeleteDialog({ open: false, isDeleting: false, mode: null, payload: null });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.payload) return;

    setDeleteDialog((p) => ({ ...p, isDeleting: true }));

    try {
      if (deleteDialog.mode === "single") {
        const result = await deleteItem(deleteDialog.payload.itemId);
        if (result?.error) {
          console.error("deleteItem error:", result.error);
          closeDelete();
          return;
        }

        setItems((prev) => prev.filter((x) => x.id !== deleteDialog.payload.itemId));
        closeDelete();
        closeDrawer();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(deleteDialog.payload.itemId));
          return next;
        });
        return;
      }

      if (deleteDialog.mode === "bulk") {
        const ids = deleteDialog.payload.itemIds || [];
        const results = await Promise.all(ids.map((id) => deleteItem(id)));

        const hasError = results.some((r) => r?.error);
        if (hasError) {
          console.error("Bulk delete errors:", results);
          alert("There was a problem deleting one or more items.");
        }

        const deletedSet = new Set(ids.map(String));
        setItems((prev) => prev.filter((x) => !deletedSet.has(String(x.id))));
        closeDelete();
        clearSelection();

        // If the drawer is open on an item that got deleted, close it.
        if (drawerOpen && activeItemId && deletedSet.has(String(activeItemId))) {
          closeDrawer();
        }
      }
    } catch (e) {
      console.error("Delete error:", e);
      closeDelete();
    }
  };

  // ---- UI ----
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
            <div className="rounded-xl p-3 text-white bg-gradient-to-br from-rose-500 to-orange-500 shadow-sm border border-gray-300">
              <FaBoxOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stocksense-teal">
                Items
              </h1>
              <p className="text-sm text-gray-500">
                Search and manage items across all locations.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search items or location/area/category…"
              startContent={<FaSearch className="text-gray-400" />}
              classNames={{
                inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
              }}
            />

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm w-max">
                <input
                  type="checkbox"
                  checked={expSoonEnabled}
                  onChange={() => setExpSoonEnabled((v) => !v)}
                  className="w-5 h-5 border border-stocksense-gray rounded cursor-pointer"
                />
                Expiring in
              </label>

              <input
                type="number"
                min={1}
                value={expDays}
                onChange={(e) => setExpDays(toPositiveInteger(e.target.value, 7))}
                className={`border border-stocksense-gray rounded px-2 py-1 w-16 ${
                  !expSoonEnabled && "bg-gray-100 text-gray-400"
                }`}
                disabled={!expSoonEnabled}
              />
              <span className="text-sm">days</span>
            </div>
          </div>
        </div>

        {/* Stats + select controls */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
              <strong>{totals.total}</strong> {totals.total === 1 ? "Item" : "Items"}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]">
              <strong>{totals.expSoon}</strong>{" "}
              expiring soon
            </span>

            {selectedCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                <strong>{selectedCount}</strong> selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                className="w-5 h-5 border border-stocksense-gray rounded cursor-pointer"
              />
              Select all (filtered)
            </label>

            <button
              onClick={clearSelection}
              className="rounded-xl border border-stocksense-gray px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
              disabled={selectedCount === 0}
            >
              Clear selection
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        <AnimatePresence initial={false}>
          {selectedCount > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-4 overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div className="text-sm text-[var(--stocksense-brand)]">
              Bulk actions for <span className="font-semibold">{selectedCount}</span>{" "}
              item{selectedCount === 1 ? "" : "s"}
              {filteredItems.length > 0 && (
                <span className="text-xs text-[var(--stocksense-brand)]/70">
                  {" "}
                  (filtered list: {filteredItems.length})
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openMove("bulk")}
                className="text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)] bg-white hover:bg-[var(--stocksense-brand-soft)] px-3 py-1.5 rounded-md cursor-pointer"
              >
                Move selected
              </button>

              <button
                onClick={openDeleteBulk}
                className="text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md cursor-pointer"
              >
                Delete selected
              </button>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* List */}
      <motion.div variants={pageSectionVariants} className="space-y-4">
        <PaginationControls
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={filteredItems.length}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
        {paginatedItems.map((it) => {
          const soon = isExpiringSoon(it.expiration_date, expDays);
          const du = daysUntil(it.expiration_date);
          const selected = selectedIds.has(String(it.id));

          return (
            <motion.div
              key={it.id}
              layout
              variants={pageItemVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              className={`rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm transition ${
                selected ? "ring-2 ring-rose-200" : "hover:bg-gray-50"
              }`}
              whileHover={{ y: -1 }}
            >
              <div className="flex h-full items-start justify-between gap-3">
                {/* Left: checkbox + info */}
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(it.id)}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />

                  <button onClick={() => openDrawer(it)} className="min-w-0 text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-semibold text-stocksense-teal truncate">{it.name}</div>

                      {soon && (
                        <span className="text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                          {du < 0 ? "Expired" : "Soon"}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 truncate mt-1">
                      {it.location?.name || "Unknown location"} • {it.area?.name || "—"} •{" "}
                      {it.category?.name || "—"}
                    </div>

                    <div className="text-sm text-gray-500 truncate mt-1">
                      Qty: {it.quantity ?? 0} • Exp: {it.expiration_date || "—"}
                    </div>
                  </button>
                </div>

                {/* Right: edit item */}
                <button
                  onClick={() => openDrawer(it)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--stocksense-brand)] hover:brightness-95 cursor-pointer"
                  title="Edit item"
                >
                  <FaEdit className="h-3 w-3" />
                  Edit
                </button>
              </div>
            </motion.div>
          );
        })}

        {filteredItems.length === 0 && (
          <motion.div
            key="empty"
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center sm:col-span-2 lg:col-span-3"
          >
            <p className="text-gray-500">No items match your search.</p>
            <div className="mt-4 flex justify-center">
              <OpenGlobalAddItemButton />
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>

        {filteredItems.length > ITEMS_PER_PAGE && (
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={filteredItems.length}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          />
        )}
      </motion.div>

      {/* Drawer (single item) */}
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
                  {activeItem?.name || "Item"}
                </div>
                <div className="text-sm text-gray-500">
                  {activeItem?.location?.name || "Unknown location"} • {activeItem?.area?.name || "—"} •{" "}
                  {activeItem?.category?.name || "—"}
                </div>
              </ModalHeader>

              <ModalBody className={`space-y-5 ${modalBodyClass}`}>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Item name</div>
                  <Input
                    value={editName}
                    onValueChange={setEditName}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Quantity</div>
                    <Input
                      value={editQty}
                      onValueChange={setEditQty}
                      type="number"
                      min={0}
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Expiration date</div>
                    <input
                      type="date"
                      value={editExp || ""}
                      onChange={(e) => setEditExp(e.target.value)}
                      className="w-full rounded-xl border border-[var(--stocksense-brand-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]/50"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveEdits}
                    isDisabled={!hasItemEditChanges}
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white w-full"
                  >
                    Save changes
                  </Button>
                  <Button
                    onClick={() => openMove("single")}
                    className="w-full rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  >
                    Move
                  </Button>
                </div>
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button variant="light" className="rounded-xl" onClick={closeDrawer}>
                  Close
                </Button>
                <Button className="rounded-xl bg-rose-600 text-white" onClick={openDeleteSingle}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Move Modal (single + bulk) */}
      <Modal isOpen={moveModalOpen} onOpenChange={setMoveModalOpen} size="md">
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {() => (
            <>
              <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
                <div className="text-lg font-semibold text-[var(--stocksense-brand)]">
                  Move {selectedCount > 0 && !drawerOpen ? `${selectedCount} items` : "item"}
                </div>
                <div className="text-sm text-gray-500">
                  Choose the destination category.
                </div>
              </ModalHeader>

              <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                <Select
                  label="Location"
                  selectedKeys={
                    moveTarget.locationId
                      ? new Set([String(moveTarget.locationId)])
                      : new Set()
                  }
                  onSelectionChange={(keys) => {
                    const locId = getSelectedValue(keys) || null;
                    const loc =
                      moveLocations.find((l) => String(l.id) === String(locId)) ||
                      moveLocations[0];
                    const firstArea = loc?.storage_areas?.[0] || null;
                    const firstCat = firstArea?.categories?.[0] || null;

                    setMoveTarget({
                      locationId: loc?.id ?? null,
                      areaId: firstArea?.id ?? null,
                      categoryId: firstCat?.id ?? null,
                    });
                  }}
                  variant="bordered"
                  radius="lg"
                  classNames={{
                    trigger: "border-[var(--stocksense-brand-border)] bg-white shadow-none",
                  }}
                >
                  {moveLocations.map((location) => (
                    <SelectItem key={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Storage area"
                  placeholder="Select area..."
                  selectedKeys={
                    moveTarget.areaId
                      ? new Set([String(moveTarget.areaId)])
                      : new Set()
                  }
                  onSelectionChange={(keys) => {
                    const areaId = getSelectedValue(keys) || null;
                    const area =
                      currentAreas.find((a) => String(a.id) === String(areaId)) ||
                      currentAreas[0];
                    const firstCat = area?.categories?.[0] || null;

                    setMoveTarget((prev) => ({
                      ...prev,
                      areaId: area?.id ?? null,
                      categoryId: firstCat?.id ?? null,
                    }));
                  }}
                  isDisabled={!moveTarget.locationId}
                  variant="bordered"
                  radius="lg"
                  classNames={{
                    trigger: "border-[var(--stocksense-brand-border)] bg-white shadow-none",
                  }}
                >
                  {currentAreas.map((area) => (
                    <SelectItem key={String(area.id)}>{area.name}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Category"
                  placeholder="Select category..."
                  selectedKeys={
                    moveTarget.categoryId
                      ? new Set([String(moveTarget.categoryId)])
                      : new Set()
                  }
                  onSelectionChange={(keys) =>
                    setMoveTarget((prev) => ({
                      ...prev,
                      categoryId: getSelectedValue(keys) || null,
                    }))
                  }
                  isDisabled={!moveTarget.areaId}
                  variant="bordered"
                  radius="lg"
                  classNames={{
                    trigger: "border-[var(--stocksense-brand-border)] bg-white shadow-none",
                  }}
                >
                  {currentCategories.map((category) => (
                    <SelectItem key={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </Select>
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button variant="light" className="rounded-xl" onClick={() => setMoveModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                  onClick={() => {
                    // If user has selected items and the drawer isn't driving the interaction, treat as bulk.
                    if (selectedIds.size > 0 && !drawerOpen) confirmMoveBulk();
                    else confirmMoveSingle();
                  }}
                  isDisabled={!canConfirmMove}
                >
                  Move
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete confirmation (single + bulk) */}
      <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={
          deleteDialog.mode === "bulk"
            ? `Delete ${deleteDialog.payload?.count ?? 0} items?`
            : deleteDialog.payload
              ? `Delete "${deleteDialog.payload.name}"?`
              : "Delete item?"
        }
        description={
          deleteDialog.mode === "bulk"
            ? `This will permanently delete ${deleteDialog.payload?.count ?? 0} selected items. This action cannot be undone.`
            : deleteDialog.payload
              ? `This will permanently delete "${deleteDialog.payload.name}" from ${deleteDialog.payload.categoryName || "its category"} in ${deleteDialog.payload.areaName || "its area"} (${deleteDialog.payload.locationName || "unknown location"}). This action cannot be undone.`
              : ""
        }
      />
    </motion.div>
  );
}
