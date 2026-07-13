"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Input,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
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
  FaChevronRight,
  FaEllipsisV,
  FaImage,
  FaMapMarkedAlt,
  FaPlus,
  FaSearch,
  FaTags,
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
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import {
  addStorageArea,
  deleteStorageArea,
  getStorageAreasPageAction,
  updateStorageArea,
  uploadInventoryImage,
} from "@/app/actions/server";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { emitInventoryChange } from "@/utils/clientEvents";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import PaginationControls from "@/components/ui/PaginationControls";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import SearchResultsLoadingState from "@/components/ui/SearchResultsLoadingState";

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
    if (!canEditInventory) return;
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

        <Input
          value={search}
          onValueChange={handleSearchChange}
          placeholder="Search storage areas"
          radius="lg"
          variant="bordered"
          className="mt-4"
          startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
          classNames={{
            inputWrapper:
              "min-h-11 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
            input: "text-sm text-gray-900 placeholder:text-gray-400",
          }}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Select
            aria-label="Filter storage areas by location"
            selectedKeys={new Set([locationFilter])}
            onSelectionChange={(keys) =>
              setLocationFilter(String(Array.from(keys)[0] || ALL_FILTER_KEY))
            }
            variant="bordered"
            radius="lg"
            classNames={themedSelectClassNames}
          >
            <SelectItem key={ALL_FILTER_KEY}>All locations</SelectItem>
            {filterLocations.map((location) => (
              <SelectItem key={String(location.id)}>{location.name}</SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Sort storage areas"
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
                className="min-h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                disabled={filtered.length === 0 || deleteDialog.isDeleting}
                className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] disabled:opacity-50"
              >
                {allVisibleSelected ? "Deselect visible" : "Select visible"}
              </button>
              <span className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500">
                {filtered.length} visible
              </span>
            </div>

            <Button
              className="mt-2 min-h-11 w-full rounded-xl bg-rose-600 text-sm font-semibold text-white"
              onPress={openBulkDelete}
              isDisabled={selectedCount === 0 || deleteDialog.isDeleting}
            >
              Delete
            </Button>
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
                    <ImageWithLoader src={area.imageUrl} alt="" className="h-full w-full object-cover" />
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
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          variant="light"
                          radius="lg"
                          className="h-9 w-9 min-w-9 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                          aria-label={`${area.name} actions`}
                        >
                          <FaEllipsisV className="h-4 w-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label={`${area.name} actions`}>
                        <DropdownItem key="select" onPress={() => toggleSelect(area.id)}>
                          {selectedIds.has(String(area.id))
                            ? "Deselect for bulk action"
                            : "Select for bulk action"}
                        </DropdownItem>
                        <DropdownItem key="edit" onPress={() => openDrawer(area)}>
                          Edit Storage Area
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<FaTrash className="h-3.5 w-3.5" />}
                          onPress={() => openDeleteForArea(area)}
                        >
                          Delete Storage Area
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
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
            <Input
              value={search}
              onValueChange={handleSearchChange}
              placeholder="Search storage areas"
              radius="lg"
              variant="bordered"
              className="w-full sm:w-72"
              startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
              classNames={{
                inputWrapper:
                  "min-h-10 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
                input: "text-sm text-gray-900 placeholder:text-gray-400",
              }}
            />
            <Select
              aria-label="Filter storage areas by location"
              selectedKeys={new Set([locationFilter])}
              onSelectionChange={(keys) =>
                setLocationFilter(String(Array.from(keys)[0] || ALL_FILTER_KEY))
              }
              variant="bordered"
              radius="lg"
              className="w-full sm:w-48"
              classNames={themedSelectClassNames}
            >
              <SelectItem key={ALL_FILTER_KEY}>All locations</SelectItem>
              {filterLocations.map((location) => (
                <SelectItem key={String(location.id)}>{location.name}</SelectItem>
              ))}
            </Select>
            <Select
              aria-label="Sort storage areas"
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
            {canEditInventory && (
              <Button
                onPress={openCreateAreaModal}
                className="min-h-10 w-full whitespace-nowrap rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm sm:w-auto"
                startContent={<FaPlus />}
              >
                Add Storage Area
              </Button>
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
                  <Button
                    size="sm"
                    variant="flat"
                    className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                    isDisabled={deleteDialog.isDeleting}
                    onPress={clearSelection}
                  >
                    Clear selection
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="rounded-xl"
                    isDisabled={deleteDialog.isDeleting}
                    onPress={openBulkDelete}
                    startContent={<FaTrash />}
                  >
                    Delete selected
                  </Button>
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
                          {a.imageUrl ? (
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white">
                              <ImageWithLoader
                                src={a.imageUrl}
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
                          <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                              <Button
                                isIconOnly
                                variant="light"
                                radius="lg"
                                className="h-9 w-9 min-w-9 shrink-0 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                                aria-label={`${a.name} actions`}
                              >
                                <FaEllipsisV className="h-4 w-4" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label={`${a.name} actions`}>
                              <DropdownItem key="edit" onPress={() => openDrawer(a)}>
                                Edit Storage Area
                              </DropdownItem>
                              <DropdownItem key="select" onPress={() => toggleSelect(a.id)}>
                                {selectedIds.has(String(a.id))
                                  ? "Deselect for bulk action"
                                  : "Select for bulk action"}
                              </DropdownItem>
                              <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                startContent={<FaTrash className="h-3.5 w-3.5" />}
                                onPress={() => openDeleteForArea(a)}
                              >
                                Delete Storage Area
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
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
                                      src={item.imageUrl}
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
                        <Button
                          radius="lg"
                          className="w-full bg-[var(--stocksense-brand)] text-sm font-semibold text-white shadow-sm"
                          endContent={<FaChevronRight className="h-3.5 w-3.5" />}
                          onPress={() => router.push(`/areas/${a.id}`)}
                        >
                          View Storage Area
                        </Button>
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
                    <Button
                      onPress={openCreateAreaModal}
                      className="mt-6 min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
                      startContent={<FaPlus />}
                    >
                      Add Storage Area
                    </Button>
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
              <Button
                onPress={clearSearch}
                radius="lg"
                variant="bordered"
                className="mt-7 border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-5 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm"
              >
                Clear search
              </Button>
            ) : canEditInventory && !hasActiveFilters ? (
              <Button
                onPress={openCreateAreaModal}
                className="mt-7 min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
                startContent={<FaPlus />}
              >
                Add Storage Area
              </Button>
            ) : null}
          </div>
        )}
      </motion.section>

      {canEditInventory && (
        <Modal
          isOpen={createAreaOpen}
          onOpenChange={(open) => {
            if (open) setCreateAreaOpen(true);
            else closeCreateAreaModal();
          }}
          placement="center"
          scrollBehavior="inside"
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={modalHeaderClass}>
                  Add Storage Area
                </ModalHeader>
                <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                  <Select
                    label="Location"
                    aria-label="Storage area location"
                    selectedKeys={
                      createAreaLocationId ? new Set([String(createAreaLocationId)]) : new Set()
                    }
                    onSelectionChange={(keys) =>
                      setCreateAreaLocationId(String(Array.from(keys)[0] || ""))
                    }
                    variant="bordered"
                    radius="lg"
                    isDisabled={isCreatingArea || filterLocations.length === 0}
                    classNames={themedSelectClassNames}
                  >
                    {filterLocations.map((location) => (
                      <SelectItem key={String(location.id)}>{location.name}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Storage area name"
                    value={createAreaName}
                    onValueChange={setCreateAreaName}
                    placeholder="e.g., Pantry, drawer, cabinet, shelf"
                    radius="lg"
                    variant="bordered"
                    isDisabled={isCreatingArea || filterLocations.length === 0}
                    classNames={modalInputClassNames}
                    autoFocus
                  />
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                        Storage area photo
                      </div>
                      {createAreaImageFile ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                          Ready to upload
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
                        {createAreaImagePreview ? (
                          <ImageWithLoader
                            src={createAreaImagePreview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-gray-400">
                            Optional photo
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)]">
                            <FaImage className="h-3.5 w-3.5" />
                            {createAreaImageFile ? "Change photo" : "Add photo"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isCreatingArea || filterLocations.length === 0}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                selectCreateAreaImageFile(file);
                              }}
                            />
                          </label>
                          {createAreaImageFile ? (
                            <Button
                              variant="flat"
                              className="rounded-xl border border-gray-200 bg-white text-gray-600"
                              onPress={clearCreateAreaImageFile}
                              isDisabled={isCreatingArea}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                        <p className="text-xs leading-5 text-gray-500">
                          {createAreaImageFile
                            ? createAreaImageFile.name
                            : "Choose a photo now, or add one later from edit."}
                        </p>
                        {createAreaImageMessage ? (
                          <p className="text-xs text-[var(--stocksense-brand)]">
                            {createAreaImageMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {filterLocations.length === 0 ? (
                    <p className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm text-[var(--stocksense-brand)]">
                      Create a location first, then add a storage area inside it.
                    </p>
                  ) : null}
                </ModalBody>
                <ModalFooter className={modalFooterClass}>
                  <Button
                    variant="light"
                    onPress={onClose}
                    isDisabled={isCreatingArea}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                    onPress={handleCreateArea}
                    isLoading={isCreatingArea}
                    isDisabled={
                      isCreatingArea ||
                      !createAreaName.trim() ||
                      !createAreaLocationId ||
                      filterLocations.length === 0
                    }
                    startContent={!isCreatingArea ? <FaPlus /> : null}
                  >
                    Add Storage Area
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

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
                  <div
                    className="truncate text-lg font-semibold text-[var(--stocksense-brand)]"
                    title={activeArea?.name || "Storage Area"}
                  >
                    {activeArea?.name || "Storage Area"}
                  </div>
                  <div
                    className="truncate text-sm text-gray-500"
                    title={activeArea?.location?.name || ""}
                  >
                    {activeArea?.location?.name}
                  </div>
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
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate font-medium text-gray-950"
                            title={c.name}
                          >
                            {c.name}
                          </div>
                          <div
                            className="truncate text-sm text-gray-500"
                            title={`${c.itemsCount} ${c.itemsCount === 1 ? "item" : "items"}`}
                          >
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
