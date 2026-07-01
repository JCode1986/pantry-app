"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
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
  FaEdit,
  FaExchangeAlt,
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
  themedSelectClassNames,
} from "@/components/modals/modalTheme";

const FILTERS = [
  { value: "needed", label: "Needed" },
  { value: "purchased", label: "Purchased" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

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

export default function ShoppingListPageClient({
  initialItems = [],
  initialError = null,
  moveLocations = [],
  canEditInventory = true,
}) {
  const [items, setItems] = useState(() => sortItems(initialItems));
  const [filter, setFilter] = useState("needed");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [message, setMessage] = useState(
    initialError ? { type: "error", text: initialError } : null
  );
  const [pendingId, setPendingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [moveDialog, setMoveDialog] = useState({
    open: false,
    item: null,
    isMoving: false,
    locationId: null,
    areaId: null,
    categoryId: null,
  });

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  const selectedCount = selectedIds.size;
  const isBulkBusy = Boolean(bulkAction);
  const safeMoveLocations = moveLocations ?? [];

  const selectedMoveLocation = useMemo(() => {
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
    return (
      moveAreas.find((area) => String(area.id) === String(moveDialog.areaId)) ??
      null
    );
  }, [moveAreas, moveDialog.areaId]);

  const canMoveToInventory =
    canEditInventory &&
    Boolean(moveDialog.item?.id && moveDialog.categoryId) &&
    !moveDialog.isMoving;

  const allVisibleSelected = useMemo(() => {
    if (visibleItems.length === 0) return false;
    return visibleItems.every((item) => selectedIds.has(String(item.id)));
  }, [selectedIds, visibleItems]);

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
      isMoving: false,
      locationId: null,
      areaId: null,
      categoryId: null,
    });
  }

  function handleMoveLocationChange(value) {
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
    const nextArea =
      moveAreas.find((area) => String(area.id) === String(value)) ?? null;
    const firstCategory = nextArea?.categories?.[0] ?? null;

    setMoveDialog((current) => ({
      ...current,
      areaId: nextArea?.id ?? null,
      categoryId: firstCategory?.id ?? null,
    }));
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

    const itemId = moveDialog.item.id;
    setMoveDialog((current) => ({ ...current, isMoving: true }));
    setMessage(null);

    const result = await moveShoppingListItemToInventoryAction(itemId, {
      categoryId: moveDialog.categoryId,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setMoveDialog((current) => ({ ...current, isMoving: false }));
      return;
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(String(itemId));
      return next;
    });
    closeMoveDialog();
    setMessage({
      type: "success",
      text: `Moved "${result.data?.inventoryItem?.name ?? "item"}" to inventory.`,
    });
    emitInventoryChange({
      entity: "shopping_list_item",
      action: "deleted",
      id: itemId,
      movedToInventoryItemId: result.data?.inventoryItem?.id,
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
      className="space-y-6"
    >
      <section className="rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[var(--entity-shopping-border)] bg-[var(--entity-shopping-accent)] p-3 text-white shadow-sm">
              <FaShoppingBasket className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-stocksense-teal md:text-2xl">
                Shopping List
              </h1>
              <p className="text-sm text-gray-500">
                Keep track of what needs to be restocked.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            )}
          </div>
        </div>

        {canEditInventory && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                disabled={visibleItems.length === 0 || isBulkBusy}
                className="h-5 w-5 cursor-pointer rounded border border-stocksense-gray"
              />
              Select all visible
            </label>

            <Button
              size="sm"
              variant="flat"
              className="w-fit rounded-xl"
              isDisabled={selectedCount === 0 || isBulkBusy}
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
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-[var(--stocksense-brand)]">
                  Bulk actions for{" "}
                  <span className="font-semibold">{selectedCount}</span>{" "}
                  item{selectedCount === 1 ? "" : "s"}
                </p>

                <div className="flex flex-wrap gap-2">
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
                className={`relative h-full overflow-hidden rounded-2xl border bg-white p-3.5 shadow-sm transition sm:p-4 ${
                  isSelected
                    ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]/40"
                    : "border-stocksense-gray hover:bg-gray-50"
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${statusAccentClass(item.status)}`} />

                <div className="flex h-full flex-col justify-between gap-3 pt-1">
                  <div className="flex items-start gap-2.5">
                    {canEditInventory && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        disabled={isDisabled}
                        aria-label={`Select ${item.name}`}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border border-stocksense-gray"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-[15px] font-semibold leading-5 text-gray-900 sm:text-base">
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

                        <div className="shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-center">
                          <div className="text-[10px] font-semibold uppercase text-gray-400">
                            Qty
                          </div>
                          <div className="text-base font-semibold leading-5 text-stocksense-teal">
                            {item.quantity ?? 0}
                          </div>
                        </div>
                      </div>

                      {addedOn ? (
                        <p className="mt-2 text-xs text-gray-500">
                          Added {addedOn}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {canEditInventory && (
                  <div className="grid grid-cols-[minmax(82px,1.25fr)_minmax(58px,1fr)_36px_36px_36px] gap-1.5">
                    {item.status === "needed" ? (
                      <Button
                        size="sm"
                        className="h-9 min-w-0 rounded-xl bg-emerald-600 px-1.5 text-[11px] text-white sm:px-2 sm:text-xs"
                        isLoading={isPending}
                        isDisabled={isBulkBusy}
                        onPress={() => updateItemStatus(item, "purchased")}
                      >
                        Purchased
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-9 min-w-0 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-1.5 text-[11px] text-[var(--stocksense-brand)] sm:px-2 sm:text-xs"
                        isLoading={isPending}
                        isDisabled={isBulkBusy}
                        onPress={() => updateItemStatus(item, "needed")}
                      >
                        Need again
                      </Button>
                    )}
                    {item.status !== "dismissed" ? (
                      <Button
                        size="sm"
                        variant="flat"
                        className="h-9 min-w-0 rounded-xl px-1.5 text-[11px] sm:px-2 sm:text-xs"
                        isDisabled={isDisabled}
                        onPress={() => updateItemStatus(item, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="flat"
                        className="h-9 min-w-0 rounded-xl px-1.5 text-[11px] sm:px-2 sm:text-xs"
                        isDisabled={isDisabled}
                        onPress={() => updateItemStatus(item, "needed")}
                      >
                        Restore
                      </Button>
                    )}
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      className="h-9 w-9 min-w-9 rounded-xl text-[var(--stocksense-brand)]"
                      isDisabled={isDisabled || safeMoveLocations.length === 0}
                      aria-label={`Move ${item.name} to inventory`}
                      title="Move to inventory"
                      onPress={() => openMoveDialog(item)}
                    >
                      <FaExchangeAlt />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      className="h-9 w-9 min-w-9 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                      isDisabled={isDisabled}
                      aria-label={`Edit ${item.name}`}
                      title="Edit"
                      onPress={() => {
                        setMessage(null);
                        setEditingItem(item);
                      }}
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      color="danger"
                      className="h-9 w-9 min-w-9 rounded-xl"
                      isDisabled={isDisabled}
                      aria-label={`Delete ${item.name}`}
                      title="Delete"
                      onPress={() => {
                        setMessage(null);
                        setDeleteCandidate(item);
                      }}
                    >
                      <FaTrash />
                    </Button>
                  </div>
                  )}
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
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {() => (
            <>
              <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
                <span>Move to inventory</span>
                {moveDialog.item?.name ? (
                  <span className="text-sm font-normal text-gray-500">
                    {moveDialog.item.name}
                  </span>
                ) : null}
              </ModalHeader>

              <ModalBody className={`space-y-4 ${modalBodyClass}`}>
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
                </Select>

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
                  isDisabled={moveDialog.isMoving || !selectedMoveLocation}
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {moveAreas.map((area) => (
                    <SelectItem key={String(area.id)}>{area.name}</SelectItem>
                  ))}
                </Select>

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
                  isDisabled={moveDialog.isMoving || !moveDialog.areaId}
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {(selectedMoveArea?.categories ?? []).map((category) => (
                    <SelectItem key={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </Select>
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button
                  variant="light"
                  className="rounded-xl"
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
