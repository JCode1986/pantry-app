"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
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
  FaArrowsAlt,
  FaBarcode,
  FaBoxOpen,
  FaChevronRight,
  FaEdit,
  FaEllipsisV,
  FaExclamationTriangle,
  FaMapMarkedAlt,
  FaPlus,
  FaSearch,
  FaTags,
  FaTrash,
  FaWarehouse,
} from "react-icons/fa";
import { parseDate } from "@internationalized/date";
import {
  deleteCategory,
  deleteItem,
  getItemsPageAction,
  updateCategoryName,
  updateItemLocation,
  updateItem,
} from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
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
import { emitInventoryChange, ITEM_ADDED_EVENT } from "@/utils/clientEvents";
import { daysUntil, isExpiringSoon, toNonNegativeInteger } from "@/utils/pantry/date";
import PaginationControls from "@/components/ui/PaginationControls";
import SearchResultsLoadingState from "@/components/ui/SearchResultsLoadingState";

const MoveItemsModal = dynamic(() => import("@/components/items/MoveItemsModal"), {
  ssr: false,
});

function formatExpiration(value) {
  if (!value) return "None";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCount(count, singular, plural = `${singular}s`) {
  const value = count ?? 0;
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

const EXPIRING_SOON_DAYS = 7;
const FILTER_ALL = "all";
const EXPIRATION_FILTERS = {
  ALL: "all",
  EXPIRED: "expired",
  SOON: "soon",
  NONE: "none",
};
const STOCK_FILTERS = {
  ALL: "all",
  IN_STOCK: "in_stock",
  LOW_OR_EMPTY: "low_or_empty",
};

const emptyItemModal = {
  open: false,
  itemId: null,
  name: "",
  quantity: "0",
  expirationDate: "",
  barcode: "",
  imageUrl: null,
};
const CATEGORY_ITEMS_PAGE_SIZE = 24;
const SORT_OPTIONS = [
  ["name_asc", "A-Z"],
  ["name_desc", "Z-A"],
  ["newest", "Newest to oldest"],
  ["oldest", "Oldest to newest"],
];
const STATUS_OPTIONS = [
  [FILTER_ALL, "All statuses"],
  [EXPIRATION_FILTERS.EXPIRED, "Expired"],
  [EXPIRATION_FILTERS.SOON, "Expiring soon"],
  [EXPIRATION_FILTERS.NONE, "No expiration"],
  [STOCK_FILTERS.IN_STOCK, "In stock"],
  [STOCK_FILTERS.LOW_OR_EMPTY, "Low or empty"],
];

export default function CategoryDetailClient({
  category,
  area,
  location,
  initialItems = [],
  initialTotalItems = initialItems?.length ?? 0,
  moveLocations = [],
  canEditInventory = true,
}) {
  const router = useRouter();
  const [categoryName, setCategoryName] = useState(category?.name ?? "");
  const [categoryImageUrl, setCategoryImageUrl] = useState(
    category?.imageUrl ?? null
  );
  const [items, setItems] = useState(initialItems);
  const [totalItemCount, setTotalItemCount] = useState(initialTotalItems);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState(category?.name ?? "");
  const [itemModal, setItemModal] = useState(emptyItemModal);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    entityType: null,
    payload: null,
    isDeleting: false,
  });
  const [moveModal, setMoveModal] = useState({
    open: false,
    sourceAreaId: null,
    sourceCategoryId: null,
    targetLocationId: location?.id ?? null,
    targetAreaId: null,
    targetCategoryId: null,
    itemIds: [],
  });
  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
  const itemModalExpirationDateValue = useMemo(() => {
    if (!itemModal.expirationDate) return null;

    try {
      return parseDate(itemModal.expirationDate);
    } catch {
      return null;
    }
  }, [itemModal.expirationDate]);
  const selectedCount = selectedItemIds.size;
  const allItemsSelected = items.length > 0 && selectedCount === items.length;
  const normalizedSearch = search.trim().toLowerCase();
  const itemsLoadRequestIdRef = useRef(0);
  const requestExpirationFilter = [
    EXPIRATION_FILTERS.EXPIRED,
    EXPIRATION_FILTERS.SOON,
    EXPIRATION_FILTERS.NONE,
  ].includes(statusFilter)
    ? statusFilter
    : EXPIRATION_FILTERS.ALL;
  const requestStockFilter = [
    STOCK_FILTERS.IN_STOCK,
    STOCK_FILTERS.LOW_OR_EMPTY,
  ].includes(statusFilter)
    ? statusFilter
    : STOCK_FILTERS.ALL;
  const loadItemsPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, page);
      const requestId = itemsLoadRequestIdRef.current + 1;
      itemsLoadRequestIdRef.current = requestId;
      setIsLoadingItems(true);
      setItemsError("");

      try {
        const result = await getItemsPageAction({
          offset: (safePage - 1) * CATEGORY_ITEMS_PAGE_SIZE,
          limit: CATEGORY_ITEMS_PAGE_SIZE,
          filters: {
            categoryId: category?.id,
            search: normalizedSearch,
            expirationFilter: requestExpirationFilter,
            expirationDays: EXPIRING_SOON_DAYS,
            stockFilter: requestStockFilter,
            sortBy,
          },
        });

        if (result?.error) {
          if (requestId === itemsLoadRequestIdRef.current) {
            setItemsError(result.error);
          }
          return;
        }

        if (requestId !== itemsLoadRequestIdRef.current) return;

        const nextItems = result?.data?.items ?? [];
        const nextTotal = result?.data?.totalCount ?? 0;
        setItems(nextItems);
        setTotalItemCount(nextTotal);

        const nextTotalPages = Math.max(
          1,
          Math.ceil(nextTotal / CATEGORY_ITEMS_PAGE_SIZE)
        );
        if (safePage > nextTotalPages) setCurrentPage(nextTotalPages);
      } catch (error) {
        if (requestId === itemsLoadRequestIdRef.current) {
          setItemsError(error?.message || "Could not load items.");
        }
      } finally {
        if (requestId === itemsLoadRequestIdRef.current) {
          setIsLoadingItems(false);
        }
      }
    },
    [category?.id, normalizedSearch, requestExpirationFilter, requestStockFilter, sortBy]
  );

  const initialLoadSkippedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadSkippedRef.current) {
      initialLoadSkippedRef.current = true;
      return;
    }

    void loadItemsPage(currentPage);
  }, [currentPage, loadItemsPage, refreshNonce]);

  useEffect(() => {
    setCurrentPage(1);
    clearSelection();
  }, [normalizedSearch, sortBy, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(totalItemCount / CATEGORY_ITEMS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem =
    totalItemCount === 0
      ? 0
      : (safeCurrentPage - 1) * CATEGORY_ITEMS_PAGE_SIZE + 1;
  const endItem = Math.min(
    (safeCurrentPage - 1) * CATEGORY_ITEMS_PAGE_SIZE + items.length,
    totalItemCount
  );
  const showSearchRestoreLoader =
    isLoadingItems && !normalizedSearch && items.length === 0;
  const representedLocationCount = location?.id ? 1 : 0;
  const representedStorageAreaCount = area?.id ? 1 : 0;
  const expiringSoonCount = items.filter((item) => {
    const expirationDays = daysUntil(item.expiration_date);
    return expirationDays >= 0 && isExpiringSoon(item.expiration_date, EXPIRING_SOON_DAYS);
  }).length;
  const summaryCards = [
    {
      label: "Items",
      value: totalItemCount,
      description: "Stored in this category",
      icon: FaBoxOpen,
    },
    {
      label: "Locations",
      value: representedLocationCount,
      description: "Spaces containing these items",
      icon: FaMapMarkedAlt,
    },
    {
      label: "Storage Areas",
      value: representedStorageAreaCount,
      description: "Shelves, bins, and cabinets",
      icon: FaWarehouse,
    },
    {
      label: "Expiring Soon",
      value: expiringSoonCount,
      description: "Items needing attention",
      icon: FaExclamationTriangle,
    },
  ];
  const normalizedMoveLocations = useMemo(
    () =>
      (moveLocations ?? []).map((moveLocation) => ({
        ...moveLocation,
        storageAreas:
          moveLocation.storageAreas ?? moveLocation.storage_areas ?? [],
      })),
    [moveLocations]
  );
  const currentStorageAreas = useMemo(() => {
    const currentLocation = normalizedMoveLocations.find(
      (moveLocation) => String(moveLocation.id) === String(location?.id)
    );

    if (currentLocation?.storageAreas?.length) {
      return currentLocation.storageAreas;
    }

    if (!area?.id || !category?.id) return [];

    return [
      {
        id: area.id,
        name: area.name,
        categories: [{ id: category.id, name: categoryName }],
      },
    ];
  }, [area?.id, area?.name, category?.id, categoryName, location?.id, normalizedMoveLocations]);

  const closeItemModal = () => setItemModal(emptyItemModal);

  const itemMatchesActiveFilters = useCallback(
    (item) => {
      const quantity = toNonNegativeInteger(item.quantity, 0);
      const expirationDays = daysUntil(item.expiration_date);

      if (requestExpirationFilter === EXPIRATION_FILTERS.EXPIRED && expirationDays >= 0) {
        return false;
      }
      if (
        requestExpirationFilter === EXPIRATION_FILTERS.SOON &&
        (expirationDays < 0 ||
          !isExpiringSoon(item.expiration_date, EXPIRING_SOON_DAYS))
      ) {
        return false;
      }
      if (requestExpirationFilter === EXPIRATION_FILTERS.NONE && item.expiration_date) {
        return false;
      }
      if (requestStockFilter === STOCK_FILTERS.IN_STOCK && quantity <= 0) {
        return false;
      }
      if (requestStockFilter === STOCK_FILTERS.LOW_OR_EMPTY && quantity > 1) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchable = [
        item.name,
        item.barcode,
        item.location?.name,
        item.area?.name,
        item.category?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    },
    [normalizedSearch, requestExpirationFilter, requestStockFilter]
  );

  useEffect(() => {
    if (!location?.id || !area?.id || !category?.id) return;

    const context = {
      locationId: location.id,
      storageAreaId: area.id,
      categoryId: category.id,
    };

    window.dispatchEvent(
      new CustomEvent("stocksense:set-add-item-context", {
        detail: context,
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("stocksense:set-add-item-context", {
          detail: null,
        })
      );
    };
  }, [area?.id, category?.id, location?.id]);

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.id || String(item.categoryId) !== String(category?.id)) return;

      const nextItem = {
        id: item.id,
        name: item.name ?? item.itemName ?? "Item",
        quantity: item.quantity ?? 0,
        expiration_date: item.expiration_date ?? item.expirationDate ?? null,
        barcode: item.barcode ?? null,
        category_id: item.categoryId,
        image_path: item.image_path ?? null,
        imageUrl: item.imageUrl ?? null,
        category: {
          id: item.categoryId,
          name: item.categoryName ?? categoryName,
        },
        area: {
          id: item.storageAreaId ?? area?.id,
          name: item.storageAreaName ?? area?.name,
        },
        location: {
          id: item.locationId ?? location?.id,
          name: item.locationName ?? location?.name,
        },
      };

      const matchesActiveFilters = itemMatchesActiveFilters(nextItem);

      if (matchesActiveFilters) {
        setTotalItemCount((current) => current + 1);
        setItems((prev) => {
          if (prev.some((visibleItem) => String(visibleItem.id) === String(nextItem.id))) {
            return prev;
          }

          const nextItems =
            sortBy === "oldest" ? [...prev, nextItem] : [nextItem, ...prev];
          return nextItems.slice(0, CATEGORY_ITEMS_PAGE_SIZE);
        });
      }

      setRefreshNonce((current) => current + 1);
    };

    window.addEventListener(ITEM_ADDED_EVENT, handleItemAdded);

    return () => {
      window.removeEventListener(ITEM_ADDED_EVENT, handleItemAdded);
    };
  }, [
    area?.id,
    area?.name,
    category?.id,
    categoryName,
    itemMatchesActiveFilters,
    location?.id,
    location?.name,
    sortBy,
  ]);

  useEffect(() => {
    setSelectedItemIds((current) => {
      const availableIds = new Set(items.map((item) => String(item.id)));
      const next = new Set(
        Array.from(current).filter((itemId) => availableIds.has(String(itemId)))
      );

      return next.size === current.size ? current : next;
    });
  }, [items]);

  const toggleSelectItem = (itemId) => {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      const key = String(itemId);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });
  };

  const toggleSelectAllItems = () => {
    setSelectedItemIds((current) => {
      if (items.length > 0 && current.size === items.length) {
        return new Set();
      }

      return new Set(items.map((item) => String(item.id)));
    });
  };

  const clearSelection = () => {
    setSelectedItemIds(new Set());
  };

  const clearSearch = () => {
    setIsLoadingItems(true);
    setSearch("");
    setCurrentPage(1);
  };

  const handleSearchChange = useCallback(
    (value) => {
      if (normalizedSearch && !value.trim() && items.length === 0) {
        setIsLoadingItems(true);
      }
      setSearch(value);
      setCurrentPage(1);
    },
    [items.length, normalizedSearch]
  );

  const openMoveItems = (itemIds) => {
    if (!canEditInventory || itemIds.length === 0) return;

    setMoveModal({
      open: true,
      sourceAreaId: area?.id ?? null,
      sourceCategoryId: category.id,
      targetLocationId: location?.id ?? null,
      targetAreaId: area?.id ?? null,
      targetCategoryId: category.id,
      itemIds,
    });
  };

  const openEditItem = (item) => {
    if (!canEditInventory) return;
    setItemModal({
      open: true,
      itemId: item.id,
      name: item.name ?? "",
      quantity: String(item.quantity ?? 0),
      expirationDate: item.expiration_date ?? "",
      barcode: item.barcode ?? "",
      imageUrl: item.imageUrl ?? null,
    });
  };

  const openDeleteItem = (item) => {
    if (!canEditInventory) return;
    setDeleteDialog({
      open: true,
      entityType: "item",
      payload: item,
      isDeleting: false,
    });
  };

  const openMoveItem = (item) => {
    if (!canEditInventory || !item?.id) return;
    openMoveItems([item.id]);
  };

  const openMoveSelected = () => {
    openMoveItems(Array.from(selectedItemIds));
  };

  const openDeleteSelected = () => {
    if (!canEditInventory || selectedCount === 0) return;

    setDeleteDialog({
      open: true,
      entityType: "items",
      payload: {
        itemIds: Array.from(selectedItemIds),
        count: selectedCount,
      },
      isDeleting: false,
    });
  };

  const openDeleteCategory = () => {
    if (!canEditInventory) return;
    setDeleteDialog({
      open: true,
      entityType: "category",
      payload: {
        id: category.id,
        name: categoryName,
      },
      isDeleting: false,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      entityType: null,
      payload: null,
      isDeleting: false,
    });
  };

  const saveCategoryName = async () => {
    if (!canEditInventory) return;
    const name = editCategoryName.trim();
    if (!name || !category?.id) return;

    setIsSaving(true);
    const previousName = categoryName;
    setCategoryName(name);

    try {
      const result = await updateCategoryName(category.id, name);
      if (result?.error) throw result.error;
      setEditCategoryOpen(false);
      emitInventoryChange({
        entity: "category",
        action: "updated",
        id: category.id,
      });
      router.refresh();
    } catch (err) {
      console.error("updateCategoryName error:", err);
      setCategoryName(previousName);
      setEditCategoryName(previousName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryImageChange = ({ imageUrl }) => {
    setCategoryImageUrl(imageUrl ?? null);
    emitInventoryChange({
      entity: "category",
      action: imageUrl ? "image_updated" : "image_removed",
      id: category?.id,
    });
  };

  const saveItem = async () => {
    if (!canEditInventory || !itemModal.itemId) return;
    const name = itemModal.name.trim();
    if (!name) return;

    const payload = {
      name,
      quantity: toNonNegativeInteger(itemModal.quantity, 0),
      expiration_date: itemModal.expirationDate || null,
      barcode: itemModal.barcode,
    };

    setIsSaving(true);

    try {
      const result = await updateItem(itemModal.itemId, payload);
      if (result?.error) throw result.error;

      setItems((prev) =>
        prev.map((item) =>
          String(item.id) === String(itemModal.itemId)
            ? {
                ...item,
                name: result.data?.name ?? payload.name,
                quantity: result.data?.quantity ?? payload.quantity,
                expiration_date:
                  result.data?.expiration_date ?? payload.expiration_date,
                barcode: result.data?.barcode ?? (payload.barcode.trim() || null),
              }
            : item
        )
      );
      setRefreshNonce((current) => current + 1);
      emitInventoryChange({
        entity: "item",
        action: "updated",
        id: itemModal.itemId,
      });
      closeItemModal();
      router.refresh();
    } catch (err) {
      console.error("updateItem error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemImageChange = ({ imagePath, imageUrl }) => {
    const itemId = itemModal.itemId;
    if (!itemId) return;

    setItems((prev) =>
      prev.map((item) =>
        String(item.id) === String(itemId)
          ? {
              ...item,
              image_path: imagePath ?? null,
              imageUrl: imageUrl ?? null,
            }
          : item
      )
    );
    setItemModal((prev) => ({
      ...prev,
      imageUrl: imageUrl ?? null,
    }));
    emitInventoryChange({
      entity: "item",
      action: imagePath ? "image_updated" : "image_removed",
      id: itemId,
    });
  };

  const confirmDelete = async () => {
    if (!canEditInventory || !deleteDialog.payload) return;
    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      if (deleteDialog.entityType === "items") {
        const itemIds = deleteDialog.payload.itemIds ?? [];
        const results = await Promise.all(itemIds.map((itemId) => deleteItem(itemId)));
        const hasError = results.some((result) => result?.error);

        if (hasError) {
          console.error("bulk delete category detail item errors:", results);
          setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
          return;
        }

        const deleted = new Set(itemIds.map(String));
        setItems((prev) => prev.filter((item) => !deleted.has(String(item.id))));
        setTotalItemCount((current) => Math.max(0, current - deleted.size));
        clearSelection();
        emitInventoryChange({
          entity: "item",
          action: "deleted",
          ids: itemIds,
        });
        closeDeleteDialog();
        router.refresh();
        setRefreshNonce((current) => current + 1);
        return;
      }

      if (deleteDialog.entityType === "item") {
        const itemId = deleteDialog.payload.id;
        const result = await deleteItem(itemId);
        if (result?.error) throw result.error;

        setItems((prev) => prev.filter((item) => String(item.id) !== String(itemId)));
        setTotalItemCount((current) => Math.max(0, current - 1));
        setSelectedItemIds((current) => {
          const next = new Set(current);
          next.delete(String(itemId));
          return next;
        });
        emitInventoryChange({
          entity: "item",
          action: "deleted",
          id: itemId,
        });
        closeDeleteDialog();
        router.refresh();
        setRefreshNonce((current) => current + 1);
        return;
      }

      if (deleteDialog.entityType === "category") {
        const result = await deleteCategory(category.id);
        if (result?.error) throw result.error;

        emitInventoryChange({
          entity: "category",
          action: "deleted",
          id: category.id,
        });
        closeDeleteDialog();
        router.replace("/categories");
      }
    } catch (err) {
      console.error("delete detail entity error:", err);
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const confirmMove = async () => {
    if (!canEditInventory) return;
    const { sourceCategoryId, targetCategoryId, itemIds } = moveModal;

    if (!targetCategoryId || itemIds.length === 0) return;
    if (String(targetCategoryId) === String(sourceCategoryId)) return;

    const results = await Promise.all(
      itemIds.map((itemId) =>
        updateItemLocation(itemId, {
          categoryId: targetCategoryId,
        })
      )
    );

    const hasError = results.some((result) => result?.error);
    if (hasError) {
      console.error("move category detail item errors:", results);
      return;
    }

    const moved = new Set(itemIds.map(String));
    setItems((prev) => prev.filter((item) => !moved.has(String(item.id))));
    setTotalItemCount((current) => Math.max(0, current - moved.size));
    clearSelection();
    setMoveModal({
      open: false,
      sourceAreaId: null,
      sourceCategoryId: null,
      targetLocationId: location?.id ?? null,
      targetAreaId: null,
      targetCategoryId: null,
      itemIds: [],
    });
    emitInventoryChange({
      entity: "item",
      action: "moved",
      ids: itemIds,
    });
    router.refresh();
    setRefreshNonce((current) => current + 1);
  };

  return (
    <main className="page-enter mx-auto max-w-[1500px] space-y-5 px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <header className="content-enter md:hidden">
        <Link
          href="/categories"
          className="inline-flex items-center text-sm font-medium text-[var(--stocksense-brand)]"
        >
          Back to categories
        </Link>

        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-slate-900/5">
          <div className="h-44 bg-[var(--entity-category-soft)]">
            {categoryImageUrl ? (
              <ImageWithLoader
                src={categoryImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[var(--entity-category-accent)]">
                <FaTags className="h-14 w-14" />
              </div>
            )}
          </div>

          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Category
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-950">
              {categoryName}
            </h1>
            <p className="mt-1 truncate text-sm text-gray-500">
              {location?.name ?? "Unknown location"}
            </p>
            <p className="truncate text-sm text-gray-500">
              {area?.name ?? "Unknown area"}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <FaBoxOpen className="h-4 w-4 text-[var(--stocksense-brand)]" />
                <p className="mt-2 text-xl font-semibold leading-none text-gray-950">
                  {totalItemCount}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-4 text-gray-500">
                  {totalItemCount === 1 ? "Item" : "Items"}
                </p>
              </div>
            </div>

            {canEditInventory && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="flat"
                  className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  onPress={() => {
                    setEditCategoryName(categoryName);
                    setEditCategoryOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit category
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={openDeleteCategory}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="content-enter max-md:hidden">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 hover:text-[var(--stocksense-brand)]"
          >
            Categories
          </Link>
          <FaChevronRight className="h-3 w-3 text-gray-300" />
          {location?.id ? (
            <Link
              href={`/locations/${location.id}`}
              className="hover:text-[var(--stocksense-brand)]"
            >
              {location.name ?? "Location"}
            </Link>
          ) : (
            <span>{location?.name ?? "Location"}</span>
          )}
          <FaChevronRight className="h-3 w-3 text-gray-300" />
          {area?.id ? (
            <Link
              href={`/areas/${area.id}`}
              className="hover:text-[var(--stocksense-brand)]"
            >
              {area.name ?? "Storage Area"}
            </Link>
          ) : (
            <span>{area?.name ?? "Storage Area"}</span>
          )}
          <FaChevronRight className="h-3 w-3 text-gray-300" />
          <span className="font-medium text-gray-800">{categoryName}</span>
        </div>

        <header className="mt-4 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {categoryImageUrl ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white shadow-sm">
                <ImageWithLoader
                  src={categoryImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] shadow-sm">
                <FaTags className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                CATEGORY
              </p>
              <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-gray-950">
                {categoryName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Everything grouped inside this category.
              </p>
              <p className="mt-2 text-sm font-medium text-gray-500">
                {formatCount(totalItemCount, "item")} &bull;{" "}
                {formatCount(representedStorageAreaCount, "storage area")}
              </p>
            </div>
          </div>

          {canEditInventory && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                variant="flat"
                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                onPress={() => {
                  setEditCategoryName(categoryName);
                  setEditCategoryOpen(true);
                }}
                startContent={<FaEdit />}
              >
                Edit
              </Button>
              <Button
                variant="flat"
                color="danger"
                className="rounded-xl"
                onPress={openDeleteCategory}
                startContent={<FaTrash />}
              >
                Delete
              </Button>
            </div>
          )}
        </header>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 max-md:hidden">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-[1.35rem] border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-md"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-950">{card.label}</h2>
                <p className="text-3xl font-semibold tracking-tight text-gray-950">
                  {card.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {card.description}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {itemsError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {itemsError}
        </div>
      ) : null}

      <section className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm max-md:hidden">
        <div className="flex flex-col gap-3">
          <Input
            value={search}
            onValueChange={handleSearchChange}
            placeholder={`Search items in ${categoryName}...`}
            startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
            radius="lg"
            variant="bordered"
            className="w-full max-w-md"
            classNames={{
              inputWrapper:
                "min-h-10 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
              input: "text-sm text-gray-900 placeholder:text-gray-400",
            }}
          />
          <div className="flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              aria-label="Filter items by status"
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) =>
                setStatusFilter(String(Array.from(keys)[0] || FILTER_ALL))
              }
              variant="bordered"
              radius="lg"
              className="w-full sm:w-44"
              classNames={themedSelectClassNames}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <SelectItem key={value}>{label}</SelectItem>
              ))}
            </Select>
            <Select
              aria-label="Sort items"
              selectedKeys={new Set([sortBy])}
              onSelectionChange={(keys) =>
                setSortBy(String(Array.from(keys)[0] || "name_asc"))
              }
              variant="bordered"
              radius="lg"
              className="w-full sm:w-40"
              classNames={themedSelectClassNames}
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <SelectItem key={value}>{label}</SelectItem>
              ))}
            </Select>
            <OpenGlobalAddItemButton
              context={{
                locationId: location?.id,
                storageAreaId: area?.id,
                categoryId: category.id,
              }}
              className="min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
            >
              Add Item
            </OpenGlobalAddItemButton>
          </div>
        </div>
      </section>

      <section className="md:hidden">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Items</h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse what is stored in this category.
            </p>
          </div>
          {canEditInventory && (
            <OpenGlobalAddItemButton
              context={{
                locationId: location?.id,
                storageAreaId: area?.id,
                categoryId: category.id,
              }}
              className="h-9 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
            >
              Add
            </OpenGlobalAddItemButton>
          )}
        </div>

        <div className="mt-3 grid gap-2">
          <Input
            value={search}
            onValueChange={handleSearchChange}
            placeholder="Search items"
            radius="lg"
            variant="bordered"
            startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
            classNames={{
              inputWrapper:
                "min-h-11 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
              input: "text-sm text-gray-900 placeholder:text-gray-400",
            }}
          />
          <Select
            aria-label="Sort items"
            selectedKeys={new Set([sortBy])}
            onSelectionChange={(keys) =>
              setSortBy(String(Array.from(keys)[0] || "name_asc"))
            }
            variant="bordered"
            radius="lg"
            classNames={themedSelectClassNames}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <SelectItem key={value}>{label}</SelectItem>
            ))}
          </Select>
        </div>

        {canEditInventory && selectedCount > 0 && (
          <div className="sticky top-[4.75rem] z-[70] mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-semibold tracking-tight text-gray-950">
                  {selectedCount} selected
                </p>
                <p className="text-xs text-gray-500">
                  Tap cards to adjust selection.
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="min-h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={toggleSelectAllItems}
                className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)]"
              >
                {allItemsSelected ? "Deselect" : "Select all"}
              </button>
              <button
                type="button"
                onClick={openMoveSelected}
                disabled={selectedCount === 0}
                className="min-h-11 rounded-xl bg-[var(--stocksense-brand)] px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Move
              </button>
              <button
                type="button"
                onClick={openDeleteSelected}
                disabled={selectedCount === 0}
                className="min-h-11 rounded-xl bg-rose-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="mt-3">
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalItemCount}
            isLoading={isLoadingItems}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          />
        </div>

        <div className="mt-3 grid gap-3">
          {items.map((item) => {
            const isSelected = selectedItemIds.has(String(item.id));

            return (
            <article
              key={item.id}
              role={selectedCount > 0 ? "button" : undefined}
              tabIndex={selectedCount > 0 ? 0 : undefined}
              onClick={selectedCount > 0 ? () => toggleSelectItem(item.id) : undefined}
              onKeyDown={
                selectedCount > 0
                  ? (event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      toggleSelectItem(item.id);
                    }
                  : undefined
              }
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                isSelected
                  ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                  : "border-gray-200"
              } ${
                selectedCount > 0
                  ? "cursor-pointer transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
                  : ""
              }`}
            >
              <div className="flex min-w-0 gap-3 p-4">
                {item.imageUrl ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-item-border)] bg-white">
                    <ImageWithLoader
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                    <FaBoxOpen className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-lg font-semibold leading-6 text-gray-950"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <div className="mt-2 grid gap-0.5 text-sm leading-5 text-gray-500">
                    <span>Qty: {item.quantity ?? 0}</span>
                    <span>Exp: {formatExpiration(item.expiration_date)}</span>
                    {item.barcode && (
                      <span className="truncate" title={item.barcode}>
                        Barcode: {item.barcode}
                      </span>
                    )}
                  </div>
                </div>
                {canEditInventory && (
                  <div
                    className="shrink-0"
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
                        >
                          <FaEllipsisV className="h-4 w-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label={`${item.name} actions`}>
                        <DropdownItem key="select" onPress={() => toggleSelectItem(item.id)}>
                          {isSelected
                            ? "Deselect for bulk action"
                            : "Select for bulk action"}
                        </DropdownItem>
                        <DropdownItem
                          key="edit"
                          onPress={() => openEditItem(item)}
                        >
                          Edit Item
                        </DropdownItem>
                        <DropdownItem
                          key="move"
                          startContent={<FaArrowsAlt className="h-3.5 w-3.5" />}
                          onPress={() => openMoveItem(item)}
                        >
                          Move Item
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<FaTrash className="h-3.5 w-3.5" />}
                          onPress={() => openDeleteItem(item)}
                        >
                          Delete Item
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                )}
              </div>
            </article>
            );
          })}

          {items.length === 0 && (
            showSearchRestoreLoader ? (
              <SearchResultsLoadingState
                label="Loading items"
                detail="Restoring all items in this category."
              />
            ) : (
            <div className={`rounded-2xl bg-white px-5 py-7 text-center shadow-sm ${
              normalizedSearch
                ? "border border-[var(--stocksense-brand-border)]"
                : "border border-dashed border-gray-200"
            }`}>
              <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border ${
                normalizedSearch
                  ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                  : "border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]"
              }`}>
                {normalizedSearch ? (
                  <FaSearch className="h-5 w-5" />
                ) : (
                  <FaBoxOpen className="h-6 w-6" />
                )}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-950">
                {normalizedSearch ? "No matching items" : "No items yet"}
              </h2>
              <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-gray-500">
                {normalizedSearch
                  ? `Nothing matched "${search.trim()}". Clear the search or try another item name.`
                  : "Add an item to start filling this category."}
              </p>
              {normalizedSearch ? (
                <Button
                  onPress={clearSearch}
                  radius="lg"
                  variant="bordered"
                  className="mt-5 w-full border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] font-semibold text-[var(--stocksense-brand)]"
                >
                  Clear search
                </Button>
              ) : canEditInventory ? (
                <div className="mt-5 flex justify-center">
                  <OpenGlobalAddItemButton
                    context={{
                      locationId: location?.id,
                      storageAreaId: area?.id,
                      categoryId: category.id,
                    }}
                  />
                </div>
              ) : null}
            </div>
            )
          )}
        </div>
        <div className="mt-3">
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalItemCount}
            isLoading={isLoadingItems}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          />
        </div>
      </section>

      <section className="max-md:hidden">
        <div className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <FaBoxOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-950">
                  Items in this category
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatCount(totalItemCount, "item")}
                </p>
              </div>
            </div>
            {items.length > 0 ? (
              <div className="w-full lg:w-auto">
                <PaginationControls
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  startItem={startItem}
                  endItem={endItem}
                  totalItems={totalItemCount}
                  isLoading={isLoadingItems}
                  onPrevious={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  onNext={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                />
              </div>
            ) : null}
          </div>

          {canEditInventory && items.length > 0 ? (
            <div className="mt-4 rounded-[1.35rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--stocksense-brand)]">
                    {selectedCount} selected
                  </p>
                  <p className="text-xs text-[var(--stocksense-brand)]">
                    Select items to move or delete together.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                    onPress={toggleSelectAllItems}
                  >
                    {allItemsSelected ? "Deselect all" : "Select all"}
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    className="rounded-xl border border-gray-200 bg-white text-gray-700"
                    onPress={clearSelection}
                    isDisabled={selectedCount === 0}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                    onPress={openMoveSelected}
                    isDisabled={selectedCount === 0}
                  >
                    Move
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="rounded-xl"
                    onPress={openDeleteSelected}
                    isDisabled={selectedCount === 0}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {showSearchRestoreLoader ? (
            <SearchResultsLoadingState
              label="Loading items"
              detail="Restoring all items in this category."
              className="mt-4 px-6 py-12"
            />
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-[1.75rem] border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/25 px-6 py-12 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
                {normalizedSearch ? (
                  <FaSearch className="h-6 w-6" />
                ) : (
                  <FaBoxOpen className="h-7 w-7" />
                )}
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">
                {normalizedSearch ? "No matching items" : "No items in this category yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                {normalizedSearch
                  ? `Nothing matched "${search.trim()}". Clear the search to see items again.`
                  : "Add the first item and keep everything in this group easy to find."}
              </p>
              {normalizedSearch ? (
                <Button
                  onPress={clearSearch}
                  radius="lg"
                  variant="bordered"
                  className="mt-7 border-[var(--stocksense-brand-border)] bg-white px-5 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm"
                >
                  Clear search
                </Button>
              ) : canEditInventory ? (
                <OpenGlobalAddItemButton
                  context={{
                    locationId: location?.id,
                    storageAreaId: area?.id,
                    categoryId: category.id,
                  }}
                  canEditInventory={canEditInventory}
                  className="mt-7 min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
                >
                  Add Item
                </OpenGlobalAddItemButton>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {items.map((item) => {
                const isSelected = selectedItemIds.has(String(item.id));
                const quantity = toNonNegativeInteger(item.quantity, 0);
                const expirationDays = daysUntil(item.expiration_date);
                const expired = expirationDays < 0;
                const soon =
                  !expired &&
                  item.expiration_date &&
                  isExpiringSoon(item.expiration_date, EXPIRING_SOON_DAYS);
                const lowStock = quantity <= 1;
                const itemPath = [
                  item.location?.name ?? location?.name,
                  item.area?.name ?? area?.name,
                  item.category?.name ?? categoryName,
                ]
                  .filter(Boolean)
                  .join(" > ");

                return (
                  <article
                    key={item.id}
                    className={`group flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]/25 hover:shadow-md lg:flex-row lg:items-center lg:justify-between ${
                      isSelected
                        ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                        : "border-white"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {item.imageUrl ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-item-border)] bg-white">
                          <ImageWithLoader
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                          <FaBoxOpen className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3
                            className="truncate text-sm font-semibold text-gray-950"
                            title={item.name}
                          >
                            {item.name}
                          </h3>
                          {(expired || soon || lowStock) && (
                            <span className="flex flex-wrap gap-1.5">
                              {(expired || soon) && (
                                <span className="shrink-0 rounded-full border border-[var(--entity-warning-border)] bg-[var(--entity-warning-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--entity-warning-accent)]">
                                  {expired ? "Expired" : "Expiring Soon"}
                                </span>
                              )}
                              {lowStock && (
                                <span className="shrink-0 rounded-full border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--entity-item-accent)]">
                                  Low Stock
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-gray-500" title={itemPath}>
                          {itemPath}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-medium text-gray-500 lg:justify-end">
                      <span>Qty: {quantity}</span>
                      {item.expiration_date ? (
                        <span>Expires {formatShortDate(item.expiration_date)}</span>
                      ) : (
                        <span>No expiration</span>
                      )}
                      {item.barcode ? (
                        <span className="inline-flex min-w-0 max-w-[12rem] items-center gap-1">
                          <FaBarcode className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.barcode}</span>
                        </span>
                      ) : null}
                      {canEditInventory ? (
                        <Dropdown placement="bottom-end">
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              variant="light"
                              radius="lg"
                              className="h-9 w-9 min-w-9 shrink-0 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                              aria-label={`${item.name} actions`}
                            >
                              <FaEllipsisV className="h-4 w-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label={`${item.name} actions`}>
                            <DropdownItem key="edit" onPress={() => openEditItem(item)}>
                              Edit Item
                            </DropdownItem>
                            <DropdownItem
                              key="move"
                              startContent={<FaArrowsAlt className="h-3.5 w-3.5" />}
                              onPress={() => openMoveItem(item)}
                            >
                              Move Item
                            </DropdownItem>
                            <DropdownItem
                              key="select"
                              onPress={() => toggleSelectItem(item.id)}
                            >
                              {isSelected
                                ? "Deselect for bulk action"
                                : "Select for bulk action"}
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              startContent={<FaTrash className="h-3.5 w-3.5" />}
                              onPress={() => openDeleteItem(item)}
                            >
                              Delete Item
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      ) : null}
                    </div>
                  </article>
                );
              })}

              {canEditInventory ? (
                <div className="group flex flex-col gap-4 rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/35 px-5 py-4 transition hover:border-[var(--stocksense-brand)] hover:shadow-md lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition group-hover:bg-[var(--stocksense-brand-soft)]">
                      <FaPlus className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-gray-950">
                        Add another item
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Save something new inside {categoryName}.
                      </p>
                    </div>
                  </div>
                  <OpenGlobalAddItemButton
                    context={{
                      locationId: location?.id,
                      storageAreaId: area?.id,
                      categoryId: category.id,
                    }}
                    canEditInventory={canEditInventory}
                    className="min-h-10 w-full rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm sm:w-auto lg:shrink-0"
                  >
                    Add Item
                  </OpenGlobalAddItemButton>
                </div>
              ) : null}
            </div>
          )}

          {items.length > 0 ? (
            <div className="mt-5">
              <PaginationControls
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                startItem={startItem}
                endItem={endItem}
                totalItems={totalItemCount}
                isLoading={isLoadingItems}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="max-md:hidden rounded-[1.5rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 px-6 py-6">
        <h2 className="text-base font-semibold text-gray-950">
          Category location
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--stocksense-brand)]">
              Location
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-950">
              {location?.name ?? "Unknown location"}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--stocksense-brand)]">
              Storage Area
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-950">
              {area?.name ?? "Unknown storage area"}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--stocksense-brand)]">
              Category
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-950">
              {categoryName}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-[var(--stocksense-brand)]">
          {[location?.name, area?.name, categoryName].filter(Boolean).join(" > ")}
        </p>
      </section>

      <section className="max-md:hidden rounded-[1.5rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 px-6 py-6">
        <div className="flex items-start gap-5">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
            <FaTags className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-950">
              Tip: Keep category names easy to recognize
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Use names like Snacks, Baking, Chargers, Cleaning Supplies, or
              Documents so everyone knows where an item belongs.
            </p>
          </div>
        </div>
      </section>

      {canEditInventory && (
        <Modal
          isOpen={editCategoryOpen}
          onOpenChange={setEditCategoryOpen}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Edit category</span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={saveCategoryName}
                    isLoading={isSaving}
                    isDisabled={!editCategoryName.trim()}
                  >
                    Save
                  </Button>
                  <MobileSheetCloseButton onPress={onClose} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Category name"
                    value={editCategoryName}
                    onValueChange={setEditCategoryName}
                    isDisabled={isSaving}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <EntityImageManager
                    entityType="category"
                    entityId={category.id}
                    imageUrl={categoryImageUrl}
                    label="Category photo"
                    onChange={handleCategoryImageChange}
                  />
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={() => {
                        onClose();
                        openDeleteCategory();
                      }}
                    >
                      Delete category
                    </Button>
                  </div>
                </ModalBody>
                <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                  <Button
                    variant="light"
                    onPress={onClose}
                    isDisabled={isSaving}
                    className="max-md:hidden"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    onPress={saveCategoryName}
                    isLoading={isSaving}
                    isDisabled={!editCategoryName.trim()}
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
        <Modal
          isOpen={itemModal.open}
          onOpenChange={(open) => {
            if (!open) closeItemModal();
          }}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {() => (
              <>
                <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">Edit item</span>
                    <span className="block truncate text-sm font-normal text-gray-500">
                      {categoryName}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={saveItem}
                    isLoading={isSaving}
                    isDisabled={isSaving || !itemModal.name.trim()}
                  >
                    Save
                  </Button>
                  <MobileSheetCloseButton onPress={closeItemModal} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Item name"
                    value={itemModal.name}
                    onValueChange={(value) =>
                      setItemModal((prev) => ({ ...prev, name: value }))
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <QuantityStepperInput
                      label="Quantity"
                      min={0}
                      value={itemModal.quantity}
                      onValueChange={(value) =>
                        setItemModal((prev) => ({ ...prev, quantity: value }))
                      }
                      classNames={modalInputClassNames}
                    />
                    <DatePicker
                      label="Expiration date"
                      labelPlacement="inside"
                      value={itemModalExpirationDateValue}
                      onChange={(date) =>
                        setItemModal((prev) => ({
                          ...prev,
                          expirationDate: date ? date.toString() : "",
                        }))
                      }
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                      showMonthAndYearPickers
                    />
                  </div>
                  <Input
                    label="Barcode"
                    value={itemModal.barcode}
                    onValueChange={(value) =>
                      setItemModal((prev) => ({ ...prev, barcode: value }))
                    }
                    variant="bordered"
                    radius="lg"
                    startContent={<FaBarcode className="text-gray-400" />}
                    classNames={modalInputClassNames}
                  />
                  <EntityImageManager
                    entityType="item"
                    entityId={itemModal.itemId}
                    imageUrl={itemModal.imageUrl}
                    label="Item photo"
                    onChange={handleItemImageChange}
                  />
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={() => {
                        const target = {
                          id: itemModal.itemId,
                          name: itemModal.name,
                        };
                        closeItemModal();
                        openDeleteItem(target);
                      }}
                    >
                      Delete item
                    </Button>
                  </div>
                </ModalBody>
                <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                  <Button
                    variant="light"
                    onPress={closeItemModal}
                    isDisabled={isSaving}
                    className="max-md:hidden"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    onPress={saveItem}
                    isLoading={isSaving}
                    isDisabled={!itemModal.name.trim()}
                  >
                    Save changes
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {canEditInventory && moveModal.open && (
        <MoveItemsModal
          moveModal={moveModal}
          setMoveModal={setMoveModal}
          locationsForMove={normalizedMoveLocations}
          storageAreas={currentStorageAreas}
          currentLocationId={location?.id ?? null}
          onConfirm={confirmMove}
        />
      )}

      {canEditInventory && (
        <ConfirmDeleteModal
          isOpen={deleteDialog.open}
          isDeleting={deleteDialog.isDeleting}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDelete}
          title={
            deleteDialog.entityType === "category"
              ? `Delete category "${deleteDialog.payload?.name ?? categoryName}"?`
              : deleteDialog.entityType === "items"
                ? `Delete ${deleteDialog.payload?.count ?? 0} selected item${
                    deleteDialog.payload?.count === 1 ? "" : "s"
                  }?`
              : `Delete "${deleteDialog.payload?.name ?? "item"}"?`
          }
          description={
            deleteDialog.entityType === "category"
              ? `This will delete "${deleteDialog.payload?.name ?? categoryName}" and all items inside it. This cannot be undone.`
              : deleteDialog.entityType === "items"
                ? `This will permanently delete ${deleteDialog.payload?.count ?? 0} selected item${
                    deleteDialog.payload?.count === 1 ? "" : "s"
                  } from ${categoryName}. This cannot be undone.`
              : `This will permanently delete "${deleteDialog.payload?.name ?? "this item"}" from ${categoryName}. This cannot be undone.`
          }
        />
      )}
    </main>
  );
}
