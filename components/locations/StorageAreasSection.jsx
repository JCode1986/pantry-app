'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from '@/components/ui/MotionLite';
import {
  addStorageArea,
  updateStorageArea,
  deleteStorageArea,
  addCategory,
  updateCategoryName,
  deleteCategory,
  addItem,
  updateItem,
  deleteItems,
  getInventoryHierarchy,
  getCategoryItemsAction,
  getLocationStorageAreasPageAction,
  updateItemsLocation,
  uploadInventoryImage,
} from '@/app/actions/server';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronUp,
  FaSearch,
  FaBoxOpen,
  FaLayerGroup,
  FaWarehouse,
  FaTags,
  FaBarcode,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { emitInventoryChange, emitItemAdded } from '@/utils/clientEvents';
import ImageWithLoader from '@/components/ui/ImageWithLoader';
import NativeDropdown from '@/components/ui/NativeDropdown';
import NativeSelect from '@/components/ui/NativeSelect';
import PaginationControls from '@/components/ui/PaginationControls';
import SearchResultsLoadingState from '@/components/ui/SearchResultsLoadingState';
import InlineButton from '@/components/ui/InlinePendingButton';
import SearchInput from '@/components/locations/StorageAreaSearchInput';
import StorageAreasMobileHierarchy from '@/components/locations/StorageAreasMobileHierarchy';
import {
  daysUntil,
  isExpiringSoon,
  toNonNegativeInteger,
  toPositiveInteger,
} from '@/utils/pantry/date';
import { containsQuery } from '@/utils/pantry/search';
import { normalizeMoveLocations } from '@/utils/pantry/moveLocations';
import useDebouncedValue from '@/utils/useDebouncedValue';

const MoveItemsModal = dynamic(() => import('@/components/items/MoveItemsModal'), {
  ssr: false,
});
const StorageEntityModals = dynamic(
  () => import('@/components/locations/StorageEntityModals'),
  { ssr: false }
);
const StorageMobileCategorySheet = dynamic(
  () => import('@/components/locations/StorageMobileCategorySheet'),
  { ssr: false }
);
const ConfirmDeleteModal = dynamic(
  () => import('@/components/modals/ConfirmDeleteModal'),
  { ssr: false }
);

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

const LOCATION_DETAIL_PAGE_SIZE = 12;
const SORT_OPTIONS = [
  ['name_asc', 'A-Z'],
  ['name_desc', 'Z-A'],
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
];
const SORT_SELECT_OPTIONS = SORT_OPTIONS.map(([value, label]) => ({
  value,
  label,
}));

function ActionMenu({ ariaLabel, items, buttonClassName = 'h-9 w-9 min-w-9' }) {
  return (
    <NativeDropdown
      ariaLabel={ariaLabel}
      buttonClassName={buttonClassName}
      items={items}
    />
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
  const [entityModalSaving, setEntityModalSaving] = useState(null);
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
  const debouncedSearch = useDebouncedValue(search, 250);
  const normalizedSearch = search.trim().toLowerCase();
  const requestSearch = debouncedSearch.trim().toLowerCase();
  const categoryItemsLoadKey = useMemo(
    () =>
      JSON.stringify({
        search: requestSearch,
        expirationFilter: expSoonEnabled ? 'soon' : 'all',
        expirationDays: expDays,
        sortBy: 'name_asc',
      }),
    [expDays, expSoonEnabled, requestSearch]
  );
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
          filters: { search: requestSearch, sortBy },
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
    [locationId, requestSearch, sortBy]
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
  }, [requestSearch, sortBy]);

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
  const [moveLocationsForModal, setMoveLocationsForModal] = useState(() =>
    normalizeMoveLocations(allLocations)
  );
  const [moveDestinationsLoaded, setMoveDestinationsLoaded] = useState(
    () => (allLocations ?? []).length > 0
  );
  const [isLoadingMoveDestinations, setIsLoadingMoveDestinations] = useState(false);
  const [moveDestinationsError, setMoveDestinationsError] = useState('');
  const moveDestinationsRequestRef = useRef(null);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    entityType: null,  // 'area' | 'category' | 'item' | 'bulk-items'
    payload: null,
    isDeleting: false,
  });

  useEffect(() => {
    const nextMoveLocations = normalizeMoveLocations(allLocations);
    if (nextMoveLocations.length === 0) return;

    setMoveLocationsForModal(nextMoveLocations);
    setMoveDestinationsLoaded(true);
  }, [allLocations]);

  const loadMoveDestinations = useCallback(
    async ({ force = false } = {}) => {
      if (!force && moveDestinationsLoaded) return moveLocationsForModal;
      if (moveDestinationsRequestRef.current) {
        return moveDestinationsRequestRef.current;
      }

      setIsLoadingMoveDestinations(true);
      setMoveDestinationsError('');

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
            error?.message || 'Could not load move destinations.'
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


  const fallbackLocationsForMove = useMemo(
    () => [
      {
        id: locationId,
        name: locationName,
        storageAreas,
      },
    ],
    [locationId, locationName, storageAreas]
  );

  const locationsForMove = useMemo(
    () =>
      moveLocationsForModal.length > 0
        ? moveLocationsForModal
        : fallbackLocationsForMove,
    [fallbackLocationsForMove, moveLocationsForModal]
  );

  const totalAreas = totalStorageAreaCount;
  const totalCategories = useMemo(
    () => (storageAreas || []).reduce((sum, a) => sum + (a.categories?.length || 0), 0),
    [storageAreas]
  );

  const totalItems = useMemo(() => {
    let n = 0;
    for (const a of storageAreas ?? []) {
      for (const c of a.categories || []) {
        n += c.itemsCount ?? c.items?.length ?? 0;
      }
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

  const toggleCategory = (id) => {
    const isExpanded = Boolean(expandedCategories[id]);
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    if (!isExpanded) {
      void loadCategoryItems(id);
    }
  };

  const expandAllAreas = () => {
    setExpandedAreas(
      Object.fromEntries((storageAreas || []).map((area) => [area.id, true]))
    );
    const categoryEntries = (storageAreas || []).flatMap((area) =>
      (area.categories || []).map((category) => [category.id, true])
    );
    setExpandedCategories(Object.fromEntries(categoryEntries));
    categoryEntries.forEach(([categoryId]) => {
      void loadCategoryItems(categoryId);
    });
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
  const closeAreaModal = ({ force = false } = {}) => {
    if (entityModalSaving && !force) return;
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
  };

  const closeCategoryModal = ({ force = false } = {}) => {
    if (entityModalSaving && !force) return;
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
  };

  const closeItemModal = ({ force = false } = {}) => {
    if (entityModalSaving && !force) return;
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
  };

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

  const handleAreaImageChange = ({ imagePath, imageUrl, imageThumbUrl }) => {
    setAreaModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
      imageThumbUrl: imageThumbUrl ?? null,
    }));
    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === areaModal.areaId
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
      entity: 'storage_area',
      action: imagePath ? 'image_updated' : 'image_removed',
      id: areaModal.areaId,
    });
  };

  const submitAreaModal = async () => {
    if (!canEditInventory || entityModalSaving) return;
    const name = areaModal.name.trim();
    if (!name) return;

    setEntityModalSaving('area');
    try {
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
          closeAreaModal({ force: true });
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
          imageThumbUrl: uploadedImage?.imageThumbUrl ?? null,
          categories: [],
        };

        setStorageAreas((prev) => [...prev, createdArea]);
        emitInventoryChange({
          entity: 'storage_area',
          action: 'added',
          id: result.data.id,
        });
        closeAreaModal({ force: true });
      }
    } finally {
      setEntityModalSaving(null);
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

  const handleCategoryImageChange = ({ imagePath, imageUrl, imageThumbUrl }) => {
    setCategoryModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
      imageThumbUrl: imageThumbUrl ?? null,
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
                      imageThumbUrl: imageThumbUrl ?? null,
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
    if (!canEditInventory || entityModalSaving) return;
    const name = categoryModal.name.trim();
    if (!name) return;

    setEntityModalSaving('category');
    try {
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
          closeCategoryModal({ force: true });
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
          imageThumbUrl: uploadedImage?.imageThumbUrl ?? null,
          items: [],
        };

        setStorageAreas((prev) =>
          prev.map((a) =>
            a.id === categoryModal.areaId
              ? { ...a, categories: [...(a.categories || []), createdCategory] }
              : a
          )
        );
        closeCategoryModal({ force: true });
        emitInventoryChange({
          entity: 'category',
          action: 'added',
          id: result.data.id,
        });
      }
    } finally {
      setEntityModalSaving(null);
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

  const handleItemImageChange = ({ imagePath, imageUrl, imageThumbUrl }) => {
    setItemModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
      imageThumbUrl: imageThumbUrl ?? null,
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
                              imageThumbUrl: imageThumbUrl ?? null,
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
    if (!canEditInventory || entityModalSaving) return;
    if (!itemModal.name.trim()) return;
    setLimitNotice(null);
    setEntityModalSaving('item');

    try {
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
        closeItemModal({ force: true });
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
          imageThumbUrl: uploadedImage.imageThumbUrl ?? created.imageThumbUrl ?? null,
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
      closeItemModal({ force: true });
    } finally {
      setEntityModalSaving(null);
    }
  };

  const performDeleteItem = async (itemId, categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    const result = await deleteItems([itemId]);
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
                        itemsCount: Math.max(
                          0,
                          (cat.itemsCount ?? cat.items?.length ?? 1) - 1
                        ),
                        items: (cat.items ?? []).filter(
                          (it) => String(it.id) !== String(itemId)
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
        action: 'deleted',
        id: itemId,
      });
    } else {
      console.error('deleteItems error:', result.error);
    }
  };

  const performBulkDeleteItems = async (itemIds, categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    const result = await deleteItems(itemIds);
    if (result?.error) {
      console.error('bulk delete item errors:', result);
      return;
    }

    const deletedSet = new Set(itemIds.map(String));
    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map((cat) =>
                cat.id === categoryId
                  ? {
                      ...cat,
                      itemsCount: Math.max(
                        0,
                        (cat.itemsCount ?? cat.items?.length ?? deletedSet.size) -
                          deletedSet.size
                      ),
                      items: (cat.items || []).filter(
                        (i) => !deletedSet.has(String(i.id))
                      ),
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

  const updateCategoryInStorageAreas = useCallback((categoryId, updater) => {
    const categoryKey = String(categoryId);
    setStorageAreas((prev) =>
      prev.map((area) => ({
        ...area,
        categories: (area.categories ?? []).map((category) =>
          String(category.id) === categoryKey ? updater(category) : category
        ),
      }))
    );
  }, []);

  const loadCategoryItems = useCallback(
    async (categoryId, options = {}) => {
      const categoryKey = String(categoryId);
      let target = null;

      for (const area of storageAreas ?? []) {
        target = (area.categories ?? []).find(
          (category) => String(category.id) === categoryKey
        );
        if (target) break;
      }

      if (
        !target ||
        target.itemsLoading ||
        (target.itemsLoaded &&
          target.itemsLoadKey === categoryItemsLoadKey &&
          !options.force)
      ) {
        return;
      }

      updateCategoryInStorageAreas(categoryId, (category) => ({
        ...category,
        itemsLoading: true,
        itemsError: '',
      }));

      try {
        const result = await getCategoryItemsAction({
          categoryId,
          filters: {
            search: requestSearch,
            expirationFilter: expSoonEnabled ? 'soon' : 'all',
            expirationDays: expDays,
            sortBy: 'name_asc',
          },
        });

        if (result?.error) {
          updateCategoryInStorageAreas(categoryId, (category) => ({
            ...category,
            itemsLoading: false,
            itemsError: result.error,
          }));
          return;
        }

        const items = result?.data?.items ?? [];
        updateCategoryInStorageAreas(categoryId, (category) => ({
          ...category,
          items,
          itemsCount: result?.data?.totalCount ?? items.length,
          itemsLoaded: true,
          itemsLoadKey: categoryItemsLoadKey,
          itemsLoading: false,
          itemsError: '',
        }));
      } catch (error) {
        updateCategoryInStorageAreas(categoryId, (category) => ({
          ...category,
          itemsLoading: false,
          itemsError: error?.message || 'Could not load items.',
        }));
      }
    },
    [
      expDays,
      expSoonEnabled,
      categoryItemsLoadKey,
      requestSearch,
      storageAreas,
      updateCategoryInStorageAreas,
    ]
  );

  useEffect(() => {
    if (!requestSearch && !expSoonEnabled) return;

    for (const area of storageAreas ?? []) {
      for (const category of area.categories ?? []) {
        void loadCategoryItems(category.id);
      }
    }
  }, [expSoonEnabled, loadCategoryItems, requestSearch, storageAreas]);

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
    void loadMoveDestinations();
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
    const itemIdSet = new Set(itemIds.map(String));
    const itemsToMove = (sourceCat?.items || []).filter((it) =>
      itemIdSet.has(String(it.id))
    );

    const result = await updateItemsLocation(itemIds, {
      categoryId: targetCategoryId,
    });

    if (result?.error) {
      console.error('Error moving some items:', result);
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
                  itemsCount: Math.max(
                    0,
                    (cat.itemsCount ?? cat.items?.length ?? itemIds.length) -
                      itemIds.length
                  ),
                  items: (cat.items || []).filter(
                    (it) => !itemIdSet.has(String(it.id))
                  ),
                };
              }

              // add to target (same location case)
              if (String(cat.id) === String(targetCategoryId)) {
                return {
                  ...cat,
                  itemsCount:
                    (cat.itemsCount ?? cat.items?.length ?? 0) + itemIds.length,
                  items: cat.itemsLoaded
                    ? [
                        ...(cat.items || []),
                        ...itemsToMove.map((it) => ({
                          ...it,
                          category_id: targetCategoryId,
                        })),
                      ]
                    : cat.items || [],
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
                    itemsCount: Math.max(
                      0,
                      (cat.itemsCount ?? cat.items?.length ?? itemIds.length) -
                        itemIds.length
                    ),
                    items: (cat.items || []).filter(
                      (it) => !itemIdSet.has(String(it.id))
                    ),
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
            (sum, category) => sum + (category.itemsCount ?? category.items?.length ?? 0),
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
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder={`Search areas, categories, or items in ${locationName}...`}
              className="w-full max-w-md"
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
              <NativeSelect
                aria-label="Sort storage areas"
                value={sortBy}
                onChange={(value) => setSortBy(value || 'name_asc')}
                options={SORT_SELECT_OPTIONS}
                className="w-36"
              />

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

      <StorageAreasMobileHierarchy
        canEditInventory={canEditInventory}
        clearSearch={clearSearch}
        currentPage={safeCurrentPage}
        endItem={endItem}
        expandedAreas={expandedAreas}
        expSoonEnabled={expSoonEnabled}
        hierarchyFiltersActive={hierarchyFiltersActive}
        isLoadingStorageAreas={isLoadingStorageAreas}
        loadCategoryItems={loadCategoryItems}
        locationName={locationName}
        normalizedSearch={normalizedSearch}
        onCreateArea={openCreateAreaModal}
        onCreateCategory={openCreateCategoryModal}
        onDelete={openDeleteDialog}
        onEditArea={openEditAreaModal}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onSearchChange={handleSearchChange}
        onSetMobileCategorySheet={setMobileCategorySheet}
        onSortChange={(value) => setSortBy(value || 'name_asc')}
        search={search}
        showSearchRestoreLoader={showSearchRestoreLoader}
        sortBy={sortBy}
        sortOptions={SORT_SELECT_OPTIONS}
        startItem={startItem}
        storageAreas={storageAreas}
        toggleArea={toggleArea}
        totalPages={totalPages}
        totalStorageAreaCount={totalStorageAreaCount}
        visibleStorageAreas={visibleStorageAreas}
      />

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
              <button
                type="button"
                onClick={clearSearch}
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-5 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:brightness-95"
              >
                Clear search
              </button>
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
                          src={area.imageThumbUrl || area.imageUrl}
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
                      <ActionMenu
                        ariaLabel={`${area.name} actions`}
                        buttonClassName="h-10 w-10 min-w-10"
                        items={[
                          {
                            key: 'edit',
                            label: 'Edit Storage Area',
                            onSelect: () => openEditAreaModal(area),
                          },
                          {
                            key: 'delete',
                            label: 'Delete Storage Area',
                            danger: true,
                            onSelect: () =>
                              openDeleteDialog('area', {
                                areaId: area.id,
                                name: area.name,
                              }),
                          },
                        ]}
                      />
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
                      const categoryKey = String(category.id);
                      const categorySelectedMap =
                        selectedByCategory[categoryKey] || {};
                      const selectedItemIds = Object.keys(categorySelectedMap).filter(
                        (itemId) => categorySelectedMap[itemId]
                      );
                      const categorySelectionActive = selectedItemIds.length > 0;
                      const allVisibleSelected =
                        items.length > 0 &&
                        items.every((item) => categorySelectedMap[String(item.id)]);

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
                                    src={category.imageThumbUrl || category.imageUrl}
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
                                  {category.itemsCount ?? (category.items ?? []).length}{' '}
                                  {(category.itemsCount ?? (category.items ?? []).length) === 1 ? 'item' : 'items'}
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
                                <ActionMenu
                                  ariaLabel={`${category.name} actions`}
                                  items={[
                                    {
                                      key: 'edit',
                                      label: 'Edit Category',
                                      onSelect: () =>
                                        openEditCategoryModal(area, category),
                                    },
                                    {
                                      key: 'delete',
                                      label: 'Delete Category',
                                      danger: true,
                                      onSelect: () =>
                                        openDeleteDialog('category', {
                                          categoryId: category.id,
                                          storageAreaId: area.id,
                                          name: category.name,
                                          areaName: area.name,
                                        }),
                                    },
                                  ]}
                                />
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
                                  {canEditInventory && categorySelectionActive ? (
                                    <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 shadow-sm">
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-[var(--stocksense-brand)]">
                                            Bulk actions for {selectedItemIds.length}{' '}
                                            selected item{selectedItemIds.length === 1 ? '' : 's'}
                                          </p>
                                          <p className="truncate text-xs text-[var(--stocksense-brand)]">
                                            {category.name} | {area.name}
                                          </p>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-2">
                                          <InlineButton
                                            className="min-h-9 border border-[var(--stocksense-brand-border)] bg-white px-3 text-[var(--stocksense-brand)]"
                                            onClick={() =>
                                              selectVisibleItemsInCategory(
                                                category.id,
                                                items
                                              )
                                            }
                                            disabled={items.length === 0}
                                          >
                                            {allVisibleSelected
                                              ? 'Deselect visible'
                                              : 'Select visible'}
                                          </InlineButton>
                                          <InlineButton
                                            className="min-h-9 border border-gray-200 bg-white px-3 text-gray-700"
                                            onClick={clearSelectedItems}
                                          >
                                            Clear
                                          </InlineButton>
                                          <InlineButton
                                            className="min-h-9 bg-[var(--stocksense-brand)] px-3 text-white"
                                            onClick={() =>
                                              openMoveModal(area.id, category.id)
                                            }
                                          >
                                            Move
                                          </InlineButton>
                                          <InlineButton
                                            className="min-h-9 border border-rose-200 bg-rose-50 px-3 text-rose-700"
                                            onClick={() =>
                                              openDeleteDialog('bulk-items', {
                                                itemIds: selectedItemIds,
                                                categoryId: category.id,
                                                storageAreaId: area.id,
                                                categoryName: category.name,
                                                areaName: area.name,
                                                count: selectedItemIds.length,
                                              })
                                            }
                                          >
                                            Delete
                                          </InlineButton>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}

                                  {category.itemsLoading ? (
                                    <SearchResultsLoadingState
                                      label="Loading items"
                                      detail="Fetching this category."
                                      className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/25 px-5 py-6"
                                    />
                                  ) : category.itemsError ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                                      {category.itemsError}
                                    </div>
                                  ) : items.length === 0 ? (
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
                                  categorySelectedMap[String(item.id)]
                                );
                                const categorySelectionMode =
                                  categorySelectionActive;

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
                                      {canEditInventory && categorySelectionMode ? (
                                        <label
                                          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center"
                                          onClick={(event) => event.stopPropagation()}
                                          onKeyDown={(event) => event.stopPropagation()}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() =>
                                              toggleSelectItem(category.id, item.id)
                                            }
                                            aria-label={`Select ${item.name}`}
                                            className="h-5 w-5 cursor-pointer rounded border-gray-300 text-[var(--stocksense-brand)] accent-[var(--stocksense-brand)] focus:ring-[var(--stocksense-brand-border)]"
                                          />
                                        </label>
                                      ) : null}
                                      {item.imageUrl ? (
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
                                          <ImageWithLoader
                                            src={item.imageThumbUrl || item.imageUrl}
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
                                      <ActionMenu
                                        ariaLabel={`${item.name} actions`}
                                        items={[
                                          {
                                            key: 'select',
                                            label: selected
                                              ? 'Deselect for bulk action'
                                              : 'Select for bulk action',
                                            onSelect: () =>
                                              toggleSelectItem(category.id, item.id),
                                          },
                                          {
                                            key: 'view',
                                            label: 'View Item',
                                            onSelect: () =>
                                              openEditItemModal(area, category, item),
                                          },
                                          {
                                            key: 'edit',
                                            label: 'Edit Item',
                                            onSelect: () =>
                                              openEditItemModal(area, category, item),
                                          },
                                          {
                                            key: 'move',
                                            label: 'Move Item',
                                            onSelect: () =>
                                              openMoveModal(area.id, category.id, item.id),
                                          },
                                          {
                                            key: 'delete',
                                            label: 'Delete Item',
                                            danger: true,
                                            onSelect: () =>
                                              openDeleteDialog('item', {
                                                itemId: item.id,
                                                itemName: item.name,
                                                categoryId: category.id,
                                                storageAreaId: area.id,
                                                categoryName: category.name,
                                                areaName: area.name,
                                              }),
                                          },
                                        ]}
                                      />
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

      {activeMobileCategory && (
        <StorageMobileCategorySheet
          activeMobileCategory={activeMobileCategory}
          setMobileCategorySheet={setMobileCategorySheet}
          locationName={locationName}
          canEditInventory={canEditInventory}
          activeMobileSelectionContext={activeMobileSelectionContext}
          clearSelectedItems={clearSelectedItems}
          selectVisibleItemsInCategory={selectVisibleItemsInCategory}
          openMoveModal={openMoveModal}
          openDeleteDialog={openDeleteDialog}
          openCreateItemModal={openCreateItemModal}
          openEditCategoryModal={openEditCategoryModal}
          loadCategoryItems={loadCategoryItems}
          expDays={expDays}
          selectedByCategory={selectedByCategory}
          toggleSelectItem={toggleSelectItem}
          openEditItemModal={openEditItemModal}
        />
      )}

      {canEditInventory &&
        (areaModal.open || categoryModal.open || itemModal.open) && (
          <StorageEntityModals
            areaModal={areaModal}
            categoryModal={categoryModal}
            itemModal={itemModal}
            setAreaModal={setAreaModal}
            setCategoryModal={setCategoryModal}
            setItemModal={setItemModal}
            locationName={locationName}
            storageAreas={storageAreas}
            onCloseAreaModal={closeAreaModal}
            onCloseCategoryModal={closeCategoryModal}
            onCloseItemModal={closeItemModal}
            onSubmitAreaModal={submitAreaModal}
            onSubmitCategoryModal={submitCategoryModal}
            onSubmitItemModal={submitItemModal}
            savingEntity={entityModalSaving}
            onAreaImageChange={handleAreaImageChange}
            onCategoryImageChange={handleCategoryImageChange}
            onItemImageChange={handleItemImageChange}
            onOpenDeleteDialog={openDeleteDialog}
          />
        )}

      {canEditInventory && moveModal.open && <MoveItemsModal
        moveModal={moveModal}
        setMoveModal={setMoveModal}
        locationsForMove={locationsForMove}
        storageAreas={storageAreas}
        currentLocationId={locationId}
        onConfirm={handleConfirmMove}
        onDestinationCreated={handleMoveDestinationCreated}
        isLoadingDestinations={isLoadingMoveDestinations}
        destinationsError={moveDestinationsError}
        onRetryLoadDestinations={() => loadMoveDestinations({ force: true })}
      />}

      {/* Reusable delete confirmation modal */}
      {canEditInventory && deleteDialog.open && <ConfirmDeleteModal
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
