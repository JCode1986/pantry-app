'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';
import {
  addLocation,
  deleteLocation,
  updateLocationName,
  uploadInventoryImage,
} from '@/app/actions/server';
import {
  FaCamera,
  FaChevronRight,
  FaImage,
  FaPlus,
  FaTrash,
  FaEdit,
  FaEye,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaUpload,
} from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import { emitInventoryChange } from '@/utils/clientEvents';
import EntityImageManager from '@/components/inventory/EntityImageManager';
import MobileSuggestionChips from '@/components/modals/MobileSuggestionChips';
import MobileSheetCloseButton from '@/components/modals/MobileSheetCloseButton';

const modalContentStyle = {
  fontFamily: 'var(--stocksense-font-family)',
};

const modalContentClass =
  'flex w-[calc(100vw-1rem)] max-h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl sm:w-full max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none';

const modalHeaderClass =
  'shrink-0 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)] max-md:sticky max-md:top-0 max-md:z-20 max-md:px-4 max-md:py-3';

const modalFooterClass =
  'flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white sm:flex-row sm:justify-end max-md:sticky max-md:bottom-[var(--wherekeep-keyboard-inset,0px)] max-md:z-20 max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pt-3 max-md:shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)]';

const modalBodyClass =
  'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5 max-md:px-4 max-md:pb-[calc(7rem+var(--wherekeep-keyboard-inset,0px))] max-md:pt-4';

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

export default function LocationsSection({ locations, canEditInventory = true }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileLocationsSectionRef = useRef(null);
  const locationImageInputRef = useRef(null);
  const locationCameraInputRef = useRef(null);
  const [allLocations, setAllLocations] = useState(locations);
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

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.locationId) return;

      setAllLocations((prev) => {
        const locationExists = (prev ?? []).some(
          (location) => String(location.id) === String(item.locationId)
        );

        if (!locationExists) {
          return [
            ...(prev ?? []),
            {
              id: item.locationId,
              name: item.locationName ?? 'Location',
              created_at: null,
              areasCount: 1,
              categoriesCount: 1,
              itemsCount: 1,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
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
  }, []);

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
  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    allLocations.length > 0 &&
    allLocations.every((location) => selectedIds.has(String(location.id)));

  const formatCount = (count, singular, plural = `${singular}s`) => {
    const value = count ?? 0;
    return `${value} ${value === 1 ? singular : plural}`;
  };

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

  const toggleSelectAllVisible = () => {
    if (!canEditInventory) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        allLocations.forEach((location) => next.delete(String(location.id)));
      } else {
        allLocations.forEach((location) => next.add(String(location.id)));
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
        _optimistic: true,
      };

      setAllLocations((prev) => [optimisticLocation, ...prev]);

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
        prev.map((loc) =>
          loc.id === optimisticLocationId ? createdLocation : loc
        )
      );
      emitInventoryChange({
        entity: 'location',
        action: 'added',
        id: newLoc.id,
      });
      closeLocationModal();
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
      }
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
      className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[96.3vh] max-md:px-4 max-md:pb-0 max-md:pt-4"
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

      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm max-md:hidden"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-location-border)] bg-[var(--entity-location-soft)] text-[var(--entity-location-accent)]">
              <FaMapMarkedAlt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Household inventory
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
                Locations
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Start with the places where inventory lives, then organize each
                one by storage area, category, and item.
              </p>
            </div>
          </div>

          {canEditInventory && (
            <Button
              onPress={openCreateLocationModal}
              radius="lg"
              className="bg-[var(--stocksense-brand)] px-5 text-white max-md:w-full"
              startContent={<FaPlus />}
            >
              New location
            </Button>
          )}
        </div>

        {canEditInventory && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between max-md:hidden">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                disabled={allLocations.length === 0 || deleteDialog.isDeleting}
                className="h-5 w-5 cursor-pointer rounded border border-stocksense-gray"
              />
              Select all visible
            </label>

            <Button
              size="sm"
              variant="flat"
              className="w-fit rounded-xl"
              isDisabled={selectedCount === 0 || deleteDialog.isDeleting}
              onPress={clearSelection}
            >
              Clear selection
            </Button>
          </div>
        )}

        {canEditInventory && <AnimatePresence initial={false}>
          {selectedCount > 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-4 overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 max-md:hidden"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--stocksense-brand)]">
                  Bulk actions for <span className="font-semibold">{selectedCount}</span>{' '}
                  location{selectedCount === 1 ? '' : 's'}
                </p>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  className="w-fit rounded-xl"
                  isDisabled={deleteDialog.isDeleting}
                  onPress={openBulkDeleteDialog}
                  startContent={<FaTrash />}
                >
                  Delete selected
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>}

        <div className="mt-5 grid gap-3 sm:grid-cols-4 max-md:hidden">
          {[
            ['Locations', allLocations.length],
            ['Areas', totalAreas],
            ['Categories', totalCategories],
            ['Items', totalItems],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-stocksense-teal">
                {value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

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

      <motion.section
        ref={mobileLocationsSectionRef}
        variants={pageItemVariants}
        className="mt-3 scroll-mt-20 md:hidden"
      >
        <h2 className="mb-2 text-base font-semibold text-gray-950">
          Your locations
        </h2>
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
                        <p className="truncate text-lg font-semibold leading-6 text-gray-950">
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
      </motion.section>

      <motion.div variants={pageItemVariants} className="mt-6">
        <AnimatePresence initial={false}>
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {allLocations.length === 0 ? (
              <li className="rounded-2xl border border-stocksense-gray bg-white p-5 text-sm text-gray-600 shadow-sm sm:col-span-2 lg:col-span-3 xl:col-span-4">
                {canEditInventory
                  ? 'No locations yet. Create your first location to start organizing inventory.'
                  : 'No locations yet.'}
              </li>
            ) : (
              allLocations.map((loc) => {
                return (
                  <motion.li
                    key={loc.id}
                    variants={itemVariants}
                    className="relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-stocksense-gray bg-white p-3.5 pt-4 text-gray-700 shadow-sm transition hover:bg-gray-50 dark:text-gray-300 sm:p-4"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-[var(--entity-location-accent)]" />
                    {/* Left: icon + content */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      {canEditInventory && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(String(loc.id))}
                          onChange={() => toggleSelect(loc.id)}
                          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border border-stocksense-gray"
                          aria-label={`Select ${loc.name}`}
                        />
                      )}
                      {loc.imageUrl ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-location-border)] bg-white">
                          <img
                            src={loc.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[var(--entity-location-border)] bg-[var(--entity-location-soft)] p-2 text-[var(--entity-location-accent)] shrink-0">
                          <FaMapMarkerAlt className="h-4 w-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold leading-5 text-[#2B3A3A] sm:text-base">{loc.name}</p>

                        {/* Counts */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 whitespace-normal break-words">
                          <span className="font-medium">{loc.areasCount ?? 0}</span> Areas |{' '}
                          <span className="font-medium">{loc.categoriesCount ?? 0}</span> Categories |{' '}
                          <span className="font-medium">{loc.itemsCount ?? 0}</span> Items
                        </p>
                      </div>
                    </div>

                    {/* Right: meta + actions */}
                    <div className="mt-auto flex flex-col gap-2.5">
                      <span className="text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                        Created:{' '}
                        {loc.created_at ? new Date(loc.created_at).toLocaleDateString() : ''}
                      </span>

                      <div className={`grid gap-1.5 ${canEditInventory ? 'grid-cols-3' : 'grid-cols-1'}`}>
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/locations/${loc.id}`)}
                          className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-2 text-xs text-[var(--stocksense-brand)] hover:bg-[var(--stocksense-brand-soft)] cursor-pointer"
                        >
                          <FaEye /> View
                        </motion.button>
                        {canEditInventory && (
                          <>
                            <motion.button
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => openEditLocationModal(loc)}
                              className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 text-xs text-amber-700 hover:bg-amber-100 cursor-pointer"
                            >
                              <FaEdit /> Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => openDeleteDialog(loc)}
                              className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              <FaTrash /> Delete
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.li>
                );
              })
            )}
          </motion.ul>
        </AnimatePresence>
      </motion.div>
      {canEditInventory && <Modal
        isOpen={locationModal.open}
        onOpenChange={(open) => !open && closeLocationModal()}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
            <span className="min-w-0 flex-1 truncate">
              {locationModal.mode === 'edit'
                ? `Edit location ${locationModal.name || ''}`
                : 'Create Location'}
            </span>
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
              autoFocus
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
          <ModalFooter className={modalFooterClass}>
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
              className="bg-[var(--stocksense-brand)] text-white"
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
