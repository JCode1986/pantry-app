'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Button,
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
  addLocation,
  deleteLocation,
  getLocationsPageAction,
  updateLocationName,
  uploadInventoryImage,
} from '@/app/actions/server';
import {
  FaCamera,
  FaBoxOpen,
  FaChevronRight,
  FaEllipsisV,
  FaImage,
  FaPlus,
  FaSearch,
  FaTags,
  FaTrash,
  FaEdit,
  FaMapMarkedAlt,
  FaUpload,
  FaWarehouse,
} from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import { emitInventoryChange } from '@/utils/clientEvents';
import EntityImageManager from '@/components/inventory/EntityImageManager';
import MobileSuggestionChips from '@/components/modals/MobileSuggestionChips';
import MobileSheetCloseButton from '@/components/modals/MobileSheetCloseButton';
import useDesktopAutoFocus from '@/components/modals/useDesktopAutoFocus';
import PaginationControls from '@/components/ui/PaginationControls';
import { themedSelectClassNames } from '@/components/modals/modalTheme';

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

const modalFooterClass =
  'wherekeep-modal-footer flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white sm:flex-row sm:justify-end max-md:sticky max-md:bottom-0 max-md:z-20 max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pt-3 max-md:shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)]';

const modalBodyClass =
  'wherekeep-modal-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5 max-md:px-4 max-md:pb-28 max-md:pt-4';

const modalInputClassNames = {
  inputWrapper:
    'border-gray-200 bg-white focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]',
  label: 'text-gray-700',
  input: 'text-gray-900 placeholder:text-gray-400',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const LOCATION_SUGGESTIONS = ['Home', 'Apartment', 'Garage', 'Storage Unit', 'Office'];
const LOCATIONS_PAGE_SIZE = 24;
const SORT_OPTIONS = [
  ['name_asc', 'A-Z'],
  ['name_desc', 'Z-A'],
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
];

function getSortTimestamp(entry) {
  const time = new Date(entry?.created_at ?? entry?.createdAt ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortLocationsForDisplay(items, sortBy) {
  return [...(items ?? [])].sort((a, b) => {
    if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
    if (sortBy === 'newest') return getSortTimestamp(b) - getSortTimestamp(a);
    if (sortBy === 'oldest') return getSortTimestamp(a) - getSortTimestamp(b);
    return a.name.localeCompare(b.name);
  });
}

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

export default function LocationsSection({
  locations,
  totalLocations = locations?.length ?? 0,
  canEditInventory = true,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileLocationsSectionRef = useRef(null);
  const locationImageInputRef = useRef(null);
  const locationCameraInputRef = useRef(null);
  const [allLocations, setAllLocations] = useState(locations);
  const [totalLocationCount, setTotalLocationCount] = useState(totalLocations);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [locationModal, setLocationModal] = useState({
    open: false,
    mode: 'create',
    locationId: null,
    name: '',
    imageFile: null,
    imagePreview: null,
    imageUrl: null,
    image_path: null,
  });
  const shouldAutoFocus = useDesktopAutoFocus(locationModal.open);
  const [message, setMessage] = useState('');
  const [locationImageMessage, setLocationImageMessage] = useState('');
  const [upgradeHref, setUpgradeHref] = useState('');
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    isDeleting: false,
    mode: 'single',
    locationId: null,
    name: '',
    locationIds: [],
    count: 0,
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const normalizedSearch = search.trim().toLowerCase();

  const loadLocationsPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, page);
      setIsLoadingLocations(true);
      setLocationsError('');

      try {
        const result = await getLocationsPageAction({
          offset: (safePage - 1) * LOCATIONS_PAGE_SIZE,
          limit: LOCATIONS_PAGE_SIZE,
          filters: { search: normalizedSearch, sortBy },
        });

        if (result?.error) {
          setLocationsError(result.error);
          return;
        }

        const nextLocations = result?.data?.items ?? [];
        const nextTotal = result?.data?.totalCount ?? 0;
        setAllLocations(nextLocations);
        setTotalLocationCount(nextTotal);

        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / LOCATIONS_PAGE_SIZE));
        if (safePage > nextTotalPages) setCurrentPage(nextTotalPages);
      } catch (error) {
        setLocationsError(error?.message || 'Could not load locations.');
      } finally {
        setIsLoadingLocations(false);
      }
    },
    [normalizedSearch, sortBy]
  );

  const initialLoadSkippedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadSkippedRef.current) {
      initialLoadSkippedRef.current = true;
      return;
    }

    void loadLocationsPage(currentPage);
  }, [currentPage, loadLocationsPage, refreshNonce]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [normalizedSearch, sortBy]);

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.locationId) return;

      setAllLocations((prev) => {
        const locationExists = (prev ?? []).some(
          (location) => String(location.id) === String(item.locationId)
        );

        if (!locationExists) {
          return sortLocationsForDisplay([
            ...(prev ?? []),
            {
              id: item.locationId,
              name: item.locationName ?? 'Location',
              created_at: null,
              areasCount: 1,
              categoriesCount: 1,
              itemsCount: 1,
              storageAreas: item.createdStorageArea
                ? [
                    {
                      id: item.storageAreaId ?? 'new-area',
                      name: item.storageAreaName ?? 'Storage area',
                      itemsCount: 1,
                    },
                  ]
                : [],
              recentItems: item.name
                ? [
                    {
                      id: item.id ?? `recent-item-${Date.now()}`,
                      name: item.name,
                      imageUrl: item.imageUrl ?? null,
                      storagePath: [
                        item.locationName,
                        item.storageAreaName,
                        item.categoryName,
                      ]
                        .filter(Boolean)
                        .join(' > '),
                    },
                  ]
                : [],
            },
          ], sortBy);
        }

        return (prev ?? []).map((location) =>
          String(location.id) === String(item.locationId)
            ? {
                ...location,
                areasCount:
                  (location.areasCount ?? 0) + (item.createdStorageArea ? 1 : 0),
                categoriesCount:
                  (location.categoriesCount ?? 0) + (item.createdCategory ? 1 : 0),
                itemsCount: (location.itemsCount ?? 0) + 1,
              }
            : location
        );
      });
    };

    window.addEventListener('stocksense:item-added', handleItemAdded);

    return () => {
      window.removeEventListener('stocksense:item-added', handleItemAdded);
    };
  }, [sortBy]);

  useEffect(() => {
    const preview = locationModal.imagePreview;

    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [locationModal.imagePreview]);

  // Motion variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
  };
  const pageItemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, type: 'spring', stiffness: 120 } },
  };

  const totalAreas = allLocations.reduce(
    (sum, location) => sum + (location.areasCount ?? 0),
    0
  );
  const totalCategories = allLocations.reduce(
    (sum, location) => sum + (location.categoriesCount ?? 0),
    0
  );
  const totalItems = allLocations.reduce(
    (sum, location) => sum + (location.itemsCount ?? 0),
    0
  );
  const filteredLocations = allLocations ?? [];
  const selectedCount = selectedIds.size;
  const selectionMode = selectedCount > 0;
  const showDesktopAddLocationTile = canEditInventory && !normalizedSearch;
  const desktopLocationCardCount =
    filteredLocations.length + (showDesktopAddLocationTile ? 1 : 0);
  const desktopLocationGridClass =
    desktopLocationCardCount <= 3
      ? 'grid max-w-[1180px] grid-cols-1 items-stretch gap-5 lg:grid-cols-2'
      : 'grid max-w-[1360px] grid-cols-1 items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-3';
  const allVisibleSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((location) => selectedIds.has(String(location.id)));
  const totalPages = Math.max(1, Math.ceil(totalLocationCount / LOCATIONS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem =
    totalLocationCount === 0 ? 0 : (safeCurrentPage - 1) * LOCATIONS_PAGE_SIZE + 1;
  const endItem = Math.min(
    (safeCurrentPage - 1) * LOCATIONS_PAGE_SIZE + filteredLocations.length,
    totalLocationCount
  );
  const refreshLocations = () => setRefreshNonce((current) => current + 1);

  const summaryCards = [
    {
      label: 'Locations',
      value: totalLocationCount,
      description: 'Spaces in your home',
      icon: FaMapMarkedAlt,
    },
    {
      label: 'Storage Areas',
      value: totalAreas,
      description: 'Shelves, rooms, and bins',
      icon: FaWarehouse,
    },
    {
      label: 'Categories',
      value: totalCategories,
      description: 'Groups inside each space',
      icon: FaTags,
    },
    {
      label: 'Items',
      value: totalItems,
      description: 'Tracked household items',
      icon: FaBoxOpen,
    },
  ];

  const formatCount = (count, singular, plural = `${singular}s`) => {
    const value = count ?? 0;
    return `${value} ${value === 1 ? singular : plural}`;
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelectAllVisible = () => {
    if (!canEditInventory) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredLocations.forEach((location) => next.delete(String(location.id)));
      } else {
        filteredLocations.forEach((location) => next.add(String(location.id)));
      }
      return next;
    });
  };

  const closeLocationModal = () => {
    setLocationModal({
      open: false,
      mode: 'create',
      locationId: null,
      name: '',
      imageFile: null,
      imagePreview: null,
      imageUrl: null,
      image_path: null,
    });
    setLocationImageMessage('');
  };

  const openCreateLocationModal = () => {
    if (!canEditInventory) return;
    setMessage('');
    setUpgradeHref('');
    setLocationModal({
      open: true,
      mode: 'create',
      locationId: null,
      name: '',
      imageFile: null,
      imagePreview: null,
      imageUrl: null,
      image_path: null,
    });
    setLocationImageMessage('');
  };

  useEffect(() => {
    if (searchParams.get('create') !== 'location') return;
    if (!canEditInventory) return;

    openCreateLocationModal();
    router.replace('/locations', { scroll: false });
  }, [canEditInventory, searchParams, router]);

  const openEditLocationModal = (location) => {
    if (!canEditInventory) return;
    setMessage('');
    setUpgradeHref('');
    setLocationModal({
      open: true,
      mode: 'edit',
      locationId: location.id,
      name: location.name,
      imageFile: null,
      imagePreview: null,
      imageUrl: location.imageUrl ?? null,
      image_path: location.image_path ?? null,
    });
    setLocationImageMessage('');
  };

  const clearLocationImageFile = () => {
    setLocationImageMessage('');
    setLocationModal((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
    }));
  };

  const selectLocationImageFile = (file) => {
    if (!file) return;

    const imageError = validateImageFile(file);
    if (imageError) {
      setLocationImageMessage(imageError);
      return;
    }

    setLocationImageMessage('');
    setLocationModal((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleLocationImageChange = ({ imagePath, imageUrl }) => {
    setLocationModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
    }));
    setAllLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationModal.locationId
          ? { ...loc, image_path: imagePath ?? null, imageUrl: imageUrl ?? null }
          : loc
      )
    );
    emitInventoryChange({
      entity: 'location',
      action: imagePath ? 'image_updated' : 'image_removed',
      id: locationModal.locationId,
    });
  };

  const scrollMobileLocationsIntoView = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    window.requestAnimationFrame(() => {
      mobileLocationsSectionRef.current?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    });
  };

  const handleSubmitLocation = async () => {
    if (!canEditInventory || isSavingLocation) return;
    const name = locationModal.name.trim();
    if (!name) return;
    setMessage('');
    setUpgradeHref('');
    setIsSavingLocation(true);
    let optimisticLocationId = null;

    try {
      if (locationModal.mode === 'edit') {
        await updateLocationName(locationModal.locationId, name);
        setAllLocations((prev) =>
          prev.map((loc) =>
            loc.id === locationModal.locationId ? { ...loc, name } : loc
          )
        );
        emitInventoryChange({
          entity: 'location',
          action: 'updated',
          id: locationModal.locationId,
        });
        closeLocationModal();
        refreshLocations();
        return;
      }

      optimisticLocationId = `temp-location-${Date.now()}`;
      const optimisticLocation = {
        id: optimisticLocationId,
        name,
        created_at: new Date().toISOString(),
        image_path: null,
        imageUrl: null,
        areasCount: 0,
        categoriesCount: 0,
        itemsCount: 0,
        storageAreas: [],
        recentItems: [],
        _optimistic: true,
      };

      setAllLocations((prev) =>
        sortLocationsForDisplay([optimisticLocation, ...prev], sortBy)
      );

      const result = await addLocation(name);
      if (result?.error) {
        setAllLocations((prev) =>
          prev.filter((loc) => loc.id !== optimisticLocationId)
        );
        setMessage(result.error);
        setUpgradeHref(result.upgradeHref || '');
        return;
      }

      const newLoc = result?.data ?? result;
      if (!newLoc?.id) {
        setAllLocations((prev) =>
          prev.filter((loc) => loc.id !== optimisticLocationId)
        );
        setMessage('Location was not created. Please try again.');
        return;
      }

      let imageUploadWarning = '';
      let createdLocation = {
        ...newLoc,
        areasCount: 0,
        categoriesCount: 0,
        itemsCount: 0,
        storageAreas: [],
        recentItems: [],
      };

      if (locationModal.imageFile) {
        const formData = new FormData();
        formData.append('image', locationModal.imageFile);

        try {
          const imageResult = await uploadInventoryImage('location', newLoc.id, formData);

          if (imageResult?.error) {
            imageUploadWarning =
              typeof imageResult.error === 'string'
                ? `Location was added, but the photo could not be uploaded: ${imageResult.error}`
                : 'Location was added, but the photo could not be uploaded.';
          } else if (imageResult?.data) {
            createdLocation = {
              ...createdLocation,
              image_path: imageResult.data.imagePath ?? createdLocation.image_path,
              imageUrl: imageResult.data.imageUrl ?? createdLocation.imageUrl,
            };
          }
        } catch (err) {
          console.error('location image upload error:', err);
          imageUploadWarning =
            err?.message === 'aborted'
              ? 'Location was added, but the photo upload was interrupted. Try a smaller image or choose it again from the location detail page.'
              : 'Location was added, but the photo could not be uploaded.';
        }
      }

      setAllLocations((prev) =>
        sortLocationsForDisplay(
          prev.map((loc) =>
            loc.id === optimisticLocationId ? createdLocation : loc
          ),
          sortBy
        )
      );
      emitInventoryChange({
        entity: 'location',
        action: 'added',
        id: newLoc.id,
      });
      closeLocationModal();
      setTotalLocationCount((current) => current + 1);
      setCurrentPage(1);
      refreshLocations();
      if (imageUploadWarning) {
        setMessage(imageUploadWarning);
      }
      scrollMobileLocationsIntoView();
    } catch (err) {
      console.error('save location error:', err);
      if (optimisticLocationId) {
        setAllLocations((prev) =>
          prev.filter((loc) => loc.id !== optimisticLocationId)
        );
      }
      setMessage(err?.message || 'Could not save location.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Open the delete modal for a given location
  const openDeleteDialog = (loc) => {
    if (!canEditInventory) return;
    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: 'single',
      locationId: loc.id,
      name: loc.name,
      locationIds: [],
      count: 0,
    });
  };

  const openBulkDeleteDialog = () => {
    if (!canEditInventory) return;
    if (selectedIds.size === 0) return;

    setDeleteDialog({
      open: true,
      isDeleting: false,
      mode: 'bulk',
      locationId: null,
      name: '',
      locationIds: Array.from(selectedIds),
      count: selectedIds.size,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog((prev) => ({ ...prev, open: false, isDeleting: false }));
  };

  const handleConfirmDelete = async () => {
    if (!canEditInventory) return;
    if (deleteDialog.mode === 'single' && !deleteDialog.locationId) return;
    if (deleteDialog.mode === 'bulk' && deleteDialog.locationIds.length === 0) return;

    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

      if (deleteDialog.mode === 'bulk') {
        await Promise.all(deleteDialog.locationIds.map((id) => deleteLocation(id)));
        const deleted = new Set(deleteDialog.locationIds.map(String));
        setAllLocations((prev) => prev.filter((loc) => !deleted.has(String(loc.id))));
        clearSelection();
        emitInventoryChange({
          entity: 'location',
          action: 'deleted',
          ids: deleteDialog.locationIds,
        });
        setTotalLocationCount((current) =>
          Math.max(0, current - deleteDialog.locationIds.length)
        );
      } else {
        await deleteLocation(deleteDialog.locationId);
        setAllLocations((prev) =>
          prev.filter((loc) => loc.id !== deleteDialog.locationId)
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(deleteDialog.locationId));
          return next;
        });
        emitInventoryChange({
          entity: 'location',
          action: 'deleted',
          id: deleteDialog.locationId,
        });
        setTotalLocationCount((current) => Math.max(0, current - 1));
      }
      refreshLocations();
    } finally {
      setDeleteDialog({
        open: false,
        isDeleting: false,
        mode: 'single',
        locationId: null,
        name: '',
        locationIds: [],
        count: 0,
      });
    }
  };

  return (
    <motion.main
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="page-enter mx-auto max-w-[1560px] px-5 py-8 md:min-h-[96.3vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4"
    >
      <motion.section
        variants={pageItemVariants}
        className="mb-4 md:hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Locations
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Where your items live
            </p>
          </div>

          {canEditInventory && (
            <Button
              onPress={openCreateLocationModal}
              radius="full"
              size="sm"
              className="h-9 shrink-0 bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
              startContent={<FaPlus className="h-3.5 w-3.5" />}
            >
              Add
            </Button>
          )}
        </div>
      </motion.section>

      <motion.section variants={pageItemVariants} className="max-md:hidden">
        <header className="flex flex-col gap-4 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              LOCATIONS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Your spaces
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Manage every room, shelf, and place your items live.
            </p>
          </div>

          <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search locations"
              radius="lg"
              variant="bordered"
              className="w-full sm:w-72"
              startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
              classNames={{
                inputWrapper:
                  'min-h-10 border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]',
                input: 'text-sm text-gray-900 placeholder:text-gray-400',
              }}
            />
            <Select
              aria-label="Sort locations"
              selectedKeys={new Set([sortBy])}
              onSelectionChange={(keys) =>
                setSortBy(String(Array.from(keys)[0] || 'name_asc'))
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
                onPress={openCreateLocationModal}
                radius="lg"
                className="min-h-10 w-full whitespace-nowrap bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm sm:w-auto"
                startContent={<FaPlus />}
              >
                Add Location
              </Button>
            )}
          </div>
        </header>

        {canEditInventory && <AnimatePresence initial={false}>
          {selectionMode ? (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-5 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 max-md:hidden"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-[var(--stocksense-brand)]">
                    Bulk actions for <span className="font-semibold">{selectedCount}</span>{' '}
                    location{selectedCount === 1 ? '' : 's'}
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--stocksense-brand)]">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      disabled={filteredLocations.length === 0 || deleteDialog.isDeleting}
                      className="h-4 w-4 cursor-pointer rounded border border-[var(--stocksense-brand-border)]"
                    />
                    Select all visible
                  </label>
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
                    onPress={openBulkDeleteDialog}
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

      {message && (
        <motion.div
          variants={pageItemVariants}
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {message}
          {upgradeHref && (
            <Link
              href={upgradeHref}
              className="ml-2 font-semibold underline underline-offset-2"
            >
              View plans
            </Link>
          )}
        </motion.div>
      )}

      {locationsError ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {locationsError}
        </div>
      ) : null}

      <motion.section
        ref={mobileLocationsSectionRef}
        variants={pageItemVariants}
        className="mt-3 scroll-mt-20 md:hidden"
      >
        <h2 className="mb-2 text-base font-semibold text-gray-950">
          Your locations
        </h2>
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search locations"
            radius="lg"
            variant="bordered"
            startContent={<FaSearch className="h-4 w-4 text-gray-400" />}
            classNames={{
              inputWrapper: 'min-h-11 border-gray-200 bg-white shadow-sm',
              input: 'text-sm text-gray-900 placeholder:text-gray-400',
            }}
          />
          <Select
            aria-label="Sort locations"
            selectedKeys={new Set([sortBy])}
            onSelectionChange={(keys) =>
              setSortBy(String(Array.from(keys)[0] || 'name_asc'))
            }
            variant="bordered"
            radius="lg"
            className="w-32"
            classNames={themedSelectClassNames}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <SelectItem key={value}>{label}</SelectItem>
            ))}
          </Select>
        </div>
        {allLocations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-7 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--entity-location-border)] bg-[var(--entity-location-soft)] text-[var(--entity-location-accent)]">
              <FaMapMarkedAlt className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No locations yet
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create your first place to start organizing your items.
            </p>
            {canEditInventory && (
              <Button
                onPress={openCreateLocationModal}
                radius="lg"
                className="mt-5 w-full bg-[var(--stocksense-brand)] text-white"
                startContent={<FaPlus />}
              >
                Add location
              </Button>
            )}
          </div>
        ) : (
          <ul className="grid gap-3">
            {allLocations.map((loc) => (
              <motion.li
                key={loc.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      if (loc._optimistic) return;
                      router.push(`/locations/${loc.id}`);
                    }}
                    disabled={Boolean(loc._optimistic)}
                    className="flex min-h-[112px] w-full items-center gap-4 p-4 text-left opacity-100 transition active:scale-[0.99] disabled:cursor-wait"
                  >
                    {loc.imageUrl ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-location-border)] bg-white">
                        <img
                          src={loc.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-[var(--entity-location-border)] bg-[var(--entity-location-soft)] text-[var(--entity-location-accent)]">
                        <FaMapMarkedAlt className="h-7 w-7" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p
                          className="truncate text-lg font-semibold leading-6 text-gray-950"
                          title={loc.name}
                        >
                          {loc.name}
                        </p>
                        {loc._optimistic && (
                          <span className="shrink-0 rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                            Saving
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid gap-0.5 text-sm leading-5 text-gray-500">
                        <span>{formatCount(loc.areasCount, 'storage area')}</span>
                        <span>{formatCount(loc.categoriesCount, 'category', 'categories')}</span>
                        <span>{formatCount(loc.itemsCount, 'item')}</span>
                      </div>
                    </div>

                    <FaChevronRight className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
                  </button>

                  {canEditInventory && !loc._optimistic && (
                    <div className="grid grid-cols-2 gap-2 border-t border-gray-200 bg-gray-50 p-3">
                      <button
                        type="button"
                        onClick={() => openEditLocationModal(loc)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700"
                      >
                        <FaEdit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteDialog(loc)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalLocationCount}
            isLoading={isLoadingLocations}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          />
        </div>
      </motion.section>

      <motion.section variants={pageItemVariants} className="mt-5 max-md:hidden">
        {filteredLocations.length > 0 ? (
          <div className="mb-4">
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalItems={totalLocationCount}
              isLoading={isLoadingLocations}
              onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          </div>
        ) : null}

        {filteredLocations.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--stocksense-brand-border)] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
              {normalizedSearch ? (
                <FaSearch className="h-6 w-6" />
              ) : (
                <FaMapMarkedAlt className="h-7 w-7" />
              )}
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">
              {normalizedSearch ? 'No spaces match' : 'No spaces yet'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
              {normalizedSearch
                ? 'Try a different search or clear your filters.'
                : 'Create your first location like a kitchen, garage, closet, or office.'}
            </p>
            {canEditInventory && !normalizedSearch ? (
              <Button
                onPress={openCreateLocationModal}
                radius="lg"
                className="mt-7 bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
                startContent={<FaPlus />}
              >
                Add Location
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="show"
                className={desktopLocationGridClass}
              >
                {filteredLocations.map((loc) => {
                  const visibleAreas = (loc.storageAreas ?? []).slice(0, 3);
                  const totalAreaCount = loc.areasCount ?? loc.storageAreas?.length ?? 0;
                  const moreAreas = Math.max(totalAreaCount - visibleAreas.length, 0);
                  const recentItems = (loc.recentItems ?? []).slice(0, 2);

                  return (
                    <motion.li
                      key={loc.id}
                      variants={itemVariants}
                      className="group relative flex h-full min-h-[25.5rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white p-6 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:shadow-lg"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stocksense-brand)]" />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {loc.imageUrl ? (
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white">
                              <img
                                src={loc.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                              <FaMapMarkedAlt className="h-5 w-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <h2
                                className="min-w-0 truncate text-xl font-semibold leading-7 text-gray-950"
                                title={loc.name}
                              >
                                {loc.name}
                              </h2>
                              {loc._optimistic && (
                                <span className="shrink-0 rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                                  Saving
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-500">
                              {formatCount(loc.itemsCount, 'item')}
                            </p>
                          </div>
                        </div>

                        {canEditInventory && !loc._optimistic ? (
                          <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                              <Button
                                isIconOnly
                                variant="light"
                                radius="lg"
                                className="h-9 w-9 min-w-9 shrink-0 text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                                aria-label={`${loc.name} actions`}
                              >
                                <FaEllipsisV className="h-4 w-4" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label={`${loc.name} actions`}>
                              <DropdownItem
                                key="edit"
                                startContent={<FaEdit className="h-3.5 w-3.5" />}
                                onPress={() => openEditLocationModal(loc)}
                              >
                                Edit Location
                              </DropdownItem>
                              <DropdownItem
                                key="delete"
                                className="text-danger"
                                color="danger"
                                startContent={<FaTrash className="h-3.5 w-3.5" />}
                                onPress={() => openDeleteDialog(loc)}
                              >
                                Delete Location
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        ) : null}
                      </div>

                      <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            STORAGE AREAS
                          </h3>
                          <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                            {totalAreaCount.toLocaleString()}
                          </span>
                        </div>

                        {visibleAreas.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {visibleAreas.map((area) => (
                              <div
                                key={area.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-[0_1px_0_rgb(15_23_42_/_0.03)]"
                              >
                                <span
                                  className="min-w-0 truncate font-medium text-gray-800"
                                  title={area.name}
                                >
                                  {area.name}
                                </span>
                                <span className="shrink-0 text-xs text-gray-500">
                                  {formatCount(area.itemsCount, 'item')}
                                </span>
                              </div>
                            ))}
                            {moreAreas > 0 ? (
                              <p className="px-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                                +{moreAreas} more
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-500">
                            No storage areas yet.
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
                                    <img
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
                                  <p
                                    className="truncate text-xs text-gray-500"
                                    title={item.storagePath || loc.name}
                                  >
                                    {item.storagePath || loc.name}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-500">
                            No recent items yet.
                          </p>
                        )}
                      </div>

                      <div className="mt-auto border-t border-gray-100 pt-5">
                        {loc._optimistic ? (
                          <span className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-sm font-semibold text-[var(--stocksense-brand)]">
                            Saving location
                          </span>
                        ) : (
                          <Link
                            href={`/locations/${loc.id}`}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                          >
                            View Location
                            <FaChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </motion.li>
                  );
                })}

                {showDesktopAddLocationTile ? (
                  <motion.li
                    variants={itemVariants}
                    className="group flex h-full min-h-[25.5rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/35 p-8 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand)] hover:shadow-md"
                  >
                    <div className="grid h-20 w-20 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition group-hover:bg-[var(--stocksense-brand-soft)]">
                      <FaPlus className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-xl font-semibold text-gray-950">
                      Add your next space
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">
                      Create a new location like a room, closet, or garage.
                    </p>
                    <Button
                      onPress={openCreateLocationModal}
                      radius="lg"
                      className="mt-6 bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm"
                      startContent={<FaPlus />}
                    >
                      Add Location
                    </Button>
                  </motion.li>
                ) : null}
              </motion.ul>
            </AnimatePresence>

            <div className="mt-5 max-w-[1360px] rounded-[1.5rem] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 px-6 py-6">
              <div className="flex items-center gap-5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]">
                  <FaMapMarkedAlt className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-950">
                    Tip: Start with your main spaces
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Add your key rooms or areas first, then build out storage areas
                    and categories inside each one.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 max-w-[1360px]">
              <PaginationControls
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                startItem={startItem}
                endItem={endItem}
                totalItems={totalLocationCount}
                isLoading={isLoadingLocations}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            </div>
          </>
        )}
      </motion.section>
      {canEditInventory && <Modal
        isOpen={locationModal.open}
        onOpenChange={(open) => !open && closeLocationModal()}
        placement="center"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
            <span className="min-w-0 flex-1 truncate">
              {locationModal.mode === 'edit'
                ? `Edit location ${locationModal.name || ''}`
                : 'Create Location'}
            </span>
            <Button
              size="sm"
              radius="full"
              onPress={handleSubmitLocation}
              isDisabled={!locationModal.name.trim() || isSavingLocation}
              isLoading={isSavingLocation}
              className="h-10 shrink-0 bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
            >
              {locationModal.mode === 'edit' ? 'Save' : 'Create'}
            </Button>
            <MobileSheetCloseButton onPress={closeLocationModal} />
          </ModalHeader>
          <ModalBody className={`space-y-4 ${modalBodyClass}`}>
            <Input
              label="Location name"
              value={locationModal.name}
              onValueChange={(name) =>
                setLocationModal((prev) => ({ ...prev, name }))
              }
              isDisabled={isSavingLocation}
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus={shouldAutoFocus}
            />
            {locationModal.mode === 'create' && (
              <MobileSuggestionChips
                suggestions={LOCATION_SUGGESTIONS}
                onSelect={(name) =>
                  setLocationModal((prev) => ({ ...prev, name }))
                }
              />
            )}
            {locationModal.mode === 'create' && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 max-md:bg-white">
                <input
                  ref={locationImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    selectLocationImageFile(file);
                  }}
                />
                <input
                  ref={locationCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    selectLocationImageFile(file);
                  }}
                />

                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                    Location photo optional
                  </div>
                  {locationModal.imageFile && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                      Ready to upload
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-32 sm:w-44">
                    {locationModal.imagePreview ? (
                      <img
                        src={locationModal.imagePreview}
                        alt=""
                        className="h-full w-full object-contain"
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
                        isDisabled={isSavingLocation}
                        onPress={() => locationCameraInputRef.current?.click()}
                        startContent={<FaCamera className="h-3.5 w-3.5" />}
                      >
                        Take photo
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                        isDisabled={isSavingLocation}
                        onPress={() => locationImageInputRef.current?.click()}
                        startContent={<FaUpload className="h-3.5 w-3.5" />}
                      >
                        {locationModal.imageFile ? 'Change photo' : 'Add photo'}
                      </Button>
                      {locationModal.imageFile && (
                        <Button
                          size="sm"
                          variant="flat"
                          className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                          isDisabled={isSavingLocation}
                          onPress={clearLocationImageFile}
                          startContent={<FaTrash className="h-3.5 w-3.5" />}
                        >
                          Remove photo
                        </Button>
                      )}
                    </div>
                    <p className="text-xs leading-5 text-gray-500 max-md:hidden">
                      {locationModal.imageFile
                        ? locationModal.imageFile.name
                        : 'Take a photo or choose one from your camera roll. Max 5 MB.'}
                    </p>
                    {locationImageMessage && (
                      <p className="text-xs text-rose-700">{locationImageMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {locationModal.mode === 'edit' && (
              <EntityImageManager
                entityType="location"
                entityId={locationModal.locationId}
                imageUrl={locationModal.imageUrl}
                label="Location photo optional"
                onChange={handleLocationImageChange}
              />
            )}
            {locationModal.mode === 'edit' && canEditInventory && (
              <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                <Button
                  className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                  onPress={() => {
                    const target = {
                      id: locationModal.locationId,
                      name: locationModal.name,
                    };
                    closeLocationModal();
                    openDeleteDialog(target);
                  }}
                >
                  Delete location
                </Button>
              </div>
            )}
          </ModalBody>
          <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
            <Button
              variant="light"
              radius="lg"
              onPress={closeLocationModal}
              isDisabled={isSavingLocation}
              className="max-md:hidden"
            >
              Cancel
            </Button>
            <Button
              radius="lg"
              onPress={handleSubmitLocation}
              isDisabled={!locationModal.name.trim() || isSavingLocation}
              isLoading={isSavingLocation}
              className="bg-[var(--stocksense-brand)] text-white max-md:hidden"
            >
              {locationModal.mode === 'edit' ? (
                'Save changes'
              ) : (
                <>
                  <span className="md:hidden">Create Location</span>
                  <span className="max-md:hidden">Add location</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>}

      {canEditInventory && <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={
          deleteDialog.mode === 'bulk'
            ? `Delete ${deleteDialog.count} location${
                deleteDialog.count === 1 ? '' : 's'
              }?`
            : deleteDialog.name
            ? `Delete location "${deleteDialog.name}"?`
            : 'Delete location?'
        }
        description={
          deleteDialog.mode === 'bulk'
            ? 'This will remove the selected locations and any storage areas, categories, and items associated with them. This action cannot be undone.'
            : 'This will remove this location and any storage areas, categories, and items associated with it. This action cannot be undone.'
        }
      />}
    </motion.main>
  );
}
