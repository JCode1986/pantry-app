"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  FaCheck,
  FaEllipsisV,
  FaExchangeAlt,
  FaImage,
  FaPlus,
  FaShoppingBasket,
  FaTrash,
  FaUndo,
} from "react-icons/fa";
import {
  bulkDeleteShoppingListItemsAction,
  bulkUpdateShoppingListItemsAction,
  deleteShoppingListItemAction,
  moveShoppingListItemToInventoryAction,
  updateShoppingListItemAction,
} from "@/app/actions/shoppingList";
import {
  addCategory,
  addLocation,
  addStorageArea,
} from "@/app/actions/server";
import AddShoppingListItemModal from "@/components/shopping-list/AddShoppingListItemModal";
import EditShoppingListItemModal from "@/components/shopping-list/EditShoppingListItemModal";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import { emitInventoryChange } from "@/utils/clientEvents";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import ImageWithLoader from "@/components/ui/ImageWithLoader";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "needed", label: "Needed" },
  { value: "purchased", label: "Purchased" },
  { value: "dismissed", label: "Dismissed" },
];

const FILTER_VALUES = new Set(FILTERS.map((filter) => filter.value));
const NEW_LOCATION_VALUE = "__new_location__";
const NEW_AREA_VALUE = "__new_area__";
const NEW_CATEGORY_VALUE = "__new_category__";

function normalizeFilter(value) {
  return FILTER_VALUES.has(value) ? value : "needed";
}

const STATUS_LABELS = {
  needed: "Needed",
  purchased: "Purchased",
  dismissed: "Dismissed",
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const mobileSelectionTransition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};

const mobileSelectionPanelMotion = {
  initial: { opacity: 0, y: -6, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: mobileSelectionTransition,
};

const mobileDefaultPanelMotion = {
  initial: { opacity: 0, y: 6, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: mobileSelectionTransition,
};

function sortItems(items) {
  return [...(items ?? [])].sort((a, b) => {
    const statusRank = { needed: 0, purchased: 1, dismissed: 2 };
    const left = statusRank[a.status] ?? 3;
    const right = statusRank[b.status] ?? 3;
    if (left !== right) return left - right;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });
}

function statusClasses(status) {
  switch (status) {
    case "purchased":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "dismissed":
      return "border-gray-200 bg-gray-50 text-gray-600";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function statusAccentClass(status) {
  switch (status) {
    case "purchased":
      return "bg-emerald-500";
    case "dismissed":
      return "bg-gray-300";
    default:
      return "bg-amber-400";
  }
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

export default function ShoppingListPageClient({
  initialItems = [],
  initialError = null,
  initialFilter = "needed",
  moveLocations = [],
  canEditInventory = true,
}) {
  const [items, setItems] = useState(() => sortItems(initialItems));
  const [filter, setFilter] = useState(() => normalizeFilter(initialFilter));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [message, setMessage] = useState(
    initialError ? { type: "error", text: initialError } : null
  );
  const [pendingId, setPendingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false);
  const mobileLongPressTimerRef = useRef(null);
  const mobileLongPressTriggeredRef = useRef(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [moveDialog, setMoveDialog] = useState({
    open: false,
    item: null,
    itemIds: [],
    isMoving: false,
    locationId: null,
    areaId: null,
    categoryId: null,
  });
  const [localMoveLocations, setLocalMoveLocations] = useState(() => moveLocations ?? []);
  const [moveCreateNames, setMoveCreateNames] = useState({
    location: "",
    area: "",
    category: "",
  });
  const [moveCreateAction, setMoveCreateAction] = useState("");
  const [moveCreateMessage, setMoveCreateMessage] = useState(null);

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  const selectedCount = selectedIds.size;
  const selectionMode = selectedCount > 0;
  const isBulkBusy = Boolean(bulkAction);
  const safeMoveLocations = localMoveLocations ?? [];

  useEffect(() => {
    setLocalMoveLocations(moveLocations ?? []);
  }, [moveLocations]);

  useEffect(() => {
    if (moveDialog.open) return;

    setMoveCreateNames({ location: "", area: "", category: "" });
    setMoveCreateAction("");
    setMoveCreateMessage(null);
  }, [moveDialog.open]);

  useEffect(() => {
    setFilter(normalizeFilter(initialFilter));
  }, [initialFilter]);

  const selectedMoveLocation = useMemo(() => {
    if (moveDialog.locationId === NEW_LOCATION_VALUE) return null;

    return (
      safeMoveLocations.find(
        (location) => String(location.id) === String(moveDialog.locationId)
      ) ??
      safeMoveLocations[0] ??
      null
    );
  }, [moveDialog.locationId, safeMoveLocations]);

  const moveAreas = selectedMoveLocation?.storage_areas ?? [];

  const selectedMoveArea = useMemo(() => {
    if (moveDialog.areaId === NEW_AREA_VALUE) return null;

    return (
      moveAreas.find((area) => String(area.id) === String(moveDialog.areaId)) ??
      null
    );
  }, [moveAreas, moveDialog.areaId]);

  const canMoveToInventory =
    canEditInventory &&
    Boolean(
      moveDialog.categoryId &&
        moveDialog.categoryId !== NEW_CATEGORY_VALUE &&
        (moveDialog.item?.id || (moveDialog.itemIds?.length ?? 0) > 0)
    ) &&
    !moveDialog.isMoving;

  const allVisibleSelected = useMemo(() => {
    if (visibleItems.length === 0) return false;
    return visibleItems.every((item) => selectedIds.has(String(item.id)));
  }, [selectedIds, visibleItems]);

  useEffect(() => {
    return () => {
      if (mobileLongPressTimerRef.current) {
        window.clearTimeout(mobileLongPressTimerRef.current);
      }
    };
  }, []);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.all += 1;
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      { all: 0, needed: 0, purchased: 0, dismissed: 0 }
    );
  }, [items]);
  const desktopSummaryCards = [
    {
      label: "Needed",
      value: counts.needed ?? 0,
      description: "Ready to restock",
      icon: FaShoppingBasket,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "Purchased",
      value: counts.purchased ?? 0,
      description: "Recently checked off",
      icon: FaCheck,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Dismissed",
      value: counts.dismissed ?? 0,
      description: "Set aside for now",
      icon: FaUndo,
      className: "border-gray-200 bg-gray-50 text-gray-600",
    },
    {
      label: "Total",
      value: counts.all ?? 0,
      description: "Shopping list items",
      icon: FaShoppingBasket,
      className:
        "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]",
    },
  ];

  function handleAdded(item) {
    if (!canEditInventory) return;
    setItems((current) => sortItems([item, ...current]));
    setFilter("needed");
    setMessage({ type: "success", text: "Added to shopping list." });
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "added",
      id: item?.id,
    });
  }

  function handleUpdated(item) {
    if (!canEditInventory) return;
    setItems((current) =>
      sortItems(current.map((existing) => (existing.id === item.id ? item : existing)))
    );
    setEditingItem((current) =>
      current && current.id === item.id ? { ...current, ...item } : current
    );
    setMessage({ type: "success", text: "Shopping list item updated." });
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "updated",
      id: item?.id,
    });
  }

  async function updateItemStatus(item, status) {
    if (!canEditInventory) return;
    if (isBulkBusy) return;

    setPendingId(item.id);
    setMessage(null);

    const result = await updateShoppingListItemAction(item.id, { status });
    setPendingId(null);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setItems((current) =>
      sortItems(current.map((existing) => (existing.id === item.id ? result.data : existing)))
    );
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "updated",
      id: item.id,
      status,
    });
  }

  function toggleSelect(id) {
    if (!canEditInventory) return;
    const key = String(id);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function enterMobileSelection(id) {
    if (!canEditInventory) return;
    setMobileSelectionMode(true);

    if (!id) return;

    const key = String(id);
    setSelectedIds((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  function cancelMobileSelection() {
    setMobileSelectionMode(false);
    clearSelection();
  }

  function clearMobileLongPressTimer() {
    if (!mobileLongPressTimerRef.current) return;
    window.clearTimeout(mobileLongPressTimerRef.current);
    mobileLongPressTimerRef.current = null;
  }

  function startMobileLongPress(id) {
    if (!isMobileViewport() || !canEditInventory || mobileSelectionMode) return;
    clearMobileLongPressTimer();
    mobileLongPressTimerRef.current = window.setTimeout(() => {
      mobileLongPressTriggeredRef.current = true;
      enterMobileSelection(id);
      mobileLongPressTimerRef.current = null;
    }, 450);
  }

  function handleMobileItemPress(item) {
    if (!isMobileViewport()) return;

    if (mobileLongPressTriggeredRef.current) {
      mobileLongPressTriggeredRef.current = false;
      return;
    }

    if (mobileSelectionMode) {
      toggleSelect(item.id);
      return;
    }

    if (!canEditInventory) return;
    setMessage(null);
    setEditingItem(item);
  }

  function getSelectedValue(keys) {
    const value = Array.from(keys)[0];
    return value ? String(value) : "";
  }

  function openMoveDialog(item) {
    if (!canEditInventory) return;
    const firstLocation = safeMoveLocations[0] ?? null;
    const firstArea = firstLocation?.storage_areas?.[0] ?? null;
    const firstCategory = firstArea?.categories?.[0] ?? null;

    setMessage(null);
    setMoveDialog({
      open: true,
      item,
      itemIds: item?.id ? [String(item.id)] : [],
      isMoving: false,
      locationId: firstLocation?.id ?? null,
      areaId: firstArea?.id ?? null,
      categoryId: firstCategory?.id ?? null,
    });
  }

  function openBulkMoveDialog() {
    if (!canEditInventory) return;
    if (selectedIds.size === 0) return;
    const firstLocation = safeMoveLocations[0] ?? null;
    const firstArea = firstLocation?.storage_areas?.[0] ?? null;
    const firstCategory = firstArea?.categories?.[0] ?? null;

    setMessage(null);
    setMoveDialog({
      open: true,
      item: null,
      itemIds: Array.from(selectedIds),
      isMoving: false,
      locationId: firstLocation?.id ?? null,
      areaId: firstArea?.id ?? null,
      categoryId: firstCategory?.id ?? null,
    });
  }

  function closeMoveDialog() {
    if (moveDialog.isMoving) return;
    setMoveDialog({
      open: false,
      item: null,
      itemIds: [],
      isMoving: false,
      locationId: null,
      areaId: null,
      categoryId: null,
    });
  }

  function handleMoveLocationChange(value) {
    if (value === NEW_LOCATION_VALUE) {
      setMoveDialog((current) => ({
        ...current,
        locationId: NEW_LOCATION_VALUE,
        areaId: null,
        categoryId: null,
      }));
      return;
    }

    const nextLocation =
      safeMoveLocations.find((location) => String(location.id) === String(value)) ??
      safeMoveLocations[0] ??
      null;
    const firstArea = nextLocation?.storage_areas?.[0] ?? null;
    const firstCategory = firstArea?.categories?.[0] ?? null;

    setMoveDialog((current) => ({
      ...current,
      locationId: nextLocation?.id ?? null,
      areaId: firstArea?.id ?? null,
      categoryId: firstCategory?.id ?? null,
    }));
  }

  function handleMoveAreaChange(value) {
    if (value === NEW_AREA_VALUE) {
      setMoveDialog((current) => ({
        ...current,
        areaId: NEW_AREA_VALUE,
        categoryId: null,
      }));
      return;
    }

    const nextArea =
      moveAreas.find((area) => String(area.id) === String(value)) ?? null;
    const firstCategory = nextArea?.categories?.[0] ?? null;

    setMoveDialog((current) => ({
      ...current,
      areaId: nextArea?.id ?? null,
      categoryId: firstCategory?.id ?? null,
    }));
  }

  function updateMoveCreateName(key, value) {
    setMoveCreateNames((current) => ({ ...current, [key]: value }));
  }

  function showMoveCreateMessage(type, text) {
    setMoveCreateMessage({ type, text });
    window.setTimeout(() => setMoveCreateMessage(null), 3500);
  }

  async function createMoveLocation() {
    const name = moveCreateNames.location.trim();
    if (!name || moveCreateAction || moveDialog.isMoving) return;

    setMoveCreateAction("location");
    setMoveCreateMessage(null);
    const result = await addLocation(name);
    setMoveCreateAction("");

    if (result?.error) {
      showMoveCreateMessage("error", result.error?.message || result.error);
      return;
    }

    const location = { ...result.data, storage_areas: [] };
    setLocalMoveLocations((current) => [...current, location]);
    setMoveDialog((current) => ({
      ...current,
      locationId: location.id,
      areaId: null,
      categoryId: null,
    }));
    updateMoveCreateName("location", "");
    showMoveCreateMessage("success", "Location created.");
  }

  async function createMoveArea() {
    const name = moveCreateNames.area.trim();
    const locationId = moveDialog.locationId;
    if (
      !name ||
      !locationId ||
      locationId === NEW_LOCATION_VALUE ||
      moveCreateAction ||
      moveDialog.isMoving
    ) {
      return;
    }

    setMoveCreateAction("area");
    setMoveCreateMessage(null);
    const result = await addStorageArea(locationId, name);
    setMoveCreateAction("");

    if (result?.error) {
      showMoveCreateMessage("error", result.error?.message || result.error);
      return;
    }

    const area = { ...result.data, categories: [] };
    setLocalMoveLocations((current) =>
      current.map((location) =>
        String(location.id) === String(locationId)
          ? {
              ...location,
              storage_areas: [...(location.storage_areas ?? []), area],
            }
          : location
      )
    );
    setMoveDialog((current) => ({
      ...current,
      areaId: area.id,
      categoryId: null,
    }));
    updateMoveCreateName("area", "");
    showMoveCreateMessage("success", "Storage area created.");
  }

  async function createMoveCategory() {
    const name = moveCreateNames.category.trim();
    const areaId = moveDialog.areaId;
    if (
      !name ||
      !areaId ||
      areaId === NEW_AREA_VALUE ||
      moveCreateAction ||
      moveDialog.isMoving
    ) {
      return;
    }

    setMoveCreateAction("category");
    setMoveCreateMessage(null);
    const result = await addCategory(areaId, name);
    setMoveCreateAction("");

    if (result?.error) {
      showMoveCreateMessage("error", result.error?.message || result.error);
      return;
    }

    const category = result.data;
    setLocalMoveLocations((current) =>
      current.map((location) => ({
        ...location,
        storage_areas: (location.storage_areas ?? []).map((area) =>
          String(area.id) === String(areaId)
            ? {
                ...area,
                categories: [...(area.categories ?? []), category],
              }
            : area
        ),
      }))
    );
    setMoveDialog((current) => ({
      ...current,
      categoryId: category.id,
    }));
    updateMoveCreateName("category", "");
    showMoveCreateMessage("success", "Category created.");
  }

  function toggleSelectAllVisible() {
    if (!canEditInventory) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleItems.forEach((item) => next.delete(String(item.id)));
      } else {
        visibleItems.forEach((item) => next.add(String(item.id)));
      }
      return next;
    });
  }

  async function bulkUpdateStatus(status) {
    if (!canEditInventory) return;
    if (selectedIds.size === 0 || isBulkBusy) return;

    const ids = Array.from(selectedIds);
    setBulkAction(status);
    setMessage(null);

    const result = await bulkUpdateShoppingListItemsAction(ids, { status });
    setBulkAction(null);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    const updatedById = new Map(
      (result.data?.items ?? []).map((item) => [String(item.id), item])
    );
    setItems((current) =>
      sortItems(
        current.map((item) => updatedById.get(String(item.id)) ?? item)
      )
    );
    clearSelection();
    setMobileSelectionMode(false);
    setMessage({
      type: "success",
      text: `Updated ${updatedById.size} shopping list item${
        updatedById.size === 1 ? "" : "s"
      }.`,
    });
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "updated",
      ids,
      status,
    });
  }

  async function confirmMoveToInventory() {
    if (!canEditInventory) return;
    if (!canMoveToInventory) return;

    const itemIds =
      moveDialog.itemIds?.length > 0
        ? moveDialog.itemIds
        : moveDialog.item?.id
          ? [String(moveDialog.item.id)]
          : [];

    if (itemIds.length === 0) return;

    setMoveDialog((current) => ({ ...current, isMoving: true }));
    setMessage(null);

    const results = [];
    for (const itemId of itemIds) {
      results.push(
        await moveShoppingListItemToInventoryAction(itemId, {
          categoryId: moveDialog.categoryId,
        })
      );
    }

    const movedItems = results
      .filter((result) => !result?.error)
      .map((result) => result.data)
      .filter(Boolean);
    const movedIds = new Set(
      movedItems.map((entry) => String(entry.shoppingListItem?.id)).filter(Boolean)
    );
    const failedResults = results.filter((result) => result?.error);

    if (movedIds.size === 0) {
      setMessage({
        type: "error",
        text: failedResults[0]?.error ?? "Could not move selected items.",
      });
      setMoveDialog((current) => ({ ...current, isMoving: false }));
      return;
    }

    setItems((current) => current.filter((item) => !movedIds.has(String(item.id))));
    setSelectedIds((current) => {
      const next = new Set(current);
      movedIds.forEach((id) => next.delete(id));
      return next;
    });
    setMobileSelectionMode(false);
    closeMoveDialog();
    setMessage({
      type: failedResults.length > 0 ? "error" : "success",
      text:
        failedResults.length > 0
          ? `Moved ${movedIds.size} item${movedIds.size === 1 ? "" : "s"} to inventory. ${failedResults.length} failed.`
          : `Moved ${movedIds.size} item${movedIds.size === 1 ? "" : "s"} to inventory.`,
    });
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "deleted",
      ids: Array.from(movedIds),
      movedToInventoryItemIds: movedItems
        .map((entry) => entry.inventoryItem?.id)
        .filter(Boolean),
    });
  }

  async function confirmBulkDelete() {
    if (!canEditInventory) return;
    if (selectedIds.size === 0 || isBulkBusy) return;

    const ids = Array.from(selectedIds);
    setBulkAction("delete");
    setMessage(null);

    const result = await bulkDeleteShoppingListItemsAction(ids);
    setBulkAction(null);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setIsBulkDeleteOpen(false);
      return;
    }

    const deletedIds = new Set((result.data?.items ?? []).map((item) => String(item.id)));
    setItems((current) =>
      current.filter((item) => !deletedIds.has(String(item.id)))
    );
    clearSelection();
    setMobileSelectionMode(false);
    setIsBulkDeleteOpen(false);
    setMessage({
      type: "success",
      text: `Deleted ${deletedIds.size} shopping list item${
        deletedIds.size === 1 ? "" : "s"
      }.`,
    });
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "deleted",
      ids,
    });
  }

  async function confirmDeleteItem() {
    if (!canEditInventory) return;
    if (!deleteCandidate?.id) return;
    if (isBulkBusy) return;

    setPendingId(deleteCandidate.id);
    setMessage(null);

    const result = await deleteShoppingListItemAction(deleteCandidate.id);
    setPendingId(null);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setDeleteCandidate(null);
      return;
    }

    setItems((current) =>
      current.filter((existing) => existing.id !== deleteCandidate.id)
    );
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(String(deleteCandidate.id));
      return next;
    });
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "deleted",
      id: deleteCandidate.id,
    });
    setDeleteCandidate(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-md:space-y-4 max-md:pb-24"
    >
      <motion.section
        className={
          mobileSelectionMode
            ? "sticky top-[4.75rem] z-30 md:hidden"
            : "space-y-3 md:hidden"
        }
      >
        {mobileSelectionMode ? (
          <motion.div
            key="shopping-mobile-selection"
            {...mobileSelectionPanelMotion}
            className="transform-gpu rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                  {selectedCount} selected
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Tap cards to adjust selection.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelMobileSelection}
                className="min-h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                disabled={visibleItems.length === 0 || isBulkBusy}
                className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] disabled:opacity-50"
              >
                {allVisibleSelected ? "Deselect all" : "Select all"}
              </button>
              <span className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500">
                {visibleItems.length} matching
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-sm font-semibold text-[var(--stocksense-brand)]"
                isLoading={moveDialog.isMoving}
                isDisabled={
                  selectedCount === 0 || isBulkBusy
                }
                onPress={openBulkMoveDialog}
                startContent={!moveDialog.isMoving ? <FaExchangeAlt /> : null}
              >
                Move
              </Button>
              <Button
                className="min-h-11 rounded-xl bg-emerald-600 text-sm font-semibold text-white"
                isLoading={bulkAction === "purchased"}
                isDisabled={
                  selectedCount === 0 || (isBulkBusy && bulkAction !== "purchased")
                }
                onPress={() => bulkUpdateStatus("purchased")}
              >
                Purchased
              </Button>
              <Button
                className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-sm font-semibold text-[var(--stocksense-brand)]"
                isLoading={bulkAction === "needed"}
                isDisabled={
                  selectedCount === 0 || (isBulkBusy && bulkAction !== "needed")
                }
                onPress={() => bulkUpdateStatus("needed")}
              >
                Need again
              </Button>
              <Button
                variant="flat"
                className="min-h-11 rounded-xl text-sm font-semibold"
                isLoading={bulkAction === "dismissed"}
                isDisabled={
                  selectedCount === 0 || (isBulkBusy && bulkAction !== "dismissed")
                }
                onPress={() => bulkUpdateStatus("dismissed")}
              >
                Dismiss
              </Button>
              <Button
                color="danger"
                variant="flat"
                className="min-h-11 rounded-xl text-sm font-semibold"
                isDisabled={selectedCount === 0 || isBulkBusy}
                onPress={() => setIsBulkDeleteOpen(true)}
              >
                Delete
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="shopping-mobile-default"
            {...mobileDefaultPanelMotion}
            className="space-y-3 transform-gpu"
          >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
                    Shopping List
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {counts.needed} needed
                  </p>
                </div>
                {canEditInventory && (
                  <div className="flex shrink-0 items-center gap-2">
                    {visibleItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => enterMobileSelection()}
                        disabled={isBulkBusy}
                        className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm disabled:opacity-50"
                      >
                        Select
                      </button>
                    )}
                    <Button
                      className="min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-3 text-sm font-semibold text-white"
                      onPress={() => {
                        setMessage(null);
                        setIsAddModalOpen(true);
                      }}
                      startContent={<FaPlus />}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              <Select
                aria-label="Shopping list status filter"
                label="Show"
                selectedKeys={new Set([filter])}
                onSelectionChange={(keys) => {
                  const value = getSelectedValue(keys);
                  if (value) setFilter(value);
                }}
                variant="bordered"
                radius="lg"
                disallowEmptySelection
                className="w-full"
                classNames={{
                  ...themedSelectClassNames,
                  trigger: `${themedSelectClassNames.trigger} min-h-12 rounded-2xl border-gray-200 bg-white shadow-sm`,
                }}
              >
                {FILTERS.map((option) => (
                  <SelectItem key={option.value} textValue={option.label}>
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>{option.label}</span>
                      <span className="text-xs font-medium text-gray-500">
                        {counts[option.value] ?? 0}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </Select>

              {message ? (
                <p
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    message.type === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {message.text}
                </p>
              ) : null}
          </motion.div>
        )}
      </motion.section>

      <section className="max-md:hidden">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--stocksense-brand)]">
              Shopping List
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">
              Restock list
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Keep track of what your home needs next.
            </p>
          </div>

          <div className="flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    filter === option.value
                      ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {option.label} ({counts[option.value] ?? 0})
                </button>
              ))}
            </div>

            {canEditInventory && (
              <div className="flex gap-2">
                <Button
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                  onPress={() => {
                    setMessage(null);
                    setIsAddModalOpen(true);
                  }}
                  startContent={<FaPlus />}
                >
                  Add item
                </Button>
              </div>
            )}
          </div>
        </div>

        {canEditInventory && <AnimatePresence initial={false}>
          {selectedCount > 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-5 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 max-md:hidden"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-[var(--stocksense-brand)]">
                    Bulk actions for{" "}
                    <span className="font-semibold">{selectedCount}</span>{" "}
                    item{selectedCount === 1 ? "" : "s"}
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--stocksense-brand)]">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      disabled={visibleItems.length === 0 || isBulkBusy}
                      className="h-4 w-4 cursor-pointer rounded border border-[var(--stocksense-brand-border)]"
                    />
                    Select all visible
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                    isDisabled={isBulkBusy}
                    onPress={clearSelection}
                  >
                    Clear selection
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                    isLoading={moveDialog.isMoving}
                    isDisabled={isBulkBusy}
                    onPress={openBulkMoveDialog}
                    startContent={!moveDialog.isMoving ? <FaExchangeAlt /> : null}
                  >
                    Move to inventory
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl bg-emerald-600 text-white"
                    isLoading={bulkAction === "purchased"}
                    isDisabled={isBulkBusy && bulkAction !== "purchased"}
                    onPress={() => bulkUpdateStatus("purchased")}
                    startContent={bulkAction !== "purchased" ? <FaCheck /> : null}
                  >
                    Mark purchased
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                    isLoading={bulkAction === "needed"}
                    isDisabled={isBulkBusy && bulkAction !== "needed"}
                    onPress={() => bulkUpdateStatus("needed")}
                    startContent={bulkAction !== "needed" ? <FaUndo /> : null}
                  >
                    Need again
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    className="rounded-xl"
                    isLoading={bulkAction === "dismissed"}
                    isDisabled={isBulkBusy && bulkAction !== "dismissed"}
                    onPress={() => bulkUpdateStatus("dismissed")}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="rounded-xl"
                    isDisabled={isBulkBusy}
                    onPress={() => setIsBulkDeleteOpen(true)}
                    startContent={<FaTrash />}
                  >
                    Delete selected
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>}

        {message ? (
          <p
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              message.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 max-md:hidden">
        {desktopSummaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
                    {card.value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {card.description}
                  </p>
                </div>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${card.className}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 md:gap-5">
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => {
            const isSelected = selectedIds.has(String(item.id));
            const isPending = pendingId === item.id;
            const isDisabled = isPending || isBulkBusy;
            const addedOn = formatDate(item.createdAt);

            return (
              <motion.article
                key={item.id}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                onPointerDown={() => startMobileLongPress(item.id)}
                onPointerUp={clearMobileLongPressTimer}
                onPointerLeave={clearMobileLongPressTimer}
                onPointerCancel={clearMobileLongPressTimer}
                onContextMenu={(event) => event.preventDefault()}
                onClick={() => handleMobileItemPress(item)}
                className={`relative h-full overflow-hidden rounded-2xl border bg-white p-3.5 shadow-sm transition sm:p-4 md:border-white/70 md:p-5 md:hover:-translate-y-0.5 md:hover:shadow-lg ${
                  isSelected
                    ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]/40"
                    : "border-stocksense-gray hover:bg-gray-50 md:hover:border-[var(--stocksense-brand-border)]"
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${statusAccentClass(item.status)}`} />

                <div className="flex h-full flex-col justify-between gap-3 pt-1">
                  <div className="flex items-start gap-2.5">
                    {mobileSelectionMode && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={mobileSelectionTransition}
                        className="mt-0.5 shrink-0 transform-gpu md:hidden"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          disabled={isDisabled}
                          onPointerDown={(event) => event.stopPropagation()}
                          onPointerUp={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Select ${item.name}`}
                          className="h-5 w-5 cursor-pointer rounded border border-stocksense-gray"
                        />
                      </motion.div>
                    )}

                    {canEditInventory && selectionMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        disabled={isDisabled}
                        aria-label={`Select ${item.name}`}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border border-stocksense-gray max-md:hidden"
                      />
                    )}

                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--entity-shopping-border)] bg-[var(--entity-shopping-soft)] text-[var(--entity-shopping-accent)] md:h-20 md:w-20">
                      {item.imageUrl ? (
                        <ImageWithLoader
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FaImage className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h2
                            className="truncate text-[15px] font-semibold leading-5 text-gray-900 sm:text-base md:text-lg md:leading-6"
                            title={item.name}
                          >
                            {item.name}
                          </h2>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClasses(item.status)}`}
                            >
                              {STATUS_LABELS[item.status] ?? item.status}
                            </span>
                            {(item.sourceItemId || item.sourceCategoryId) ? (
                              <span className="rounded-full border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--entity-item-accent)]">
                                From inventory
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-start gap-1.5">
                          <div className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1.5 text-center">
                            <div className="text-[10px] font-semibold uppercase text-gray-400">
                              Qty
                            </div>
                            <div className="text-base font-semibold leading-5 text-[var(--stocksense-brand)]">
                              {item.quantity ?? 0}
                            </div>
                          </div>

                          {canEditInventory && (
                            <div
                              className="max-md:hidden"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <Dropdown placement="bottom-end">
                                <DropdownTrigger>
                                  <Button
                                    isIconOnly
                                    variant="light"
                                    radius="lg"
                                    className="h-9 w-9 min-w-9 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                                    aria-label={`${item.name} actions`}
                                    isDisabled={isDisabled}
                                  >
                                    <FaEllipsisV className="h-4 w-4" />
                                  </Button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label={`${item.name} actions`}>
                                  <DropdownItem
                                    key="select"
                                    onPress={() => toggleSelect(item.id)}
                                  >
                                    {isSelected
                                      ? "Deselect for bulk action"
                                      : "Select for bulk action"}
                                  </DropdownItem>
                                  {item.status === "needed" ? (
                                    <DropdownItem
                                      key="purchased"
                                      onPress={() => updateItemStatus(item, "purchased")}
                                    >
                                      Mark purchased
                                    </DropdownItem>
                                  ) : (
                                    <DropdownItem
                                      key="needed"
                                      onPress={() => updateItemStatus(item, "needed")}
                                    >
                                      Need again
                                    </DropdownItem>
                                  )}
                                  {item.status !== "dismissed" ? (
                                    <DropdownItem
                                      key="dismiss"
                                      onPress={() => updateItemStatus(item, "dismissed")}
                                    >
                                      Dismiss
                                    </DropdownItem>
                                  ) : (
                                    <DropdownItem
                                      key="restore"
                                      onPress={() => updateItemStatus(item, "needed")}
                                    >
                                      Restore
                                    </DropdownItem>
                                  )}
                                  <DropdownItem
                                    key="move"
                                    onPress={() => openMoveDialog(item)}
                                  >
                                    Move to inventory
                                  </DropdownItem>
                                  <DropdownItem
                                    key="edit"
                                    onPress={() => {
                                      setMessage(null);
                                      setEditingItem(item);
                                    }}
                                  >
                                    Edit
                                  </DropdownItem>
                                  <DropdownItem
                                    key="delete"
                                    className="text-danger"
                                    color="danger"
                                    onPress={() => {
                                      setMessage(null);
                                      setDeleteCandidate(item);
                                    }}
                                  >
                                    Delete
                                  </DropdownItem>
                                </DropdownMenu>
                              </Dropdown>
                            </div>
                          )}
                        </div>
                      </div>

                      {addedOn ? (
                        <p className="mt-2 text-xs text-gray-500">
                          Added {addedOn}
                        </p>
                      ) : null}
                    </div>
                  </div>

                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center shadow-sm sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <p className="text-sm text-gray-500">
              {filter === "needed"
                ? "No needed items right now."
                : `No ${filter} shopping list items.`}
            </p>
            {canEditInventory && (
              <Button
                className="mt-4 rounded-xl bg-[var(--stocksense-brand)] text-white"
                onPress={() => {
                  setMessage(null);
                  setIsAddModalOpen(true);
                }}
                startContent={<FaPlus />}
              >
                Add item
              </Button>
            )}
          </div>
        ) : null}
      </section>

      {canEditInventory && <AddShoppingListItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleAdded}
      />}
      {canEditInventory && <EditShoppingListItemModal
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onUpdated={handleUpdated}
        onMoveToInventory={(item) => {
          setEditingItem(null);
          openMoveDialog(item);
        }}
        isMovingToInventory={
          Boolean(editingItem?.id) &&
          moveDialog.isMoving &&
          moveDialog.itemIds?.includes(String(editingItem.id))
        }
        onDelete={(item) => {
          setEditingItem(null);
          setMessage(null);
          setDeleteCandidate(item);
        }}
      />}
      {canEditInventory && <Modal
        isOpen={moveDialog.open}
        onOpenChange={(open) => {
          if (!open) closeMoveDialog();
        }}
        hideCloseButton={moveDialog.isMoving}
        isDismissable={!moveDialog.isMoving}
        placement="center"
        size="md"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {() => (
            <>
              <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">Move to inventory</span>
                  {moveDialog.item?.name ? (
                    <span className="block truncate text-sm font-normal text-gray-500">
                      {moveDialog.item.name}
                    </span>
                  ) : moveDialog.itemIds?.length > 1 ? (
                    <span className="block truncate text-sm font-normal text-gray-500">
                      {moveDialog.itemIds.length} selected items
                    </span>
                  ) : null}
                </span>
                <MobileSheetCloseButton onPress={closeMoveDialog} />
              </ModalHeader>

              <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                {moveCreateMessage ? (
                  <div
                    className={`rounded-2xl border px-3 py-2 text-sm ${
                      moveCreateMessage.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {moveCreateMessage.text}
                  </div>
                ) : null}

                <Select
                  label="Location"
                  selectedKeys={
                    moveDialog.locationId
                      ? new Set([String(moveDialog.locationId)])
                      : new Set()
                  }
                  onSelectionChange={(keys) =>
                    handleMoveLocationChange(getSelectedValue(keys))
                  }
                  isDisabled={moveDialog.isMoving}
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {safeMoveLocations.map((location) => (
                    <SelectItem key={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                  <SelectItem key={NEW_LOCATION_VALUE}>+ New location</SelectItem>
                </Select>
                {moveDialog.locationId === NEW_LOCATION_VALUE ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      label="New location"
                      value={moveCreateNames.location}
                      onValueChange={(value) => updateMoveCreateName("location", value)}
                      placeholder="Kitchen, garage, closet..."
                      isDisabled={moveDialog.isMoving}
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                    <Button
                      className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={moveCreateAction === "location"}
                      isDisabled={
                        moveDialog.isMoving ||
                        !moveCreateNames.location.trim() ||
                        Boolean(moveCreateAction)
                      }
                      onPress={createMoveLocation}
                    >
                      Create
                    </Button>
                  </div>
                ) : null}

                <Select
                  label="Storage area"
                  placeholder="Select storage area"
                  selectedKeys={
                    moveDialog.areaId
                      ? new Set([String(moveDialog.areaId)])
                      : new Set()
                  }
                  onSelectionChange={(keys) =>
                    handleMoveAreaChange(getSelectedValue(keys))
                  }
                  isDisabled={
                    moveDialog.isMoving ||
                    !selectedMoveLocation ||
                    moveDialog.locationId === NEW_LOCATION_VALUE
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {moveAreas.map((area) => (
                    <SelectItem key={String(area.id)}>{area.name}</SelectItem>
                  ))}
                  <SelectItem key={NEW_AREA_VALUE}>+ New storage area</SelectItem>
                </Select>
                {moveDialog.areaId === NEW_AREA_VALUE ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      label="New storage area"
                      value={moveCreateNames.area}
                      onValueChange={(value) => updateMoveCreateName("area", value)}
                      placeholder="Pantry, shelf, drawer..."
                      isDisabled={
                        moveDialog.isMoving ||
                        !moveDialog.locationId ||
                        moveDialog.locationId === NEW_LOCATION_VALUE
                      }
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                    <Button
                      className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={moveCreateAction === "area"}
                      isDisabled={
                        moveDialog.isMoving ||
                        !moveCreateNames.area.trim() ||
                        !moveDialog.locationId ||
                        moveDialog.locationId === NEW_LOCATION_VALUE ||
                        Boolean(moveCreateAction)
                      }
                      onPress={createMoveArea}
                    >
                      Create
                    </Button>
                  </div>
                ) : null}

                <Select
                  label="Category"
                  placeholder="Select category"
                  selectedKeys={
                    moveDialog.categoryId
                      ? new Set([String(moveDialog.categoryId)])
                      : new Set()
                  }
                  onSelectionChange={(keys) =>
                    setMoveDialog((current) => ({
                      ...current,
                      categoryId: getSelectedValue(keys) || null,
                    }))
                  }
                  isDisabled={
                    moveDialog.isMoving ||
                    !moveDialog.areaId ||
                    moveDialog.areaId === NEW_AREA_VALUE
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {(selectedMoveArea?.categories ?? []).map((category) => (
                    <SelectItem key={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectItem key={NEW_CATEGORY_VALUE}>+ New category</SelectItem>
                </Select>
                {moveDialog.categoryId === NEW_CATEGORY_VALUE ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      label="New category"
                      value={moveCreateNames.category}
                      onValueChange={(value) => updateMoveCreateName("category", value)}
                      placeholder="Snacks, tools, cleaning..."
                      isDisabled={
                        moveDialog.isMoving ||
                        !moveDialog.areaId ||
                        moveDialog.areaId === NEW_AREA_VALUE
                      }
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                    <Button
                      className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={moveCreateAction === "category"}
                      isDisabled={
                        moveDialog.isMoving ||
                        !moveCreateNames.category.trim() ||
                        !moveDialog.areaId ||
                        moveDialog.areaId === NEW_AREA_VALUE ||
                        Boolean(moveCreateAction)
                      }
                      onPress={createMoveCategory}
                    >
                      Create
                    </Button>
                  </div>
                ) : null}
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button
                  variant="light"
                  className="rounded-xl max-md:hidden"
                  isDisabled={moveDialog.isMoving}
                  onPress={closeMoveDialog}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                  isLoading={moveDialog.isMoving}
                  isDisabled={!canMoveToInventory}
                  onPress={confirmMoveToInventory}
                >
                  Move
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>}
      {canEditInventory && <ConfirmDeleteModal
        isOpen={Boolean(deleteCandidate)}
        isDeleting={Boolean(deleteCandidate && pendingId === deleteCandidate.id)}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={confirmDeleteItem}
        title={
          deleteCandidate
            ? `Delete "${deleteCandidate.name}"?`
            : "Delete shopping list item?"
        }
        description={
          deleteCandidate
            ? `This will remove "${deleteCandidate.name}" from your shopping list.`
            : ""
        }
      />}
      {canEditInventory && <ConfirmDeleteModal
        isOpen={isBulkDeleteOpen}
        isDeleting={bulkAction === "delete"}
        onCancel={() => setIsBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedCount} shopping list item${
          selectedCount === 1 ? "" : "s"
        }?`}
        description="This will remove the selected items from your shopping list."
      />}
    </motion.div>
  );
}
