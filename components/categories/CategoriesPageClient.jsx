"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  FaCamera,
  FaChevronRight,
  FaEllipsisV,
  FaImage,
  FaMapMarkedAlt,
  FaPlus,
  FaSearch,
  FaTags,
  FaTrash,
  FaUpload,
  FaWarehouse,
} from "react-icons/fa";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import EntityImageManager from "@/components/inventory/EntityImageManager";
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
  addCategory,
  deleteCategory,
  getCategoriesPageAction,
  updateCategoryName,
  uploadInventoryImage,
} from "@/app/actions/server";
import { emitInventoryChange } from "@/utils/clientEvents";
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

const CATEGORIES_PAGE_SIZE = 24;
const ALL_FILTER_KEY = "all";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const SORT_OPTIONS = [
  ["name_asc", "A-Z"],
  ["name_desc", "Z-A"],
  ["newest", "Newest to oldest"],
  ["oldest", "Oldest to newest"],
];

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

function validateImageFile(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.has(file.type)) return "Choose a JPG, PNG, WebP, or GIF image.";
  if (file.size > MAX_IMAGE_SIZE) return "Images must be 5 MB or smaller.";
  return "";
}

export default function CategoriesPageClient({
  initialCategories,
  initialTotalCategories = initialCategories?.length ?? 0,
  filterLocations = [],
  filterAreas = [],
  canEditInventory = true,
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories ?? []);
  const [totalCategoryCount, setTotalCategoryCount] = useState(initialTotalCategories);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [locationFilter, setLocationFilter] = useState(ALL_FILTER_KEY);
  const [areaFilter, setAreaFilter] = useState(ALL_FILTER_KEY);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [renameValue, setRenameValue] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    payload: null,
    isDeleting: false,
    mode: "single",
  });
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createCategoryName, setCreateCategoryName] = useState("");
  const [createCategoryLocationId, setCreateCategoryLocationId] = useState("");
  const [createCategoryAreaId, setCreateCategoryAreaId] = useState("");
  const [createCategoryImageFile, setCreateCategoryImageFile] = useState(null);
  const [createCategoryImagePreview, setCreateCategoryImagePreview] = useState(null);
  const [createCategoryImageMessage, setCreateCategoryImageMessage] = useState("");
  const [createCategoryError, setCreateCategoryError] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const activeCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(activeCategoryId)) || null,
    [categories, activeCategoryId]
  );

  useEffect(() => {
    return () => {
      if (createCategoryImagePreview) URL.revokeObjectURL(createCategoryImagePreview);
    };
  }, [createCategoryImagePreview]);

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.categoryId) return;

      if (item.createdCategory) {
        setTotalCategoryCount((current) => current + 1);
      }

      setCategories((prev) => {
        const existingCategory = prev.find(
          (category) => String(category.id) === String(item.categoryId)
        );

        const itemSummary = {
          id: item.id,
          name: item.name,
          quantity: item.quantity ?? 0,
          expiration_date: item.expiration_date ?? null,
        };

        if (!existingCategory) {
          return sortCategoriesForDisplay([
            ...prev,
            {
              id: item.categoryId,
              name: item.categoryName ?? "Category",
              image_path: null,
              imageUrl: null,
              insertedAt: null,
              storageArea: {
                id: item.storageAreaId ?? null,
                name: item.storageAreaName ?? "Unknown area",
              },
              location: {
                id: item.locationId ?? null,
                name: item.locationName ?? "Unknown location",
              },
              items: [itemSummary],
              itemsCount: 1,
            },
          ], sortBy);
        }

        return prev.map((category) => {
          if (String(category.id) !== String(item.categoryId)) return category;
          if ((category.items ?? []).some((i) => String(i.id) === String(item.id))) {
            return category;
          }

          const items = [...(category.items ?? []), itemSummary];

          return {
            ...category,
            items,
            itemsCount: items.length,
          };
        });
      });
      setRefreshNonce((current) => current + 1);
    };

    window.addEventListener("stocksense:item-added", handleItemAdded);

    return () => {
      window.removeEventListener("stocksense:item-added", handleItemAdded);
    };
  }, [sortBy]);

  const normalizedSearch = search.trim().toLowerCase();
  const categoriesLoadRequestIdRef = useRef(0);
  const areaOptions = useMemo(() => {
    if (locationFilter === ALL_FILTER_KEY) return filterAreas;
    return filterAreas.filter(
      (area) => String(area.location_id) === String(locationFilter)
    );
  }, [filterAreas, locationFilter]);
  const createAreaOptions = useMemo(() => {
    if (!createCategoryLocationId) return filterAreas;
    return filterAreas.filter(
      (area) => String(area.location_id) === String(createCategoryLocationId)
    );
  }, [createCategoryLocationId, filterAreas]);

  const loadCategoriesPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, page);
      const requestId = categoriesLoadRequestIdRef.current + 1;
      categoriesLoadRequestIdRef.current = requestId;
      setIsLoadingCategories(true);
      setCategoriesError("");

      try {
        const result = await getCategoriesPageAction({
          offset: (safePage - 1) * CATEGORIES_PAGE_SIZE,
          limit: CATEGORIES_PAGE_SIZE,
          filters: {
            search: normalizedSearch,
            sortBy,
            locationId: locationFilter === ALL_FILTER_KEY ? null : locationFilter,
            areaId: areaFilter === ALL_FILTER_KEY ? null : areaFilter,
          },
        });

        if (result?.error) {
          if (requestId === categoriesLoadRequestIdRef.current) {
            setCategoriesError(result.error);
          }
          return;
        }

        if (requestId !== categoriesLoadRequestIdRef.current) return;

        const nextCategories = result?.data?.items ?? [];
        const nextTotal = result?.data?.totalCount ?? 0;
        setCategories(nextCategories);
        setTotalCategoryCount(nextTotal);

        const nextTotalPages = Math.max(
          1,
          Math.ceil(nextTotal / CATEGORIES_PAGE_SIZE)
        );
        if (safePage > nextTotalPages) setCurrentPage(nextTotalPages);
      } catch (error) {
        if (requestId === categoriesLoadRequestIdRef.current) {
          setCategoriesError(error?.message || "Could not load categories.");
        }
      } finally {
        if (requestId === categoriesLoadRequestIdRef.current) {
          setIsLoadingCategories(false);
        }
      }
    },
    [areaFilter, locationFilter, normalizedSearch, sortBy]
  );

  const initialLoadSkippedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadSkippedRef.current) {
      initialLoadSkippedRef.current = true;
      return;
    }

    void loadCategoriesPage(currentPage);
  }, [currentPage, loadCategoriesPage, refreshNonce]);

  useEffect(() => {
    setCurrentPage(1);
    clearSelection();
  }, [areaFilter, locationFilter, normalizedSearch, sortBy]);

  const filtered = categories ?? [];
  const showSearchRestoreLoader =
    isLoadingCategories && !normalizedSearch && filtered.length === 0;

  const selectedCount = selectedIds.size;
  const selectionMode = selectedCount > 0;
  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((category) => selectedIds.has(String(category.id)));
  const totalPages = Math.max(1, Math.ceil(totalCategoryCount / CATEGORIES_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem =
    totalCategoryCount === 0
      ? 0
      : (safeCurrentPage - 1) * CATEGORIES_PAGE_SIZE + 1;
  const endItem = Math.min(
    (safeCurrentPage - 1) * CATEGORIES_PAGE_SIZE + filtered.length,
    totalCategoryCount
  );
  const hasActiveFilters =
    Boolean(normalizedSearch) ||
    locationFilter !== ALL_FILTER_KEY ||
    areaFilter !== ALL_FILTER_KEY;
  const totalItems = categories.reduce(
    (sum, category) => sum + (category.itemsCount ?? 0),
    0
  );
  const totalLocations = new Set(
    categories
      .map((category) => category.location?.id ?? category.location?.name)
      .filter(Boolean)
  ).size;
  const totalAreas = new Set(
    categories
      .map((category) => category.storageArea?.id ?? category.storageArea?.name)
      .filter(Boolean)
  ).size;
  const summaryCards = [
    {
      label: "Categories",
      value: totalCategoryCount,
      description: "Groups across your home",
      icon: FaTags,
    },
    {
      label: "Items",
      value: totalItems,
      description: "Tracked in categories",
      icon: FaBoxOpen,
    },
    {
      label: "Storage Areas",
      value: totalAreas,
      description: "Shelves and bins used",
      icon: FaWarehouse,
    },
    {
      label: "Locations",
      value: totalLocations,
      description: "Spaces represented",
      icon: FaMapMarkedAlt,
    },
  ];

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

  const toggleSelectAllVisible = () => {
    if (!canEditInventory) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((category) => next.delete(String(category.id)));
      } else {
        filtered.forEach((category) => next.add(String(category.id)));
      }
      return next;
    });
  };

  const openDrawer = (cat) => {
    setActiveCategoryId(cat.id);
    setRenameValue(cat.name);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveCategoryId(null);
    setRenameValue("");
  };

  const handleRename = async () => {
    if (!canEditInventory) return;
    if (!activeCategory) return;
    const name = renameValue.trim();
    if (!name) return;

    const result = await updateCategoryName(activeCategory.id, name);
    if (result?.error) {
      console.error(result.error);
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === activeCategory.id ? { ...c, name } : c))
    );
    emitInventoryChange({
      entity: "category",
      action: "updated",
      id: activeCategory.id,
    });
  };

  const handleCategoryImageChange = ({ imagePath, imageUrl }) => {
    if (!activeCategory?.id) return;

    setCategories((prev) =>
      prev.map((category) =>
        category.id === activeCategory.id
          ? {
              ...category,
              image_path: imagePath ?? null,
              imageUrl: imageUrl ?? null,
            }
          : category
      )
    );

    emitInventoryChange({
      entity: "category",
      action: imagePath ? "image_updated" : "image_removed",
      id: activeCategory.id,
    });
  };

  const openCreateCategoryModal = () => {
    if (!canEditInventory) return;

    const defaultAreaOptions =
      areaFilter !== ALL_FILTER_KEY
        ? filterAreas.filter((area) => String(area.id) === String(areaFilter))
        : areaOptions;
    const defaultAreaId =
      defaultAreaOptions[0]?.id ? String(defaultAreaOptions[0].id) : "";
    const defaultArea = filterAreas.find(
      (area) => String(area.id) === String(defaultAreaId)
    );
    const defaultLocationId =
      locationFilter !== ALL_FILTER_KEY
        ? locationFilter
        : defaultArea?.location_id
          ? String(defaultArea.location_id)
          : filterLocations[0]?.id
            ? String(filterLocations[0].id)
            : "";

    setCreateCategoryName("");
    setCreateCategoryLocationId(defaultLocationId);
    setCreateCategoryAreaId(defaultAreaId);
    setCreateCategoryError("");
    setCreateCategoryOpen(true);
  };

  const closeCreateCategoryModal = () => {
    if (isCreatingCategory) return;
    setCreateCategoryOpen(false);
    setCreateCategoryName("");
    setCreateCategoryLocationId("");
    setCreateCategoryAreaId("");
    setCreateCategoryImageFile(null);
    setCreateCategoryImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return null;
    });
    setCreateCategoryImageMessage("");
    setCreateCategoryError("");
  };

  const selectCreateCategoryImageFile = (file) => {
    const imageError = validateImageFile(file);
    if (imageError) {
      setCreateCategoryImageMessage(imageError);
      return;
    }

    setCreateCategoryImageFile(file ?? null);
    setCreateCategoryImageMessage("");
    setCreateCategoryImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const clearCreateCategoryImageFile = () => {
    setCreateCategoryImageFile(null);
    setCreateCategoryImageMessage("");
    setCreateCategoryImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return null;
    });
  };

  const uploadCreatedCategoryImage = async (categoryId) => {
    if (!createCategoryImageFile || !categoryId) return null;

    const formData = new FormData();
    formData.append("image", createCategoryImageFile);

    const result = await uploadInventoryImage("category", categoryId, formData);
    if (result?.error) {
      const message =
        typeof result.error === "string"
          ? result.error
          : "Category was added, but the photo could not be uploaded.";
      setCreateCategoryImageMessage(message);
      return null;
    }

    return result?.data ?? null;
  };

  const handleCreateLocationChange = (keys) => {
    const nextLocationId = String(Array.from(keys)[0] || "");
    const nextAreas = filterAreas.filter(
      (area) => String(area.location_id) === nextLocationId
    );

    setCreateCategoryLocationId(nextLocationId);
    setCreateCategoryAreaId(nextAreas[0]?.id ? String(nextAreas[0].id) : "");
  };

  const handleCreateCategory = async () => {
    if (!canEditInventory) return;
    const name = createCategoryName.trim();
    if (!name || !createCategoryAreaId) return;

    setIsCreatingCategory(true);
    setCreateCategoryError("");

    try {
      const result = await addCategory(createCategoryAreaId, name);
      if (result?.error) {
        throw result.error;
      }

      const area = filterAreas.find(
        (option) => String(option.id) === String(createCategoryAreaId)
      );
      const location = filterLocations.find(
        (option) => String(option.id) === String(area?.location_id)
      );
      const created = result.data;
      const uploadedImage = await uploadCreatedCategoryImage(created?.id);
      const createdCategory = {
        id: created?.id,
        name: created?.name ?? name,
        image_path: uploadedImage?.imagePath ?? null,
        imageUrl: uploadedImage?.imageUrl ?? null,
        insertedAt: created?.created_at ?? null,
        storageArea: {
          id: area?.id ?? createCategoryAreaId,
          name: area?.name ?? "Storage area",
        },
        location: {
          id: location?.id ?? area?.location_id ?? null,
          name: location?.name ?? "Unknown location",
        },
        items: [],
        itemsCount: 0,
      };
      const matchesCurrentFilters =
        (!normalizedSearch ||
          createdCategory.name.toLowerCase().includes(normalizedSearch)) &&
        (locationFilter === ALL_FILTER_KEY ||
          String(createdCategory.location.id) === String(locationFilter)) &&
        (areaFilter === ALL_FILTER_KEY ||
          String(createdCategory.storageArea.id) === String(areaFilter));

      if (matchesCurrentFilters) {
        setCategories((prev) => {
          if (
            prev.some(
              (category) => String(category.id) === String(createdCategory.id)
            )
          ) {
            return prev;
          }

          return sortCategoriesForDisplay([...prev, createdCategory], sortBy);
        });
        setTotalCategoryCount((current) => current + 1);
      }

      emitInventoryChange({
        entity: "category",
        action: "added",
        id: created?.id,
      });
      setCreateCategoryOpen(false);
      setCreateCategoryName("");
      clearCreateCategoryImageFile();
      setRefreshNonce((current) => current + 1);
      router.refresh();
    } catch (error) {
      console.error("addCategory error:", error);
      setCreateCategoryError(
        typeof error === "string"
          ? error
          : error?.message ?? "Could not add category."
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const openDelete = () => {
    if (!canEditInventory) return;
    if (!activeCategory) return;
    openDeleteForCategory(activeCategory);
  };

  const openDeleteForCategory = (category) => {
    if (!canEditInventory || !category) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: "single",
      payload: {
        categoryId: category.id,
        name: category.name,
        storageAreaName: category.storageArea?.name,
        locationName: category.location?.name,
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
        categoryIds: Array.from(selectedIds),
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
      const ids = deleteDialog.payload.categoryIds ?? [];
      const results = await Promise.all(ids.map((id) => deleteCategory(id)));
      const hasError = results.some((result) => result?.error);
      if (hasError) {
        console.error("bulk deleteCategory error:", results);
        closeDelete();
        return;
      }

      const deleted = new Set(ids.map(String));
      setCategories((prev) =>
        prev.filter((category) => !deleted.has(String(category.id)))
      );
      setTotalCategoryCount((current) => Math.max(0, current - deleted.size));
      clearSelection();
      if (activeCategoryId && deleted.has(String(activeCategoryId))) closeDrawer();
      emitInventoryChange({
        entity: "category",
        action: "deleted",
        ids,
      });
      closeDelete();
      setRefreshNonce((current) => current + 1);
      return;
    }

    const { categoryId } = deleteDialog.payload;
    const result = await deleteCategory(categoryId);
    if (result?.error) {
      console.error(result.error);
      closeDelete();
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(categoryId));
      return next;
    });
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setTotalCategoryCount((current) => Math.max(0, current - 1));
    emitInventoryChange({
      entity: "category",
      action: "deleted",
      id: categoryId,
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
              Categories
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Groups of items across every location
            </p>
          </div>
        </div>

        <Input
          value={search}
          onValueChange={handleSearchChange}
          placeholder="Search categories"
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
            aria-label="Filter categories by location"
            selectedKeys={new Set([locationFilter])}
            onSelectionChange={(keys) => {
              setLocationFilter(String(Array.from(keys)[0] || ALL_FILTER_KEY));
              setAreaFilter(ALL_FILTER_KEY);
            }}
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
            aria-label="Filter categories by storage area"
            selectedKeys={new Set([areaFilter])}
            onSelectionChange={(keys) =>
              setAreaFilter(String(Array.from(keys)[0] || ALL_FILTER_KEY))
            }
            variant="bordered"
            radius="lg"
            classNames={themedSelectClassNames}
          >
            <SelectItem key={ALL_FILTER_KEY}>All areas</SelectItem>
            {areaOptions.map((area) => (
              <SelectItem key={String(area.id)}>{area.name}</SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Sort categories"
            selectedKeys={new Set([sortBy])}
            onSelectionChange={(keys) =>
              setSortBy(String(Array.from(keys)[0] || "name_asc"))
            }
            variant="bordered"
            radius="lg"
            className="col-span-2"
            classNames={themedSelectClassNames}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <SelectItem key={value}>{label}</SelectItem>
            ))}
          </Select>
        </div>
      </motion.section>

      {categoriesError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {categoriesError}
        </div>
      ) : null}

      <motion.section variants={pageSectionVariants} className="grid gap-3 md:hidden">
        {canEditInventory && selectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="sticky top-[4.75rem] z-30 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
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
            label="Loading categories"
            detail="Restoring all categories."
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
                : "border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]"
            }`}>
              {normalizedSearch ? (
                <FaSearch className="h-5 w-5" />
              ) : (
                <FaTags className="h-6 w-6" />
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              {normalizedSearch ? "No matching categories" : "No categories found"}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-gray-500">
              {normalizedSearch
                ? `Nothing matched "${search.trim()}". Clear the search or try another category name.`
                : "Try a different filter or add an item to create a category."}
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
                <Button
                  onPress={openCreateCategoryModal}
                  className="rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white"
                  startContent={<FaPlus />}
                >
                  Add Category
                </Button>
              </div>
            ) : null}
          </motion.div>
        ) : (
          filtered.map((category) => (
            <motion.article
              key={category.id}
              layout
              variants={pageItemVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                selectedIds.has(String(category.id))
                  ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                  : "border-gray-200"
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelect(category.id);
                    return;
                  }
                  router.push(`/categories/${category.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  if (selectionMode) {
                    toggleSelect(category.id);
                    return;
                  }
                  router.push(`/categories/${category.id}`);
                }}
                className="flex min-h-[112px] w-full cursor-pointer items-center gap-4 p-4 text-left transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
              >
                {category.imageUrl ? (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-category-border)] bg-white">
                    <ImageWithLoader
                      src={category.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                    <FaTags className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold leading-6 text-gray-950">
                    {category.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {category.location?.name}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {category.storageArea?.name}
                  </p>
                  <div className="mt-2 text-sm leading-5 text-gray-500">
                    {category.itemsCount ?? 0}{" "}
                    {(category.itemsCount ?? 0) === 1 ? "item" : "items"}
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
                          aria-label={`${category.name} actions`}
                        >
                          <FaEllipsisV className="h-4 w-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label={`${category.name} actions`}>
                        <DropdownItem key="select" onPress={() => toggleSelect(category.id)}>
                          {selectedIds.has(String(category.id))
                            ? "Deselect for bulk action"
                            : "Select for bulk action"}
                        </DropdownItem>
                        <DropdownItem key="edit" onPress={() => openDrawer(category)}>
                          Edit Category
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<FaTrash className="h-3.5 w-3.5" />}
                          onPress={() => openDeleteForCategory(category)}
                        >
                          Delete Category
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
          totalItems={totalCategoryCount}
          isLoading={isLoadingCategories}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        />
      </motion.section>

      <motion.section variants={pageItemVariants} className="max-md:hidden">
        <header className="flex flex-col gap-4 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              CATEGORIES
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Your categories
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Browse the household groups that keep every storage area organized.
            </p>
          </div>

          <div className="flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              value={search}
              onValueChange={handleSearchChange}
              placeholder="Search categories"
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
              aria-label="Filter categories by location"
              selectedKeys={new Set([locationFilter])}
              onSelectionChange={(keys) => {
                setLocationFilter(String(Array.from(keys)[0] || ALL_FILTER_KEY));
                setAreaFilter(ALL_FILTER_KEY);
              }}
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
              aria-label="Filter categories by storage area"
              selectedKeys={new Set([areaFilter])}
              onSelectionChange={(keys) =>
                setAreaFilter(String(Array.from(keys)[0] || ALL_FILTER_KEY))
              }
              variant="bordered"
              radius="lg"
              className="w-full sm:w-48"
              classNames={themedSelectClassNames}
            >
              <SelectItem key={ALL_FILTER_KEY}>All areas</SelectItem>
              {areaOptions.map((area) => (
                <SelectItem key={String(area.id)}>{area.name}</SelectItem>
              ))}
            </Select>
            <Select
              aria-label="Sort categories"
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
                onPress={openCreateCategoryModal}
                className="min-h-10 w-full whitespace-nowrap rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm sm:w-auto"
                startContent={<FaPlus />}
              >
                Add Category
              </Button>
            )}
          </div>
        </header>

        {canEditInventory && (
          <AnimatePresence initial={false}>
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
                      Bulk actions for{" "}
                      <span className="font-semibold">{selectedCount}</span>{" "}
                      categor{selectedCount === 1 ? "y" : "ies"}
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
          </AnimatePresence>
        )}
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
                totalItems={totalCategoryCount}
                isLoading={isLoadingCategories}
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
                {filtered.map((c) => {
                  const recentItems = (c.items ?? []).slice(0, 3);
                  const moreItems = Math.max(
                    (c.itemsCount ?? c.items?.length ?? 0) - recentItems.length,
                    0
                  );
                  const categoryPath = [
                    c.location?.name || "Unknown location",
                    c.storageArea?.name || "Storage area",
                    c.name,
                  ].join(" > ");

                  return (
                    <motion.article
                      key={c.id}
                      layout
                      variants={pageItemVariants}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                      className={`group relative flex h-full min-h-[29rem] flex-col overflow-hidden rounded-[1.5rem] border bg-white p-6 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-lg ${
                        selectedIds.has(String(c.id))
                          ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                          : "border-white/70"
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stocksense-brand)] opacity-70 transition group-hover:opacity-100" />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {c.imageUrl ? (
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white">
                              <ImageWithLoader
                                src={c.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                              <FaTags className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h2
                              className="truncate text-xl font-semibold leading-7 text-gray-950"
                              title={c.name}
                            >
                              {c.name}
                            </h2>
                            <p
                              className="mt-1 truncate text-sm font-medium text-gray-500"
                              title={categoryPath}
                            >
                              {categoryPath}
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
                                aria-label={`${c.name} actions`}
                              >
                                <FaEllipsisV className="h-4 w-4" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label={`${c.name} actions`}>
                              <DropdownItem key="edit" onPress={() => openDrawer(c)}>
                                Edit Category
                              </DropdownItem>
                              <DropdownItem key="select" onPress={() => toggleSelect(c.id)}>
                                {selectedIds.has(String(c.id))
                                  ? "Deselect for bulk action"
                                  : "Select for bulk action"}
                              </DropdownItem>
                              <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                startContent={<FaTrash className="h-3.5 w-3.5" />}
                                onPress={() => openDeleteForCategory(c)}
                              >
                                Delete Category
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        ) : null}
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-4">
                          <p className="text-3xl font-semibold tracking-tight text-[var(--stocksense-brand)]">
                            {(c.itemsCount ?? 0).toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[var(--stocksense-brand)]">
                            {(c.itemsCount ?? 0) === 1 ? "item" : "items"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Storage
                          </p>
                          <p
                            className="mt-2 truncate text-sm font-semibold text-gray-950"
                            title={c.storageArea?.name || "Storage area"}
                          >
                            {c.storageArea?.name || "Storage area"}
                          </p>
                          <p
                            className="mt-1 truncate text-xs text-gray-500"
                            title={c.location?.name || "Unknown location"}
                          >
                            {c.location?.name || "Unknown location"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            RECENTLY ADDED
                          </h3>
                          <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                            {formatCount(c.itemsCount ?? 0, "item")}
                          </span>
                        </div>

                        {recentItems.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {recentItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-[0_1px_0_rgb(15_23_42_/_0.03)]"
                              >
                                <span
                                  className="min-w-0 truncate font-medium text-gray-800"
                                  title={item.name}
                                >
                                  {item.name}
                                </span>
                                <span className="shrink-0 text-xs text-gray-500">
                                  Qty {item.quantity ?? 0}
                                </span>
                              </div>
                            ))}
                            {moreItems > 0 ? (
                              <p className="px-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                                +{moreItems} more
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-500">
                            No items added yet
                          </p>
                        )}
                      </div>

                      <Button
                        as={Link}
                        href={`/categories/${c.id}`}
                        className="mt-auto min-h-10 w-full rounded-xl bg-[var(--stocksense-brand)] text-sm font-semibold text-white shadow-sm"
                      >
                        View Category
                      </Button>
                    </motion.article>
                  );
                })}

                {canEditInventory ? (
                  <motion.div
                    variants={pageItemVariants}
                    className="group flex min-h-[29rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/35 p-8 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand)] hover:shadow-md"
                  >
                    <div className="grid h-20 w-20 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition group-hover:bg-[var(--stocksense-brand-soft)]">
                      <FaPlus className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-xl font-semibold text-gray-950">
                      Add another category
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">
                      Create a new group inside one of your storage areas.
                    </p>
                    <Button
                      onPress={openCreateCategoryModal}
                      className="mt-6 min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
                      startContent={<FaPlus />}
                    >
                      Add Category
                    </Button>
                  </motion.div>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="mt-5">
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
            </div>
          </>
        ) : showSearchRestoreLoader ? (
          <SearchResultsLoadingState
            label="Loading categories"
            detail="Restoring all categories."
            className="px-6 py-12"
          />
        ) : (
          <motion.div
            variants={pageItemVariants}
            className="rounded-[1.75rem] border border-dashed border-[var(--stocksense-brand-border)] bg-white px-6 py-12 text-center shadow-sm"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
              <FaTags className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">
              {normalizedSearch ? "No matching categories" : hasActiveFilters ? "No categories found" : "No categories yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
              {normalizedSearch
                ? `Nothing matched "${search.trim()}". Clear the search to see categories again.`
                : hasActiveFilters
                ? "Try a different search, location, or storage-area filter."
                : "Create the first category for your household."}
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
            ) : canEditInventory ? (
              <Button
                onPress={openCreateCategoryModal}
                className="mt-7 min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
                startContent={<FaPlus />}
              >
                Add Category
              </Button>
            ) : null}
          </motion.div>
        )}
      </motion.section>

      <motion.section
        variants={pageItemVariants}
        className="max-md:hidden rounded-[1.5rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 px-6 py-6"
      >
        <div className="flex items-start gap-5">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
            <FaTags className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-950">
              Tip: Keep categories easy to scan
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Use simple names like Snacks, Baking, Cleaning, Tools, Chargers,
              or Documents so everyone can quickly find the right group.
            </p>
          </div>
        </div>
      </motion.section>

      {canEditInventory && (
        <Modal
          isOpen={createCategoryOpen}
          onOpenChange={(open) => {
            if (!open) closeCreateCategoryModal();
          }}
          placement="center"
          scrollBehavior="inside"
          classNames={{
            wrapper: "z-[100] max-md:items-end",
            base:
              "mx-0 my-0 w-full rounded-t-[1.75rem] rounded-b-none border border-white/70 bg-white shadow-2xl md:mx-4 md:my-8 md:max-w-lg md:rounded-[1.5rem]",
            closeButton: "hidden",
          }}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Add category</span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={handleCreateCategory}
                    isLoading={isCreatingCategory}
                    isDisabled={
                      isCreatingCategory ||
                      !createCategoryName.trim() ||
                      !createCategoryAreaId
                    }
                  >
                    Add
                  </Button>
                  <MobileSheetCloseButton onPress={onClose} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Category name"
                    value={createCategoryName}
                    onValueChange={setCreateCategoryName}
                    isDisabled={isCreatingCategory}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <Select
                    label="Location"
                    selectedKeys={
                      createCategoryLocationId
                        ? new Set([String(createCategoryLocationId)])
                        : new Set()
                    }
                    onSelectionChange={handleCreateLocationChange}
                    isDisabled={isCreatingCategory || filterLocations.length === 0}
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    {filterLocations.map((location) => (
                      <SelectItem key={String(location.id)}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    label="Storage area"
                    selectedKeys={
                      createCategoryAreaId
                        ? new Set([String(createCategoryAreaId)])
                        : new Set()
                    }
                    onSelectionChange={(keys) =>
                      setCreateCategoryAreaId(String(Array.from(keys)[0] || ""))
                    }
                    isDisabled={isCreatingCategory || createAreaOptions.length === 0}
                    variant="bordered"
                    radius="lg"
                    classNames={themedSelectClassNames}
                  >
                    {createAreaOptions.map((area) => (
                      <SelectItem key={String(area.id)}>{area.name}</SelectItem>
                    ))}
                  </Select>
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                        Category photo optional
                      </div>
                      {createCategoryImageFile ? (
                        <span className="rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                          Ready to upload
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
                        {createCategoryImagePreview ? (
                          <ImageWithLoader
                            src={createCategoryImagePreview}
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
                          <Button
                            size="sm"
                            variant="flat"
                            className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:hidden"
                            isDisabled={isCreatingCategory}
                            onPress={() =>
                              document
                                .getElementById("create-category-camera-input")
                                ?.click()
                            }
                            startContent={<FaCamera className="h-3.5 w-3.5" />}
                          >
                            Take photo
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                            isDisabled={isCreatingCategory}
                            onPress={() =>
                              document
                                .getElementById("create-category-image-input")
                                ?.click()
                            }
                            startContent={<FaUpload className="h-3.5 w-3.5" />}
                          >
                            {createCategoryImageFile ? "Change photo" : "Add photo"}
                          </Button>
                          {createCategoryImageFile ? (
                            <Button
                              size="sm"
                              variant="flat"
                              className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                              isDisabled={isCreatingCategory}
                              onPress={clearCreateCategoryImageFile}
                              startContent={<FaTrash className="h-3.5 w-3.5" />}
                            >
                              Remove photo
                            </Button>
                          ) : null}
                        </div>
                        <input
                          id="create-category-image-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            selectCreateCategoryImageFile(file);
                          }}
                        />
                        <input
                          id="create-category-camera-input"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            selectCreateCategoryImageFile(file);
                          }}
                        />
                        <p className="text-xs leading-5 text-gray-500 max-md:hidden">
                          {createCategoryImageFile
                            ? createCategoryImageFile.name
                            : "Take a photo or choose one from your camera roll. Max 5 MB."}
                        </p>
                        {createCategoryImageMessage ? (
                          <p className="text-xs text-rose-700">
                            {createCategoryImageMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {filterAreas.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Add a storage area before creating categories.
                    </div>
                  ) : null}
                  {createCategoryError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {createCategoryError}
                    </div>
                  ) : null}
                </ModalBody>
                <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                  <Button
                    variant="light"
                    onPress={onClose}
                    isDisabled={isCreatingCategory}
                    className="max-md:hidden"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    onPress={handleCreateCategory}
                    isLoading={isCreatingCategory}
                    isDisabled={
                      isCreatingCategory ||
                      !createCategoryName.trim() ||
                      !createCategoryAreaId
                    }
                  >
                    Add Category
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {/* Drawer (HeroUI Modal styled as right drawer) */}
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
              <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass} max-md:flex-row max-md:gap-3`}>
                <div
                  className="min-w-0 flex-1 truncate text-lg font-semibold text-[var(--stocksense-brand)]"
                  title={activeCategory?.name || "Category"}
                >
                  {activeCategory?.name || "Category"}
                </div>
                <div
                  className="truncate text-sm text-gray-500 max-md:hidden"
                  title={`${activeCategory?.location?.name || ""} / ${activeCategory?.storageArea?.name || ""}`}
                >
                  {activeCategory?.location?.name} &gt; {activeCategory?.storageArea?.name}
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

              <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                {canEditInventory && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Category name</div>
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

                {canEditInventory && activeCategory?.id && (
                  <EntityImageManager
                    entityType="category"
                    entityId={activeCategory.id}
                    imageUrl={activeCategory.imageUrl}
                    label="Category photo"
                    onChange={handleCategoryImageChange}
                  />
                )}

                {canEditInventory && activeCategory?.id && (
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onClick={openDelete}
                    >
                      Delete category
                    </Button>
                  </div>
                )}

                {/* Items preview */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-gray-950">
                    Items ({activeCategory?.itemsCount ?? 0})
                  </div>

                  <div className="space-y-2">
                    {(activeCategory?.items || []).slice(0, 8).map((it) => (
                      <div
                        key={it.id}
                        className="flex justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate font-medium text-gray-950"
                            title={it.name}
                          >
                            {it.name}
                          </div>
                          <div
                            className="truncate text-sm text-gray-500"
                            title={`Qty: ${it.quantity ?? 0} - Exp: ${it.expiration_date || "-"}`}
                          >
                            Qty: {it.quantity ?? 0} &bull; Exp: {it.expiration_date || "-"}
                          </div>
                        </div>
                      </div>
                    ))}

                    {(activeCategory?.items || []).length === 0 && (
                      <div className="text-sm text-gray-500">
                        No items in this category yet.
                      </div>
                    )}

                    {(activeCategory?.items || []).length > 8 && (
                      <div className="text-xs text-gray-400">
                        Showing first 8 items...
                      </div>
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
                    Delete category
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
            ? `Delete ${deleteDialog.payload?.count ?? 0} categor${
                deleteDialog.payload?.count === 1 ? "y" : "ies"
              }?`
            : deleteDialog.payload
            ? `Delete category "${deleteDialog.payload.name}"?`
            : "Delete category?"
        }
        description={
          deleteDialog.mode === "bulk"
            ? "This will delete the selected categories, including all items inside them. This cannot be undone."
            : deleteDialog.payload
            ? `This will delete "${deleteDialog.payload.name}" in ${deleteDialog.payload.locationName} > ${deleteDialog.payload.storageAreaName}, including all items inside it. This cannot be undone.`
            : ""
        }
      />}
    </motion.div>
  );
}
