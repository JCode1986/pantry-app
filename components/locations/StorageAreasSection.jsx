'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@heroui/react';
import {
  addStorageArea,
  updateStorageArea,
  deleteStorageArea,
  addCategory,
  updateCategoryName,
  deleteCategory,
  addItem,
  updateItem,
  deleteItem,
  getLocationStorageAreasPageAction,
  updateItemLocation,
  uploadInventoryImage,
} from '@/app/actions/server';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronUp,
  FaEllipsisV,
  FaCamera,
  FaImage,
  FaSearch,
  FaBoxOpen,
  FaLayerGroup,
  FaWarehouse,
  FaTags,
  FaBarcode,
  FaExclamationTriangle,
} from 'react-icons/fa';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import { emitInventoryChange, emitItemAdded } from '@/utils/clientEvents';
import EntityImageManager from '@/components/inventory/EntityImageManager';
import ImageWithLoader from '@/components/ui/ImageWithLoader';
import MobileSuggestionChips from '@/components/modals/MobileSuggestionChips';
import MobileSheetCloseButton from '@/components/modals/MobileSheetCloseButton';
import { themedSelectClassNames } from '@/components/modals/modalTheme';
import QuantityStepperInput from '@/components/modals/QuantityStepperInput';
import PaginationControls from '@/components/ui/PaginationControls';
import SearchResultsLoadingState from '@/components/ui/SearchResultsLoadingState';
import useDesktopAutoFocus from '@/components/modals/useDesktopAutoFocus';
import {
  daysUntil,
  isExpiringSoon,
  toNonNegativeInteger,
  toPositiveInteger,
} from '@/utils/pantry/date';
import { containsQuery } from '@/utils/pantry/search';
import { parseDate } from '@internationalized/date';

const MoveItemsModal = dynamic(() => import('@/components/items/MoveItemsModal'), {
  ssr: false,
});

const collapseVariants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  open: { height: 'auto', opacity: 1, transition: { duration: 0.25 } },
};

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const pageItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, type: 'spring', stiffness: 120 },
  },
};

const modalContentStyle = {
  fontFamily: 'var(--stocksense-font-family)',
};

const modalContentClass =
  'wherekeep-modal-content flex w-[calc(100vw-1rem)] max-h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl sm:w-full max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none';

const mobileSheetModalClassNames = {
  wrapper:
    'max-md:items-stretch max-md:justify-stretch max-md:overflow-hidden max-md:p-0',
  base: 'max-md:m-0 max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none',
};

const modalHeaderClass =
  'shrink-0 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)] max-md:sticky max-md:top-0 max-md:z-20 max-md:px-4 max-md:py-3';

const modalBodyClass = 'wherekeep-modal-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5 max-md:px-4 max-md:pb-40 max-md:pt-4';

const modalFooterClass =
  'wherekeep-modal-footer flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white sm:flex-row sm:justify-end max-md:sticky max-md:bottom-0 max-md:z-20 max-md:px-4 max-md:pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+1rem))] max-md:pt-3 max-md:shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)]';

const modalInputClassNames = {
  inputWrapper:
    'border-gray-200 bg-white focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]',
  label: 'text-gray-700',
  input: 'text-gray-900 placeholder:text-gray-400',
};

const modalPrimaryButtonClass =
  'bg-[var(--stocksense-brand)] text-white hover:brightness-95';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const STORAGE_AREA_SUGGESTIONS = ['Pantry', 'Closet', 'Cabinet', 'Drawer', 'Shelf', 'Box'];
const CATEGORY_SUGGESTIONS = ['Food', 'Documents', 'Tools', 'Medicine', 'Clothes', 'Electronics'];
const LOCATION_DETAIL_PAGE_SIZE = 12;
const SORT_OPTIONS = [
  ['name_asc', 'A-Z'],
  ['name_desc', 'Z-A'],
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
];

function validateImageFile(file) {
  if (!file) return '';
  if (!IMAGE_TYPES.has(file.type)) {
    return 'Choose a JPG, PNG, WebP, or GIF image.';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'Images must be 5 MB or smaller.';
  }
  return '';
}

function CreateImagePicker({
  label,
  imagePreview,
  imageFile,
  imageMessage,
  onSelect,
  onClear,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 max-md:bg-white">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
          {label}
        </div>
        {imageFile && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
            Ready to upload
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
          {imagePreview ? (
            <ImageWithLoader
              src={imagePreview}
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
              {imageFile ? 'Change photo' : 'Add photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  onSelect(file);
                }}
              />
            </label>
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
                  event.target.value = '';
                  onSelect(file);
                }}
              />
            </label>
            {imageFile && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs leading-5 text-gray-500 max-md:hidden">
            {imageFile
              ? imageFile.name
              : 'Choose a photo now, or add one later from edit.'}
          </p>
          {imageMessage && (
            <p className="text-xs text-[var(--stocksense-brand)]">{imageMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StorageAreasSection({
  locationId,
  initialStorageAreas,
  initialTotalStorageAreas = initialStorageAreas?.length ?? 0,
  locationName,
  // optional: pass all locations if you want true cross-location moves
  allLocations,
  canEditInventory = true,
}) {
  const [storageAreas, setStorageAreas] = useState(initialStorageAreas ?? []);
  const [totalStorageAreaCount, setTotalStorageAreaCount] = useState(initialTotalStorageAreas);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name_asc');
  const [isLoadingStorageAreas, setIsLoadingStorageAreas] = useState(false);
  const [storageAreasError, setStorageAreasError] = useState('');
  const [areaModal, setAreaModal] = useState({
    open: false,
    mode: 'create',
    areaId: null,
    name: '',
    imageUrl: null,
    image_path: null,
    imageFile: null,
    imagePreview: null,
    imageMessage: '',
    locationName: '',
  });
  const [categoryModal, setCategoryModal] = useState({
    open: false,
    mode: 'create',
    areaId: null,
    categoryId: null,
    areaName: '',
    name: '',
    imageUrl: null,
    image_path: null,
    imageFile: null,
    imagePreview: null,
    imageMessage: '',
  });
  const [itemModal, setItemModal] = useState({
    open: false,
    mode: 'create',
    areaId: null,
    categoryId: null,
    itemId: null,
    categoryName: '',
    name: '',
    quantity: '',
    expirationDate: '',
    imageUrl: null,
    image_path: null,
    imageFile: null,
    imagePreview: null,
    imageMessage: '',
  });
  const shouldAutoFocus = useDesktopAutoFocus(
    areaModal.open || categoryModal.open || itemModal.open
  );
  const itemModalExpirationDateValue = useMemo(() => {
    if (!itemModal.expirationDate) return null;
    try {
      return parseDate(itemModal.expirationDate);
    } catch {
      return null;
    }
  }, [itemModal.expirationDate]);
  const [limitNotice, setLimitNotice] = useState(null);

  const [expandedAreas, setExpandedAreas] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [mobileCategorySheet, setMobileCategorySheet] = useState(null);

  // bulk-select state: { [categoryId]: { [itemId]: true } }
  const [selectedByCategory, setSelectedByCategory] = useState({});

  // filters
  const [search, setSearch] = useState('');
  const [expSoonEnabled, setExpSoonEnabled] = useState(false);
  const [expDays, setExpDays] = useState(7);
  const normalizedSearch = search.trim().toLowerCase();
  const storageLoadRequestIdRef = useRef(0);

  const loadStorageAreaPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, page);
      const requestId = storageLoadRequestIdRef.current + 1;
      storageLoadRequestIdRef.current = requestId;
      setIsLoadingStorageAreas(true);
      setStorageAreasError('');

      try {
        const result = await getLocationStorageAreasPageAction({
          locationId,
          offset: (safePage - 1) * LOCATION_DETAIL_PAGE_SIZE,
          limit: LOCATION_DETAIL_PAGE_SIZE,
          filters: { search: normalizedSearch, sortBy },
        });

        if (result?.error) {
          if (requestId === storageLoadRequestIdRef.current) {
            setStorageAreasError(result.error);
          }
          return;
        }

        if (requestId !== storageLoadRequestIdRef.current) return;

        const nextAreas = result?.data?.items ?? [];
        const nextTotal = result?.data?.totalCount ?? 0;
        setStorageAreas(nextAreas);
        setTotalStorageAreaCount(nextTotal);

        const nextTotalPages = Math.max(
          1,
          Math.ceil(nextTotal / LOCATION_DETAIL_PAGE_SIZE)
        );
        if (safePage > nextTotalPages) setCurrentPage(nextTotalPages);
      } catch (error) {
        if (requestId === storageLoadRequestIdRef.current) {
          setStorageAreasError(error?.message || 'Could not load storage areas.');
        }
      } finally {
        if (requestId === storageLoadRequestIdRef.current) {
          setIsLoadingStorageAreas(false);
        }
      }
    },
    [locationId, normalizedSearch, sortBy]
  );

  const initialStorageLoadSkippedRef = useRef(false);

  useEffect(() => {
    if (!initialStorageLoadSkippedRef.current) {
      initialStorageLoadSkippedRef.current = true;
      return;
    }

    void loadStorageAreaPage(currentPage);
  }, [currentPage, loadStorageAreaPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedByCategory({});
  }, [normalizedSearch, sortBy]);

  const handleSearchChange = useCallback(
    (value) => {
      if (normalizedSearch && !value.trim() && storageAreas.length === 0) {
        setIsLoadingStorageAreas(true);
      }
      setSearch(value);
      setSelectedByCategory({});
      setCurrentPage(1);
    },
    [normalizedSearch, storageAreas.length]
  );

  const clearSearch = () => {
    setIsLoadingStorageAreas(true);
    setSearch('');
    setSelectedByCategory({});
    setCurrentPage(1);
  };

  // Move items modal state
  const [moveModal, setMoveModal] = useState({
    open: false,
    sourceAreaId: null,
    sourceCategoryId: null,
    targetLocationId: locationId,
    targetAreaId: null,
    targetCategoryId: null,
    itemIds: [],
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    entityType: null,  // 'area' | 'category' | 'item' | 'bulk-items'
    payload: null,
    isDeleting: false,
  });

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.storageAreaId || String(item.locationId) !== String(locationId)) {
        return;
      }

      const itemSummary = {
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 0,
        expiration_date: item.expiration_date ?? null,
        category_id: item.category_id ?? item.categoryId,
      };

      setStorageAreas((prev) => {
        const areaExists = (prev ?? []).some(
          (area) => String(area.id) === String(item.storageAreaId)
        );

        if (!areaExists) {
          return [
            ...(prev ?? []),
            {
              id: item.storageAreaId,
              name: item.storageAreaName ?? 'Storage area',
              categories: [
                {
                  id: item.categoryId,
                  name: item.categoryName ?? 'Category',
                  items: [itemSummary],
                },
              ],
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        }

        return (prev ?? []).map((area) => {
          if (String(area.id) !== String(item.storageAreaId)) return area;

          const categories = area.categories ?? [];
          const categoryExists = categories.some(
            (category) => String(category.id) === String(item.categoryId)
          );

          const nextCategories = categoryExists
            ? categories.map((category) => {
                if (String(category.id) !== String(item.categoryId)) {
                  return category;
                }

                if ((category.items ?? []).some((i) => String(i.id) === String(item.id))) {
                  return category;
                }

                return {
                  ...category,
                  items: [...(category.items ?? []), itemSummary],
                };
              })
            : [
                ...categories,
                {
                  id: item.categoryId,
                  name: item.categoryName ?? 'Category',
                  items: [itemSummary],
                },
              ];

          return {
            ...area,
            categories: nextCategories,
          };
        });
      });

      setExpandedAreas((prev) => ({
        ...prev,
        [item.storageAreaId]: true,
      }));
      setExpandedCategories((prev) => ({
        ...prev,
        [item.categoryId]: true,
      }));
    };

    window.addEventListener('stocksense:item-added', handleItemAdded);

    return () => {
      window.removeEventListener('stocksense:item-added', handleItemAdded);
    };
  }, [locationId]);

  useEffect(() => {
    const previews = [
      areaModal.imagePreview,
      categoryModal.imagePreview,
      itemModal.imagePreview,
    ];

    return () => {
      previews.forEach((preview) => {
        if (preview?.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [
    areaModal.imagePreview,
    categoryModal.imagePreview,
    itemModal.imagePreview,
  ]);

  const setCreateImageFile = (setModal, file) => {
    if (!file) return;

    const imageError = validateImageFile(file);
    if (imageError) {
      setModal((prev) => ({ ...prev, imageMessage: imageError }));
      return;
    }

    setModal((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      imageMessage: '',
    }));
  };

  const clearCreateImageFile = (setModal) => {
    setModal((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
    }));
  };

  const uploadCreatedEntityImage = async (entityType, entityId, imageFile) => {
    if (!imageFile || !entityId) return null;

    const formData = new FormData();
    formData.append('image', imageFile);
    const result = await uploadInventoryImage(entityType, entityId, formData);

    if (result?.error) {
      console.error(`${entityType} image upload error:`, result.error);
      return null;
    }

    return result?.data ?? null;
  };

  const openDeleteDialog = (entityType, payload) => {
    if (!canEditInventory) return;
    setDeleteDialog({
      open: true,
      entityType,
      payload,
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


  // Build locations list for the modal, normalize storageAreas vs storage_areas
  const locationsForMove = useMemo(() => {
    if (allLocations && allLocations.length) {
      return allLocations.map((loc) => ({
        ...loc,
        storageAreas: loc.storageAreas || loc.storage_areas || [],
      }));
    }
    // fallback: only current location with current storageAreas
    return [
      {
        id: locationId,
        name: locationName,
        storageAreas,
      },
    ];
  }, [allLocations, locationId, locationName, storageAreas]);

  const expansionSignature = useMemo(
    () =>
      (storageAreas || [])
        .map((area) => `${area.id}:${(area.categories || []).map((c) => c.id).join(',')}`)
        .join('|'),
    [storageAreas]
  );

  useEffect(() => {
    const areaState = {};
    const categoryState = {};

    for (const areaGroup of expansionSignature.split('|')) {
      if (!areaGroup) continue;

      const [areaId, categoryList = ''] = areaGroup.split(':');
      if (areaId) areaState[areaId] = true;

      for (const categoryId of categoryList.split(',')) {
        if (categoryId) categoryState[categoryId] = true;
      }
    }

    setExpandedAreas(areaState);
    setExpandedCategories(categoryState);
  }, [expansionSignature]);

  const totalAreas = totalStorageAreaCount;
  const totalCategories = useMemo(
    () => (storageAreas || []).reduce((sum, a) => sum + (a.categories?.length || 0), 0),
    [storageAreas]
  );

  const totalItems = useMemo(() => {
    let n = 0;
    for (const a of storageAreas ?? []) {
      for (const c of a.categories || []) n += c.items?.length || 0;
    }
    return n;
  }, [storageAreas]);

  const expiringSoonCount = useMemo(() => {
    let n = 0;
    for (const area of storageAreas ?? []) {
      for (const category of area.categories || []) {
        for (const item of category.items || []) {
          if (isExpiringSoon(item.expiration_date, expDays)) n += 1;
        }
      }
    }
    return n;
  }, [storageAreas, expDays]);

  const desktopSummaryCards = [
    {
      label: 'Storage Areas',
      value: totalAreas,
      description: 'Places inside this space',
      icon: FaWarehouse,
    },
    {
      label: 'Categories',
      value: totalCategories,
      description: 'Groups across all areas',
      icon: FaTags,
    },
    {
      label: 'Items',
      value: totalItems,
      description: 'Things stored here',
      icon: FaBoxOpen,
    },
    {
      label: 'Expiring Soon',
      value: expiringSoonCount,
      description: 'Items expiring soon',
      icon: FaExclamationTriangle,
      isWarning: true,
    },
  ];

  // ---------- Expand/Collapse helpers ----------
  const toggleArea = (id) =>
    setExpandedAreas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const toggleCategory = (id) =>
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const expandAllAreas = () => {
    setExpandedAreas(
      Object.fromEntries((storageAreas || []).map((area) => [area.id, true]))
    );
    setExpandedCategories(
      Object.fromEntries(
        (storageAreas || []).flatMap((area) =>
          (area.categories || []).map((category) => [category.id, true])
        )
      )
    );
  };

  const collapseAllAreas = () => {
    setExpandedAreas(
      Object.fromEntries((storageAreas || []).map((area) => [area.id, false]))
    );
    setExpandedCategories(
      Object.fromEntries(
        (storageAreas || []).flatMap((area) =>
          (area.categories || []).map((category) => [category.id, false])
        )
      )
    );
  };

  const allAreasExpanded =
    (storageAreas || []).length > 0 &&
    (storageAreas || []).every((area) => expandedAreas[area.id]) &&
    (storageAreas || []).every((area) =>
      (area.categories || []).every((category) => expandedCategories[category.id])
    );

  // ---------- Modal helpers ----------
  const closeAreaModal = () =>
    setAreaModal({
      open: false,
      mode: 'create',
      areaId: null,
      name: '',
      imageUrl: null,
      image_path: null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
      locationName: '',
    });

  const closeCategoryModal = () =>
    setCategoryModal({
      open: false,
      mode: 'create',
      areaId: null,
      categoryId: null,
      areaName: '',
      name: '',
      imageUrl: null,
      image_path: null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
    });

  const closeItemModal = () =>
    setItemModal({
      open: false,
      mode: 'create',
      areaId: null,
      categoryId: null,
      itemId: null,
      categoryName: '',
      name: '',
      quantity: '',
      expirationDate: '',
      imageUrl: null,
      image_path: null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
    });

  // ---------- Storage Area CRUD ----------
  const openCreateAreaModal = () =>
    canEditInventory &&
    setAreaModal({
      open: true,
      mode: 'create',
      areaId: null,
      name: '',
      imageUrl: null,
      image_path: null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
      locationName,
    });

  const openEditAreaModal = (area) =>
    canEditInventory &&
    setAreaModal({
      open: true,
      mode: 'edit',
      areaId: area.id,
      name: area.name,
      imageUrl: area.imageUrl ?? null,
      image_path: area.image_path ?? null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
      locationName,
    });

  const handleAreaImageChange = ({ imagePath, imageUrl }) => {
    setAreaModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
    }));
    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === areaModal.areaId
          ? { ...area, image_path: imagePath ?? null, imageUrl: imageUrl ?? null }
          : area
      )
    );
    emitInventoryChange({
      entity: 'storage_area',
      action: imagePath ? 'image_updated' : 'image_removed',
      id: areaModal.areaId,
    });
  };

  const submitAreaModal = async () => {
    if (!canEditInventory) return;
    const name = areaModal.name.trim();
    if (!name) return;

    if (areaModal.mode === 'edit') {
      const result = await updateStorageArea(areaModal.areaId, name);
      if (!result?.error) {
        setStorageAreas((prev) =>
          prev.map((a) => (a.id === areaModal.areaId ? { ...a, name } : a))
        );
        emitInventoryChange({
          entity: 'storage_area',
          action: 'updated',
          id: areaModal.areaId,
        });
        closeAreaModal();
      }
      return;
    }

    const result = await addStorageArea(locationId, name);
    if (result?.data) {
      const uploadedImage = await uploadCreatedEntityImage(
        'storage_area',
        result.data.id,
        areaModal.imageFile
      );
      const createdArea = {
        ...result.data,
        image_path: uploadedImage?.imagePath ?? result.data.image_path ?? null,
        imageUrl: uploadedImage?.imageUrl ?? null,
        categories: [],
      };

      setStorageAreas((prev) => [...prev, createdArea]);
      emitInventoryChange({
        entity: 'storage_area',
        action: 'added',
        id: result.data.id,
      });
      closeAreaModal();
    }
  };

  const performDeleteStorageArea = async (id) => {
    if (!canEditInventory) return;
    const result = await deleteStorageArea(id);
    if (!result?.error) {
      setStorageAreas((prev) => prev.filter((a) => a.id !== id));
      emitInventoryChange({
        entity: 'storage_area',
        action: 'deleted',
        id,
      });
    } else {
      console.error('deleteStorageArea error:', result.error);
    }
  };

  // ---------- Category CRUD ----------
  const openCreateCategoryModal = (area) =>
    canEditInventory &&
    setCategoryModal({
      open: true,
      mode: 'create',
      areaId: area.id,
      categoryId: null,
      areaName: area.name,
      name: '',
      imageUrl: null,
      image_path: null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
    });

  const openEditCategoryModal = (area, category) =>
    canEditInventory &&
    setCategoryModal({
      open: true,
      mode: 'edit',
      areaId: area.id,
      categoryId: category.id,
      areaName: area.name,
      name: category.name,
      imageUrl: category.imageUrl ?? null,
      image_path: category.image_path ?? null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
    });

  const handleCategoryImageChange = ({ imagePath, imageUrl }) => {
    setCategoryModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
    }));
    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === categoryModal.areaId
          ? {
              ...area,
              categories: area.categories.map((category) =>
                category.id === categoryModal.categoryId
                  ? {
                      ...category,
                      image_path: imagePath ?? null,
                      imageUrl: imageUrl ?? null,
                    }
                  : category
              ),
            }
          : area
      )
    );
    emitInventoryChange({
      entity: 'category',
      action: imagePath ? 'image_updated' : 'image_removed',
      id: categoryModal.categoryId,
    });
  };

  const submitCategoryModal = async () => {
    if (!canEditInventory) return;
    const name = categoryModal.name.trim();
    if (!name) return;

    if (categoryModal.mode === 'edit') {
      const result = await updateCategoryName(categoryModal.categoryId, name);
      if (!result?.error) {
        setStorageAreas((prev) =>
          prev.map((a) =>
            a.id === categoryModal.areaId
              ? {
                  ...a,
                  categories: a.categories.map((c) =>
                    c.id === categoryModal.categoryId ? { ...c, name } : c
                  ),
                }
              : a
          )
        );
        emitInventoryChange({
          entity: 'category',
          action: 'updated',
          id: categoryModal.categoryId,
        });
        closeCategoryModal();
      }
      return;
    }

    const result = await addCategory(categoryModal.areaId, name);
    if (result?.error) {
      console.error('addCategory error:', result.error);
      alert(result.error.message || 'Failed to add category');
      return;
    }

    if (result?.data) {
      const uploadedImage = await uploadCreatedEntityImage(
        'category',
        result.data.id,
        categoryModal.imageFile
      );
      const createdCategory = {
        ...result.data,
        image_path: uploadedImage?.imagePath ?? result.data.image_path ?? null,
        imageUrl: uploadedImage?.imageUrl ?? null,
        items: [],
      };

      setStorageAreas((prev) =>
        prev.map((a) =>
          a.id === categoryModal.areaId
            ? { ...a, categories: [...(a.categories || []), createdCategory] }
            : a
        )
      );
      closeCategoryModal();
      emitInventoryChange({
        entity: 'category',
        action: 'added',
        id: result.data.id,
      });
    }
  };

  const performDeleteCategory = async (categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    const result = await deleteCategory(categoryId);
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((a) =>
          a.id === storageAreaId
            ? {
                ...a,
                categories: a.categories.filter((c) => c.id !== categoryId),
              }
            : a
        )
      );
      emitInventoryChange({
        entity: 'category',
        action: 'deleted',
        id: categoryId,
      });
    } else {
      console.error('deleteCategory error:', result.error);
    }
  };

  // ---------- Item CRUD ----------
  const openCreateItemModal = (area, category) =>
    canEditInventory &&
    setItemModal({
      open: true,
      mode: 'create',
      areaId: area.id,
      categoryId: category.id,
      itemId: null,
      categoryName: category.name,
      name: '',
      quantity: '',
      expirationDate: '',
      imageUrl: null,
      image_path: null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
    });

  const openEditItemModal = (area, category, item) =>
    canEditInventory &&
    setItemModal({
      open: true,
      mode: 'edit',
      areaId: area.id,
      categoryId: category.id,
      itemId: item.id,
      categoryName: category.name,
      name: item.name,
      quantity: String(item.quantity ?? 0),
      expirationDate: item.expiration_date || '',
      imageUrl: item.imageUrl ?? null,
      image_path: item.image_path ?? null,
      imageFile: null,
      imagePreview: null,
      imageMessage: '',
    });

  const handleItemImageChange = ({ imagePath, imageUrl }) => {
    setItemModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
    }));
    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === itemModal.areaId
          ? {
              ...area,
              categories: area.categories.map((cat) =>
                cat.id === itemModal.categoryId
                  ? {
                      ...cat,
                      items: cat.items.map((item) =>
                        item.id === itemModal.itemId
                          ? {
                              ...item,
                              image_path: imagePath ?? null,
                              imageUrl: imageUrl ?? null,
                            }
                          : item
                      ),
                    }
                  : cat
              ),
            }
          : area
      )
    );
    emitInventoryChange({
      entity: 'item',
      action: imagePath ? 'image_updated' : 'image_removed',
      id: itemModal.itemId,
    });
  };

  const submitItemModal = async () => {
    if (!canEditInventory) return;
    if (!itemModal.name.trim()) return;
    setLimitNotice(null);

    const payload = {
      name: itemModal.name.trim(),
      quantity: toNonNegativeInteger(itemModal.quantity, 0),
      expiration_date: itemModal.expirationDate || null,
    };

    if (itemModal.mode === 'edit') {
      const { data, error } = await updateItem(itemModal.itemId, payload);
      if (error) {
        console.error(error);
        return;
      }

      setStorageAreas((prev) =>
        prev.map((area) =>
          area.id === itemModal.areaId
            ? {
                ...area,
                categories: area.categories.map((cat) =>
                  cat.id === itemModal.categoryId
                    ? {
                        ...cat,
                        items: cat.items.map((it) =>
                          it.id === itemModal.itemId
                            ? {
                                ...it,
                                ...data,
                                imageUrl: it.imageUrl,
                              }
                            : it
                        ),
                      }
                    : cat
                ),
              }
            : area
        )
      );
      emitInventoryChange({
        entity: 'item',
        action: 'updated',
        id: itemModal.itemId,
      });
      closeItemModal();
      return;
    }

    const result = await addItem(itemModal.categoryId, payload);
    if (result?.error) {
      setLimitNotice({
        message:
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Could not add item.',
        upgradeHref: result.upgradeHref,
      });
      return;
    }

    let created = result?.data;
    if (!created) return;

    const uploadedImage = await uploadCreatedEntityImage(
      'item',
      created.id,
      itemModal.imageFile
    );
    if (uploadedImage) {
      created = {
        ...created,
        image_path: uploadedImage.imagePath ?? created.image_path ?? null,
        imageUrl: uploadedImage.imageUrl ?? created.imageUrl ?? null,
      };
    }

    setStorageAreas((prev) =>
      prev.map((area) => ({
        ...area,
        categories: (area.categories || []).map((cat) =>
          cat.id === itemModal.categoryId
            ? { ...cat, items: [...(cat.items || []), created] }
            : cat
        ),
      }))
    );

    emitItemAdded({
      ...created,
      locationId,
      locationName,
      storageAreaId: itemModal.areaId,
      storageAreaName:
        storageAreas.find((area) => String(area.id) === String(itemModal.areaId))
          ?.name ?? null,
      categoryId: itemModal.categoryId,
      categoryName: itemModal.categoryName,
    });
    closeItemModal();
  };

  const performDeleteItem = async (itemId, categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    const result = await deleteItem(itemId);
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((area) =>
          area.id === storageAreaId
            ? {
                ...area,
                categories: area.categories.map((cat) =>
                  cat.id === categoryId
                    ? {
                        ...cat,
                        items: cat.items.filter((it) => it.id !== itemId),
                      }
                    : cat
                ),
              }
            : area
        )
      );
      emitInventoryChange({
        entity: 'item',
        action: 'deleted',
        id: itemId,
      });
    } else {
      console.error('deleteItem error:', result.error);
    }
  };

  const performBulkDeleteItems = async (itemIds, categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    for (const id of itemIds) {
      await deleteItem(id);
    }

    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map((cat) =>
                cat.id === categoryId
                  ? {
                      ...cat,
                      items: (cat.items || []).filter((i) => !itemIds.includes(i.id)),
                    }
                  : cat
              ),
            }
          : area
      )
    );

    setSelectedByCategory((prev) => ({ ...prev, [categoryId]: {} }));
    emitInventoryChange({
      entity: 'item',
      action: 'deleted',
      ids: itemIds,
    });
  };

  const handleConfirmDelete = async () => {
    if (!canEditInventory) return;
    const { entityType, payload } = deleteDialog;
    if (!entityType || !payload) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      if (entityType === 'area') {
        await performDeleteStorageArea(payload.areaId);
      } else if (entityType === 'category') {
        await performDeleteCategory(payload.categoryId, payload.storageAreaId);
      } else if (entityType === 'item') {
        await performDeleteItem(
          payload.itemId,
          payload.categoryId,
          payload.storageAreaId
        );
      } else if (entityType === 'bulk-items') {
        await performBulkDeleteItems(
          payload.itemIds,
          payload.categoryId,
          payload.storageAreaId
        );
      }
    } catch (e) {
      console.error('Error during delete:', e);
    } finally {
      closeDeleteDialog();
    }
  };

  const deleteTitle = (() => {
    const { entityType, payload } = deleteDialog;
    if (!entityType || !payload) return 'Delete';

    if (entityType === 'area') {
      return `Delete storage area "${payload.name}"?`;
    }
    if (entityType === 'category') {
      return `Delete category "${payload.name}"?`;
    }
    if (entityType === 'item') {
      return `Delete item "${payload.itemName}"?`;
    }
    if (entityType === 'bulk-items') {
      return `Delete ${payload.count} items?`;
    }
    return 'Delete';
  })();

  const deleteDescription = (() => {
    const { entityType, payload } = deleteDialog;
    if (!entityType || !payload) return '';

    if (entityType === 'area') {
      return 'This will remove this storage area and all of its categories and items. This action cannot be undone.';
    }
    if (entityType === 'category') {
      return `This will remove the category "${payload.name}" in ${payload.areaName}, including all items inside it. This action cannot be undone.`;
    }
    if (entityType === 'item') {
      return `This will permanently delete "${payload.itemName}" from ${payload.categoryName} in ${payload.areaName}. This cannot be undone.`;
    }
    if (entityType === 'bulk-items') {
      return `This will permanently delete ${payload.count} selected item${
        payload.count > 1 ? 's' : ''
      } from ${payload.categoryName} in ${payload.areaName}. This cannot be undone.`;
    }
    return '';
  })();



  const toggleSelectItem = (categoryId, itemId) => {
    if (!canEditInventory) return;
    const categoryKey = String(categoryId);
    const itemKey = String(itemId);

    setSelectedByCategory((prev) => {
      const selected = Boolean(prev[categoryKey]?.[itemKey]);
      const nextCategorySelection = { ...(prev[categoryKey] || {}) };

      if (selected) {
        delete nextCategorySelection[itemKey];
      } else {
        nextCategorySelection[itemKey] = true;
      }

      return Object.keys(nextCategorySelection).length
        ? { [categoryKey]: nextCategorySelection }
        : {};
    });
  };

  const selectVisibleItemsInCategory = (categoryId, items) => {
    if (!canEditInventory) return;
    const itemIds = (items ?? []).map((item) => String(item.id));
    if (itemIds.length === 0) return;

    setSelectedByCategory((prev) => {
      const categoryKey = String(categoryId);
      const current = prev[categoryKey] || {};
      const allSelected = itemIds.every((itemId) => current[itemId]);

      if (allSelected) return {};

      return {
        [categoryKey]: itemIds.reduce((next, itemId) => {
          next[itemId] = true;
          return next;
        }, {}),
      };
    });
  };

  const clearSelectedItems = () => {
    setSelectedByCategory({});
  };

  // ---------- Move items logic ----------

  const openMoveModal = (areaId, categoryId, singleItemId = null) => {
    if (!canEditInventory) return;
    const selectedMap = selectedByCategory[categoryId] || {};
    let itemIds = Object.keys(selectedMap).filter((k) => selectedMap[k]);

    // If nothing selected but a single item action triggered it, move that one
    if (itemIds.length === 0 && singleItemId) {
      itemIds = [singleItemId];
    }

    if (itemIds.length === 0) {
      alert('Select at least one item to move.');
      return;
    }

    // Default target: current location + same area/category
    setMoveModal({
      open: true,
      sourceAreaId: areaId,
      sourceCategoryId: categoryId,
      targetLocationId: locationId,
      targetAreaId: areaId,
      targetCategoryId: categoryId,
      itemIds,
    });
  };

  const handleConfirmMove = async () => {
    if (!canEditInventory) return;
    const {
      sourceAreaId,
      sourceCategoryId,
      targetLocationId,
      targetAreaId,
      targetCategoryId,
      itemIds,
    } = moveModal;

    if (!targetCategoryId || itemIds.length === 0) return;
    if (String(targetCategoryId) === String(sourceCategoryId)) return;

    // Find source area/category in current state
    const sourceArea = storageAreas.find(
      (a) => String(a.id) === String(sourceAreaId)
    );
    const sourceCat = sourceArea?.categories?.find(
      (c) => String(c.id) === String(sourceCategoryId)
    );
    const itemsToMove = (sourceCat?.items || []).filter((it) =>
      itemIds.includes(it.id)
    );

    // --- DB update: only change category_id ---
    const results = await Promise.all(
      itemsToMove.map((it) =>
        updateItemLocation(it.id, {
          categoryId: targetCategoryId,
        })
      )
    );

    const hasError = results.some((r) => r?.error);
    if (hasError) {
      console.error('Error moving some items:', results);
      alert('There was a problem moving one or more items. Nothing was changed.');
      return;
    }

    // --- Local state update ---
    if (String(targetLocationId) === String(locationId)) {
      setStorageAreas((prev) =>
        prev.map((area) => {
          if (
            String(area.id) !== String(sourceAreaId) &&
            String(area.id) !== String(targetAreaId)
          ) {
            return area;
          }

          return {
            ...area,
            categories: (area.categories || []).map((cat) => {
              // remove from source
              if (String(cat.id) === String(sourceCategoryId)) {
                return {
                  ...cat,
                  items: (cat.items || []).filter((it) => !itemIds.includes(it.id)),
                };
              }

              // add to target (same location case)
              if (String(cat.id) === String(targetCategoryId)) {
                return {
                  ...cat,
                  items: [
                    ...(cat.items || []),
                    ...itemsToMove.map((it) => ({
                      ...it,
                      category_id: targetCategoryId,
                    })),
                  ],
                };
              }

              return cat;
            }),
          };
        })
      );
    } else {
      // different location: just remove from source; other location UI will fetch fresh data
      setStorageAreas((prev) =>
        prev.map((area) => {
          if (String(area.id) !== String(sourceAreaId)) return area;
          return {
            ...area,
            categories: (area.categories || []).map((cat) =>
              String(cat.id) === String(sourceCategoryId)
                ? {
                    ...cat,
                    items: (cat.items || []).filter((it) => !itemIds.includes(it.id)),
                  }
                : cat
            ),
          };
        })
      );
    }

    // Clear selection on source category and close modal
    setSelectedByCategory((prev) => ({
      ...prev,
      [sourceCategoryId]: {},
    }));

    setMoveModal({
      open: false,
      sourceAreaId: null,
      sourceCategoryId: null,
      targetLocationId: locationId,
      targetAreaId: null,
      targetCategoryId: null,
      itemIds: [],
    });
    emitInventoryChange({
      entity: 'item',
      action: 'moved',
      ids: itemIds,
    });
  };

  const handleMoveDestinationCreated = ({
    type,
    locationId: createdLocationId,
    area,
    areaId,
    category,
  }) => {
    if (type === 'area' && String(createdLocationId) === String(locationId) && area?.id) {
      setStorageAreas((prev) => {
        if (prev.some((item) => String(item.id) === String(area.id))) return prev;
        return [...prev, { ...area, categories: [] }];
      });
      return;
    }

    if (type === 'category' && category?.id && areaId) {
      setStorageAreas((prev) =>
        prev.map((storageArea) =>
          String(storageArea.id) === String(areaId)
            ? {
                ...storageArea,
                categories: (storageArea.categories || []).some(
                  (item) => String(item.id) === String(category.id)
                )
                  ? storageArea.categories
                  : [
                      ...(storageArea.categories || []),
                      { ...category, items: [] },
                    ],
              }
            : storageArea
        )
      );
    }
  };



  // ---------- Filtering ----------
  const totalPages = Math.max(
    1,
    Math.ceil(totalStorageAreaCount / LOCATION_DETAIL_PAGE_SIZE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem =
    totalStorageAreaCount === 0
      ? 0
      : (safeCurrentPage - 1) * LOCATION_DETAIL_PAGE_SIZE + 1;
  const endItem = Math.min(
    (safeCurrentPage - 1) * LOCATION_DETAIL_PAGE_SIZE + storageAreas.length,
    totalStorageAreaCount
  );
  const hierarchyFiltersActive = Boolean(normalizedSearch || expSoonEnabled);
  const activeMobileCategory = useMemo(() => {
    if (!mobileCategorySheet) return null;

    const area = (storageAreas ?? []).find(
      (item) => String(item.id) === String(mobileCategorySheet.areaId)
    );
    const category = area?.categories?.find(
      (item) => String(item.id) === String(mobileCategorySheet.categoryId)
    );

    if (!area || !category) return null;

    const areaNameMatches =
      normalizedSearch && containsQuery(area.name, normalizedSearch);
    const categoryNameMatches =
      normalizedSearch && containsQuery(category.name, normalizedSearch);

    const items = (category.items ?? []).filter((item) => {
      if (expSoonEnabled && !isExpiringSoon(item.expiration_date, expDays)) {
        return false;
      }
      if (!normalizedSearch || areaNameMatches || categoryNameMatches) {
        return true;
      }
      return containsQuery(item.name, normalizedSearch);
    });

    return {
      area,
      category,
      items,
    };
  }, [mobileCategorySheet, storageAreas, normalizedSearch, expSoonEnabled, expDays]);

  const visibleStorageAreas = useMemo(
    () =>
      (storageAreas ?? [])
        .map((area) => {
          const filtersActive = Boolean(normalizedSearch || expSoonEnabled);
          const areaNameMatches =
            normalizedSearch && containsQuery(area.name, normalizedSearch);
          const categories = (area.categories ?? [])
            .map((category) => {
              const categoryNameMatches =
                normalizedSearch && containsQuery(category.name, normalizedSearch);
              const items = (category.items ?? []).filter((item) => {
                if (expSoonEnabled && !isExpiringSoon(item.expiration_date, expDays)) {
                  return false;
                }
                if (!normalizedSearch || areaNameMatches || categoryNameMatches) {
                  return true;
                }
                return containsQuery(item.name, normalizedSearch);
              });
              const shouldShowCategory =
                !filtersActive || areaNameMatches || categoryNameMatches || items.length > 0;

              return shouldShowCategory ? { ...category, visibleItems: items } : null;
            })
            .filter(Boolean);

          const areaItemCount = (area.categories ?? []).reduce(
            (sum, category) => sum + (category.items?.length ?? 0),
            0
          );
          const shouldShowArea =
            !filtersActive
              ? true
              : areaNameMatches || categories.length > 0;

          return shouldShowArea
            ? {
                ...area,
                visibleCategories: categories,
                areaItemCount,
              }
            : null;
        })
        .filter(Boolean),
    [storageAreas, normalizedSearch, expSoonEnabled, expDays]
  );
  const showSearchRestoreLoader =
    isLoadingStorageAreas &&
    !hierarchyFiltersActive &&
    storageAreas.length === 0 &&
    visibleStorageAreas.length === 0;

  const selectedBulkContext = useMemo(() => {
    for (const area of visibleStorageAreas ?? []) {
      for (const category of area.visibleCategories ?? []) {
        const selectedMap = selectedByCategory[String(category.id)] || {};
        const itemIds = Object.keys(selectedMap).filter((itemId) => selectedMap[itemId]);
        if (itemIds.length === 0) continue;

        const visibleItems = category.visibleItems ?? [];

        return {
          area,
          category,
          itemIds,
          visibleItems,
          allVisibleSelected:
            visibleItems.length > 0 &&
            visibleItems.every((item) => selectedMap[String(item.id)]),
        };
      }
    }

    return null;
  }, [visibleStorageAreas, selectedByCategory]);

  const activeMobileSelectionContext =
    activeMobileCategory &&
    selectedBulkContext &&
    String(activeMobileCategory.category.id) ===
      String(selectedBulkContext.category.id)
      ? selectedBulkContext
      : null;

  // ---------- UI ----------
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-28 transition-all duration-150"
    >
      {limitNotice && (
        <motion.div
          variants={pageItemVariants}
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {limitNotice.message}
          {limitNotice.upgradeHref && (
            <Link
              href={limitNotice.upgradeHref}
              className="ml-2 font-semibold underline underline-offset-2"
            >
              View plans
            </Link>
          )}
        </motion.div>
      )}
      {storageAreasError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {storageAreasError}
        </div>
      ) : null}

      {canEditInventory && (
        <AnimatePresence initial={false}>
          {selectedBulkContext ? (
            <motion.div
              key="location-category-bulk-actions"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] px-4 max-md:hidden"
            >
              <div className="pointer-events-auto mx-auto max-w-2xl rounded-2xl border border-[var(--stocksense-brand-border)] bg-white p-3 shadow-2xl shadow-slate-900/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-950">
                      {selectedBulkContext.itemIds.length} selected in{' '}
                      {selectedBulkContext.category.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {selectedBulkContext.area.name} | {locationName}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                      onPress={() =>
                        selectVisibleItemsInCategory(
                          selectedBulkContext.category.id,
                          selectedBulkContext.visibleItems
                        )
                      }
                      isDisabled={selectedBulkContext.visibleItems.length === 0}
                    >
                      {selectedBulkContext.allVisibleSelected
                        ? 'Deselect visible'
                        : 'Select visible'}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="rounded-xl border border-gray-200 bg-white text-gray-700"
                      onPress={clearSelectedItems}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                      onPress={() =>
                        openMoveModal(
                          selectedBulkContext.area.id,
                          selectedBulkContext.category.id
                        )
                      }
                    >
                      Move
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      className="rounded-xl"
                      onPress={() =>
                        openDeleteDialog('bulk-items', {
                          itemIds: selectedBulkContext.itemIds,
                          categoryId: selectedBulkContext.category.id,
                          storageAreaId: selectedBulkContext.area.id,
                          categoryName: selectedBulkContext.category.name,
                          areaName: selectedBulkContext.area.name,
                          count: selectedBulkContext.itemIds.length,
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {/* Desktop overview and tools */}
      <motion.section variants={pageItemVariants} className="max-md:hidden">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {desktopSummaryCards.map(({ label, value, description, icon: Icon, isWarning }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-[1.35rem] border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-md"
            >
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
                  isWarning
                    ? 'border-[var(--entity-warning-border)] bg-[var(--entity-warning-soft)] text-[var(--entity-warning-accent)]'
                    : 'border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-950">{label}</h2>
                <p className="text-3xl font-semibold tracking-tight text-gray-950">
                  {value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
          <div className="grid max-w-6xl gap-3">
            <Input
              value={search}
              onValueChange={handleSearchChange}
              placeholder={`Search areas, categories, or items in ${locationName}...`}
              radius="lg"
              variant="bordered"
              className="w-full max-w-md"
              startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
              classNames={{
                inputWrapper:
                  'min-h-10 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]',
                input: 'text-sm text-gray-900 placeholder:text-gray-400',
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={expSoonEnabled}
                  onChange={() => setExpSoonEnabled((value) => !value)}
                  className="h-4 w-4 cursor-pointer rounded border border-gray-300"
                />
                  Expiring
              </label>
              <input
                type="number"
                min={1}
                value={expDays}
                onChange={(event) =>
                  setExpDays(toPositiveInteger(event.target.value, 7))
                }
                className="h-10 w-16 rounded-xl border border-gray-200 bg-white px-2 text-sm text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
                disabled={!expSoonEnabled}
                aria-label="Expiring within days"
              />
              <span className="text-xs font-medium text-gray-500">days</span>
              <Select
                aria-label="Sort storage areas"
                selectedKeys={new Set([sortBy])}
                onSelectionChange={(keys) =>
                  setSortBy(String(Array.from(keys)[0] || 'name_asc'))
                }
                variant="bordered"
                radius="lg"
                className="w-36"
                classNames={themedSelectClassNames}
              >
                {SORT_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value}>{label}</SelectItem>
                ))}
              </Select>

              {storageAreas.length > 0 && (
                <button
                  type="button"
                  onClick={allAreasExpanded ? collapseAllAreas : expandAllAreas}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:text-[var(--stocksense-brand)]"
                >
                  {allAreasExpanded ? 'Collapse all' : 'Expand all'}
                  <FaChevronUp
                    className={`h-3.5 w-3.5 transition-transform ${
                      allAreasExpanded ? '' : 'rotate-180'
                    }`}
                  />
                </button>
              )}

              {canEditInventory && (
                <button
                  type="button"
                  onClick={openCreateAreaModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                >
                  <FaPlus className="h-3.5 w-3.5" />
                  Add Storage Area
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Mobile hierarchy */}
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 md:hidden"
      >
        <motion.div
          variants={pageItemVariants}
          initial="hidden"
          animate="show"
          className="flex items-end justify-between gap-3"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              Storage areas
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse the places inside this location.
            </p>
          </div>
          {canEditInventory && storageAreas.length > 0 && (
            <button
              onClick={openCreateAreaModal}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
            >
              <FaPlus className="h-3 w-3" /> Add
            </button>
          )}
        </motion.div>

        <Input
          value={search}
          onValueChange={handleSearchChange}
          placeholder={`Search ${locationName}`}
          radius="lg"
          variant="bordered"
          startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
          classNames={{
            inputWrapper:
              'min-h-11 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]',
            input: 'text-sm text-gray-900 placeholder:text-gray-400',
          }}
        />

        <Select
          aria-label="Sort storage areas"
          selectedKeys={new Set([sortBy])}
          onSelectionChange={(keys) =>
            setSortBy(String(Array.from(keys)[0] || 'name_asc'))
          }
          variant="bordered"
          radius="lg"
          classNames={themedSelectClassNames}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <SelectItem key={value}>{label}</SelectItem>
          ))}
        </Select>

        {showSearchRestoreLoader ? (
          <SearchResultsLoadingState
            label="Loading inventory"
            detail="Restoring everything in this location."
          />
        ) : storageAreas.length === 0 && !hierarchyFiltersActive ? (
          <motion.div
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center shadow-sm"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
              <FaWarehouse className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No storage areas yet
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Create the first storage area for this location.
            </p>
            {canEditInventory && (
              <div className="mt-4">
                <button
                  onClick={openCreateAreaModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[var(--stocksense-brand)] shadow-sm"
                >
                  <FaPlus /> New storage area
                </button>
              </div>
            )}
          </motion.div>
        ) : visibleStorageAreas.length === 0 ? (
          <motion.div
            variants={pageItemVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
              <FaSearch className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No matching inventory
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {normalizedSearch
                ? `Nothing matched "${search.trim()}". Clear the search or try a different term.`
                : 'Try another search or adjust the expiration filter.'}
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
            ) : null}
          </motion.div>
        ) : (
          visibleStorageAreas.map((area) => {
            const visibleCategories = area.visibleCategories ?? [];
            const areaItemCount = area.areaItemCount ?? 0;

            return (
            <motion.article
              key={area.id}
              variants={pageItemVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm"
            >
              <div className="border-t-4 border-[var(--entity-area-accent)] p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={Boolean(expandedAreas[area.id])}
                    aria-label={`${expandedAreas[area.id] ? 'Collapse' : 'Expand'} ${area.name}`}
                  >
                    {area.imageUrl ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-area-border)] bg-white">
                        <ImageWithLoader
                          src={area.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
                        <FaWarehouse className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-gray-900">
                        {area.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {(area.categories || []).length}{' '}
                        {(area.categories || []).length === 1 ? 'category' : 'categories'} |{' '}
                        {areaItemCount} {areaItemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    <FaChevronUp
                      className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                        expandedAreas[area.id] ? '' : 'rotate-180'
                      }`}
                    />
                  </button>
                </div>

                {canEditInventory && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEditAreaModal(area)}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-700"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() =>
                        openDeleteDialog('area', {
                          areaId: area.id,
                          name: area.name,
                        })
                      }
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs font-medium text-rose-700"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence initial={false}>
                {expandedAreas[area.id] && (
                  <motion.div
                    key={`${area.id}-mobile-content`}
                    variants={collapseVariants}
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-gray-100 bg-gray-50/70 p-3">
                      {visibleCategories.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-sm text-gray-500">
                          {normalizedSearch || expSoonEnabled
                            ? 'No matching categories or items.'
                            : 'No categories yet.'}
                        </div>
                      ) : (
                        visibleCategories.map((category) => {
                          const items = category.visibleItems ?? [];

                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() =>
                                setMobileCategorySheet({
                                  areaId: area.id,
                                  categoryId: category.id,
                                })
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {category.imageUrl ? (
                                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-category-border)] bg-white">
                                    <ImageWithLoader
                                      src={category.imageUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                                    <FaTags className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    {category.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {items.length} {items.length === 1 ? 'item' : 'items'}
                                  </p>
                                </div>
                              </div>
                              <FaChevronUp className="h-3.5 w-3.5 rotate-90 text-gray-400" />
                            </button>
                          );
                        })
                      )}

                      {canEditInventory && (
                        <button
                          onClick={() => openCreateCategoryModal(area)}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--stocksense-brand-border)] bg-white text-sm font-medium text-[var(--stocksense-brand)]"
                        >
                          <FaLayerGroup /> New category
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
            );
          })
        )}
        <PaginationControls
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={totalStorageAreaCount}
          isLoading={isLoadingStorageAreas}
          onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        />
      </motion.div>

      {/* Desktop hierarchy */}
      <motion.div variants={pageVariants} className="hidden space-y-5 md:block">
        <div className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">
                Location map
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Storage areas, categories, and items inside {locationName}.
              </p>
            </div>
            <div className="lg:min-w-[24rem]">
              <PaginationControls
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                startItem={startItem}
                endItem={endItem}
                totalItems={totalStorageAreaCount}
                isLoading={isLoadingStorageAreas}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
        {showSearchRestoreLoader ? (
          <SearchResultsLoadingState
            label="Loading inventory"
            detail="Restoring everything in this location."
            className="p-10"
          />
        ) : storageAreas.length === 0 && !hierarchyFiltersActive ? (
          <motion.div
            variants={pageItemVariants}
            className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/35 p-10 text-center"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
              <FaWarehouse className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-950">
              Nothing stored here yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
              Create a shelf, closet, drawer, cabinet, or bin to start organizing this space.
            </p>
            {canEditInventory && (
              <button
                type="button"
                onClick={openCreateAreaModal}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              >
                <FaPlus className="h-3.5 w-3.5" />
                Add Storage Area
              </button>
            )}
          </motion.div>
        ) : visibleStorageAreas.length === 0 ? (
          <motion.div
            variants={pageItemVariants}
            className="rounded-2xl border border-white/70 bg-gray-50/60 p-8 text-center"
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
              <FaSearch className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No matching inventory
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {normalizedSearch
                ? `Nothing matched "${search.trim()}". Clear the search to see this location again.`
                : 'Try another search or adjust the expiration filter.'}
            </p>
            {normalizedSearch ? (
              <Button
                onPress={clearSearch}
                radius="lg"
                variant="bordered"
                className="mt-5 border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-5 text-sm font-semibold text-[var(--stocksense-brand)]"
              >
                Clear search
              </Button>
            ) : null}
          </motion.div>
        ) : (
          visibleStorageAreas.map((area, areaIndex) => (
            <motion.article
              key={area.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 20,
                delay: areaIndex * 0.02,
              }}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/50 shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:shadow-md"
            >
              <div className="border-t-4 border-[var(--entity-area-accent)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <button
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent text-[var(--stocksense-brand)] transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]"
                      aria-expanded={Boolean(expandedAreas[area.id])}
                      aria-label={`${expandedAreas[area.id] ? 'Collapse' : 'Expand'} ${area.name}`}
                    >
                      <FaChevronUp
                        className={`h-4 w-4 transition-transform ${
                          expandedAreas[area.id] ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                    {area.imageUrl ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-area-border)] bg-white">
                        <ImageWithLoader
                          src={area.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
                        <FaWarehouse className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--entity-area-accent)]">
                          Storage area
                        </span>
                        <h2 className="truncate text-xl font-semibold tracking-tight text-gray-950">
                          {area.name}
                        </h2>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {(area.categories ?? []).length}{' '}
                        {(area.categories ?? []).length === 1
                          ? 'category'
                          : 'categories'}{' '}
                        &bull; {area.areaItemCount}{' '}
                        {area.areaItemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>

                  {canEditInventory && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openCreateCategoryModal(area)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:brightness-95"
                      >
                        <FaLayerGroup className="h-3.5 w-3.5" />
                        Add Category
                      </button>
                      <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            variant="light"
                            radius="lg"
                            className="h-10 w-10 min-w-10 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                            aria-label={`${area.name} actions`}
                          >
                            <FaEllipsisV className="h-4 w-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label={`${area.name} actions`}>
                          <DropdownItem
                            key="edit"
                            onPress={() => openEditAreaModal(area)}
                          >
                            Edit Storage Area
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            onPress={() =>
                              openDeleteDialog('area', {
                                areaId: area.id,
                                name: area.name,
                              })
                            }
                          >
                            Delete Storage Area
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {expandedAreas[area.id] && (
                    <motion.div
                      key={`${area.id}-desktop-content`}
                      variants={collapseVariants}
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      className="overflow-hidden"
                    >
                      <div className="mt-5 space-y-4">
                        {area.visibleCategories.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-white p-6 text-center">
                            <h3 className="text-base font-semibold text-gray-950">
                              No categories yet
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                              Create a category to group the items inside this storage area.
                            </p>
                            {canEditInventory ? (
                              <button
                                type="button"
                                onClick={() => openCreateCategoryModal(area)}
                                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                              >
                                <FaLayerGroup className="h-3.5 w-3.5" />
                                Add Category
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          area.visibleCategories.map((category, categoryIndex) => {
                      const items = category.visibleItems ?? [];

                      return (
                        <motion.section
                          key={category.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: categoryIndex * 0.02 }}
                          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleCategory(category.id)}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-transparent text-[var(--stocksense-brand)] transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]"
                                aria-expanded={Boolean(expandedCategories[category.id])}
                                aria-label={`${expandedCategories[category.id] ? 'Collapse' : 'Expand'} ${category.name}`}
                              >
                                <FaChevronUp
                                  className={`h-3.5 w-3.5 transition-transform ${
                                    expandedCategories[category.id] ? '' : 'rotate-180'
                                  }`}
                                />
                              </button>
                              {category.imageUrl ? (
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-category-border)] bg-white">
                                  <ImageWithLoader
                                    src={category.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                                  <FaTags className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--entity-category-accent)]">
                                    Category
                                  </span>
                                  <h3 className="truncate text-base font-semibold text-gray-950">
                                    {category.name}
                                  </h3>
                                </div>
                                <p className="text-xs font-medium text-gray-500">
                                  {(category.items ?? []).length}{' '}
                                  {(category.items ?? []).length === 1 ? 'item' : 'items'}
                                </p>
                              </div>
                            </div>

                            {canEditInventory && (
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openCreateItemModal(area, category)}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
                                >
                                  <FaBoxOpen className="h-3.5 w-3.5" />
                                  Add Item
                                </button>
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
                                    <DropdownItem
                                      key="edit"
                                      onPress={() => openEditCategoryModal(area, category)}
                                    >
                                      Edit Category
                                    </DropdownItem>
                                    <DropdownItem
                                      key="delete"
                                      className="text-danger"
                                      color="danger"
                                      onPress={() =>
                                        openDeleteDialog('category', {
                                          categoryId: category.id,
                                          storageAreaId: area.id,
                                          name: category.name,
                                          areaName: area.name,
                                        })
                                      }
                                    >
                                      Delete Category
                                    </DropdownItem>
                                  </DropdownMenu>
                                </Dropdown>
                              </div>
                            )}
                          </div>

                          <AnimatePresence initial={false}>
                            {expandedCategories[category.id] && (
                              <motion.div
                                key={`${category.id}-desktop-items`}
                                variants={collapseVariants}
                                initial="collapsed"
                                animate="open"
                                exit="collapsed"
                                className="overflow-hidden"
                              >
                                <div className="mt-3 space-y-2">
                                  {items.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/25 px-5 py-6 text-center">
                                      <h4 className="text-sm font-semibold text-gray-950">
                                        {normalizedSearch || expSoonEnabled
                                          ? 'No matching items'
                                          : 'No items yet'}
                                      </h4>
                                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                                        {normalizedSearch || expSoonEnabled
                                          ? 'Try another search or adjust the expiration filter.'
                                          : 'Add the first item to this category.'}
                                      </p>
                                      {canEditInventory && !normalizedSearch && !expSoonEnabled ? (
                                        <button
                                          type="button"
                                          onClick={() => openCreateItemModal(area, category)}
                                          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                                        >
                                          <FaBoxOpen className="h-3.5 w-3.5" />
                                          Add Item
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : (
                                    items.map((item, itemIndex) => {
                                const expirationDays = daysUntil(item.expiration_date);
                                const expired = expirationDays < 0;
                                const soon = !expired && isExpiringSoon(
                                  item.expiration_date,
                                  expDays
                                );
                                const quantity = toNonNegativeInteger(item.quantity, 0);
                                const lowStock = quantity <= 1;
                                const selected = Boolean(
                                  selectedByCategory[category.id]?.[item.id]
                                );

                                return (
                                  <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      duration: 0.18,
                                      delay: itemIndex * 0.015,
                                    }}
                                    className={`flex items-start justify-between gap-3 rounded-2xl border bg-white px-3 py-3 shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:shadow-md ${
                                      selected
                                        ? 'border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]'
                                        : 'border-white/70'
                                    }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      {item.imageUrl ? (
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
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
                                          <p className="truncate text-sm font-semibold text-gray-950">
                                            {item.name}
                                          </p>
                                          {(expired || soon || lowStock) && (
                                            <span className="flex flex-wrap gap-1.5">
                                              {(expired || soon) && (
                                                <span className="shrink-0 rounded-full border border-[var(--entity-warning-border)] bg-[var(--entity-warning-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--entity-warning-accent)]">
                                                  {expired ? 'Expired' : 'Expiring soon'}
                                                </span>
                                              )}
                                              {lowStock && (
                                                <span className="shrink-0 rounded-full border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--entity-item-accent)]">
                                                  Low stock
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-gray-500">
                                          <span>Qty: {quantity}</span>
                                          {item.expiration_date && (
                                            <span>Expires {item.expiration_date}</span>
                                          )}
                                          {item.barcode && (
                                            <span className="inline-flex min-w-0 items-center gap-1">
                                              <FaBarcode className="h-3 w-3" />
                                              <span className="truncate">{item.barcode}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {canEditInventory && (
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
                                          <DropdownItem
                                            key="select"
                                            onPress={() =>
                                              toggleSelectItem(category.id, item.id)
                                            }
                                          >
                                            {selected
                                              ? 'Deselect for bulk action'
                                              : 'Select for bulk action'}
                                          </DropdownItem>
                                          <DropdownItem
                                            key="view"
                                            onPress={() =>
                                              openEditItemModal(area, category, item)
                                            }
                                          >
                                            View Item
                                          </DropdownItem>
                                          <DropdownItem
                                            key="edit"
                                            onPress={() =>
                                              openEditItemModal(area, category, item)
                                            }
                                          >
                                            Edit Item
                                          </DropdownItem>
                                          <DropdownItem
                                            key="move"
                                            onPress={() =>
                                              openMoveModal(area.id, category.id, item.id)
                                            }
                                          >
                                            Move Item
                                          </DropdownItem>
                                          <DropdownItem
                                            key="delete"
                                            className="text-danger"
                                            color="danger"
                                            onPress={() =>
                                              openDeleteDialog('item', {
                                                itemId: item.id,
                                                itemName: item.name,
                                                categoryId: category.id,
                                                storageAreaId: area.id,
                                                categoryName: category.name,
                                                areaName: area.name,
                                              })
                                            }
                                          >
                                            Delete Item
                                          </DropdownItem>
                                        </DropdownMenu>
                                      </Dropdown>
                                    )}
                                  </motion.div>
                                );
                                    })
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.section>
                      );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.article>
          ))
        )}
          </div>

          {canEditInventory && storageAreas.length > 0 ? (
            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/35 px-5 py-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
                  <FaPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-950">
                    Add another storage area
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Create a new place inside {locationName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openCreateAreaModal}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              >
                <FaPlus className="h-3.5 w-3.5" />
                Add Storage Area
              </button>
            </div>
          ) : null}

          <div className="mt-5">
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalItems={totalStorageAreaCount}
              isLoading={isLoadingStorageAreas}
              onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 px-6 py-6">
          <div className="flex items-center gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
              <FaWarehouse className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-950">
                Tip: Build this location one area at a time
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Start with the main shelves, drawers, closets, or bins, then add
                categories and items as you go.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <Modal
        isOpen={Boolean(activeMobileCategory)}
        onOpenChange={(open) => {
          if (!open) setMobileCategorySheet(null);
        }}
        placement="bottom"
        scrollBehavior="inside"
        size="full"
        classNames={{
          wrapper: "items-end",
        }}
      >
        <ModalContent
          className={`${modalContentClass} max-h-[88svh] max-md:h-[88svh] max-md:max-h-[88svh] max-md:rounded-b-none max-md:rounded-t-3xl sm:rounded-2xl`}
          style={modalContentStyle}
        >
          {() => (
            <>
              <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[var(--stocksense-brand)]">
                    {activeMobileCategory?.category?.name || 'Category'}
                  </span>
                  <span className="block truncate text-sm font-normal text-gray-500">
                    {activeMobileCategory?.area?.name} | {locationName}
                  </span>
                </span>
                <MobileSheetCloseButton onPress={() => setMobileCategorySheet(null)} />
              </ModalHeader>

              <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                {canEditInventory && activeMobileCategory && (
                  <AnimatePresence initial={false} mode="wait">
                    {activeMobileSelectionContext ? (
                      <motion.div
                        key="location-mobile-category-selection"
                        initial={{ opacity: 0, y: -6, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.985 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="sticky top-3 z-[60] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                              {activeMobileSelectionContext.itemIds.length} selected
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                              Tap cards to adjust selection.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={clearSelectedItems}
                            className="min-h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              selectVisibleItemsInCategory(
                                activeMobileSelectionContext.category.id,
                                activeMobileSelectionContext.visibleItems
                              )
                            }
                            disabled={activeMobileSelectionContext.visibleItems.length === 0}
                            className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] disabled:opacity-50"
                          >
                            {activeMobileSelectionContext.allVisibleSelected
                              ? 'Deselect visible'
                              : 'Select visible'}
                          </button>
                          <span className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500">
                            {activeMobileSelectionContext.visibleItems.length} visible
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button
                            className="min-h-11 rounded-xl bg-[var(--stocksense-brand)] text-sm font-semibold text-white"
                            onPress={() =>
                              openMoveModal(
                                activeMobileSelectionContext.area.id,
                                activeMobileSelectionContext.category.id
                              )
                            }
                            isDisabled={activeMobileSelectionContext.itemIds.length === 0}
                          >
                            Move
                          </Button>
                          <Button
                            className="min-h-11 rounded-xl bg-rose-600 text-sm font-semibold text-white"
                            onPress={() =>
                              openDeleteDialog('bulk-items', {
                                itemIds: activeMobileSelectionContext.itemIds,
                                categoryId: activeMobileSelectionContext.category.id,
                                storageAreaId: activeMobileSelectionContext.area.id,
                                categoryName: activeMobileSelectionContext.category.name,
                                areaName: activeMobileSelectionContext.area.name,
                                count: activeMobileSelectionContext.itemIds.length,
                              })
                            }
                            isDisabled={activeMobileSelectionContext.itemIds.length === 0}
                          >
                            Delete
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="location-mobile-category-default"
                        initial={{ opacity: 0, y: 6, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.995 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="grid grid-cols-2 gap-2"
                      >
                        <button
                          onClick={() => {
                            openCreateItemModal(
                              activeMobileCategory.area,
                              activeMobileCategory.category
                            );
                          }}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-3 text-sm font-medium text-white"
                        >
                          <FaBoxOpen /> Add item
                        </button>
                        <button
                          onClick={() =>
                            openEditCategoryModal(
                              activeMobileCategory.area,
                              activeMobileCategory.category
                            )
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-700"
                        >
                          <FaEdit /> Edit category
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {activeMobileCategory?.items?.length ? (
                  activeMobileCategory.items.map((item) => {
                    const soon = isExpiringSoon(item.expiration_date, expDays);
                    const selected = Boolean(
                      selectedByCategory[activeMobileCategory.category.id]?.[item.id]
                    );

                    return (
                      <div
                        key={item.id}
                        role={activeMobileSelectionContext ? 'button' : undefined}
                        tabIndex={activeMobileSelectionContext ? 0 : undefined}
                        onClick={
                          activeMobileSelectionContext
                            ? () =>
                                toggleSelectItem(
                                  activeMobileCategory.category.id,
                                  item.id
                                )
                            : undefined
                        }
                        onKeyDown={
                          activeMobileSelectionContext
                            ? (event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  toggleSelectItem(
                                    activeMobileCategory.category.id,
                                    item.id
                                  );
                                }
                              }
                            : undefined
                        }
                        className={`rounded-2xl border bg-white p-3 shadow-sm ${
                          selected
                            ? 'border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]'
                            : 'border-gray-100'
                        } ${
                          activeMobileSelectionContext
                            ? 'cursor-pointer transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]'
                            : ''
                        }`}
                      >
                        <div className="flex min-w-0 gap-3">
                          {item.imageUrl ? (
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
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

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {item.name}
                              </p>
                              {soon && (
                                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
                                  {daysUntil(item.expiration_date) < 0
                                    ? 'Expired'
                                    : 'Soon'}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                              <span>Qty: {item.quantity}</span>
                              <span>Exp: {item.expiration_date || '-'}</span>
                              {item.barcode && (
                                <span className="inline-flex min-w-0 items-center gap-1 text-xs">
                                  <FaBarcode className="h-3 w-3" />
                                  <span className="truncate">{item.barcode}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {canEditInventory && activeMobileCategory && (
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
                                  className="h-9 w-9 min-w-9 shrink-0 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                                  aria-label={`${item.name} actions`}
                                >
                                  <FaEllipsisV className="h-4 w-4" />
                                </Button>
                              </DropdownTrigger>
                              <DropdownMenu aria-label={`${item.name} actions`}>
                                <DropdownItem
                                  key="select"
                                  onPress={() =>
                                    toggleSelectItem(
                                      activeMobileCategory.category.id,
                                      item.id
                                    )
                                  }
                                >
                                  {selected
                                    ? 'Deselect for bulk action'
                                    : 'Select for bulk action'}
                                </DropdownItem>
                                <DropdownItem
                                  key="edit"
                                  onPress={() =>
                                    openEditItemModal(
                                      activeMobileCategory.area,
                                      activeMobileCategory.category,
                                      item
                                    )
                                  }
                                >
                                  Edit Item
                                </DropdownItem>
                                <DropdownItem
                                  key="move"
                                  onPress={() =>
                                    openMoveModal(
                                      activeMobileCategory.area.id,
                                      activeMobileCategory.category.id,
                                      item.id
                                    )
                                  }
                                >
                                  Move Item
                                </DropdownItem>
                                <DropdownItem
                                  key="delete"
                                  className="text-danger"
                                  color="danger"
                                  onPress={() =>
                                    openDeleteDialog('item', {
                                      itemId: item.id,
                                      itemName: item.name,
                                      categoryId: activeMobileCategory.category.id,
                                      storageAreaId: activeMobileCategory.area.id,
                                      categoryName: activeMobileCategory.category.name,
                                      areaName: activeMobileCategory.area.name,
                                    })
                                  }
                                >
                                  Delete Item
                                </DropdownItem>
                              </DropdownMenu>
                            </Dropdown>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    No items in this category yet.
                  </div>
                )}

                {canEditInventory && activeMobileCategory && (
                  <button
                    onClick={() => {
                      setMobileCategorySheet(null);
                      openDeleteDialog('category', {
                        categoryId: activeMobileCategory.category.id,
                        storageAreaId: activeMobileCategory.area.id,
                        name: activeMobileCategory.category.name,
                        areaName: activeMobileCategory.area.name,
                      });
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-base font-semibold text-rose-700"
                  >
                    <FaTrash /> Delete category
                  </button>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {canEditInventory && <Modal
        isOpen={areaModal.open}
        onOpenChange={(open) => !open && closeAreaModal()}
        placement="center"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
            <span className="min-w-0 flex-1 truncate">
              {areaModal.mode === 'edit'
                ? `Edit storage area in ${areaModal.locationName || locationName}`
                : `Create new storage in ${areaModal.locationName || locationName}`}
            </span>
            <Button
              size="sm"
              radius="full"
              onPress={submitAreaModal}
              isDisabled={!areaModal.name.trim()}
              className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
            >
              {areaModal.mode === 'edit' ? 'Save' : 'Create'}
            </Button>
            <MobileSheetCloseButton onPress={closeAreaModal} />
          </ModalHeader>
          <ModalBody className={modalBodyClass}>
            <Input
              label="Storage area name"
              value={areaModal.name}
              onValueChange={(name) => setAreaModal((prev) => ({ ...prev, name }))}
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus={shouldAutoFocus}
            />
            {areaModal.mode === 'create' && (
              <MobileSuggestionChips
                suggestions={STORAGE_AREA_SUGGESTIONS}
                onSelect={(name) => setAreaModal((prev) => ({ ...prev, name }))}
              />
            )}
            {areaModal.mode === 'create' && (
              <CreateImagePicker
                label="Storage area photo optional"
                imagePreview={areaModal.imagePreview}
                imageFile={areaModal.imageFile}
                imageMessage={areaModal.imageMessage}
                onSelect={(file) => setCreateImageFile(setAreaModal, file)}
                onClear={() => clearCreateImageFile(setAreaModal)}
              />
            )}
            {areaModal.mode === 'edit' && (
              <EntityImageManager
                entityType="storage_area"
                entityId={areaModal.areaId}
                imageUrl={areaModal.imageUrl}
                label="Storage area photo"
                onChange={handleAreaImageChange}
              />
            )}
            {areaModal.mode === 'edit' && (
              <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                <Button
                  className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                  onPress={() => {
                    const payload = {
                      areaId: areaModal.areaId,
                      name: areaModal.name,
                    };
                    closeAreaModal();
                    openDeleteDialog('area', payload);
                  }}
                >
                  Delete storage area
                </Button>
              </div>
            )}
          </ModalBody>
          <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
            <Button
              variant="light"
              radius="lg"
              onPress={closeAreaModal}
              className="max-md:hidden"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              radius="lg"
              onPress={submitAreaModal}
              isDisabled={!areaModal.name.trim()}
              className={`${modalPrimaryButtonClass} max-md:hidden`}
            >
              {areaModal.mode === 'edit' ? (
                'Save changes'
              ) : (
                <>
                  <span className="md:hidden">Create Storage Area</span>
                  <span className="max-md:hidden">Add area</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>}

      {canEditInventory && <Modal
        isOpen={categoryModal.open}
        onOpenChange={(open) => !open && closeCategoryModal()}
        placement="center"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
            <span className="min-w-0 flex-1 truncate">
              {categoryModal.mode === 'edit'
                ? `Edit category in ${categoryModal.areaName || 'storage area'}`
                : `Create new category in ${categoryModal.areaName || 'storage area'}`}
            </span>
            <Button
              size="sm"
              radius="full"
              onPress={submitCategoryModal}
              isDisabled={!categoryModal.name.trim()}
              className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
            >
              {categoryModal.mode === 'edit' ? 'Save' : 'Create'}
            </Button>
            <MobileSheetCloseButton onPress={closeCategoryModal} />
          </ModalHeader>
          <ModalBody className={modalBodyClass}>
            <Input
              label="Category name"
              value={categoryModal.name}
              onValueChange={(name) =>
                setCategoryModal((prev) => ({ ...prev, name }))
              }
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus={shouldAutoFocus}
            />
            {categoryModal.mode === 'create' && (
              <MobileSuggestionChips
                suggestions={CATEGORY_SUGGESTIONS}
                onSelect={(name) =>
                  setCategoryModal((prev) => ({ ...prev, name }))
                }
              />
            )}
            {categoryModal.mode === 'create' && (
              <CreateImagePicker
                label="Category photo optional"
                imagePreview={categoryModal.imagePreview}
                imageFile={categoryModal.imageFile}
                imageMessage={categoryModal.imageMessage}
                onSelect={(file) => setCreateImageFile(setCategoryModal, file)}
                onClear={() => clearCreateImageFile(setCategoryModal)}
              />
            )}
            {categoryModal.mode === 'edit' && (
              <EntityImageManager
                entityType="category"
                entityId={categoryModal.categoryId}
                imageUrl={categoryModal.imageUrl}
                label="Category photo"
                onChange={handleCategoryImageChange}
              />
            )}
            {categoryModal.mode === 'edit' && (
              <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                <Button
                  className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                  onPress={() => {
                    const payload = {
                      categoryId: categoryModal.categoryId,
                      storageAreaId: categoryModal.areaId,
                      name: categoryModal.name,
                      areaName: categoryModal.areaName,
                    };
                    closeCategoryModal();
                    openDeleteDialog('category', payload);
                  }}
                >
                  Delete category
                </Button>
              </div>
            )}
          </ModalBody>
          <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
            <Button
              variant="light"
              radius="lg"
              onPress={closeCategoryModal}
              className="max-md:hidden"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              radius="lg"
              onPress={submitCategoryModal}
              isDisabled={!categoryModal.name.trim()}
              className={`${modalPrimaryButtonClass} max-md:hidden`}
            >
              {categoryModal.mode === 'edit' ? (
                'Save changes'
              ) : (
                <>
                  <span className="md:hidden">Create Category</span>
                  <span className="max-md:hidden">Add category</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>}

      {canEditInventory && <Modal
        isOpen={itemModal.open}
        onOpenChange={(open) => !open && closeItemModal()}
        placement="center"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
            <span className="min-w-0 flex-1 truncate">
              {itemModal.mode === 'edit'
                ? `Edit item in ${itemModal.categoryName || 'category'}`
                : `Create new item in ${itemModal.categoryName || 'category'}`}
            </span>
            <Button
              size="sm"
              radius="full"
              onPress={submitItemModal}
              isDisabled={!itemModal.name.trim()}
              className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
            >
              {itemModal.mode === 'edit' ? 'Save' : 'Add'}
            </Button>
            <MobileSheetCloseButton onPress={closeItemModal} />
          </ModalHeader>
          <ModalBody className={`space-y-3 ${modalBodyClass}`}>
            <Input
              label="Item name"
              value={itemModal.name}
              onValueChange={(name) => setItemModal((prev) => ({ ...prev, name }))}
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus={shouldAutoFocus}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <QuantityStepperInput
                label="Quantity"
                value={itemModal.quantity}
                onValueChange={(quantity) =>
                  setItemModal((prev) => ({ ...prev, quantity }))
                }
                min={0}
                classNames={modalInputClassNames}
              />
              <DatePicker
                label="Expiration date"
                labelPlacement="inside"
                value={itemModalExpirationDateValue}
                onChange={(date) =>
                  setItemModal((prev) => ({
                    ...prev,
                    expirationDate: date ? date.toString() : '',
                  }))
                }
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
                showMonthAndYearPickers
              />
            </div>
            {itemModal.mode === 'edit' && (
              <EntityImageManager
                entityType="item"
                entityId={itemModal.itemId}
                imageUrl={itemModal.imageUrl}
                label="Item photo"
                onChange={handleItemImageChange}
              />
            )}
            {itemModal.mode === 'create' && (
              <CreateImagePicker
                label="Item photo optional"
                imagePreview={itemModal.imagePreview}
                imageFile={itemModal.imageFile}
                imageMessage={itemModal.imageMessage}
                onSelect={(file) => setCreateImageFile(setItemModal, file)}
                onClear={() => clearCreateImageFile(setItemModal)}
              />
            )}
            {itemModal.mode === 'edit' && (
              <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                <Button
                  className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                  onPress={() => {
                    const payload = {
                      itemId: itemModal.itemId,
                      categoryId: itemModal.categoryId,
                      storageAreaId: itemModal.areaId,
                      itemName: itemModal.name,
                      categoryName: itemModal.categoryName,
                      areaName:
                        storageAreas.find(
                          (area) => String(area.id) === String(itemModal.areaId)
                        )?.name ?? 'this storage area',
                    };
                    closeItemModal();
                    openDeleteDialog('item', payload);
                  }}
                >
                  Delete item
                </Button>
              </div>
            )}
          </ModalBody>
          <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
            <Button
              variant="light"
              radius="lg"
              onPress={closeItemModal}
              className="max-md:hidden"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              radius="lg"
              onPress={submitItemModal}
              isDisabled={!itemModal.name.trim()}
              className={`${modalPrimaryButtonClass} max-md:hidden`}
            >
              {itemModal.mode === 'edit' ? (
                'Save changes'
              ) : (
                <>
                  <span className="md:hidden">Create Item</span>
                  <span className="max-md:hidden">Add item</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>}

      {canEditInventory && moveModal.open && <MoveItemsModal
        moveModal={moveModal}
        setMoveModal={setMoveModal}
        locationsForMove={locationsForMove}
        storageAreas={storageAreas}
        currentLocationId={locationId}
        onConfirm={handleConfirmMove}
        onDestinationCreated={handleMoveDestinationCreated}
      />}

      {/* Reusable delete confirmation modal */}
      {canEditInventory && <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={deleteTitle}
        description={deleteDescription}
      />}

    </motion.div>
  );
}
