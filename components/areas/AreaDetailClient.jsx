"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
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
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaEllipsisV,
  FaImage,
  FaPlus,
  FaSearch,
  FaTag,
  FaTags,
  FaTrash,
  FaUpload,
  FaWarehouse,
} from "react-icons/fa";

import {
  addCategory,
  deleteStorageArea,
  getAreaCategoriesPageAction,
  updateCategoryName,
  deleteCategory,
  updateStorageArea,
  uploadInventoryImage,
} from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import useDesktopAutoFocus from "@/components/modals/useDesktopAutoFocus";
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
import PaginationControls from "@/components/ui/PaginationControls";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import SearchResultsLoadingState from "@/components/ui/SearchResultsLoadingState";
import { daysUntil, isExpiringSoon, toNonNegativeInteger } from "@/utils/pantry/date";

const CATEGORY_SUGGESTIONS = ["Food", "Documents", "Tools", "Medicine", "Clothes", "Electronics"];
const AREA_DETAIL_PAGE_SIZE = 24;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const SORT_OPTIONS = [
  ["name_asc", "A-Z"],
  ["name_desc", "Z-A"],
  ["newest", "Newest"],
  ["oldest", "Oldest"],
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
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(() => new Set());
  const [mobileAddOpen, setMobileAddOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => new Set());

  const [isSaving, setIsSaving] = useState(false);
  const [editAreaOpen, setEditAreaOpen] = useState(false);
  const [editAreaName, setEditAreaName] = useState(area?.name ?? "");
  const [deleteAreaOpen, setDeleteAreaOpen] = useState(false);
  const [isDeletingArea, setIsDeletingArea] = useState(false);

  const [renameModal, setRenameModal] = useState({
    open: false,
    id: null,
    name: "",
    imageUrl: null,
  });
  const shouldAutoFocus = useDesktopAutoFocus(
    mobileAddOpen || editAreaOpen || renameModal.open
  );

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
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  const handleCategoryImageChange = ({ imageUrl }) => {
    const id = renameModal.id;
    if (!id) return;

    setRenameModal((prev) => ({ ...prev, imageUrl: imageUrl ?? null }));
    setCategories((prev) =>
      prev.map((category) =>
        String(category.id) === String(id)
          ? { ...category, imageUrl: imageUrl ?? null }
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
              <ImageWithLoader src={areaImageUrl} alt="" className="h-full w-full object-cover" />
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
                <Button
                  variant="flat"
                  className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  onPress={() => {
                    setEditAreaName(areaName);
                    setEditAreaOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit area
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={() => setDeleteAreaOpen(true)}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Header */}
      <motion.div variants={pageItemVariants} className="hidden">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/areas" className="inline-flex items-center gap-2 hover:text-[var(--stocksense-brand)]">
            <FaChevronLeft className="h-3.5 w-3.5" />
            Areas
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600">{area?.location?.name || "Location"}</span>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-800">{areaName || "Area"}</span>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-3">
              {areaImageUrl && (
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <ImageWithLoader
                    src={areaImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
                {areaName}
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              {canEditInventory ? "Manage" : "View"} categories for{" "}
              <span className="font-medium">{area?.location?.name}</span>.
              Click a category to view items.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              <span>{totals.categories} categories</span>
              <span>{totals.items} items</span>
            </div>
          </div>

          <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              value={search}
              onValueChange={handleSearchChange}
              placeholder="Search categories..."
              startContent={<FaSearch className="text-gray-400" />}
              className="w-full sm:w-80"
              radius="lg"
              variant="bordered"
            />
            <OpenGlobalAddItemButton
              canEditInventory={canEditInventory}
              context={{
                locationId: area?.location?.id,
                storageAreaId: area?.id,
              }}
            />
            {canEditInventory && (
              <>
                <Button
                  variant="flat"
                  className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700"
                  onPress={() => {
                    setEditAreaName(areaName);
                    setEditAreaOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={() => setDeleteAreaOpen(true)}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

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
                <ImageWithLoader src={areaImageUrl} alt="" className="h-full w-full object-cover" />
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
              <Button
                variant="flat"
                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                onPress={() => {
                  setEditAreaName(areaName);
                  setEditAreaOpen(true);
                }}
                startContent={<FaEdit />}
              >
                Edit
              </Button>
              <Button
                variant="flat"
                color="danger"
                className="rounded-xl"
                onPress={() => setDeleteAreaOpen(true)}
                startContent={<FaTrash />}
              >
                Delete
              </Button>
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
          <Input
            value={search}
            onValueChange={handleSearchChange}
            placeholder="Search categories or items..."
            startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
            className="w-full max-w-md"
            radius="lg"
            variant="bordered"
            classNames={{
              inputWrapper:
                "min-h-10 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
              input: "text-sm text-gray-900 placeholder:text-gray-400",
            }}
          />
          <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
                variant="flat"
                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                onPress={focusDesktopAddCategory}
                startContent={<FaPlus />}
              >
                Add Category
              </Button>
            )}
            <OpenGlobalAddItemButton
              canEditInventory={canEditInventory}
              context={{
                locationId: area?.location?.id,
                storageAreaId: area?.id,
              }}
              className="rounded-xl bg-[var(--stocksense-brand)] text-white shadow-sm"
            >
              Add Item
            </OpenGlobalAddItemButton>
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
        <Input
          value={search}
          onValueChange={handleSearchChange}
          placeholder="Search categories"
          radius="lg"
          variant="bordered"
          className="mt-3"
          startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
          classNames={{
            inputWrapper:
              "min-h-11 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
            input: "text-sm text-gray-900 placeholder:text-gray-400",
          }}
        />
        <Select
          aria-label="Sort categories"
          selectedKeys={new Set([sortBy])}
          onSelectionChange={(keys) =>
            setSortBy(String(Array.from(keys)[0] || "name_asc"))
          }
          variant="bordered"
          radius="lg"
          className="mt-3"
          classNames={themedSelectClassNames}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <SelectItem key={value}>{label}</SelectItem>
          ))}
        </Select>
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

              <Button
                className="mt-2 min-h-11 w-full rounded-xl bg-rose-600 text-sm font-semibold text-white"
                onPress={openBulkDelete}
                isDisabled={selectedCount === 0 || deleteModal.busy}
              >
                Delete
              </Button>
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
                    <ImageWithLoader src={cat.imageUrl} alt="" className="h-full w-full object-cover" />
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
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      variant="light"
                      radius="lg"
                      className="h-9 w-9 min-w-9 shrink-0 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                      aria-label={`${cat.name} actions`}
                    >
                      <FaEllipsisV className="h-4 w-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label={`${cat.name} actions`}>
                    <DropdownItem
                      key="select"
                      onPress={() => toggleSelectCategory(cat.id)}
                    >
                      {selected
                        ? "Deselect for bulk action"
                        : "Select for bulk action"}
                    </DropdownItem>
                    <DropdownItem
                      key="edit"
                      onPress={() =>
                        setRenameModal({
                          open: true,
                          id: cat.id,
                          name: cat.name,
                          imageUrl: cat.imageUrl ?? null,
                        })
                      }
                    >
                      Edit Category
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      onPress={() =>
                        setDeleteModal({
                          open: true,
                          mode: "single",
                          id: cat.id,
                          name: cat.name,
                          categoryIds: [],
                          count: 0,
                          busy: false,
                        })
                      }
                    >
                      Delete Category
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
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
              <Button
                onPress={clearSearch}
                radius="lg"
                variant="bordered"
                className="mt-5 w-full border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] font-semibold text-[var(--stocksense-brand)]"
              >
                Clear search
              </Button>
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
                <Button
                  variant="bordered"
                  className="rounded-xl border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  onPress={toggleSelectAllVisible}
                  isDisabled={filtered.length === 0 || deleteModal.busy}
                >
                  {allVisibleSelected ? "Deselect visible" : "Select visible"}
                </Button>
                <Button
                  variant="light"
                  className="rounded-xl bg-white text-gray-700"
                  onPress={clearSelection}
                  isDisabled={deleteModal.busy}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-rose-600 text-white"
                  onPress={openBulkDelete}
                  isDisabled={selectedCount === 0 || deleteModal.busy}
                >
                  Delete selected
                </Button>
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
              <Button
                onPress={clearSearch}
                radius="lg"
                variant="bordered"
                className="mt-7 border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-5 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm"
              >
                Clear search
              </Button>
            ) : canEditInventory ? (
              <div className="mx-auto mt-7 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                <Input
                  id="area-detail-new-category"
                  value={newCategory}
                  onValueChange={setNewCategory}
                  placeholder="Category name"
                  radius="lg"
                  variant="bordered"
                  className="sm:max-w-xs"
                  isDisabled={isSaving}
                  classNames={{
                    inputWrapper:
                      "border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
                  }}
                />
                <Button
                  className="rounded-xl bg-[var(--stocksense-brand)] px-5 text-white shadow-sm"
                  onPress={handleAddCategory}
                  isDisabled={isSaving || !newCategory.trim()}
                  isLoading={isSaving}
                  startContent={!isSaving ? <FaPlus /> : null}
                >
                  Add Category
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((cat, idx) => {
              const items = cat.items ?? [];
              const collapsed = collapsedCategoryIds.has(String(cat.id));
              const selected = selectedCategoryIds.has(String(cat.id));

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
                              src={cat.imageUrl}
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

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {canEditInventory && (
                          <OpenGlobalAddItemButton
                            canEditInventory={canEditInventory}
                            context={{
                              locationId: area?.location?.id,
                              storageAreaId: area?.id,
                              categoryId: cat.id,
                            }}
                            className="min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm"
                          >
                            Add Item
                          </OpenGlobalAddItemButton>
                        )}
                        <Dropdown placement="bottom-end">
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              variant="light"
                              radius="lg"
                              isDisabled={isSaving}
                              className="h-10 w-10 min-w-10 shrink-0 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                              aria-label={`${cat.name} actions`}
                            >
                              <FaEllipsisV className="h-4 w-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label={`${cat.name} actions`}>
                            <DropdownItem
                              key="view"
                              onPress={() => router.push(`/categories/${cat.id}`)}
                            >
                              View Items
                            </DropdownItem>
                            {canEditInventory ? (
                              <DropdownItem
                                key="select"
                                onPress={() => toggleSelectCategory(cat.id)}
                              >
                                {selected
                                  ? "Deselect for bulk action"
                                  : "Select for bulk action"}
                              </DropdownItem>
                            ) : null}
                            {canEditInventory ? (
                              <DropdownItem
                                key="edit"
                                onPress={() =>
                                  setRenameModal({
                                    open: true,
                                    id: cat.id,
                                    name: cat.name,
                                    imageUrl: cat.imageUrl ?? null,
                                  })
                                }
                              >
                                Edit Category
                              </DropdownItem>
                            ) : null}
                            {canEditInventory ? (
                              <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                onPress={() =>
                                  setDeleteModal({
                                    open: true,
                                    mode: "single",
                                    id: cat.id,
                                    name: cat.name,
                                    categoryIds: [],
                                    count: 0,
                                    busy: false,
                                  })
                                }
                              >
                                Delete Category
                              </DropdownItem>
                            ) : null}
                          </DropdownMenu>
                        </Dropdown>
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
                      {items.length === 0 ? (
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
                          {canEditInventory ? (
                            <OpenGlobalAddItemButton
                              canEditInventory={canEditInventory}
                              context={{
                                locationId: area?.location?.id,
                                storageAreaId: area?.id,
                                categoryId: cat.id,
                              }}
                              className="mt-5 min-h-10 rounded-xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm"
                            >
                              Add Item
                            </OpenGlobalAddItemButton>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {items.map((item) => {
                            const expirationDays = daysUntil(item.expiration_date);
                            const expired = expirationDays < 0;
                            const soon =
                              !expired &&
                              item.expiration_date &&
                              isExpiringSoon(item.expiration_date, 7);
                            const quantity = toNonNegativeInteger(item.quantity, 0);
                            const lowStock = quantity <= 1;

                            return (
                              <div
                                key={item.id}
                                className="flex flex-col gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]/25 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  {item.imageUrl ? (
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-white">
                                      <ImageWithLoader
                                        src={item.imageUrl}
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
                                      <DropdownItem
                                        key="view"
                                        onPress={() => router.push(`/categories/${cat.id}`)}
                                      >
                                        View in Category
                                      </DropdownItem>
                                    </DropdownMenu>
                                  </Dropdown>
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
                <Input
                  id="area-detail-new-category"
                  value={newCategory}
                  onValueChange={setNewCategory}
                  placeholder="Category name"
                  radius="lg"
                  variant="bordered"
                  className="w-full sm:w-72"
                  isDisabled={isSaving}
                  classNames={{
                    inputWrapper:
                      "border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
                  }}
                />
                <Button
                  className="rounded-xl bg-[var(--stocksense-brand)] px-5 text-white shadow-sm"
                  onPress={handleAddCategory}
                  isDisabled={isSaving || !newCategory.trim()}
                  isLoading={isSaving}
                  startContent={!isSaving ? <FaPlus /> : null}
                >
                  Add Category
                </Button>
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

      {canEditInventory && (
        <Modal
          isOpen={mobileAddOpen}
          onOpenChange={(open) => {
            if (!open && !isSaving) setMobileAddOpen(false);
          }}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {() => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Create Category</span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={handleAddCategory}
                    isDisabled={isSaving || !newCategory.trim()}
                    isLoading={isSaving}
                    startContent={!isSaving ? <FaPlus className="h-3.5 w-3.5" /> : null}
                  >
                    Create
                  </Button>
                  <MobileSheetCloseButton onPress={() => setMobileAddOpen(false)} />
                </ModalHeader>
                <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                  <Input
                    label="Category name"
                    value={newCategory}
                    onValueChange={setNewCategory}
                    placeholder={`Category in ${areaName}`}
                    radius="lg"
                    variant="bordered"
                    isDisabled={isSaving}
                    classNames={modalInputClassNames}
                    autoFocus={shouldAutoFocus}
                  />
                  <MobileSuggestionChips
                    suggestions={CATEGORY_SUGGESTIONS}
                    onSelect={setNewCategory}
                  />
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                        Category photo optional
                      </div>
                      {newCategoryImageFile ? (
                        <span className="rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                          Ready to upload
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
                        {newCategoryImagePreview ? (
                          <ImageWithLoader
                            src={newCategoryImagePreview}
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
                          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)] sm:hidden">
                            <FaCamera className="h-3.5 w-3.5" />
                            Take photo
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                selectNewCategoryImageFile(file);
                              }}
                            />
                          </label>
                          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)]">
                            <FaUpload className="h-3.5 w-3.5" />
                            {newCategoryImageFile ? "Change photo" : "Add photo"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                selectNewCategoryImageFile(file);
                              }}
                            />
                          </label>
                          {newCategoryImageFile ? (
                            <Button
                              size="sm"
                              variant="flat"
                              className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                              isDisabled={isSaving}
                              onPress={clearNewCategoryImageFile}
                              startContent={<FaTrash className="h-3.5 w-3.5" />}
                            >
                              Remove photo
                            </Button>
                          ) : null}
                        </div>
                        <p className="text-xs leading-5 text-gray-500 max-md:hidden">
                          {newCategoryImageFile
                            ? newCategoryImageFile.name
                            : "Take a photo or choose one from your camera roll. Max 5 MB."}
                        </p>
                        {newCategoryImageMessage ? (
                          <p className="text-xs text-rose-700">
                            {newCategoryImageMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    onPress={handleAddCategory}
                    isDisabled={isSaving || !newCategory.trim()}
                    isLoading={isSaving}
                    startContent={!isSaving ? <FaPlus /> : null}
                  >
                    Create Category
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {canEditInventory && (
        <Modal
          isOpen={editAreaOpen}
          onOpenChange={setEditAreaOpen}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Edit storage area</span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={handleRenameArea}
                    isLoading={isSaving}
                    isDisabled={!editAreaName.trim()}
                  >
                    Save
                  </Button>
                  <MobileSheetCloseButton onPress={onClose} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Storage area name"
                    value={editAreaName}
                    onValueChange={setEditAreaName}
                    variant="bordered"
                    radius="lg"
                    isDisabled={isSaving}
                    classNames={modalInputClassNames}
                  />
                  <EntityImageManager
                    entityType="storage_area"
                    entityId={area?.id}
                    imageUrl={areaImageUrl}
                    label="Storage area photo"
                    onChange={handleAreaImageChange}
                  />
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={() => {
                        onClose();
                        setDeleteAreaOpen(true);
                      }}
                    >
                      Delete storage area
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
                    onPress={handleRenameArea}
                    isLoading={isSaving}
                    isDisabled={!editAreaName.trim()}
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
        <ConfirmDeleteModal
          isOpen={deleteAreaOpen}
          isDeleting={isDeletingArea}
          onCancel={() => setDeleteAreaOpen(false)}
          onConfirm={handleDeleteArea}
          title={`Delete storage area "${areaName}"?`}
          description={`This will delete "${areaName}" and all categories and items inside it. This cannot be undone.`}
        />
      )}

      {/* Edit Category Modal */}
      {canEditInventory && <Modal
        isOpen={renameModal.open}
        onOpenChange={(open) => setRenameModal((p) => ({ ...p, open }))}
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
                  onPress={handleRename}
                  isDisabled={isSaving || !renameModal.name.trim()}
                >
                  Save
                </Button>
                <MobileSheetCloseButton onPress={onClose} />
              </ModalHeader>
              <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                <Input
                  value={renameModal.name}
                  onValueChange={(v) => setRenameModal((p) => ({ ...p, name: v }))}
                  variant="bordered"
                  radius="lg"
                  label="Category name"
                  isDisabled={isSaving}
                  classNames={modalInputClassNames}
                />
                <EntityImageManager
                  entityType="category"
                  entityId={renameModal.id}
                  imageUrl={renameModal.imageUrl}
                  label="Category photo"
                  onChange={handleCategoryImageChange}
                />
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <Button
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      const target = {
                        id: renameModal.id,
                        name: renameModal.name,
                        busy: false,
                      };
                      onClose();
                      setDeleteModal({
                        open: true,
                        mode: "single",
                        ...target,
                        categoryIds: [],
                        count: 0,
                        busy: false,
                      });
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
                  className="bg-[var(--stocksense-brand)] text-white max-md:hidden"
                  onPress={handleRename}
                  isDisabled={isSaving || !renameModal.name.trim()}
                >
                  Save changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>}

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
