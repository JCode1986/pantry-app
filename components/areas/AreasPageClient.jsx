"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "@/components/ui/MotionLite";
import {
  FaBoxOpen,
  FaChevronRight,
  FaMapMarkedAlt,
  FaPlus,
  FaSearch,
  FaTags,
  FaTimes,
  FaTrash,
  FaWarehouse,
} from "react-icons/fa";
import NativeDropdown from "@/components/ui/NativeDropdown";
import NativeSelect from "@/components/ui/NativeSelect";
import {
  addStorageArea,
  deleteStorageArea,
  getStorageAreasPageAction,
  updateStorageArea,
  uploadInventoryImage,
} from "@/app/actions/server";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { emitInventoryChange } from "@/utils/clientEvents";
import PaginationControls from "@/components/ui/PaginationControls";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import SearchResultsLoadingState from "@/components/ui/SearchResultsLoadingState";

const AreaCreateModal = dynamic(
  () => import("@/components/areas/AreaCreateModal"),
  { ssr: false }
);
const AreaDrawer = dynamic(
  () => import("@/components/areas/AreaDrawer"),
  { ssr: false }
);
const ConfirmDeleteModal = dynamic(
  () => import("@/components/modals/ConfirmDeleteModal"),
  { ssr: false }
);

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

const AREAS_PAGE_SIZE = 24;
const ALL_FILTER_KEY = "all";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const SORT_OPTIONS = [
  ["name_asc", "A-Z"],
  ["name_desc", "Z-A"],
  ["newest", "Newest"],
  ["oldest", "Oldest"],
];

function getSortTimestamp(entry) {
  const time = new Date(entry?.created_at ?? entry?.createdAt ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortAreasForDisplay(items, sortBy) {
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

function formatRelativeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function validateImageFile(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.has(file.type)) {
    return "Choose a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "Images must be 5 MB or smaller.";
  }
  return "";
}

export default function AreasPageClient({
  initialAreas,
  initialTotalAreas = initialAreas?.length ?? 0,
  filterLocations = [],
  canEditInventory = true,
}) {
  const router = useRouter();
  const [areas, setAreas] = useState(initialAreas ?? []);
  const [totalAreaCount, setTotalAreaCount] = useState(initialTotalAreas);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [locationFilter, setLocationFilter] = useState(ALL_FILTER_KEY);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [areasError, setAreasError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState(null);

  const [renameValue, setRenameValue] = useState("");
  const [isRenamingArea, setIsRenamingArea] = useState(false);
  const [createAreaOpen, setCreateAreaOpen] = useState(false);
  const [createAreaName, setCreateAreaName] = useState("");
  const [createAreaLocationId, setCreateAreaLocationId] = useState("");
  const [createAreaImageFile, setCreateAreaImageFile] = useState(null);
  const [createAreaImagePreview, setCreateAreaImagePreview] = useState(null);
  const [createAreaImageMessage, setCreateAreaImageMessage] = useState("");
  const [isCreatingArea, setIsCreatingArea] = useState(false);

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
    return () => {
      if (createAreaImagePreview) URL.revokeObjectURL(createAreaImagePreview);
    };
  }, [createAreaImagePreview]);

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.storageAreaId) return;

      setAreas((prev) => {
        const existingArea = prev.find(
          (area) => String(area.id) === String(item.storageAreaId)
        );

        if (!existingArea) {
          return sortAreasForDisplay([
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
          ], sortBy);
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
  }, [sortBy]);

  const normalizedSearch = search.trim().toLowerCase();
  const areasLoadRequestIdRef = useRef(0);
  const loadAreasPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, page);
      const requestId = areasLoadRequestIdRef.current + 1;
      areasLoadRequestIdRef.current = requestId;
      setIsLoadingAreas(true);
      setAreasError("");

      try {
        const result = await getStorageAreasPageAction({
          offset: (safePage - 1) * AREAS_PAGE_SIZE,
          limit: AREAS_PAGE_SIZE,
          filters: {
            search: normalizedSearch,
            sortBy,
            locationId: locationFilter === ALL_FILTER_KEY ? null : locationFilter,
          },
        });

        if (result?.error) {
          if (requestId === areasLoadRequestIdRef.current) {
            setAreasError(result.error);
          }
          return;
        }

        if (requestId !== areasLoadRequestIdRef.current) return;

        const nextAreas = result?.data?.items ?? [];
        const nextTotal = result?.data?.totalCount ?? 0;
        setAreas(nextAreas);
        setTotalAreaCount(nextTotal);

        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / AREAS_PAGE_SIZE));
        if (safePage > nextTotalPages) setCurrentPage(nextTotalPages);
      } catch (error) {
        if (requestId === areasLoadRequestIdRef.current) {
          setAreasError(error?.message || "Could not load storage areas.");
        }
      } finally {
        if (requestId === areasLoadRequestIdRef.current) {
          setIsLoadingAreas(false);
        }
      }
    },
    [locationFilter, normalizedSearch, sortBy]
  );

  const initialLoadSkippedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadSkippedRef.current) {
      initialLoadSkippedRef.current = true;
      return;
    }

    void loadAreasPage(currentPage);
  }, [currentPage, loadAreasPage, refreshNonce]);

  useEffect(() => {
    setCurrentPage(1);
    clearSelection();
  }, [locationFilter, normalizedSearch, sortBy]);

  const filtered = areas ?? [];
  const showSearchRestoreLoader =
    isLoadingAreas && !normalizedSearch && filtered.length === 0;

  const selectedCount = selectedIds.size;
  const selectionMode = selectedCount > 0;
  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((area) => selectedIds.has(String(area.id)));
  const totalPages = Math.max(1, Math.ceil(totalAreaCount / AREAS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem =
    totalAreaCount === 0 ? 0 : (safeCurrentPage - 1) * AREAS_PAGE_SIZE + 1;
  const endItem = Math.min(
    (safeCurrentPage - 1) * AREAS_PAGE_SIZE + filtered.length,
    totalAreaCount
  );
  const totalCategories = areas.reduce(
    (sum, area) => sum + (area.categoriesCount ?? 0),
    0
  );
  const totalItems = areas.reduce(
    (sum, area) => sum + (area.itemsCount ?? 0),
    0
  );
  const totalLocations = new Set(
    areas.map((area) => area.location?.id ?? area.location?.name).filter(Boolean)
  ).size;
  const summaryCards = [
    {
      label: "Storage Areas",
      value: totalAreaCount,
      description: "Shelves, closets, bins",
      icon: FaWarehouse,
    },
    {
      label: "Locations",
      value: totalLocations,
      description: "Spaces with storage",
      icon: FaMapMarkedAlt,
    },
    {
      label: "Categories",
      value: totalCategories,
      description: "Groups inside areas",
      icon: FaTags,
    },
    {
      label: "Items",
      value: totalItems,
      description: "Tracked household items",
      icon: FaBoxOpen,
    },
  ];
  const hasActiveFilters =
    Boolean(normalizedSearch) || locationFilter !== ALL_FILTER_KEY;

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

  const clearSearch = () => {
    setIsLoadingAreas(true);
    setSearch("");
    setCurrentPage(1);
  };

  const handleSearchChange = useCallback(
    (value) => {
      if (normalizedSearch && !value.trim() && filtered.length === 0) {
        setIsLoadingAreas(true);
      }
      setSearch(value);
      setCurrentPage(1);
    },
    [filtered.length, normalizedSearch]
  );

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

  const defaultCreateAreaLocationId = () => {
    if (locationFilter !== ALL_FILTER_KEY) return locationFilter;
    return filterLocations[0]?.id ? String(filterLocations[0].id) : "";
  };

  const openCreateAreaModal = () => {
    if (!canEditInventory) return;
    setCreateAreaName("");
    setCreateAreaLocationId(defaultCreateAreaLocationId());
    setCreateAreaImageFile(null);
    setCreateAreaImagePreview(null);
    setCreateAreaImageMessage("");
    setCreateAreaOpen(true);
  };

  const closeCreateAreaModal = () => {
    if (isCreatingArea) return;
    setCreateAreaOpen(false);
    setCreateAreaName("");
    setCreateAreaLocationId("");
    setCreateAreaImageFile(null);
    setCreateAreaImagePreview(null);
    setCreateAreaImageMessage("");
  };

  const selectCreateAreaImageFile = (file) => {
    const imageError = validateImageFile(file);
    if (imageError) {
      setCreateAreaImageMessage(imageError);
      return;
    }

    setCreateAreaImageFile(file ?? null);
    setCreateAreaImageMessage("");
    setCreateAreaImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const clearCreateAreaImageFile = () => {
    setCreateAreaImageFile(null);
    setCreateAreaImageMessage("");
    setCreateAreaImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return null;
    });
  };

  const uploadCreatedAreaImage = async (areaId) => {
    if (!createAreaImageFile || !areaId) return null;

    const formData = new FormData();
    formData.append("image", createAreaImageFile);

    const result = await uploadInventoryImage("storage_area", areaId, formData);
    if (result?.error) {
      const message =
        typeof result.error === "string"
          ? result.error
          : "Storage area was added, but the photo could not be uploaded.";
      setCreateAreaImageMessage(message);
      setAreasError(message);
      return null;
    }

    return result?.data ?? null;
  };

  const handleCreateArea = async () => {
    if (!canEditInventory || isCreatingArea) return;
    const name = createAreaName.trim();
    const targetLocationId = createAreaLocationId || defaultCreateAreaLocationId();
    if (!name || !targetLocationId) return;

    setIsCreatingArea(true);
    try {
      const result = await addStorageArea(targetLocationId, name);
      if (result?.error) {
        setAreasError(typeof result.error === "string" ? result.error : "Could not add storage area.");
        return;
      }

      const created = result?.data;
      if (!created?.id) return;

      const uploadedImage = await uploadCreatedAreaImage(created.id);

      const location =
        filterLocations.find((entry) => String(entry.id) === String(targetLocationId)) ??
        null;
      const visibleInCurrentFilter =
        locationFilter === ALL_FILTER_KEY ||
        String(locationFilter) === String(targetLocationId);
      const visibleInCurrentSearch =
        !normalizedSearch || name.toLowerCase().includes(normalizedSearch);

      const visibleInCurrentResults = visibleInCurrentFilter && visibleInCurrentSearch;

      if (visibleInCurrentResults && safeCurrentPage === 1) {
        const nextArea = {
          id: created.id,
          name: created.name ?? name,
          image_path: uploadedImage?.imagePath ?? created.image_path ?? null,
          imageUrl: uploadedImage?.imageUrl ?? null,
          imageThumbUrl: uploadedImage?.imageThumbUrl ?? null,
          created_at: created.created_at ?? null,
          location: {
            id: targetLocationId,
            name: location?.name ?? "Unknown location",
          },
          categories: [],
          categoriesCount: 0,
          itemsCount: 0,
        };

        setAreas((prev) => {
          const next = sortAreasForDisplay(
            [nextArea, ...prev.filter((area) => String(area.id) !== String(created.id))],
            sortBy
          );
          return next.slice(0, AREAS_PAGE_SIZE);
        });
      }

      if (visibleInCurrentResults) {
        setTotalAreaCount((current) => current + 1);
      }
      emitInventoryChange({
        entity: "storage_area",
        action: "added",
        id: created.id,
      });
      setCreateAreaOpen(false);
      setCreateAreaName("");
      clearCreateAreaImageFile();
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setAreasError(error?.message || "Could not add storage area.");
    } finally {
      setIsCreatingArea(false);
    }
  };

  const closeDrawer = () => {
    if (isRenamingArea) return;
    setDrawerOpen(false);
    setActiveAreaId(null);
    setRenameValue("");
  };

  const handleRename = async () => {
    if (!canEditInventory || isRenamingArea) return;
    if (!activeArea) return;
    const name = renameValue.trim();
    if (!name) return;

    setIsRenamingArea(true);
    try {
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
    } finally {
      setIsRenamingArea(false);
    }
  };

  const handleAreaImageChange = ({ imagePath, imageUrl, imageThumbUrl }) => {
    if (!activeArea?.id) return;
    setAreas((prev) =>
      prev.map((area) =>
        area.id === activeArea.id
          ? {
              ...area,
              image_path: imagePath ?? null,
              imageUrl: imageUrl ?? null,
              imageThumbUrl: imageThumbUrl ?? null,
            }
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
      setTotalAreaCount((current) => Math.max(0, current - deleted.size));
      clearSelection();
      if (activeAreaId && deleted.has(String(activeAreaId))) closeDrawer();
      emitInventoryChange({
        entity: "storage_area",
        action: "deleted",
        ids,
      });
      closeDelete();
      setRefreshNonce((current) => current + 1);
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
    setTotalAreaCount((current) => Math.max(0, current - 1));
    emitInventoryChange({
      entity: "storage_area",
      action: "deleted",
      id: areaId,
    });
    closeDelete();
    closeDrawer();
    setRefreshNonce((current) => current + 1);
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

        <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]">
          <FaSearch className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search storage areas"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear storage area search"
              onClick={clearSearch}
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95"
            >
              <FaTimes className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NativeSelect
            aria-label="Filter storage areas by location"
            value={locationFilter}
            onChange={(value) => setLocationFilter(value || ALL_FILTER_KEY)}
            options={[
              { value: ALL_FILTER_KEY, label: "All locations" },
              ...filterLocations.map((location) => ({
                value: String(location.id),
                label: location.name,
              })),
            ]}
          />
          <NativeSelect
            aria-label="Sort storage areas"
            value={sortBy}
            onChange={(value) => setSortBy(value || "name_asc")}
            options={SORT_OPTIONS.map(([value, label]) => ({ value, label }))}
          />
        </div>
      </motion.section>

      {areasError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {areasError}
        </div>
      ) : null}

      <motion.section variants={pageSectionVariants} className="grid gap-3 md:hidden">
        {canEditInventory && selectionMode && (
          <motion.div
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
                className="min-h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.99]"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                disabled={filtered.length === 0 || deleteDialog.isDeleting}
                className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:opacity-85 active:scale-[0.99] disabled:opacity-50"
              >
                {allVisibleSelected ? "Deselect visible" : "Select visible"}
              </button>
              <span className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500">
                {filtered.length} visible
              </span>
            </div>

            <button
              type="button"
              className="mt-2 min-h-11 w-full rounded-xl bg-rose-600 text-sm font-semibold text-white transition hover:opacity-85 active:scale-[0.99] disabled:opacity-50"
              onClick={openBulkDelete}
              disabled={selectedCount === 0 || deleteDialog.isDeleting}
            >
              Delete
            </button>
          </motion.div>
        )}
        {showSearchRestoreLoader ? (
          <SearchResultsLoadingState
            label="Loading storage areas"
            detail="Restoring all storage areas."
          />
        ) : filtered.length === 0 ? (
          <motion.div
            key="mobile-empty"
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className={`rounded-2xl bg-white px-5 py-7 text-center shadow-sm ${
              normalizedSearch
                ? "border border-[var(--stocksense-brand-border)]"
                : "border border-dashed border-gray-200"
            }`}
          >
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border ${
              normalizedSearch
                ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                : "border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]"
            }`}>
              {normalizedSearch ? (
                <FaSearch className="h-5 w-5" />
              ) : (
                <FaWarehouse className="h-6 w-6" />
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              {normalizedSearch ? "No matching storage areas" : "No storage areas found"}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-gray-500">
              {normalizedSearch
                ? `Nothing matched "${search.trim()}". Clear the search or try another area name.`
                : "Try a different filter or add an item to create a storage area."}
            </p>
            {normalizedSearch ? (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:opacity-85 active:scale-[0.99]"
              >
                Clear search
              </button>
            ) : canEditInventory ? (
              <div className="mt-5 flex justify-center">
                <OpenGlobalAddItemButton canEditInventory={canEditInventory} />
              </div>
            ) : null}
          </motion.div>
        ) : (
          filtered.map((area) => (
            <motion.article
              key={area.id}
              layout
              variants={pageItemVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                selectedIds.has(String(area.id))
                  ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                  : "border-gray-200"
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelect(area.id);
                    return;
                  }
                  router.push(`/areas/${area.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  if (selectionMode) {
                    toggleSelect(area.id);
                    return;
                  }
                  router.push(`/areas/${area.id}`);
                }}
                className="flex min-h-[112px] w-full cursor-pointer items-center gap-4 p-4 text-left transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
              >
                {area.imageUrl ? (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-area-border)] bg-white">
                    <ImageWithLoader src={area.imageThumbUrl || area.imageUrl} alt="" className="h-full w-full object-cover" />
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

                {canEditInventory ? (
                  <span
                    className="shrink-0"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <NativeDropdown
                      ariaLabel={`${area.name} actions`}
                      items={[
                        {
                          key: "select",
                          label: selectedIds.has(String(area.id))
                            ? "Deselect for bulk action"
                            : "Select for bulk action",
                          onSelect: () => toggleSelect(area.id),
                        },
                        {
                          key: "edit",
                          label: "Edit Storage Area",
                          onSelect: () => openDrawer(area),
                        },
                        {
                          key: "delete",
                          label: "Delete Storage Area",
                          danger: true,
                          onSelect: () => openDeleteForArea(area),
                        },
                      ]}
                    />
                  </span>
                ) : (
                  <FaChevronRight className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
                )}
              </div>
            </motion.article>
          ))
        )}
        <PaginationControls
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={totalAreaCount}
          isLoading={isLoadingAreas}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        />
      </motion.section>

      <motion.section variants={pageItemVariants} className="max-md:hidden">
        <header className="flex flex-col gap-4 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              STORAGE AREAS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Your storage
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Browse the shelves, closets, drawers, and bins that organize your home.
            </p>
          </div>

          <div className="flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)] sm:w-72">
              <FaSearch className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search storage areas"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              {search ? (
                <button
                  type="button"
                  aria-label="Clear storage area search"
                  onClick={clearSearch}
                  className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95"
                >
                  <FaTimes className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
            <NativeSelect
              aria-label="Filter storage areas by location"
              className="w-full sm:w-48"
              value={locationFilter}
              onChange={(value) => setLocationFilter(value || ALL_FILTER_KEY)}
              options={[
                { value: ALL_FILTER_KEY, label: "All locations" },
                ...filterLocations.map((location) => ({
                  value: String(location.id),
                  label: location.name,
                })),
              ]}
            />
            <NativeSelect
              aria-label="Sort storage areas"
              className="w-full sm:w-40"
              value={sortBy}
              onChange={(value) => setSortBy(value || "name_asc")}
              options={SORT_OPTIONS.map(([value, label]) => ({ value, label }))}
            />
            {canEditInventory && (
              <button
                type="button"
                onClick={openCreateAreaModal}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-85 active:scale-[0.99] sm:w-auto"
              >
                <FaPlus className="h-3.5 w-3.5" />
                Add Storage Area
              </button>
            )}
          </div>
        </header>

        {canEditInventory && <AnimatePresence initial={false}>
          {selectionMode ? (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-5 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-[var(--stocksense-brand)]">
                    Bulk actions for <span className="font-semibold">{selectedCount}</span>{" "}
                    storage area{selectedCount === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    disabled={filtered.length === 0 || deleteDialog.isDeleting}
                    className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--stocksense-brand)] hover:bg-[var(--stocksense-brand-soft)] disabled:opacity-50"
                  >
                    {allVisibleSelected ? "Deselect visible" : "Select visible"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)] active:scale-[0.99] disabled:opacity-50"
                    disabled={deleteDialog.isDeleting}
                    onClick={clearSelection}
                  >
                    Clear selection
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-[0.99] disabled:opacity-50"
                    disabled={deleteDialog.isDeleting}
                    onClick={openBulkDelete}
                  >
                    <FaTrash className="h-3.5 w-3.5" />
                    Delete selected
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>}
      </motion.section>

      <motion.section
        variants={pageItemVariants}
        className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 max-md:hidden"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-[1.35rem] border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-md"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-950">
                  {card.label}
                </h2>
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
      </motion.section>

      <motion.section variants={pageItemVariants} className="mt-5 max-md:hidden">
        {filtered.length > 0 ? (
          <>
            <div className="mb-4">
              <PaginationControls
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                startItem={startItem}
                endItem={endItem}
                totalItems={totalAreaCount}
                isLoading={isLoadingAreas}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            </div>

            <AnimatePresence initial={false}>
              <motion.div
                variants={pageSectionVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3"
              >
                {filtered.map((a) => {
                  const categories = a.categories ?? [];
                  const visibleCategories = categories.slice(0, 3);
                  const moreCategories = Math.max(categories.length - visibleCategories.length, 0);
                  const recentItems = (a.recentItems ?? []).slice(0, 2);
                  const updatedLabel = formatRelativeDate(
                    a.updated_at ?? a.updatedAt ?? a.created_at ?? a.createdAt
                  );

                  return (
                    <motion.article
                      key={a.id}
                      layout
                      variants={pageItemVariants}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                      className={`group relative flex h-full min-h-[29rem] flex-col overflow-hidden rounded-[1.5rem] border bg-white p-6 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-lg ${
                        selectedIds.has(String(a.id))
                          ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                          : "border-white/70"
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stocksense-brand)] opacity-70 transition group-hover:opacity-100" />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {canEditInventory && selectionMode ? (
                            <label
                              className="mt-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(String(a.id))}
                                onChange={() => toggleSelect(a.id)}
                                aria-label={`Select ${a.name}`}
                                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[var(--stocksense-brand)] accent-[var(--stocksense-brand)] focus:ring-[var(--stocksense-brand-border)]"
                              />
                            </label>
                          ) : null}

                          {a.imageUrl ? (
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white">
                              <ImageWithLoader
                                src={a.imageThumbUrl || a.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                              <FaWarehouse className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h2
                              className="truncate text-xl font-semibold leading-7 text-gray-950"
                              title={a.name}
                            >
                              {a.name}
                            </h2>
                            <p
                              className="mt-1 truncate text-sm font-medium text-gray-500"
                              title={a.location?.name || "Unknown location"}
                            >
                              {a.location?.name || "Unknown location"}
                            </p>
                          </div>
                        </div>

                        {canEditInventory ? (
                          <NativeDropdown
                            ariaLabel={`${a.name} actions`}
                            items={[
                              {
                                key: "edit",
                                label: "Edit Storage Area",
                                onSelect: () => openDrawer(a),
                              },
                              {
                                key: "select",
                                label: selectedIds.has(String(a.id))
                                  ? "Deselect for bulk action"
                                  : "Select for bulk action",
                                onSelect: () => toggleSelect(a.id),
                              },
                              {
                                key: "delete",
                                label: "Delete Storage Area",
                                danger: true,
                                onSelect: () => openDeleteForArea(a),
                              },
                            ]}
                          />
                        ) : null}
                      </div>

                      <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            CATEGORIES
                          </h3>
                          <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                            {(a.categoriesCount ?? categories.length).toLocaleString()}
                          </span>
                        </div>

                        {visibleCategories.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {visibleCategories.map((category) => (
                              <div
                                key={category.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-[0_1px_0_rgb(15_23_42_/_0.03)]"
                              >
                                <span
                                  className="min-w-0 truncate font-medium text-gray-800"
                                  title={category.name}
                                >
                                  {category.name}
                                </span>
                                <span className="shrink-0 text-xs text-gray-500">
                                  {formatCount(category.itemsCount, "item")}
                                </span>
                              </div>
                            ))}
                            {moreCategories > 0 ? (
                              <p className="px-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                                +{moreCategories} more
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-500">
                            No categories yet
                          </p>
                        )}
                      </div>

                      <div className="mt-6">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                          RECENTLY ADDED
                        </h3>

                        {recentItems.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {recentItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex min-w-0 items-center gap-3"
                              >
                                {item.imageUrl ? (
                                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
                                    <ImageWithLoader
                                      src={item.imageThumbUrl || item.imageUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                                    <FaBoxOpen className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="truncate text-sm font-semibold text-gray-950"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </p>
                                  <p className="truncate text-xs text-gray-500">
                                    Added {formatRelativeDate(item.created_at ?? item.createdAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (a.itemsCount ?? 0) > 0 ? (
                          <p className="mt-3 text-sm leading-6 text-gray-500">
                            View this storage area to review {formatCount(a.itemsCount, "item")}.
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-gray-500">
                            No items added yet
                          </p>
                        )}
                      </div>

                      <div className="mt-auto border-t border-gray-100 pt-5">
                        <div className="mb-4 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-gray-700">
                            {formatCount(a.itemsCount, "item")}
                          </span>
                          {updatedLabel ? (
                            <span className="text-gray-500">Updated {updatedLabel}</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-85 active:scale-[0.99]"
                          onClick={() => router.push(`/areas/${a.id}`)}
                        >
                          View Storage Area
                          <FaChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.article>
                  );
                })}

                {canEditInventory ? (
                  <motion.div
                    variants={pageItemVariants}
                    className="group flex h-full min-h-[29rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/35 p-8 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand)] hover:shadow-md"
                  >
                    <div className="grid h-20 w-20 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition group-hover:bg-[var(--stocksense-brand-soft)]">
                      <FaPlus className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-xl font-semibold text-gray-950">
                      Add another storage area
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">
                      Create a pantry, drawer, closet, cabinet, or shelf.
                    </p>
                    <button
                      type="button"
                      onClick={openCreateAreaModal}
                      className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-85 active:scale-[0.99]"
                    >
                      <FaPlus className="h-3.5 w-3.5" />
                      Add Storage Area
                    </button>
                  </motion.div>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 rounded-[1.5rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 px-6 py-6">
              <div className="flex items-center gap-5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
                  <FaWarehouse className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-950">
                    Tip: Keep storage areas specific
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    The more specific you are, like "Pantry" instead of "Kitchen,"
                    the faster you'll find what you need.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <PaginationControls
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                startItem={startItem}
                endItem={endItem}
                totalItems={totalAreaCount}
                isLoading={isLoadingAreas}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            </div>
          </>
        ) : showSearchRestoreLoader ? (
          <SearchResultsLoadingState
            label="Loading storage areas"
            detail="Restoring all storage areas."
            className="px-6 py-12"
          />
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--stocksense-brand-border)] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
              {hasActiveFilters ? (
                <FaSearch className="h-6 w-6" />
              ) : (
                <FaWarehouse className="h-7 w-7" />
              )}
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">
              {normalizedSearch ? "No matching storage areas" : hasActiveFilters ? "No storage areas match" : "No storage areas yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
              {normalizedSearch
                ? `Nothing matched "${search.trim()}". Clear the search to see storage areas again.`
                : hasActiveFilters
                ? "Try a different search, location filter, or sort option."
                : "Create a pantry, shelf, closet, drawer, cabinet, or bin to start organizing your home."}
            </p>
            {normalizedSearch ? (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-7 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-5 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm transition hover:opacity-85 active:scale-[0.99]"
              >
                Clear search
              </button>
            ) : canEditInventory && !hasActiveFilters ? (
              <button
                type="button"
                onClick={openCreateAreaModal}
                className="mt-7 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-85 active:scale-[0.99]"
              >
                <FaPlus className="h-3.5 w-3.5" />
                Add Storage Area
              </button>
            ) : null}
          </div>
        )}
      </motion.section>

      {canEditInventory && createAreaOpen && (
        <AreaCreateModal
          isOpen={createAreaOpen}
          onOpen={() => setCreateAreaOpen(true)}
          onClose={closeCreateAreaModal}
          locationId={createAreaLocationId}
          setLocationId={setCreateAreaLocationId}
          filterLocations={filterLocations}
          areaName={createAreaName}
          setAreaName={setCreateAreaName}
          imageFile={createAreaImageFile}
          imagePreview={createAreaImagePreview}
          imageMessage={createAreaImageMessage}
          onSelectImageFile={selectCreateAreaImageFile}
          onClearImageFile={clearCreateAreaImageFile}
          isCreating={isCreatingArea}
          onCreate={handleCreateArea}
        />
      )}

      {drawerOpen && (
        <AreaDrawer
          isOpen={drawerOpen}
          onClose={closeDrawer}
          activeArea={activeArea}
          canEditInventory={canEditInventory}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          onRename={handleRename}
          isRenaming={isRenamingArea}
          onImageChange={handleAreaImageChange}
          onDelete={openDelete}
        />
      )}

      {/* Delete confirmation */}
      {canEditInventory && deleteDialog.open && <ConfirmDeleteModal
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
