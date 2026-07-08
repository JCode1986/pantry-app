"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  FaBarcode,
  FaBoxOpen,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { updateItem, deleteItem, updateItemLocation } from "@/app/actions/server";
import { deleteItemAndAddToShoppingListAction } from "@/app/actions/shoppingList";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
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
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { emitInventoryChange } from "@/utils/clientEvents";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
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

const ITEMS_PER_PAGE = 25;
const ALL_FILTER_KEY = "all";
const EXPIRATION_FILTERS = {
  ALL: "all",
  EXPIRED: "expired",
  SOON: "soon",
  NONE: "none",
};
const EXPIRATION_FILTER_LABELS = {
  [EXPIRATION_FILTERS.EXPIRED]: "Expired",
  [EXPIRATION_FILTERS.SOON]: "Expiring soon",
  [EXPIRATION_FILTERS.NONE]: "No expiration",
};
const STOCK_FILTERS = {
  ALL: "all",
  IN_STOCK: "in_stock",
  LOW_OR_EMPTY: "low_or_empty",
};
const STOCK_FILTER_LABELS = {
  [STOCK_FILTERS.IN_STOCK]: "In stock",
  [STOCK_FILTERS.LOW_OR_EMPTY]: "Low or empty",
};
const SORT_OPTIONS = {
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  EXPIRATION_ASC: "expiration_asc",
  QUANTITY_ASC: "quantity_asc",
};

const SORT_LABELS = {
  [SORT_OPTIONS.NAME_ASC]: "Name A-Z",
  [SORT_OPTIONS.NAME_DESC]: "Name Z-A",
  [SORT_OPTIONS.EXPIRATION_ASC]: "Expiration soonest",
  [SORT_OPTIONS.QUANTITY_ASC]: "Quantity low to high",
};

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

export default function ItemsPageClient({
  initialItems,
  moveLocations,
  canEditInventory = true,
  initialExpirationFilter,
  initialExpirationDays,
}) {
  const hasInitialExpirationFilter =
    initialExpirationFilter === EXPIRATION_FILTERS.EXPIRED ||
    initialExpirationFilter === EXPIRATION_FILTERS.SOON ||
    initialExpirationFilter === EXPIRATION_FILTERS.NONE;
  const normalizedInitialExpirationDays = toPositiveInteger(
    initialExpirationDays,
    7
  );
  const [items, setItems] = useState(initialItems ?? []);

  // filters
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState(ALL_FILTER_KEY);
  const [areaFilter, setAreaFilter] = useState(ALL_FILTER_KEY);
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER_KEY);
  const [expirationFilter, setExpirationFilter] = useState(
    hasInitialExpirationFilter ? initialExpirationFilter : EXPIRATION_FILTERS.ALL
  );
  const [stockFilter, setStockFilter] = useState(STOCK_FILTERS.ALL);
  const [expDays, setExpDays] = useState(normalizedInitialExpirationDays);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.NAME_ASC);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    hasInitialExpirationFilter
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null);

  // edit form
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editExp, setEditExp] = useState("");
  const [editBarcode, setEditBarcode] = useState("");

  // bulk selection (Set of item IDs)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false);
  const mobileLongPressTimerRef = useRef(null);
  const mobileLongPressTriggeredRef = useRef(false);

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
    isAddingToShoppingList: false,
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
    const barcode = editBarcode.trim();

    return (
      name !== (activeItem.name || "") ||
      quantity !== (activeItem.quantity ?? 0) ||
      expirationDate !== (activeItem.expiration_date ?? null) ||
      (barcode || null) !== (activeItem.barcode ?? null)
    );
  }, [activeItem, editBarcode, editExp, editName, editQty]);

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
        barcode: item.barcode ?? null,
        category_id: item.category_id ?? item.categoryId ?? null,
        image_path: item.image_path ?? null,
        imageUrl: item.imageUrl ?? null,
        location:
          loc || item.locationId || item.locationName
            ? {
                id: loc?.id ?? item.locationId ?? null,
                name: loc?.name ?? item.locationName ?? "Unknown location",
              }
            : null,
        area:
          area || item.storageAreaId || item.storageAreaName
            ? {
                id: area?.id ?? item.storageAreaId ?? null,
                name: area?.name ?? item.storageAreaName ?? "Unknown area",
              }
            : null,
        category:
          cat || item.categoryId || item.categoryName
            ? {
                id: cat?.id ?? item.categoryId ?? null,
                name: cat?.name ?? item.categoryName ?? "Unknown category",
              }
            : null,
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

  useEffect(() => {
    return () => {
      if (mobileLongPressTimerRef.current) {
        window.clearTimeout(mobileLongPressTimerRef.current);
      }
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const locationOptions = useMemo(() => moveLocations || [], [moveLocations]);

  const areaOptions = useMemo(() => {
    const locations =
      locationFilter === ALL_FILTER_KEY
        ? locationOptions
        : locationOptions.filter((location) => String(location.id) === locationFilter);

    return locations.flatMap((location) =>
      (location.storage_areas || []).map((area) => ({
        ...area,
        locationId: location.id,
        locationName: location.name,
      }))
    );
  }, [locationFilter, locationOptions]);

  const categoryOptions = useMemo(() => {
    const areas =
      areaFilter === ALL_FILTER_KEY
        ? areaOptions
        : areaOptions.filter((area) => String(area.id) === areaFilter);

    return areas.flatMap((area) =>
      (area.categories || []).map((category) => ({
        ...category,
        areaId: area.id,
        areaName: area.name,
        locationId: area.locationId,
        locationName: area.locationName,
      }))
    );
  }, [areaFilter, areaOptions]);

  const selectedLocation = useMemo(
    () =>
      locationOptions.find((location) => String(location.id) === locationFilter) ||
      null,
    [locationFilter, locationOptions]
  );

  const selectedArea = useMemo(
    () => areaOptions.find((area) => String(area.id) === areaFilter) || null,
    [areaFilter, areaOptions]
  );

  const selectedCategory = useMemo(
    () =>
      categoryOptions.find((category) => String(category.id) === categoryFilter) ||
      null,
    [categoryFilter, categoryOptions]
  );

  const activeFilterCount = useMemo(() => {
    return [
      normalizedSearch,
      locationFilter !== ALL_FILTER_KEY,
      areaFilter !== ALL_FILTER_KEY,
      categoryFilter !== ALL_FILTER_KEY,
      expirationFilter !== EXPIRATION_FILTERS.ALL,
      stockFilter !== STOCK_FILTERS.ALL,
    ].filter(Boolean).length;
  }, [
    areaFilter,
    categoryFilter,
    expirationFilter,
    locationFilter,
    normalizedSearch,
    stockFilter,
  ]);

  const filtersAreActive = activeFilterCount > 0;
  const mobileSheetFilterCount = [
    locationFilter !== ALL_FILTER_KEY,
    areaFilter !== ALL_FILTER_KEY,
    categoryFilter !== ALL_FILTER_KEY,
    expirationFilter !== EXPIRATION_FILTERS.ALL,
    stockFilter !== STOCK_FILTERS.ALL,
  ].filter(Boolean).length;
  const advancedFiltersAreActive =
    areaFilter !== ALL_FILTER_KEY ||
    categoryFilter !== ALL_FILTER_KEY ||
    expirationFilter !== EXPIRATION_FILTERS.ALL ||
    stockFilter !== STOCK_FILTERS.ALL;
  const advancedFilterCount =
    activeFilterCount -
    Number(Boolean(normalizedSearch)) -
    Number(locationFilter !== ALL_FILTER_KEY);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const searchLabel = search.trim();

    if (searchLabel) {
      chips.push({ id: "search", label: `Search: ${searchLabel}` });
    }

    if (locationFilter !== ALL_FILTER_KEY) {
      chips.push({
        id: "location",
        label: `Location: ${selectedLocation?.name || "Selected"}`,
      });
    }

    if (areaFilter !== ALL_FILTER_KEY) {
      chips.push({
        id: "area",
        label: `Area: ${selectedArea?.name || "Selected"}`,
      });
    }

    if (categoryFilter !== ALL_FILTER_KEY) {
      chips.push({
        id: "category",
        label: `Category: ${selectedCategory?.name || "Selected"}`,
      });
    }

    if (expirationFilter !== EXPIRATION_FILTERS.ALL) {
      chips.push({
        id: "expiration",
        label:
          expirationFilter === EXPIRATION_FILTERS.SOON
            ? `Expiring in ${expDays} day${expDays === 1 ? "" : "s"}`
            : EXPIRATION_FILTER_LABELS[expirationFilter],
      });
    }

    if (stockFilter !== STOCK_FILTERS.ALL) {
      chips.push({
        id: "stock",
        label: STOCK_FILTER_LABELS[stockFilter],
      });
    }

    return chips;
  }, [
    areaFilter,
    categoryFilter,
    expDays,
    expirationFilter,
    locationFilter,
    search,
    selectedArea,
    selectedCategory,
    selectedLocation,
    stockFilter,
  ]);

  const filteredItems = useMemo(() => {
    const nextItems = (items || []).filter((it) => {
      const nameOk = !normalizedSearch || containsQuery(it.name, normalizedSearch);
      const barcodeOk = !normalizedSearch || containsQuery(it.barcode, normalizedSearch);

      const path = `${it.location?.name || ""} ${it.area?.name || ""} ${it.category?.name || ""}`;
      const pathOk = !normalizedSearch || containsQuery(path, normalizedSearch);

      const itemLocationId = it.location?.id ? String(it.location.id) : "";
      const itemAreaId = it.area?.id ? String(it.area.id) : "";
      const itemCategoryId = it.category?.id ?? it.category_id;
      const itemCategoryKey = itemCategoryId ? String(itemCategoryId) : "";

      const locationOk =
        locationFilter === ALL_FILTER_KEY || itemLocationId === locationFilter;
      const areaOk = areaFilter === ALL_FILTER_KEY || itemAreaId === areaFilter;
      const categoryOk =
        categoryFilter === ALL_FILTER_KEY || itemCategoryKey === categoryFilter;

      const expirationDays = daysUntil(it.expiration_date);
      let expirationOk = true;
      if (expirationFilter === EXPIRATION_FILTERS.EXPIRED) {
        expirationOk = expirationDays < 0;
      } else if (expirationFilter === EXPIRATION_FILTERS.SOON) {
        expirationOk = expirationDays >= 0 && expirationDays <= expDays;
      } else if (expirationFilter === EXPIRATION_FILTERS.NONE) {
        expirationOk = !it.expiration_date;
      }

      const quantity = toNonNegativeInteger(it.quantity, 0);
      let stockOk = true;
      if (stockFilter === STOCK_FILTERS.IN_STOCK) {
        stockOk = quantity > 0;
      } else if (stockFilter === STOCK_FILTERS.LOW_OR_EMPTY) {
        stockOk = quantity <= 1;
      }

      return (
        (nameOk || barcodeOk || pathOk) &&
        locationOk &&
        areaOk &&
        categoryOk &&
        expirationOk &&
        stockOk
      );
    });

    return [...nextItems].sort((a, b) => {
      if (sortBy === SORT_OPTIONS.NAME_DESC) {
        return (b.name || "").localeCompare(a.name || "");
      }

      if (sortBy === SORT_OPTIONS.EXPIRATION_ASC) {
        const aDays = daysUntil(a.expiration_date);
        const bDays = daysUntil(b.expiration_date);
        if (aDays !== bDays) return aDays - bDays;
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortBy === SORT_OPTIONS.QUANTITY_ASC) {
        const aQuantity = toNonNegativeInteger(a.quantity, 0);
        const bQuantity = toNonNegativeInteger(b.quantity, 0);
        if (aQuantity !== bQuantity) return aQuantity - bQuantity;
        return (a.name || "").localeCompare(b.name || "");
      }

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [
    areaFilter,
    categoryFilter,
    expDays,
    expirationFilter,
    items,
    locationFilter,
    normalizedSearch,
    sortBy,
    stockFilter,
  ]);

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
  }, [
    areaFilter,
    categoryFilter,
    expDays,
    expirationFilter,
    locationFilter,
    normalizedSearch,
    stockFilter,
  ]);

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

  const enterMobileSelection = (id) => {
    if (!canEditInventory) return;
    setMobileSelectionMode(true);

    if (!id) return;

    const key = String(id);
    setSelectedIds((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const cancelMobileSelection = () => {
    setMobileSelectionMode(false);
    clearSelection();
  };

  const clearMobileLongPressTimer = () => {
    if (!mobileLongPressTimerRef.current) return;
    window.clearTimeout(mobileLongPressTimerRef.current);
    mobileLongPressTimerRef.current = null;
  };

  const startMobileLongPress = (id) => {
    if (!canEditInventory || mobileSelectionMode) return;
    clearMobileLongPressTimer();
    mobileLongPressTimerRef.current = window.setTimeout(() => {
      mobileLongPressTriggeredRef.current = true;
      enterMobileSelection(id);
      mobileLongPressTimerRef.current = null;
    }, 450);
  };

  const handleMobileItemPress = (item) => {
    if (mobileLongPressTriggeredRef.current) {
      mobileLongPressTriggeredRef.current = false;
      return;
    }

    if (mobileSelectionMode) {
      toggleSelect(item.id);
      return;
    }

    openDrawer(item);
  };

  const selectAllFiltered = () => {
    if (!canEditInventory) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const it of filteredItems) next.add(String(it.id));
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (!canEditInventory) return;
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

  const handleLocationFilterChange = (value) => {
    setLocationFilter(value || ALL_FILTER_KEY);
    setAreaFilter(ALL_FILTER_KEY);
    setCategoryFilter(ALL_FILTER_KEY);
  };

  const handleAreaFilterChange = (value) => {
    setAreaFilter(value || ALL_FILTER_KEY);
    setCategoryFilter(ALL_FILTER_KEY);
  };

  const resetFilters = () => {
    setSearch("");
    setLocationFilter(ALL_FILTER_KEY);
    setAreaFilter(ALL_FILTER_KEY);
    setCategoryFilter(ALL_FILTER_KEY);
    setExpirationFilter(EXPIRATION_FILTERS.ALL);
    setStockFilter(STOCK_FILTERS.ALL);
    setExpDays(7);
    setSortBy(SORT_OPTIONS.NAME_ASC);
    clearSelection();
    setMobileSelectionMode(false);
  };

  const applyMobileQuickFilter = (filter) => {
    if (filter === "expiring") {
      setExpirationFilter((current) =>
        current === EXPIRATION_FILTERS.SOON
          ? EXPIRATION_FILTERS.ALL
          : EXPIRATION_FILTERS.SOON
      );
      return;
    }

    if (filter === "stock") {
      setStockFilter((current) =>
        current === STOCK_FILTERS.LOW_OR_EMPTY
          ? STOCK_FILTERS.ALL
          : STOCK_FILTERS.LOW_OR_EMPTY
      );
    }
  };

  const clearFilter = (filterId) => {
    if (filterId === "search") {
      setSearch("");
      return;
    }

    if (filterId === "location") {
      setLocationFilter(ALL_FILTER_KEY);
      setAreaFilter(ALL_FILTER_KEY);
      setCategoryFilter(ALL_FILTER_KEY);
      return;
    }

    if (filterId === "area") {
      setAreaFilter(ALL_FILTER_KEY);
      setCategoryFilter(ALL_FILTER_KEY);
      return;
    }

    if (filterId === "category") {
      setCategoryFilter(ALL_FILTER_KEY);
      return;
    }

    if (filterId === "expiration") {
      setExpirationFilter(EXPIRATION_FILTERS.ALL);
      return;
    }

    if (filterId === "stock") {
      setStockFilter(STOCK_FILTERS.ALL);
    }
  };

  // ---- drawer helpers ----
  const openDrawer = (it) => {
    setActiveItemId(it.id);
    setEditName(it.name || "");
    setEditQty(String(it.quantity ?? 0));
    setEditExp(it.expiration_date || "");
    setEditBarcode(it.barcode || "");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveItemId(null);
    setEditName("");
    setEditQty("");
    setEditExp("");
    setEditBarcode("");
    setMoveModalOpen(false);
  };

  const saveEdits = async () => {
    if (!canEditInventory) return;
    if (!activeItem) return;

    const name = editName.trim();
    if (!name) return;

    const qty = toNonNegativeInteger(editQty, 0);

    const updated = {
      name,
      quantity: qty,
      expiration_date: editExp ? editExp : null,
      barcode: editBarcode,
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
              barcode: (data?.barcode ?? updated.barcode.trim()) || null,
            }
          : x
      )
    );
    emitInventoryChange({
      entity: "item",
      action: "updated",
      id: activeItem.id,
    });
    closeDrawer();
  };

  const handleActiveItemImageChange = ({ imagePath, imageUrl }) => {
    if (!activeItem?.id) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === activeItem.id
          ? { ...item, image_path: imagePath ?? null, imageUrl: imageUrl ?? null }
          : item
      )
    );
    emitInventoryChange({
      entity: "item",
      action: imagePath ? "image_updated" : "image_removed",
      id: activeItem.id,
    });
  };

  // ---- move helpers (single + bulk) ----
  const openMove = (mode) => {
    if (!canEditInventory) return;
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
    if (!canEditInventory) return false;
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
  }, [activeItem, canEditInventory, drawerOpen, items, moveTarget.categoryId, selectedIds]);

  const confirmMoveSingle = async () => {
    if (!canEditInventory) return;
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

    emitInventoryChange({
      entity: "item",
      action: "moved",
      id: activeItem.id,
    });
    closeDrawer();
  };

  const confirmMoveBulk = async () => {
    if (!canEditInventory) return;
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
    setMobileSelectionMode(false);
    emitInventoryChange({
      entity: "item",
      action: "moved",
      ids,
    });
  };

  // ---- delete helpers (single + bulk) ----
  const openDeleteSingle = () => {
    if (!canEditInventory) return;
    if (!activeItem) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      isAddingToShoppingList: false,
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
    if (!canEditInventory) return;
    if (selectedIds.size === 0) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      isAddingToShoppingList: false,
      mode: "bulk",
      payload: {
        itemIds: Array.from(selectedIds),
        count: selectedIds.size,
      },
    });
  };

  const closeDelete = () => {
    setDeleteDialog({
      open: false,
      isDeleting: false,
      isAddingToShoppingList: false,
      mode: null,
      payload: null,
    });
  };

  const confirmDelete = async () => {
    if (!canEditInventory) return;
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
        emitInventoryChange({
          entity: "item",
          action: "deleted",
          id: deleteDialog.payload.itemId,
        });
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
        emitInventoryChange({
          entity: "item",
          action: "deleted",
          ids,
        });
        closeDelete();
        clearSelection();
        setMobileSelectionMode(false);

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

  const confirmDeleteAndAddToShoppingList = async () => {
    if (!canEditInventory) return;
    if (!deleteDialog.payload || deleteDialog.mode !== "single") return;

    setDeleteDialog((p) => ({ ...p, isAddingToShoppingList: true }));

    try {
      const result = await deleteItemAndAddToShoppingListAction(
        deleteDialog.payload.itemId
      );

      if (result?.error) {
        console.error("deleteItemAndAddToShoppingListAction error:", result.error);
        closeDelete();
        return;
      }

      setItems((prev) => prev.filter((x) => x.id !== deleteDialog.payload.itemId));
      emitInventoryChange({
        entity: "shopping_list_item",
        action: "added",
        sourceEntity: "item",
        sourceAction: "deleted",
        id: result.data?.shoppingListItem?.id,
        deletedItemId: deleteDialog.payload.itemId,
      });
      closeDelete();
      closeDrawer();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(deleteDialog.payload.itemId));
        return next;
      });
    } catch (e) {
      console.error("Delete and add to shopping list error:", e);
      closeDelete();
    }
  };

  // ---- UI ----
  return (
    <motion.div
      variants={pageSectionVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-md:space-y-4 max-md:pb-24"
    >
      <motion.section
        variants={pageItemVariants}
        className={
          mobileSelectionMode
            ? "sticky top-[4.75rem] z-30 md:hidden"
            : "space-y-3 md:hidden"
        }
      >
        {mobileSelectionMode ? (
          <motion.div
            key="items-mobile-selection"
            {...mobileSelectionPanelMotion}
            className="transform-gpu rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-gray-950">
                  {selectedCount} selected
                </h1>
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
                onClick={toggleSelectAllFiltered}
                disabled={filteredItems.length === 0}
                className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] disabled:opacity-50"
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
              <span className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500">
                {filteredItems.length} matching
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                className="min-h-11 rounded-xl bg-[var(--stocksense-brand)] text-sm font-semibold text-white"
                onClick={() => openMove("bulk")}
                isDisabled={selectedCount === 0}
              >
                Move
              </Button>
              <Button
                className="min-h-11 rounded-xl bg-rose-600 text-sm font-semibold text-white"
                onClick={openDeleteBulk}
                isDisabled={selectedCount === 0}
              >
                Delete
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="items-mobile-default"
            {...mobileDefaultPanelMotion}
            className="space-y-3 transform-gpu"
          >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
                    Items
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {totals.total} {totals.total === 1 ? "item" : "items"} stored
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canEditInventory && filteredItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => enterMobileSelection()}
                      className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm"
                    >
                      Select
                    </button>
                  )}
                  <OpenGlobalAddItemButton
                    canEditInventory={canEditInventory}
                    className="min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-3 text-sm font-semibold text-white"
                  >
                    Add
                  </OpenGlobalAddItemButton>
                </div>
              </div>

              <Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search items"
                startContent={<FaSearch className="text-gray-400" />}
                classNames={{
                  inputWrapper:
                    "min-h-12 rounded-2xl border border-stocksense-gray bg-white shadow-sm",
                }}
              />

              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                <button
                  type="button"
                  onClick={() => applyMobileQuickFilter("expiring")}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                    expirationFilter === EXPIRATION_FILTERS.SOON
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  Expiring soon
                </button>
                <button
                  type="button"
                  onClick={() => applyMobileQuickFilter("stock")}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                    stockFilter === STOCK_FILTERS.LOW_OR_EMPTY
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  Low stock
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(true)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm"
                >
                  <FaFilter className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                  Filters
                  {mobileSheetFilterCount > 0 && (
                    <span className="rounded-full bg-[var(--stocksense-brand)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {mobileSheetFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {filtersAreActive && (
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => clearFilter(chip.id)}
                      className="inline-flex min-h-8 max-w-[240px] shrink-0 items-center gap-1.5 rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-xs font-medium text-[var(--stocksense-brand)]"
                      title={`Clear ${chip.label}`}
                    >
                      <span className="truncate">{chip.label}</span>
                      <FaTimes className="h-2.5 w-2.5 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
          </motion.div>
        )}
      </motion.section>

      {/* Header */}
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm max-md:hidden md:p-5"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[var(--entity-item-border)] bg-[var(--entity-item-accent)] p-3 text-white shadow-sm">
              <FaBoxOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-stocksense-teal md:text-2xl">
                Items
              </h1>
              <p className="text-sm text-gray-500">
                {canEditInventory
                  ? "Search and manage items across all locations."
                  : "Search items across all locations."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)_auto] md:items-start">
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search items, locations, areas, categories..."
            startContent={<FaSearch className="text-gray-400" />}
            classNames={{
              inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
            }}
          />

          <Select
            aria-label="Filter by location"
            label="Location"
            selectedKeys={new Set([locationFilter])}
            onSelectionChange={(keys) =>
              handleLocationFilterChange(getSelectedValue(keys) || ALL_FILTER_KEY)
            }
            variant="bordered"
            radius="lg"
            classNames={themedSelectClassNames}
          >
            <SelectItem key={ALL_FILTER_KEY}>All locations</SelectItem>
            {locationOptions.map((location) => (
              <SelectItem key={String(location.id)}>{location.name}</SelectItem>
            ))}
          </Select>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters((value) => !value)}
            className={`flex h-14 items-center justify-between gap-2 rounded-xl border px-4 text-sm font-medium transition md:justify-center ${
              advancedFiltersAreActive
                ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                : "border-stocksense-gray bg-white text-gray-700 hover:bg-gray-50"
            }`}
            aria-expanded={showAdvancedFilters}
          >
            <span className="flex items-center gap-2">
              <FaFilter className="h-3.5 w-3.5" />
              More filters
              {advancedFiltersAreActive && (
                <span className="rounded-full bg-[var(--stocksense-brand)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {advancedFilterCount}
                </span>
              )}
            </span>
            <FaChevronDown
              className={`h-3 w-3 transition-transform ${
                showAdvancedFilters ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-2xl border border-stocksense-gray bg-gray-50 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Select
                    aria-label="Filter by storage area"
                    label="Storage area"
                    selectedKeys={new Set([areaFilter])}
                    onSelectionChange={(keys) =>
                      handleAreaFilterChange(getSelectedValue(keys) || ALL_FILTER_KEY)
                    }
                    isDisabled={areaOptions.length === 0}
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    <SelectItem key={ALL_FILTER_KEY}>All areas</SelectItem>
                    {areaOptions.map((area) => (
                      <SelectItem key={String(area.id)}>
                        {locationFilter === ALL_FILTER_KEY
                          ? `${area.name} - ${area.locationName}`
                          : area.name}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    aria-label="Filter by category"
                    label="Category"
                    selectedKeys={new Set([categoryFilter])}
                    onSelectionChange={(keys) =>
                      setCategoryFilter(getSelectedValue(keys) || ALL_FILTER_KEY)
                    }
                    isDisabled={categoryOptions.length === 0}
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    <SelectItem key={ALL_FILTER_KEY}>All categories</SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={String(category.id)}>
                        {locationFilter === ALL_FILTER_KEY
                          ? `${category.name} - ${category.areaName} - ${category.locationName}`
                          : areaFilter === ALL_FILTER_KEY
                          ? `${category.name} - ${category.areaName}`
                          : category.name}
                      </SelectItem>
                    ))}
                  </Select>

                  <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                    <Select
                      aria-label="Filter by expiration"
                      label="Expiration"
                      selectedKeys={new Set([expirationFilter])}
                      onSelectionChange={(keys) =>
                        setExpirationFilter(
                          getSelectedValue(keys) || EXPIRATION_FILTERS.ALL
                        )
                      }
                      variant="bordered"
                      radius="lg"
                      className="min-w-0 flex-1"
                      classNames={themedSelectClassNames}
                    >
                      <SelectItem key={EXPIRATION_FILTERS.ALL}>
                        Any expiration
                      </SelectItem>
                      <SelectItem key={EXPIRATION_FILTERS.EXPIRED}>
                        Expired
                      </SelectItem>
                      <SelectItem key={EXPIRATION_FILTERS.SOON}>
                        Expiring soon
                      </SelectItem>
                      <SelectItem key={EXPIRATION_FILTERS.NONE}>
                        No expiration
                      </SelectItem>
                    </Select>

                    <input
                      aria-label="Expiring soon day window"
                      type="number"
                      min={1}
                      value={expDays}
                      onChange={(e) => setExpDays(toPositiveInteger(e.target.value, 7))}
                      className={`w-20 rounded-xl border border-stocksense-gray px-3 text-sm ${
                        expirationFilter !== EXPIRATION_FILTERS.SOON
                          ? "bg-gray-100 text-gray-400"
                          : "bg-white text-gray-800"
                      }`}
                      disabled={expirationFilter !== EXPIRATION_FILTERS.SOON}
                    />
                  </div>

                  <Select
                    aria-label="Filter by stock"
                    label="Stock"
                    selectedKeys={new Set([stockFilter])}
                    onSelectionChange={(keys) =>
                      setStockFilter(getSelectedValue(keys) || STOCK_FILTERS.ALL)
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    <SelectItem key={STOCK_FILTERS.ALL}>Any stock</SelectItem>
                    <SelectItem key={STOCK_FILTERS.IN_STOCK}>In stock</SelectItem>
                    <SelectItem key={STOCK_FILTERS.LOW_OR_EMPTY}>
                      Low or empty
                    </SelectItem>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filtersAreActive && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => clearFilter(chip.id)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-1.5 text-xs font-medium text-[var(--stocksense-brand)] hover:brightness-95"
                title={`Clear ${chip.label}`}
              >
                <span className="truncate">{chip.label}</span>
                <FaTimes className="h-2.5 w-2.5 shrink-0" />
              </button>
            ))}

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-stocksense-gray bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Reset all
            </button>
          </div>
        )}

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

            {canEditInventory && selectedCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                <strong>{selectedCount}</strong> selected
              </span>
            )}

            {filtersAreActive && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                <strong>{filteredItems.length}</strong> matching
              </span>
            )}
          </div>

          {canEditInventory && (
            <div className="flex flex-wrap gap-2 items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  className="w-5 h-5 border border-stocksense-gray rounded cursor-pointer"
                />
                Select all visible
              </label>

              <button
                onClick={clearSelection}
                className="rounded-xl border border-stocksense-gray px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                disabled={selectedCount === 0}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Bulk actions bar */}
        {canEditInventory && <AnimatePresence initial={false}>
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
        </AnimatePresence>}
      </motion.div>

      {/* List */}
      <motion.div variants={pageSectionVariants} className="space-y-4">
        <div className="max-md:hidden">
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={filteredItems.length}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          />
        </div>

        <div className="space-y-3 md:hidden">
          <AnimatePresence initial={false}>
            {paginatedItems.map((it) => {
              const expirationDays = daysUntil(it.expiration_date);
              const expired = expirationDays < 0;
              const soon =
                expirationDays >= 0 && expirationDays <= toPositiveInteger(expDays, 7);
              const quantity = toNonNegativeInteger(it.quantity, 0);
              const lowStock = quantity <= 1;
              const selected = selectedIds.has(String(it.id));
              const path = [
                it.location?.name || "Unknown location",
                it.area?.name || "Storage area",
                it.category?.name || "Category",
              ].join(" > ");

              return (
                <motion.div
                  key={it.id}
                  variants={pageItemVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                  role="button"
                  tabIndex={0}
                  onPointerDown={() => startMobileLongPress(it.id)}
                  onPointerUp={clearMobileLongPressTimer}
                  onPointerLeave={clearMobileLongPressTimer}
                  onPointerCancel={clearMobileLongPressTimer}
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={() => handleMobileItemPress(it)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleMobileItemPress(it);
                    }
                  }}
                  className={`flex w-full gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)] ${
                    selected
                      ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                      : "border-stocksense-gray"
                  }`}
                >
                  {mobileSelectionMode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={mobileSelectionTransition}
                      className="mt-7 shrink-0 transform-gpu"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(it.id)}
                        onPointerDown={(event) => event.stopPropagation()}
                        onPointerUp={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[var(--stocksense-brand)]"
                        aria-label={`Select ${it.name}`}
                      />
                    </motion.div>
                  )}

                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 text-[var(--stocksense-brand)]">
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FaBoxOpen className="h-7 w-7" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start gap-2">
                      <h2 className="min-w-0 flex-1 truncate text-base font-semibold leading-5 text-gray-950">
                        {it.name}
                      </h2>
                      <FaChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" />
                    </div>

                    <p className="mt-1 truncate text-sm text-gray-500">{path}</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">
                      Qty: {quantity}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {it.expiration_date
                        ? `Expires ${it.expiration_date}`
                        : "No expiration date"}
                    </p>

                    {(expired || soon || lowStock) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(expired || soon) && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              expired
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-orange-200 bg-orange-50 text-orange-700"
                            }`}
                          >
                            {expired ? "Expired" : "Expiring soon"}
                          </span>
                        )}
                        {lowStock && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Low stock
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {filteredItems.length === 0 && (
              <motion.div
                key="mobile-empty"
                variants={pageItemVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                className="rounded-2xl border border-stocksense-gray bg-white px-5 py-8 text-center shadow-sm"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                  <FaBoxOpen className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-gray-950">
                  {items.length === 0 ? "No items yet" : "No matching items"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {items.length === 0
                    ? "Start adding things you want to keep track of."
                    : "Try changing your search or filters."}
                </p>
                {items.length === 0 ? (
                  <div className="mt-5">
                    <OpenGlobalAddItemButton
                      canEditInventory={canEditInventory}
                      className="min-h-11 rounded-xl bg-[var(--stocksense-brand)] px-4 font-semibold text-white"
                    >
                      Add item
                    </OpenGlobalAddItemButton>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 gap-4 max-md:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              role="button"
              tabIndex={0}
              onClick={() => openDrawer(it)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDrawer(it);
                }
              }}
              className={`relative h-full overflow-hidden rounded-2xl border bg-white p-3.5 pt-4 shadow-sm transition sm:p-4 ${
                selected
                  ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                  : "border-stocksense-gray hover:bg-gray-50"
              } cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]`}
              whileHover={{ y: -1 }}
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${soon ? "bg-[var(--entity-warning-accent)]" : "bg-[var(--entity-item-accent)]"}`} />
              <div className="flex h-full items-start gap-2.5">
                {/* Left: checkbox + info */}
                <div className="flex items-start gap-2.5 min-w-0">
                  {canEditInventory && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      onChange={() => toggleSelect(it.id)}
                      className="mt-0.5 w-5 h-5 cursor-pointer"
                    />
                  )}

                  {it.imageUrl && (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                      <img
                        src={it.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="truncate text-[15px] font-semibold leading-5 text-stocksense-teal sm:text-base">{it.name}</div>

                      {soon && (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-700">
                          {du < 0 ? "Expired" : "Soon"}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-500 truncate">
                      {it.location?.name || "Unknown location"} • {it.area?.name || "—"} •{" "}
                      {it.category?.name || "—"}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-gray-600">
                      Qty: {it.quantity ?? 0} • Exp: {it.expiration_date || "—"}
                    </div>
                    {it.barcode && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <FaBarcode className="h-3 w-3" />
                        <span className="truncate">{it.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>
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
            className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4"
          >
            <p className="text-gray-500">No items match your search.</p>
            <div className="mt-4 flex justify-center">
              <OpenGlobalAddItemButton canEditInventory={canEditInventory} />
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

      <Modal
        isOpen={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        placement="bottom"
        size="full"
        classNames={{
          wrapper: "items-end md:hidden",
          base: "m-0 w-full max-w-none rounded-t-3xl border-0 bg-white shadow-2xl md:hidden",
        }}
      >
        <ModalContent
          className="max-h-[88svh] w-full overflow-hidden rounded-t-3xl bg-white text-gray-700 md:hidden"
          style={modalContentStyle}
        >
          {() => (
            <>
              <ModalHeader className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-3 text-[var(--stocksense-brand)]">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-[var(--stocksense-brand)]">Filters</h2>
                </div>
                <MobileSheetCloseButton onPress={() => setFilterSheetOpen(false)} />
              </ModalHeader>

              <ModalBody className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-6">
                <Select
                  aria-label="Filter by location"
                  label="Location"
                  selectedKeys={new Set([locationFilter])}
                  onSelectionChange={(keys) =>
                    handleLocationFilterChange(getSelectedValue(keys) || ALL_FILTER_KEY)
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  <SelectItem key={ALL_FILTER_KEY}>All locations</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  aria-label="Filter by storage area"
                  label="Storage Area"
                  selectedKeys={new Set([areaFilter])}
                  onSelectionChange={(keys) =>
                    handleAreaFilterChange(getSelectedValue(keys) || ALL_FILTER_KEY)
                  }
                  isDisabled={areaOptions.length === 0}
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  <SelectItem key={ALL_FILTER_KEY}>All storage areas</SelectItem>
                  {areaOptions.map((area) => (
                    <SelectItem key={String(area.id)}>
                      {locationFilter === ALL_FILTER_KEY
                        ? `${area.name} - ${area.locationName}`
                        : area.name}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  aria-label="Filter by category"
                  label="Category"
                  selectedKeys={new Set([categoryFilter])}
                  onSelectionChange={(keys) =>
                    setCategoryFilter(getSelectedValue(keys) || ALL_FILTER_KEY)
                  }
                  isDisabled={categoryOptions.length === 0}
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  <SelectItem key={ALL_FILTER_KEY}>All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={String(category.id)}>
                      {locationFilter === ALL_FILTER_KEY
                        ? `${category.name} - ${category.areaName} - ${category.locationName}`
                        : areaFilter === ALL_FILTER_KEY
                          ? `${category.name} - ${category.areaName}`
                          : category.name}
                    </SelectItem>
                  ))}
                </Select>

                <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
                  <Select
                    aria-label="Filter by expiration"
                    label="Expiration"
                    selectedKeys={new Set([expirationFilter])}
                    onSelectionChange={(keys) =>
                      setExpirationFilter(
                        getSelectedValue(keys) || EXPIRATION_FILTERS.ALL
                      )
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    <SelectItem key={EXPIRATION_FILTERS.ALL}>
                      Any expiration
                    </SelectItem>
                    <SelectItem key={EXPIRATION_FILTERS.EXPIRED}>
                      Expired
                    </SelectItem>
                    <SelectItem key={EXPIRATION_FILTERS.SOON}>
                      Expiring soon
                    </SelectItem>
                    <SelectItem key={EXPIRATION_FILTERS.NONE}>
                      No expiration
                    </SelectItem>
                  </Select>

                  <input
                    aria-label="Expiring soon day window"
                    type="number"
                    min={1}
                    value={expDays}
                    onChange={(event) =>
                      setExpDays(toPositiveInteger(event.target.value, 7))
                    }
                    className={`min-h-14 rounded-xl border border-stocksense-gray px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)] ${
                      expirationFilter !== EXPIRATION_FILTERS.SOON
                        ? "bg-gray-100 text-gray-400"
                        : "bg-white text-gray-800"
                    }`}
                    disabled={expirationFilter !== EXPIRATION_FILTERS.SOON}
                  />
                </div>

                <Select
                  aria-label="Filter by stock"
                  label="Stock"
                  selectedKeys={new Set([stockFilter])}
                  onSelectionChange={(keys) =>
                    setStockFilter(getSelectedValue(keys) || STOCK_FILTERS.ALL)
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  <SelectItem key={STOCK_FILTERS.ALL}>Any stock</SelectItem>
                  <SelectItem key={STOCK_FILTERS.IN_STOCK}>In stock</SelectItem>
                  <SelectItem key={STOCK_FILTERS.LOW_OR_EMPTY}>
                    Low or empty
                  </SelectItem>
                </Select>

                <Select
                  aria-label="Sort items"
                  label="Sort by"
                  selectedKeys={new Set([sortBy])}
                  onSelectionChange={(keys) =>
                    setSortBy(getSelectedValue(keys) || SORT_OPTIONS.NAME_ASC)
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {Object.entries(SORT_LABELS).map(([key, label]) => (
                    <SelectItem key={key}>{label}</SelectItem>
                  ))}
                </Select>
              </ModalBody>

              <ModalFooter className="sticky bottom-0 z-20 border-t border-gray-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)]">
                <Button
                  className="min-h-12 w-full rounded-xl bg-[var(--stocksense-brand)] text-base font-semibold text-white"
                  onClick={() => setFilterSheetOpen(false)}
                >
                  Apply filters
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

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
              <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold text-[var(--stocksense-brand)]">
                    {activeItem?.name || "Item"}
                  </div>
                  <div className="truncate text-sm text-gray-500">
                    {activeItem?.location?.name || "Unknown location"} • {activeItem?.area?.name || "—"} •{" "}
                    {activeItem?.category?.name || "—"}
                  </div>
                </div>
                <MobileSheetCloseButton onPress={closeDrawer} />
              </ModalHeader>

              <ModalBody className={`space-y-5 ${modalBodyClass}`}>
                {canEditInventory ? (
                  <>
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

                    <div className="space-y-2 max-md:hidden">
                      <div className="text-xs font-medium text-gray-600">Barcode</div>
                      <Input
                        value={editBarcode}
                        onValueChange={setEditBarcode}
                        placeholder="e.g., 012345678905"
                        variant="bordered"
                        radius="lg"
                        classNames={modalInputClassNames}
                        startContent={<FaBarcode className="text-gray-400" />}
                      />
                    </div>

                    <EntityImageManager
                      entityType="item"
                      entityId={activeItem?.id}
                      imageUrl={activeItem?.imageUrl}
                      label="Item photo"
                      onChange={handleActiveItemImageChange}
                    />

                    {activeItem?.barcode && (
                      <div className="rounded-xl border border-gray-200 bg-white p-3 md:hidden">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                          <FaBarcode className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                          <span>Barcode</span>
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-gray-800">
                          {activeItem.barcode}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 max-md:flex-col">
                      <Button
                        onClick={saveEdits}
                        isDisabled={!hasItemEditChanges}
                        className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
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
                    <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                      <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                      <Button
                        className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                        onClick={openDeleteSingle}
                      >
                        Delete item
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-stocksense-gray bg-white p-3">
                      <div className="text-xs font-medium text-gray-500">Quantity</div>
                      <div className="mt-1 text-sm font-semibold text-gray-800">
                        {activeItem?.quantity ?? 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-stocksense-gray bg-white p-3">
                      <div className="text-xs font-medium text-gray-500">Expiration</div>
                      <div className="mt-1 text-sm font-semibold text-gray-800">
                        {activeItem?.expiration_date || "None"}
                      </div>
                    </div>
                    {activeItem?.barcode && (
                      <div className="rounded-xl border border-stocksense-gray bg-white p-3 sm:col-span-2">
                        <div className="text-xs font-medium text-gray-500">Barcode</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800">
                          {activeItem.barcode}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button variant="light" className="rounded-xl max-md:hidden" onClick={closeDrawer}>
                  Close
                </Button>
                {canEditInventory && (
                  <Button
                    className="rounded-xl bg-rose-600 text-white max-md:hidden"
                    onClick={openDeleteSingle}
                  >
                    Delete
                  </Button>
                )}
                {canEditInventory && (
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white md:hidden"
                    onClick={saveEdits}
                    isDisabled={!hasItemEditChanges}
                  >
                    Save changes
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Move Modal (single + bulk) */}
      {canEditInventory && <Modal
        isOpen={moveModalOpen}
        onOpenChange={setMoveModalOpen}
        size="md"
        placement="center"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {() => (
            <>
              <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold text-[var(--stocksense-brand)]">
                    Move {selectedCount > 0 && !drawerOpen ? `${selectedCount} items` : "item"}
                  </div>
                  <div className="truncate text-sm text-gray-500">
                    Choose the destination category.
                  </div>
                </div>
                <MobileSheetCloseButton onPress={() => setMoveModalOpen(false)} />
              </ModalHeader>

              <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                {drawerOpen && activeItem ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Current
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-950">
                      {activeItem.location?.name || "Unknown location"} &gt;{" "}
                      {activeItem.area?.name || "Storage area"} &gt;{" "}
                      {activeItem.category?.name || "Category"}
                    </p>
                  </div>
                ) : null}
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
                  classNames={themedSelectClassNames}
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
                  classNames={themedSelectClassNames}
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
                  classNames={themedSelectClassNames}
                >
                  {currentCategories.map((category) => (
                    <SelectItem key={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </Select>
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button
                  variant="light"
                  className="rounded-xl max-md:hidden"
                  onClick={() => setMoveModalOpen(false)}
                >
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
      </Modal>}

      {/* Delete confirmation (single + bulk) */}
      {canEditInventory && <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        isSecondaryConfirming={deleteDialog.isAddingToShoppingList}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        onSecondaryConfirm={
          deleteDialog.mode === "single" ? confirmDeleteAndAddToShoppingList : null
        }
        secondaryConfirmLabel={
          deleteDialog.mode === "single" ? "Delete and add to shopping list" : null
        }
        secondaryConfirmClassName="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
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
      />}
    </motion.div>
  );
}
