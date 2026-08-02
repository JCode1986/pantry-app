"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/ui/MotionLite";
import {
  FaArrowsAlt,
  FaBoxOpen,
  FaChevronRight,
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
  deleteItems,
  deleteStorageArea,
  getCategoryItemsAction,
  getInventoryHierarchy,
  getAreaCategoriesPageAction,
  updateItem,
  updateItemsLocation,
  updateCategoryName,
  deleteCategory,
  updateStorageArea,
  uploadInventoryImage,
} from "@/app/actions/server";
import { emitInventoryChange } from "@/utils/clientEvents";
import PaginationControls from "@/components/ui/PaginationControls";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import NativeSelect from "@/components/ui/NativeSelect";
import SearchResultsLoadingState from "@/components/ui/SearchResultsLoadingState";
import { daysUntil, isExpiringSoon, toNonNegativeInteger } from "@/utils/pantry/date";
import { normalizeMoveLocations } from "@/utils/pantry/moveLocations";

const MoveItemsModal = dynamic(() => import("@/components/items/MoveItemsModal"), {
  ssr: false,
});
const AreaItemEditModal = dynamic(() => import("@/components/areas/AreaItemEditModal"), {
  ssr: false,
});
const AreaDetailModals = dynamic(
  () => import("@/components/areas/AreaDetailModals"),
  { ssr: false }
);
const ConfirmDeleteModal = dynamic(
  () => import("@/components/modals/ConfirmDeleteModal"),
  { ssr: false }
);

const AREA_DETAIL_PAGE_SIZE = 24;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const SORT_OPTIONS = [
  ["name_asc", "A-Z"],
  ["name_desc", "Z-A"],
  ["newest", "Newest"],
  ["oldest", "Oldest"],
];
const SORT_SELECT_OPTIONS = SORT_OPTIONS.map(([value, label]) => ({
  value,
  label,
}));

const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function InlineButton({
  children,
  className = "",
  disabled = false,
  onClick,
  type = "button",
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${buttonBaseClass} ${className}`}
    >
      {children}
    </button>
  );
}

function SearchInput({ value, onChange, placeholder, className = "" }) {
  return (
    <label
      className={`flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)] ${className}`}
    >
      <FaSearch className="h-4 w-4 shrink-0 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
      />
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[var(--stocksense-brand)] focus:ring-1 focus:ring-[var(--stocksense-brand-border)] disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    />
  );
}

function ActionMenu({ ariaLabel, items, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      const target = event.target;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const closeMenu = () => setIsOpen(false);

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [isOpen]);

  const menu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
            className="fixed z-[120] min-w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl"
          >
            {items.filter(Boolean).map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  item.onSelect();
                }}
                className={`block w-full px-3 py-2 text-left font-medium transition hover:bg-gray-50 ${
                  item.danger ? "text-rose-700" : "text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) {
            setMenuPosition({
              top: rect.bottom + 8,
              right: Math.max(12, window.innerWidth - rect.right),
            });
          }
          setIsOpen((current) => !current);
        }}
        className="grid h-9 w-9 min-w-9 shrink-0 place-items-center rounded-xl text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FaEllipsisV className="h-4 w-4" />
      </button>
      {menu}
    </div>
  );
}

function getSortTimestamp(entry) {
  const time = new Date(
    entry?.insertedAt ?? entry?.inserted_at ?? entry?.created_at ?? entry?.createdAt ?? 0
  ).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortCategoriesForDisplay(items, sortBy) {
  return [...(items ?? [])].sort((a, b) => {
    if (sortBy === "name_desc") return b.name.localeCompare(a.name);
    if (sortBy === "newest") return getSortTimestamp(b) - getSortTimestamp(a);
    if (sortBy === "oldest") return getSortTimestamp(a) - getSortTimestamp(b);
    return a.name.localeCompare(b.name);
  });
}

function formatCount(count, singular, plural = `${singular}s`) {
  const value = count ?? 0;
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function formatExpiration(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function validateImageFile(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.has(file.type)) return "Choose a JPG, PNG, WebP, or GIF image.";
  if (file.size > MAX_IMAGE_SIZE) return "Images must be 5 MB or smaller.";
  return "";
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

const collapseVariants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  open: { height: "auto", opacity: 1, transition: { duration: 0.25 } },
};

const emptyItemModal = {
  open: false,
  itemId: null,
  categoryId: null,
  categoryName: "",
  name: "",
  quantity: "0",
  expirationDate: "",
  barcode: "",
  imageUrl: null,
};

export default function AreaDetailClient({
  area,
  initialCategories,
  initialTotalCategories = initialCategories?.length ?? 0,
  canEditInventory = true,
}) {
  const router = useRouter();
  const [areaName, setAreaName] = useState(area?.name ?? "");
  const [areaImageUrl, setAreaImageUrl] = useState(area?.imageUrl ?? null);
  const [categories, setCategories] = useState(initialCategories ?? []);
  const [totalCategoryCount, setTotalCategoryCount] = useState(initialTotalCategories);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryImageFile, setNewCategoryImageFile] = useState(null);
  const [newCategoryImagePreview, setNewCategoryImagePreview] = useState(null);
  const [newCategoryImageMessage, setNewCategoryImageMessage] = useState("");
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(
    () => new Set((initialCategories ?? []).map((category) => String(category.id)))
  );
  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
  const [mobileAddOpen, setMobileAddOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => new Set());

  const [isSaving, setIsSaving] = useState(false);
  const [editAreaOpen, setEditAreaOpen] = useState(false);
  const [editAreaName, setEditAreaName] = useState(area?.name ?? "");
  const [deleteAreaOpen, setDeleteAreaOpen] = useState(false);
  const [isDeletingArea, setIsDeletingArea] = useState(false);
  const [itemModal, setItemModal] = useState(emptyItemModal);
  const [itemDeleteDialog, setItemDeleteDialog] = useState({
    open: false,
    payload: null,
    isDeleting: false,
  });
  const [moveModal, setMoveModal] = useState({
    open: false,
    sourceAreaId: area?.id ?? null,
    sourceCategoryId: null,
    targetLocationId: area?.location?.id ?? null,
    targetAreaId: area?.id ?? null,
    targetCategoryId: null,
    itemIds: [],
  });
  const [moveLocationsForModal, setMoveLocationsForModal] = useState([]);
  const [moveDestinationsLoaded, setMoveDestinationsLoaded] = useState(false);
  const [isLoadingMoveDestinations, setIsLoadingMoveDestinations] = useState(false);
  const [moveDestinationsError, setMoveDestinationsError] = useState("");
  const moveDestinationsRequestRef = useRef(null);

  const [renameModal, setRenameModal] = useState({
    open: false,
    id: null,
    name: "",
    imageUrl: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    mode: "single",
    id: null,
    name: "",
    categoryIds: [],
    count: 0,
    busy: false,
  });

  useEffect(() => {
    return () => {
      if (newCategoryImagePreview) URL.revokeObjectURL(newCategoryImagePreview);
    };
  }, [newCategoryImagePreview]);

  const normalizedSearch = search.trim().toLowerCase();
  const categoryItemsLoadKey = useMemo(
    () => JSON.stringify({ search: normalizedSearch, sortBy: "name_asc" }),
    [normalizedSearch]
  );
  const categoryLoadRequestIdRef = useRef(0);
  const loadCategoryPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, page);
      const requestId = categoryLoadRequestIdRef.current + 1;
      categoryLoadRequestIdRef.current = requestId;
      setIsLoadingCategories(true);
      setCategoriesError("");

      try {
        const result = await getAreaCategoriesPageAction({
          areaId: area?.id,
          offset: (safePage - 1) * AREA_DETAIL_PAGE_SIZE,
          limit: AREA_DETAIL_PAGE_SIZE,
          filters: { search: normalizedSearch, sortBy },
        });

        if (result?.error) {
          if (requestId === categoryLoadRequestIdRef.current) {
            setCategoriesError(result.error);
          }
          return;
        }

        if (requestId !== categoryLoadRequestIdRef.current) return;

        const nextCategories = result?.data?.items ?? [];
        const nextTotal = result?.data?.totalCount ?? 0;
        setCategories(nextCategories);
        setCollapsedCategoryIds(
          new Set(nextCategories.map((category) => String(category.id)))
        );
        setSelectedItemIds(new Set());
        setTotalCategoryCount(nextTotal);

        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / AREA_DETAIL_PAGE_SIZE));
        if (safePage > nextTotalPages) setCurrentPage(nextTotalPages);
      } catch (error) {
        if (requestId === categoryLoadRequestIdRef.current) {
          setCategoriesError(error?.message || "Could not load categories.");
        }
      } finally {
        if (requestId === categoryLoadRequestIdRef.current) {
          setIsLoadingCategories(false);
        }
      }
    },
    [area?.id, normalizedSearch, sortBy]
  );

  const initialLoadSkippedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadSkippedRef.current) {
      initialLoadSkippedRef.current = true;
      return;
    }

    void loadCategoryPage(currentPage);
  }, [currentPage, loadCategoryPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategoryIds(new Set());
  }, [normalizedSearch, sortBy]);

  const filtered = categories ?? [];
  const showSearchRestoreLoader =
    isLoadingCategories && !normalizedSearch && filtered.length === 0;
  const selectedCount = selectedCategoryIds.size;
  const selectionMode = selectedCount > 0;
  const itemSelectionMode = selectedItemIds.size > 0;
  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((category) => selectedCategoryIds.has(String(category.id)));
  const totalPages = Math.max(1, Math.ceil(totalCategoryCount / AREA_DETAIL_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem =
    totalCategoryCount === 0
      ? 0
      : (safeCurrentPage - 1) * AREA_DETAIL_PAGE_SIZE + 1;
  const endItem = Math.min(
    (safeCurrentPage - 1) * AREA_DETAIL_PAGE_SIZE + filtered.length,
    totalCategoryCount
  );
  const hasActiveSearch = Boolean(normalizedSearch);

  useEffect(() => {
    setSelectedCategoryIds((current) => {
      const visibleIds = new Set(filtered.map((category) => String(category.id)));
      const next = new Set(
        Array.from(current).filter((categoryId) => visibleIds.has(categoryId))
      );

      return next.size === current.size ? current : next;
    });
  }, [filtered]);

  const totals = useMemo(() => {
    return {
      categories: totalCategoryCount,
      items: categories.reduce((sum, c) => sum + (c.itemsCount || 0), 0),
    };
  }, [categories, totalCategoryCount]);

  useEffect(() => {
    setSelectedItemIds((current) => {
      const availableIds = new Set(
        categories.flatMap((category) =>
          (category.items ?? []).map((item) => String(item.id))
        )
      );
      const next = new Set(
        Array.from(current).filter((itemId) => availableIds.has(String(itemId)))
      );

      return next.size === current.size ? current : next;
    });
  }, [categories]);

  const currentStorageAreas = useMemo(
    () => [
      {
        id: area?.id,
        name: areaName,
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
      },
    ],
    [area?.id, areaName, categories]
  );

  const fallbackLocationsForMove = useMemo(
    () => [
      {
        id: area?.location?.id,
        name: area?.location?.name ?? "Location",
        storageAreas: currentStorageAreas,
      },
    ],
    [area?.location?.id, area?.location?.name, currentStorageAreas]
  );

  const locationsForMove = useMemo(
    () =>
      moveLocationsForModal.length > 0
        ? moveLocationsForModal
        : fallbackLocationsForMove,
    [fallbackLocationsForMove, moveLocationsForModal]
  );

  const closeItemModal = () => setItemModal(emptyItemModal);

  const loadMoveDestinations = useCallback(
    async ({ force = false } = {}) => {
      if (!force && moveDestinationsLoaded) return moveLocationsForModal;
      if (moveDestinationsRequestRef.current) {
        return moveDestinationsRequestRef.current;
      }

      setIsLoadingMoveDestinations(true);
      setMoveDestinationsError("");

      const request = getInventoryHierarchy()
        .then((result) => {
          if (result?.error) {
            throw new Error(result.error);
          }

          const nextMoveLocations = normalizeMoveLocations(result?.data ?? []);
          setMoveLocationsForModal(nextMoveLocations);
          setMoveDestinationsLoaded(true);
          return nextMoveLocations;
        })
        .catch((error) => {
          setMoveDestinationsError(
            error?.message || "Could not load move destinations."
          );
          return null;
        })
        .finally(() => {
          setIsLoadingMoveDestinations(false);
          moveDestinationsRequestRef.current = null;
        });

      moveDestinationsRequestRef.current = request;
      return request;
    },
    [moveDestinationsLoaded, moveLocationsForModal]
  );

  const toggleSelectItem = (itemId) => {
    if (!canEditInventory) return;
    const key = String(itemId);

    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setVisibleItemsSelected = (itemIds, selected) => {
    if (!canEditInventory || itemIds.length === 0) return;
    setSelectedItemIds((current) => {
      const next = new Set(current);
      itemIds.forEach((itemId) => {
        if (selected) next.add(String(itemId));
        else next.delete(String(itemId));
      });
      return next;
    });
  };

  const clearItemSelection = () => {
    setSelectedItemIds(new Set());
  };

  const openEditItem = (item, category) => {
    if (!canEditInventory) return;
    setItemModal({
      open: true,
      itemId: item.id,
      categoryId: category.id,
      categoryName: category.name,
      name: item.name ?? "",
      quantity: String(item.quantity ?? 0),
      expirationDate: item.expiration_date ?? "",
      barcode: item.barcode ?? "",
      imageUrl: item.imageUrl ?? null,
    });
  };

  const openMoveItem = (item, category) => {
    if (!canEditInventory || !item?.id || !category?.id) return;

    setMoveModal({
      open: true,
      sourceAreaId: area?.id ?? null,
      sourceCategoryId: category.id,
      targetLocationId: area?.location?.id ?? null,
      targetAreaId: area?.id ?? null,
      targetCategoryId: category.id,
      itemIds: [item.id],
    });
    void loadMoveDestinations();
  };

  const openMoveSelectedItems = (category, itemIds) => {
    if (!canEditInventory || !category?.id || itemIds.length === 0) return;

    setMoveModal({
      open: true,
      sourceAreaId: area?.id ?? null,
      sourceCategoryId: category.id,
      targetLocationId: area?.location?.id ?? null,
      targetAreaId: area?.id ?? null,
      targetCategoryId: category.id,
      itemIds,
    });
    void loadMoveDestinations();
  };

  const openDeleteItem = (item, category) => {
    if (!canEditInventory) return;
    setItemDeleteDialog({
      open: true,
      payload: {
        ...item,
        categoryId: category?.id ?? item?.category_id ?? item?.categoryId,
        categoryName: category?.name ?? item?.categoryName,
      },
      isDeleting: false,
    });
  };

  const openDeleteSelectedItems = (category, itemIds) => {
    if (!canEditInventory || !category?.id || itemIds.length === 0) return;

    setItemDeleteDialog({
      open: true,
      payload: {
        itemIds,
        count: itemIds.length,
        categoryId: category.id,
        categoryName: category.name,
      },
      isDeleting: false,
    });
  };

  const loadCategoryItems = useCallback(
    async (categoryId, options = {}) => {
      const categoryKey = String(categoryId);
      const target = categories.find(
        (category) => String(category.id) === categoryKey
      );
      if (
        !target ||
        target.itemsLoading ||
        (target.itemsLoaded &&
          target.itemsLoadKey === categoryItemsLoadKey &&
          !options.force)
      ) {
        return;
      }

      setCategories((prev) =>
        prev.map((category) =>
          String(category.id) === categoryKey
            ? { ...category, itemsLoading: true, itemsError: "" }
            : category
        )
      );

      try {
        const result = await getCategoryItemsAction({
          categoryId,
          filters: {
            search: normalizedSearch,
            sortBy: "name_asc",
          },
        });

        if (result?.error) {
          setCategories((prev) =>
            prev.map((category) =>
              String(category.id) === categoryKey
                ? {
                    ...category,
                    itemsLoading: false,
                    itemsError: result.error,
                  }
                : category
            )
          );
          return;
        }

        const items = result?.data?.items ?? [];
        setCategories((prev) =>
          prev.map((category) =>
            String(category.id) === categoryKey
              ? {
                  ...category,
                  items,
                  itemsCount: result?.data?.totalCount ?? items.length,
                  itemsLoaded: true,
                  itemsLoadKey: categoryItemsLoadKey,
                  itemsLoading: false,
                  itemsError: "",
                }
              : category
          )
        );
      } catch (error) {
        setCategories((prev) =>
          prev.map((category) =>
            String(category.id) === categoryKey
              ? {
                  ...category,
                  itemsLoading: false,
                  itemsError: error?.message || "Could not load items.",
                }
              : category
          )
        );
      }
    },
    [categories, categoryItemsLoadKey, normalizedSearch]
  );

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.categoryId || String(item.storageAreaId) !== String(area?.id)) {
        return;
      }

      if (item.createdCategory) {
        setTotalCategoryCount((current) => current + 1);
      }

      const nextItem = {
        id: item.id,
        name: item.name ?? item.itemName ?? "Item",
        quantity: item.quantity ?? 0,
        expiration_date: item.expiration_date ?? item.expirationDate ?? null,
        barcode: item.barcode ?? null,
        image_path: item.image_path ?? null,
        imageUrl: item.imageUrl ?? null,
      };

      setCategories((prev) => {
        const categoryExists = prev.some(
          (category) => String(category.id) === String(item.categoryId)
        );

        if (!categoryExists) {
          return sortCategoriesForDisplay([
            ...prev,
            {
              id: item.categoryId,
              name: item.categoryName ?? "Category",
              itemsCount: 1,
              items: [nextItem],
            },
          ], sortBy);
        }

        return prev.map((category) =>
          String(category.id) === String(item.categoryId)
            ? (() => {
                const existingItems = category.items ?? [];
                const itemAlreadyVisible = existingItems.some(
                  (visibleItem) => String(visibleItem.id) === String(item.id)
                );

                return {
                  ...category,
                  itemsCount: itemAlreadyVisible
                    ? category.itemsCount ?? existingItems.length
                    : (category.itemsCount ?? existingItems.length) + 1,
                  items: itemAlreadyVisible ? existingItems : [...existingItems, nextItem],
                };
              })()
            : category
        );
      });
      setCollapsedCategoryIds((prev) => {
        if (!prev.has(String(item.categoryId))) return prev;
        const next = new Set(prev);
        next.delete(String(item.categoryId));
        return next;
      });
    };

    window.addEventListener("stocksense:item-added", handleItemAdded);

    return () => {
      window.removeEventListener("stocksense:item-added", handleItemAdded);
    };
  }, [area?.id, sortBy]);

  // ---------------- Actions ----------------

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

      setCategories((prev) =>
        prev.map((category) => ({
          ...category,
          items: (category.items ?? []).map((item) =>
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
          ),
        }))
      );
      emitInventoryChange({
        entity: "item",
        action: "updated",
        id: itemModal.itemId,
      });
      closeItemModal();
      router.refresh();
    } catch (err) {
      console.error("update area detail item error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemImageChange = ({ imagePath, imageUrl, imageThumbUrl }) => {
    const itemId = itemModal.itemId;
    if (!itemId) return;

    setCategories((prev) =>
      prev.map((category) => ({
        ...category,
        items: (category.items ?? []).map((item) =>
          String(item.id) === String(itemId)
            ? {
                ...item,
                image_path: imagePath ?? null,
                imageUrl: imageUrl ?? null,
                imageThumbUrl: imageThumbUrl ?? null,
              }
            : item
        ),
      }))
    );
    setItemModal((prev) => ({
      ...prev,
      imageUrl: imageUrl ?? null,
      imageThumbUrl: imageThumbUrl ?? null,
    }));
    emitInventoryChange({
      entity: "item",
      action: imagePath ? "image_updated" : "image_removed",
      id: itemId,
    });
  };

  const confirmDeleteItem = async () => {
    const payload = itemDeleteDialog.payload;
    if (!canEditInventory || !payload) return;

    const itemIds = payload.itemIds?.length
      ? payload.itemIds.map(String)
      : payload.id
        ? [String(payload.id)]
        : [];
    if (itemIds.length === 0) return;

    setItemDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      const result = await deleteItems(itemIds);
      if (result?.error) throw result.error;

      const deleted = new Set(itemIds);
      const categoryKey = String(payload.categoryId ?? payload.category_id);
      setCategories((prev) =>
        prev.map((category) => {
          if (String(category.id) !== categoryKey) return category;

          return {
            ...category,
            itemsCount: Math.max(
              0,
              (category.itemsCount ?? category.items?.length ?? deleted.size) -
                deleted.size
            ),
            items: (category.items ?? []).filter(
              (currentItem) => !deleted.has(String(currentItem.id))
            ),
          };
        })
      );
      setSelectedItemIds((current) => {
        const next = new Set(current);
        deleted.forEach((itemId) => next.delete(itemId));
        return next;
      });
      setItemDeleteDialog({ open: false, payload: null, isDeleting: false });
      emitInventoryChange({
        entity: "item",
        action: "deleted",
        ids: itemIds,
      });
      router.refresh();
    } catch (err) {
      console.error("delete area detail item error:", err);
      setItemDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const confirmMove = async () => {
    if (!canEditInventory) return;
    const { sourceCategoryId, targetAreaId, targetCategoryId, itemIds } = moveModal;
    if (!targetCategoryId || itemIds.length === 0) return;
    if (String(targetCategoryId) === String(sourceCategoryId)) return;

    const moved = new Set(itemIds.map(String));
    const sourceCategory = categories.find(
      (category) => String(category.id) === String(sourceCategoryId)
    );
    const movedItems = (sourceCategory?.items ?? []).filter((item) =>
      moved.has(String(item.id))
    );

    const result = await updateItemsLocation(itemIds, {
      categoryId: targetCategoryId,
    });

    if (result?.error) {
      console.error("move area detail item errors:", result);
      return;
    }

    setCategories((prev) =>
      prev.map((category) => {
        if (String(category.id) === String(sourceCategoryId)) {
          return {
            ...category,
            itemsCount: Math.max(
              0,
              (category.itemsCount ?? category.items?.length ?? moved.size) - moved.size
            ),
            items: (category.items ?? []).filter(
              (item) => !moved.has(String(item.id))
            ),
          };
        }

        if (
          String(targetAreaId) === String(area?.id) &&
          String(category.id) === String(targetCategoryId)
        ) {
          return {
            ...category,
            itemsCount:
              (category.itemsCount ?? category.items?.length ?? 0) + moved.size,
            items: category.itemsLoaded
              ? [
                  ...(category.items ?? []),
                  ...movedItems.map((item) => ({
                    ...item,
                    category_id: targetCategoryId,
                  })),
                ]
              : category.items ?? [],
          };
        }

        return category;
      })
    );
    setSelectedItemIds((current) => {
      const next = new Set(current);
      moved.forEach((itemId) => next.delete(itemId));
      return next;
    });
    setMoveModal({
      open: false,
      sourceAreaId: area?.id ?? null,
      sourceCategoryId: null,
      targetLocationId: area?.location?.id ?? null,
      targetAreaId: area?.id ?? null,
      targetCategoryId: null,
      itemIds: [],
    });
    emitInventoryChange({
      entity: "item",
      action: "moved",
      ids: itemIds,
    });
    router.refresh();
  };

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
      sortCategoriesForDisplay([...prev, optimistic], sortBy)
    );
    setTotalCategoryCount((current) => current + 1);
    setNewCategory("");

    try {
      const result = await addCategory(area.id, name);

      if (result?.error) {
        throw result.error;
      }

      const created = result?.data;
      if (!created?.id) throw new Error("Category create failed: no id returned");
      let uploadedImage = null;

      if (newCategoryImageFile) {
        const formData = new FormData();
        formData.append("image", newCategoryImageFile);
        const imageResult = await uploadInventoryImage("category", created.id, formData);
        if (imageResult?.error) {
          setNewCategoryImageMessage(
            typeof imageResult.error === "string"
              ? imageResult.error
              : "Category was added, but the photo could not be uploaded."
          );
        } else {
          uploadedImage = imageResult?.data ?? null;
        }
      }

      setCategories((prev) =>
        sortCategoriesForDisplay(
          prev.map((c) =>
            c.id === tempId
              ? {
                  id: created.id,
                  name: created.name,
                  image_path: uploadedImage?.imagePath ?? created.image_path ?? null,
                  imageUrl: uploadedImage?.imageUrl ?? null,
                  imageThumbUrl: uploadedImage?.imageThumbUrl ?? null,
                  itemsCount: 0,
                }
              : c
          ),
          sortBy
        )
      );
      emitInventoryChange({
        entity: "category",
        action: "added",
        id: created.id,
      });
      setMobileAddOpen(false);
      clearNewCategoryImageFile();
    } catch (e) {
      console.error("addCategory failed:", e);

      // rollback optimistic
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      setTotalCategoryCount((current) => Math.max(0, current - 1));
      alert("Failed to add category. Please try again.");
      setNewCategory(name);
    } finally {
      setIsSaving(false);
    }
  };

  const selectNewCategoryImageFile = (file) => {
    const imageError = validateImageFile(file);
    if (imageError) {
      setNewCategoryImageMessage(imageError);
      return;
    }

    setNewCategoryImageFile(file ?? null);
    setNewCategoryImageMessage("");
    setNewCategoryImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const clearNewCategoryImageFile = () => {
    setNewCategoryImageFile(null);
    setNewCategoryImageMessage("");
    setNewCategoryImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return null;
    });
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
      sortCategoriesForDisplay(
        prev.map((c) => (c.id === id ? { ...c, name } : c)),
        sortBy
      )
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
        sortCategoriesForDisplay(
          prev.map((c) => (c.id === id ? { ...c, name: prevName || c.name } : c)),
          sortBy
        )
      );

      alert("Failed to rename category. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategoryCollapsed = (categoryId) => {
    const key = String(categoryId);
    const isCollapsed = collapsedCategoryIds.has(key);
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (isCollapsed) {
      void loadCategoryItems(categoryId);
    }
  };

  useEffect(() => {
    if (!normalizedSearch) return;
    filtered.forEach((category) => {
      void loadCategoryItems(category.id);
    });
  }, [filtered, loadCategoryItems, normalizedSearch]);

  const clearSelection = () => {
    setSelectedCategoryIds(new Set());
  };

  const clearSearch = () => {
    setIsLoadingCategories(true);
    setSearch("");
    setCurrentPage(1);
  };

  const handleSearchChange = useCallback(
    (value) => {
      if (normalizedSearch && !value.trim() && filtered.length === 0) {
        setIsLoadingCategories(true);
      }
      setSearch(value);
      setCurrentPage(1);
    },
    [filtered.length, normalizedSearch]
  );

  const toggleSelectCategory = (categoryId) => {
    if (!canEditInventory) return;
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      const key = String(categoryId);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (!canEditInventory) return;
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        filtered.forEach((category) => next.delete(String(category.id)));
      } else {
        filtered.forEach((category) => next.add(String(category.id)));
      }

      return next;
    });
  };

  const openBulkDelete = () => {
    if (!canEditInventory || selectedCategoryIds.size === 0) return;

    setDeleteModal({
      open: true,
      mode: "bulk",
      id: null,
      name: "",
      categoryIds: Array.from(selectedCategoryIds),
      count: selectedCategoryIds.size,
      busy: false,
    });
  };

  const focusDesktopAddCategory = () => {
    const input = document.getElementById("area-detail-new-category");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  };

  const handleCategoryImageChange = ({ imageUrl, imageThumbUrl }) => {
    const id = renameModal.id;
    if (!id) return;

    setRenameModal((prev) => ({ ...prev, imageUrl: imageUrl ?? null }));
    setCategories((prev) =>
      prev.map((category) =>
        String(category.id) === String(id)
          ? {
              ...category,
              imageUrl: imageUrl ?? null,
              imageThumbUrl: imageThumbUrl ?? null,
            }
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
    const isBulk = deleteModal.mode === "bulk";
    const ids = isBulk
      ? (deleteModal.categoryIds ?? []).map(String).filter(Boolean)
      : deleteModal.id
        ? [String(deleteModal.id)]
        : [];
    if (ids.length === 0) return;

    setDeleteModal((p) => ({ ...p, busy: true }));

    // optimistic remove
    const snapshot = categories;
    const deletedIds = new Set(ids);
    setCategories((prev) => prev.filter((c) => !deletedIds.has(String(c.id))));
    setTotalCategoryCount((current) => Math.max(0, current - deletedIds.size));

    try {
      const results = await Promise.all(ids.map((id) => deleteCategory(id)));
      const failed = results.find((result) => result?.error);
      if (failed?.error) throw failed.error;

      setDeleteModal({
        open: false,
        mode: "single",
        id: null,
        name: "",
        categoryIds: [],
        count: 0,
        busy: false,
      });
      if (isBulk) clearSelection();
      emitInventoryChange({
        entity: "category",
        action: "deleted",
        ...(isBulk ? { ids } : { id: ids[0] }),
      });
    } catch (e) {
      console.error("deleteCategory failed:", e);

      // rollback
      setCategories(snapshot);
      setTotalCategoryCount((current) => current + deletedIds.size);
      setDeleteModal((p) => ({ ...p, busy: false }));

      alert(
        isBulk
          ? "Failed to delete selected categories. Please try again."
          : "Failed to delete category. Please try again."
      );
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
              <ImageWithLoader
                src={areaImageUrl}
                alt=""
                loading="eager"
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
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
                <InlineButton
                  className="min-h-10 border border-[var(--stocksense-brand-border)] bg-white px-3 text-[var(--stocksense-brand)]"
                  onClick={() => {
                    setEditAreaName(areaName);
                    setEditAreaOpen(true);
                  }}
                >
                  <FaEdit className="h-3.5 w-3.5" />
                  Edit area
                </InlineButton>
                <InlineButton
                  className="min-h-10 border border-rose-200 bg-rose-50 px-3 text-rose-700"
                  onClick={() => setDeleteAreaOpen(true)}
                >
                  <FaTrash className="h-3.5 w-3.5" />
                  Delete
                </InlineButton>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <motion.section variants={pageItemVariants} className="max-md:hidden">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link
            href="/areas"
            className="inline-flex items-center gap-2 hover:text-[var(--stocksense-brand)]"
          >
            Storage Areas
          </Link>
          <FaChevronRight className="h-3 w-3 text-gray-300" />
          {area?.location?.id ? (
            <Link
              href={`/locations/${area.location.id}`}
              className="text-gray-600 hover:text-[var(--stocksense-brand)]"
            >
              {area.location.name || "Location"}
            </Link>
          ) : (
            <span className="text-gray-600">
              {area?.location?.name || "Location"}
            </span>
          )}
          <FaChevronRight className="h-3 w-3 text-gray-300" />
          <span className="font-medium text-gray-800">{areaName || "Storage Area"}</span>
        </div>

        <header className="mt-4 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {areaImageUrl ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white shadow-sm">
                <ImageWithLoader
                  src={areaImageUrl}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] shadow-sm">
                <FaWarehouse className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                STORAGE AREA
              </p>
              <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-gray-950">
                {areaName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Everything organized in this space.
              </p>
              <p className="mt-2 text-sm font-medium text-gray-500">
                {formatCount(totals.categories, "category", "categories")} &bull;{" "}
                {formatCount(totals.items, "item")}
              </p>
            </div>
          </div>

          {canEditInventory && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <InlineButton
                className="min-h-10 border border-[var(--stocksense-brand-border)] bg-white px-3 text-[var(--stocksense-brand)]"
                onClick={() => {
                  setEditAreaName(areaName);
                  setEditAreaOpen(true);
                }}
              >
                <FaEdit className="h-3.5 w-3.5" />
                Edit
              </InlineButton>
              <InlineButton
                className="min-h-10 border border-rose-200 bg-rose-50 px-3 text-rose-700"
                onClick={() => setDeleteAreaOpen(true)}
              >
                <FaTrash className="h-3.5 w-3.5" />
                Delete
              </InlineButton>
            </div>
          )}
        </header>
      </motion.section>

      <motion.section
        variants={pageItemVariants}
        className="grid gap-4 sm:grid-cols-2 max-md:hidden"
      >
        <div className="flex items-center gap-4 rounded-[1.35rem] border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-md">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
            <FaTags className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-950">Categories</h2>
            <p className="text-3xl font-semibold tracking-tight text-gray-950">
              {totals.categories.toLocaleString()}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Groups inside this storage area
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[1.35rem] border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-md">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
            <FaBoxOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-950">Items</h2>
            <p className="text-3xl font-semibold tracking-tight text-gray-950">
              {totals.items.toLocaleString()}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Stored in this area
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={pageItemVariants}
        className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm max-md:hidden"
      >
        <div className="flex flex-col gap-3">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search categories or items..."
            className="w-full max-w-md"
          />
          <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <NativeSelect
              aria-label="Sort categories"
              value={sortBy}
              onChange={(value) => setSortBy(value || "name_asc")}
              options={SORT_SELECT_OPTIONS}
              className="w-full sm:w-40"
            />
            {canEditInventory && (
              <InlineButton
                className="min-h-10 border border-[var(--stocksense-brand-border)] bg-white px-3 text-[var(--stocksense-brand)]"
                onClick={focusDesktopAddCategory}
              >
                <FaPlus className="h-3.5 w-3.5" />
                Add Category
              </InlineButton>
            )}
          </div>
        </div>
      </motion.section>

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
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search categories"
          className="mt-3 min-h-11"
        />
        <NativeSelect
          aria-label="Sort categories"
          value={sortBy}
          onChange={(value) => setSortBy(value || "name_asc")}
          options={SORT_SELECT_OPTIONS}
          className="mt-3"
        />
      </motion.section>

      {categoriesError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {categoriesError}
        </div>
      ) : null}

      <section className="grid gap-3 md:hidden">
        <AnimatePresence initial={false}>
          {canEditInventory && selectionMode ? (
            <motion.div
              key="area-detail-mobile-category-selection"
              initial={{ opacity: 0, y: -6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="sticky top-[4.75rem] z-[70] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
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
                  onClick={clearSelection}
                  className="min-h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  disabled={filtered.length === 0 || deleteModal.busy}
                  className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] disabled:opacity-50"
                >
                  {allVisibleSelected ? "Deselect visible" : "Select visible"}
                </button>
                <span className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500">
                  {filtered.length} visible
                </span>
              </div>

              <InlineButton
                className="mt-2 min-h-11 w-full bg-rose-600 px-3 text-white"
                onClick={openBulkDelete}
                disabled={selectedCount === 0 || deleteModal.busy}
              >
                Delete
              </InlineButton>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <PaginationControls
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={totalCategoryCount}
          isLoading={isLoadingCategories}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        />
        {filtered.map((cat) => {
          const selected = selectedCategoryIds.has(String(cat.id));

          return (
          <article
            key={cat.id}
            className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
              selected
                ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                : "border-gray-200"
            }`}
          >
            <div className="flex min-h-[96px] w-full items-center gap-4 p-4 text-left">
              <button
                type="button"
                onClick={() => {
                  if (selectionMode) {
                    toggleSelectCategory(cat.id);
                    return;
                  }
                  router.push(`/categories/${cat.id}`);
                }}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
              >
                {cat.imageUrl ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-category-border)] bg-white">
                    <ImageWithLoader src={cat.imageThumbUrl || cat.imageUrl} alt="" className="h-full w-full object-cover" />
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
              </button>

              {canEditInventory && (
                <ActionMenu
                  ariaLabel={`${cat.name} actions`}
                  items={[
                    {
                      key: "select",
                      label: selected
                        ? "Deselect for bulk action"
                        : "Select for bulk action",
                      onSelect: () => toggleSelectCategory(cat.id),
                    },
                    {
                      key: "edit",
                      label: "Edit Category",
                      onSelect: () =>
                        setRenameModal({
                          open: true,
                          id: cat.id,
                          name: cat.name,
                          imageUrl: cat.imageUrl ?? null,
                        }),
                    },
                    {
                      key: "delete",
                      label: "Delete Category",
                      danger: true,
                      onSelect: () =>
                        setDeleteModal({
                          open: true,
                          mode: "single",
                          id: cat.id,
                          name: cat.name,
                          categoryIds: [],
                          count: 0,
                          busy: false,
                        }),
                    },
                  ]}
                />
              )}
            </div>
          </article>
          );
        })}

        {filtered.length === 0 && (
          showSearchRestoreLoader ? (
            <SearchResultsLoadingState
              label="Loading categories"
              detail="Restoring all categories in this storage area."
            />
          ) : (
          <div className={`rounded-2xl bg-white px-5 py-7 text-center shadow-sm ${
            hasActiveSearch
              ? "border border-[var(--stocksense-brand-border)]"
              : "border border-dashed border-gray-200"
          }`}>
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border ${
              hasActiveSearch
                ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                : "border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]"
            }`}>
              {hasActiveSearch ? (
                <FaSearch className="h-5 w-5" />
              ) : (
                <FaTag className="h-6 w-6" />
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              {hasActiveSearch ? "No matching categories" : "No categories found"}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-gray-500">
              {hasActiveSearch
                ? `Nothing matched "${search.trim()}". Clear the search or try another category name.`
                : canEditInventory
                  ? "Add a new category to organize this storage area."
                  : "No categories are available."}
            </p>
            {hasActiveSearch ? (
              <InlineButton
                className="mt-5 min-h-10 w-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 text-[var(--stocksense-brand)]"
                onClick={clearSearch}
              >
                Clear search
              </InlineButton>
            ) : null}
          </div>
          )
        )}
        <PaginationControls
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={totalCategoryCount}
          isLoading={isLoadingCategories}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        />
      </section>

      <motion.section variants={pageItemVariants} className="space-y-5 max-md:hidden">
        {filtered.length > 0 ? (
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalCategoryCount}
            isLoading={isLoadingCategories}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          />
        ) : null}

        {canEditInventory && selectionMode ? (
          <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--stocksense-brand)]">
                  {selectedCount} categor{selectedCount === 1 ? "y" : "ies"} selected
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Use the actions below or select more categories from the menu.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <InlineButton
                  className="min-h-10 border border-[var(--stocksense-brand-border)] bg-white px-3 text-[var(--stocksense-brand)]"
                  onClick={toggleSelectAllVisible}
                  disabled={filtered.length === 0 || deleteModal.busy}
                >
                  {allVisibleSelected ? "Deselect visible" : "Select visible"}
                </InlineButton>
                <InlineButton
                  className="min-h-10 bg-white px-3 text-gray-700"
                  onClick={clearSelection}
                  disabled={deleteModal.busy}
                >
                  Cancel
                </InlineButton>
                <InlineButton
                  className="min-h-10 bg-rose-600 px-3 text-white"
                  onClick={openBulkDelete}
                  disabled={selectedCount === 0 || deleteModal.busy}
                >
                  Delete selected
                </InlineButton>
              </div>
            </div>
          </div>
        ) : null}

        {showSearchRestoreLoader ? (
          <SearchResultsLoadingState
            label="Loading categories"
            detail="Restoring all categories in this storage area."
            className="px-6 py-12"
          />
        ) : filtered.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--stocksense-brand-border)] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
              {hasActiveSearch ? (
                <FaSearch className="h-7 w-7" />
              ) : (
                <FaTags className="h-8 w-8" />
              )}
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-gray-950">
              {hasActiveSearch ? "No matching categories" : "No categories yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
              {hasActiveSearch
                ? `Nothing matched "${search.trim()}". Clear the search to see categories again.`
                : "Create categories to organize the items stored here."}
            </p>
            {hasActiveSearch ? (
              <InlineButton
                className="mt-7 min-h-10 border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-5 text-[var(--stocksense-brand)] shadow-sm"
                onClick={clearSearch}
              >
                Clear search
              </InlineButton>
            ) : canEditInventory ? (
              <div className="mx-auto mt-7 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                <TextInput
                  id="area-detail-new-category"
                  value={newCategory}
                  onChange={setNewCategory}
                  placeholder="Category name"
                  className="sm:max-w-xs"
                  disabled={isSaving}
                />
                <InlineButton
                  className="min-h-10 bg-[var(--stocksense-brand)] px-5 text-white shadow-sm"
                  onClick={handleAddCategory}
                  disabled={isSaving || !newCategory.trim()}
                >
                  {!isSaving ? <FaPlus className="h-3.5 w-3.5" /> : null}
                  {isSaving ? "Adding..." : "Add Category"}
                </InlineButton>
              </div>
            ) : null}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((cat, idx) => {
              const items = cat.items ?? [];
              const collapsed = collapsedCategoryIds.has(String(cat.id));
              const selected = selectedCategoryIds.has(String(cat.id));
              const categoryItemIds = items.map((item) => String(item.id));
              const selectedCategoryItemCount = categoryItemIds.filter((itemId) =>
                selectedItemIds.has(itemId)
              ).length;
              const selectedCategoryItemIds = categoryItemIds.filter((itemId) =>
                selectedItemIds.has(itemId)
              );
              const allCategoryItemsSelected =
                categoryItemIds.length > 0 &&
                selectedCategoryItemCount === categoryItemIds.length;

              return (
                <motion.article
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className={`group overflow-hidden rounded-[1.5rem] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-lg ${
                    selected
                      ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                      : "border-white/70"
                  }`}
                >
                  <div className="border-b border-gray-100 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {canEditInventory && selectionMode ? (
                          <label
                            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelectCategory(cat.id)}
                              aria-label={`Select ${cat.name}`}
                              className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[var(--stocksense-brand)] accent-[var(--stocksense-brand)] focus:ring-[var(--stocksense-brand-border)]"
                            />
                          </label>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleCategoryCollapsed(cat.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          aria-expanded={!collapsed}
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                            {collapsed ? (
                              <FaChevronRight className="h-3.5 w-3.5" />
                            ) : (
                              <FaChevronRight className="h-3.5 w-3.5 rotate-90 transition" />
                            )}
                          </span>
                          {cat.imageUrl ? (
                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white">
                              <ImageWithLoader
                                src={cat.imageThumbUrl || cat.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </span>
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                              <FaTag className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-xl font-semibold leading-7 text-gray-950">
                              {cat.name}
                            </span>
                            <span className="mt-1 block text-sm font-medium text-gray-500">
                              {formatCount(cat.itemsCount ?? items.length, "item")}
                            </span>
                          </span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <ActionMenu
                          ariaLabel={`${cat.name} actions`}
                          disabled={isSaving}
                          items={[
                            {
                              key: "view",
                              label: "View Items",
                              onSelect: () => router.push(`/categories/${cat.id}`),
                            },
                            canEditInventory
                              ? {
                                  key: "select",
                                  label: selected
                                    ? "Deselect for bulk action"
                                    : "Select for bulk action",
                                  onSelect: () => toggleSelectCategory(cat.id),
                                }
                              : null,
                            canEditInventory
                              ? {
                                  key: "edit",
                                  label: "Edit Category",
                                  onSelect: () =>
                                    setRenameModal({
                                      open: true,
                                      id: cat.id,
                                      name: cat.name,
                                      imageUrl: cat.imageUrl ?? null,
                                    }),
                                }
                              : null,
                            canEditInventory
                              ? {
                                  key: "delete",
                                  label: "Delete Category",
                                  danger: true,
                                  onSelect: () =>
                                    setDeleteModal({
                                      open: true,
                                      mode: "single",
                                      id: cat.id,
                                      name: cat.name,
                                      categoryIds: [],
                                      count: 0,
                                      busy: false,
                                    }),
                                }
                              : null,
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        variants={collapseVariants}
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        className="overflow-hidden"
                      >
                    <div className="bg-gray-50/60 px-5 py-4">
                      {cat.itemsLoading ? (
                        <SearchResultsLoadingState
                          label="Loading items"
                          detail="Fetching this category."
                          className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-white px-5 py-8"
                        />
                      ) : cat.itemsError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                          {cat.itemsError}
                        </div>
                      ) : items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-white px-5 py-8 text-center">
                          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                            <FaBoxOpen className="h-5 w-5" />
                          </div>
                          <h3 className="mt-4 text-base font-semibold text-gray-950">
                            No items yet
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Add your first item to this category.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {canEditInventory && itemSelectionMode ? (
                            <div className="mb-3 rounded-2xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[var(--entity-item-accent)]">
                                    {selectedCategoryItemCount} of {categoryItemIds.length} visible item{categoryItemIds.length === 1 ? "" : "s"} selected
                                  </p>
                                  <p className="mt-0.5 text-xs text-gray-600">
                                    Use checkboxes to adjust items in {cat.name}.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <InlineButton
                                    className="min-h-10 border border-[var(--entity-item-border)] bg-white px-3 text-[var(--entity-item-accent)]"
                                    onClick={() =>
                                      setVisibleItemsSelected(
                                        categoryItemIds,
                                        !allCategoryItemsSelected
                                      )
                                    }
                                    disabled={categoryItemIds.length === 0}
                                  >
                                    {allCategoryItemsSelected
                                      ? "Deselect all visible"
                                      : "Select all visible"}
                                  </InlineButton>
                                  <InlineButton
                                    className="min-h-10 bg-white px-3 text-gray-700"
                                    onClick={clearItemSelection}
                                  >
                                    Clear
                                  </InlineButton>
                                  <InlineButton
                                    className="min-h-10 bg-[var(--stocksense-brand)] px-3 text-white"
                                    onClick={() =>
                                      openMoveSelectedItems(
                                        cat,
                                        selectedCategoryItemIds
                                      )
                                    }
                                    disabled={selectedCategoryItemCount === 0}
                                  >
                                    Move
                                  </InlineButton>
                                  <InlineButton
                                    className="min-h-10 bg-rose-600 px-3 text-white"
                                    onClick={() =>
                                      openDeleteSelectedItems(
                                        cat,
                                        selectedCategoryItemIds
                                      )
                                    }
                                    disabled={selectedCategoryItemCount === 0}
                                  >
                                    Delete
                                  </InlineButton>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {items.map((item) => {
                            const expirationDays = daysUntil(item.expiration_date);
                            const expired = expirationDays < 0;
                            const soon =
                              !expired &&
                              item.expiration_date &&
                              isExpiringSoon(item.expiration_date, 7);
                            const quantity = toNonNegativeInteger(item.quantity, 0);
                            const lowStock = quantity <= 1;
                            const itemSelected = selectedItemIds.has(String(item.id));

                            return (
                              <div
                                key={item.id}
                                className={`flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]/25 md:flex-row md:items-center md:justify-between ${
                                  itemSelected
                                    ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                                    : "border-white"
                                }`}
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  {canEditInventory && itemSelectionMode ? (
                                    <label
                                      className="hidden h-6 w-6 shrink-0 cursor-pointer items-center justify-center md:flex"
                                      onClick={(event) => event.stopPropagation()}
                                      onKeyDown={(event) => event.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={itemSelected}
                                        onChange={() => toggleSelectItem(item.id)}
                                        aria-label={`Select ${item.name}`}
                                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[var(--stocksense-brand)] accent-[var(--stocksense-brand)] focus:ring-[var(--stocksense-brand-border)]"
                                      />
                                    </label>
                                  ) : null}
                                  {item.imageUrl ? (
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-white">
                                      <ImageWithLoader
                                        src={item.imageThumbUrl || item.imageUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                                      <FaBoxOpen className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                      <p
                                        className="truncate text-sm font-semibold text-gray-950"
                                        title={item.name}
                                      >
                                        {item.name}
                                      </p>
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
                                    <p className="mt-1 truncate text-xs text-gray-500">
                                      {[area?.location?.name, areaName, cat.name]
                                        .filter(Boolean)
                                        .join(" > ")}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
                                  <span>Qty {quantity}</span>
                                  {item.expiration_date ? (
                                    <span>Expires {formatExpiration(item.expiration_date)}</span>
                                  ) : (
                                    <span>No expiration</span>
                                  )}
                                  {canEditInventory ? (
                                    <ActionMenu
                                      ariaLabel={`${item.name} actions`}
                                      items={[
                                        {
                                          key: "edit",
                                          label: "Edit Item",
                                          onSelect: () => openEditItem(item, cat),
                                        },
                                        {
                                          key: "move",
                                          label: "Move Item",
                                          onSelect: () => openMoveItem(item, cat),
                                        },
                                        {
                                          key: "select",
                                          label: itemSelected
                                            ? "Deselect for bulk action"
                                            : "Select for bulk action",
                                          onSelect: () => toggleSelectItem(item.id),
                                        },
                                        {
                                          key: "delete",
                                          label: "Delete Item",
                                          danger: true,
                                          onSelect: () => openDeleteItem(item, cat),
                                        },
                                      ]}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}

        {canEditInventory && filtered.length > 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/35 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
                  <FaPlus className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-950">
                    Add another category
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Create a new group inside this storage area.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <TextInput
                  id="area-detail-new-category"
                  value={newCategory}
                  onChange={setNewCategory}
                  placeholder="Category name"
                  className="w-full sm:w-72"
                  disabled={isSaving}
                />
                <InlineButton
                  className="min-h-10 bg-[var(--stocksense-brand)] px-5 text-white shadow-sm"
                  onClick={handleAddCategory}
                  disabled={isSaving || !newCategory.trim()}
                >
                  {!isSaving ? <FaPlus className="h-3.5 w-3.5" /> : null}
                  {isSaving ? "Adding..." : "Add Category"}
                </InlineButton>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
                <FaTags className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-950">
                  Tip: Keep categories helpful
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Use categories that make sense for how you naturally organize this storage area.
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--stocksense-brand)]">
                  Breakfast &bull; Cleaning &bull; Baking &bull; Tools &bull; Shelf 1 &bull; Pet Supplies &bull; Left Drawer
                </p>
              </div>
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalCategoryCount}
            isLoading={isLoadingCategories}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          />
        ) : null}
      </motion.section>

      {canEditInventory &&
        (mobileAddOpen || editAreaOpen || renameModal.open) && (
          <AreaDetailModals
            mobileAddOpen={mobileAddOpen}
            setMobileAddOpen={setMobileAddOpen}
            editAreaOpen={editAreaOpen}
            setEditAreaOpen={setEditAreaOpen}
            renameModal={renameModal}
            setRenameModal={setRenameModal}
            isSaving={isSaving}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            areaName={areaName}
            newCategoryImageFile={newCategoryImageFile}
            newCategoryImagePreview={newCategoryImagePreview}
            newCategoryImageMessage={newCategoryImageMessage}
            onSelectNewCategoryImageFile={selectNewCategoryImageFile}
            onClearNewCategoryImageFile={clearNewCategoryImageFile}
            onAddCategory={handleAddCategory}
            editAreaName={editAreaName}
            setEditAreaName={setEditAreaName}
            areaId={area?.id}
            areaImageUrl={areaImageUrl}
            onRenameArea={handleRenameArea}
            onAreaImageChange={handleAreaImageChange}
            onRequestDeleteArea={() => setDeleteAreaOpen(true)}
            onRenameCategory={handleRename}
            onCategoryImageChange={handleCategoryImageChange}
            onRequestDeleteCategory={(target) =>
              setDeleteModal({
                open: true,
                mode: "single",
                ...target,
                categoryIds: [],
                count: 0,
                busy: false,
              })
            }
          />
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

      {canEditInventory && itemModal.open && (
        <AreaItemEditModal
          itemModal={itemModal}
          setItemModal={setItemModal}
          isSaving={isSaving}
          onClose={closeItemModal}
          onSave={saveItem}
          onImageChange={handleItemImageChange}
          onDelete={() => {
            const targetCategory = {
              id: itemModal.categoryId,
              name: itemModal.categoryName,
            };
            const targetItem = {
              id: itemModal.itemId,
              name: itemModal.name,
            };
            closeItemModal();
            openDeleteItem(targetItem, targetCategory);
          }}
        />
      )}

      {canEditInventory && moveModal.open && (
        <MoveItemsModal
          moveModal={moveModal}
          setMoveModal={setMoveModal}
          locationsForMove={locationsForMove}
          storageAreas={currentStorageAreas}
          currentLocationId={area?.location?.id ?? null}
          onConfirm={confirmMove}
          isLoadingDestinations={isLoadingMoveDestinations}
          destinationsError={moveDestinationsError}
          onRetryLoadDestinations={() => loadMoveDestinations({ force: true })}
        />
      )}

      {canEditInventory && (
        <ConfirmDeleteModal
          isOpen={itemDeleteDialog.open}
          isDeleting={itemDeleteDialog.isDeleting}
          onCancel={() =>
            setItemDeleteDialog({
              open: false,
              payload: null,
              isDeleting: false,
            })
          }
          onConfirm={confirmDeleteItem}
          title={
            itemDeleteDialog.payload?.itemIds?.length
              ? `Delete ${itemDeleteDialog.payload.count ?? itemDeleteDialog.payload.itemIds.length} item${
                  (itemDeleteDialog.payload.count ?? itemDeleteDialog.payload.itemIds.length) === 1
                    ? ""
                    : "s"
                }?`
              : `Delete "${itemDeleteDialog.payload?.name ?? "item"}"?`
          }
          description={
            itemDeleteDialog.payload?.itemIds?.length
              ? `This will permanently delete ${
                  itemDeleteDialog.payload.count ?? itemDeleteDialog.payload.itemIds.length
                } selected item${
                  (itemDeleteDialog.payload.count ?? itemDeleteDialog.payload.itemIds.length) === 1
                    ? ""
                    : "s"
                } from ${
                  itemDeleteDialog.payload?.categoryName ?? "this category"
                }. This cannot be undone.`
              : `This will permanently delete "${
                  itemDeleteDialog.payload?.name ?? "this item"
                }" from ${
                  itemDeleteDialog.payload?.categoryName ?? "this category"
                }. This cannot be undone.`
          }
        />
      )}

      {canEditInventory && (
        <ConfirmDeleteModal
          isOpen={deleteModal.open}
          isDeleting={deleteModal.busy || isSaving}
          onCancel={() =>
            setDeleteModal({
              open: false,
              mode: "single",
              id: null,
              name: "",
              categoryIds: [],
              count: 0,
              busy: false,
            })
          }
          onConfirm={handleDelete}
          title={
            deleteModal.mode === "bulk"
              ? `Delete ${deleteModal.count ?? 0} categor${
                  deleteModal.count === 1 ? "y" : "ies"
                }?`
              : deleteModal.name
              ? `Delete category "${deleteModal.name}"?`
              : "Delete category?"
          }
          description={
            deleteModal.mode === "bulk"
              ? `This will remove ${deleteModal.count ?? 0} selected categor${
                  deleteModal.count === 1 ? "y" : "ies"
                } and all items inside them. This cannot be undone.`
              : `This will remove "${
                  deleteModal.name || "this category"
                }" and all items inside it. This cannot be undone.`
          }
          confirmLabel={
            deleteModal.mode === "bulk" ? "Delete selected" : "Delete category"
          }
          cancelLabel={deleteModal.mode === "bulk" ? "Keep categories" : "Keep category"}
        />
      )}
    </motion.div>
  );
}
