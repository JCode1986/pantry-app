"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Input,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { FaSearch } from "react-icons/fa";
import { updateItem, deleteItem, updateItemLocation } from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import OpenGlobalAddItemButton from "@/components/OpenGlobalAddItemButton";
import {
  daysUntil,
  isExpiringSoon,
  toNonNegativeInteger,
  toPositiveInteger,
} from "@/utils/pantry/date";
import { containsQuery } from "@/utils/pantry/search";

export default function ItemsPageClient({ initialItems, moveLocations }) {
  const [items, setItems] = useState(initialItems ?? []);

  // filters
  const [search, setSearch] = useState("");
  const [expSoonEnabled, setExpSoonEnabled] = useState(false);
  const [expDays, setExpDays] = useState(7);

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

  const filteredIds = useMemo(
    () => new Set(filteredItems.map((i) => String(i.id))),
    [filteredItems]
  );

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

  const confirmMoveSingle = async () => {
    if (!activeItem) return;
    if (!moveTarget.categoryId) return;

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

    setMoveModalOpen(false);
  };

  const confirmMoveBulk = async () => {
    if (!moveTarget.categoryId) return;
    if (selectedIds.size === 0) return;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-stocksense-gray bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stocksense-teal">
              Items
            </h1>
            <p className="text-sm text-gray-500">
              Search and manage items across all locations.
            </p>
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
              <label className="flex items-center gap-2 text-sm">
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
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
              <strong>{totals.total}</strong> {totals.total === 1 ? "Item" : "Items"}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]">
              <strong>{(items || []).filter((i) => isExpiringSoon(i.expiration_date, expDays)).length}</strong>{" "}
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
        {selectedCount > 0 && (
          <div className="mt-4 rounded-xl border border-[#9FE7D7] bg-[#E6FAF6] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-[#0E7488]">
              Bulk actions for <span className="font-semibold">{selectedCount}</span>{" "}
              item{selectedCount === 1 ? "" : "s"}
              {filteredItems.length > 0 && (
                <span className="text-xs text-[#0E7488]/70">
                  {" "}
                  (filtered list: {filteredItems.length})
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openMove("bulk")}
                className="text-[#0E7488] border border-[#9FE7D7] bg-white hover:bg-[#d5f3ea] px-3 py-1.5 rounded-md cursor-pointer"
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
          </div>
        )}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredItems.map((it) => {
          const soon = isExpiringSoon(it.expiration_date, expDays);
          const du = daysUntil(it.expiration_date);
          const selected = selectedIds.has(String(it.id));

          return (
            <div
              key={it.id}
              className={`rounded-2xl border border-stocksense-gray bg-white shadow-sm p-4 transition ${
                selected ? "ring-2 ring-rose-200" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: checkbox + info */}
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(it.id)}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />

                  <button onClick={() => openDrawer(it)} className="text-left min-w-0">
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

                {/* Right: open drawer */}
                <button
                  onClick={() => openDrawer(it)}
                  className="shrink-0 text-gray-300 hover:text-gray-500 cursor-pointer"
                  title="Open item"
                >
                  →
                </button>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center">
            <p className="text-gray-500">No items match your search.</p>
            <div className="mt-4 flex justify-center">
              <OpenGlobalAddItemButton />
            </div>
          </div>
        )}
      </div>

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
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="text-stocksense-teal font-semibold text-lg">
                  {activeItem?.name || "Item"}
                </div>
                <div className="text-sm text-gray-500">
                  {activeItem?.location?.name || "Unknown location"} • {activeItem?.area?.name || "—"} •{" "}
                  {activeItem?.category?.name || "—"}
                </div>
              </ModalHeader>

              <ModalBody className="space-y-5">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Item name</div>
                  <Input
                    value={editName}
                    onValueChange={setEditName}
                    classNames={{
                      inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                    }}
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
                      classNames={{
                        inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Expiration date</div>
                    <input
                      type="date"
                      value={editExp || ""}
                      onChange={(e) => setEditExp(e.target.value)}
                      className="w-full rounded-xl border border-stocksense-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveEdits}
                    className="rounded-xl bg-[#0E7488] text-white w-full"
                  >
                    Save changes
                  </Button>
                  <Button
                    onClick={() => openMove("single")}
                    className="rounded-xl border border-stocksense-gray bg-white w-full"
                  >
                    Move
                  </Button>
                </div>
              </ModalBody>

              <ModalFooter>
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
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="text-stocksense-teal font-semibold text-lg">
                  Move {selectedCount > 0 && !drawerOpen ? `${selectedCount} items` : "item"}
                </div>
                <div className="text-sm text-gray-500">
                  Choose the destination category.
                </div>
              </ModalHeader>

              <ModalBody className="space-y-4">
                {/* Location */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Location</label>
                  <select
                    value={moveTarget.locationId ? String(moveTarget.locationId) : ""}
                    onChange={(e) => {
                      const locId = e.target.value || null;
                      const loc =
                        moveLocations.find((l) => String(l.id) === String(locId)) || moveLocations[0];
                      const firstArea = loc?.storage_areas?.[0] || null;
                      const firstCat = firstArea?.categories?.[0] || null;

                      setMoveTarget({
                        locationId: loc?.id ?? null,
                        areaId: firstArea?.id ?? null,
                        categoryId: firstCat?.id ?? null,
                      });
                    }}
                    className="w-full rounded-xl border border-stocksense-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                  >
                    {moveLocations.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Area */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Storage area</label>
                  <select
                    value={moveTarget.areaId ? String(moveTarget.areaId) : ""}
                    onChange={(e) => {
                      const areaId = e.target.value || null;
                      const area =
                        currentAreas.find((a) => String(a.id) === String(areaId)) || currentAreas[0];
                      const firstCat = area?.categories?.[0] || null;

                      setMoveTarget((prev) => ({
                        ...prev,
                        areaId: area?.id ?? null,
                        categoryId: firstCat?.id ?? null,
                      }));
                    }}
                    className="w-full rounded-xl border border-stocksense-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                    disabled={!moveTarget.locationId}
                  >
                    <option value="">Select area…</option>
                    {currentAreas.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Category</label>
                  <select
                    value={moveTarget.categoryId ? String(moveTarget.categoryId) : ""}
                    onChange={(e) =>
                      setMoveTarget((prev) => ({
                        ...prev,
                        categoryId: e.target.value || null,
                      }))
                    }
                    className="w-full rounded-xl border border-stocksense-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                    disabled={!moveTarget.areaId}
                  >
                    <option value="">Select category…</option>
                    {currentCategories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button variant="light" className="rounded-xl" onClick={() => setMoveModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-[#0E7488] text-white"
                  onClick={() => {
                    // If user has selected items and the drawer isn't driving the interaction, treat as bulk.
                    if (selectedIds.size > 0 && !drawerOpen) confirmMoveBulk();
                    else confirmMoveSingle();
                  }}
                  disabled={!moveTarget.categoryId}
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
    </div>
  );
}
