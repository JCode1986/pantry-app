'use client';

import { useEffect, useState } from 'react';
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
} from '@/app/actions/server';
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaEye,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import { emitInventoryChange } from '@/utils/clientEvents';
import EntityImageManager from '@/components/inventory/EntityImageManager';

const modalContentStyle = {
  fontFamily: 'var(--stocksense-font-family)',
};

const modalContentClass =
  'flex w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white text-gray-700 sm:w-full';

const modalHeaderClass =
  'shrink-0 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)]';

const modalFooterClass =
  'flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--stocksense-brand-border)] bg-white sm:flex-row sm:justify-end';

const modalInputClassNames = {
  inputWrapper:
    'border-[var(--stocksense-brand-border)] bg-white focus-within:border-[var(--stocksense-brand)]',
  label: 'text-gray-700',
  input: 'text-gray-900 placeholder:text-gray-400',
};

export default function LocationsSection({ locations, canEditInventory = true }) {
  const router = useRouter();
  const [allLocations, setAllLocations] = useState(locations);
  const [locationModal, setLocationModal] = useState({
    open: false,
    mode: 'create',
    locationId: null,
    name: '',
  });
  const [message, setMessage] = useState('');
  const [upgradeHref, setUpgradeHref] = useState('');

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
      imageUrl: null,
      image_path: null,
    });
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
      imageUrl: null,
      image_path: null,
    });
  };

  const openEditLocationModal = (location) => {
    if (!canEditInventory) return;
    setMessage('');
    setUpgradeHref('');
    setLocationModal({
      open: true,
      mode: 'edit',
      locationId: location.id,
      name: location.name,
      imageUrl: location.imageUrl ?? null,
      image_path: location.image_path ?? null,
    });
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

  const handleSubmitLocation = async () => {
    if (!canEditInventory) return;
    const name = locationModal.name.trim();
    if (!name) return;
    setMessage('');
    setUpgradeHref('');

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

    const result = await addLocation(name);
    if (result?.error) {
      setMessage(result.error);
      setUpgradeHref(result.upgradeHref || '');
      return;
    }

    const newLoc = result?.data ?? result;
    if (!newLoc?.id) return;

    setAllLocations([
      ...allLocations,
      { ...newLoc, areasCount: 0, categoriesCount: 0, itemsCount: 0 },
    ]);
    emitInventoryChange({
      entity: 'location',
      action: 'added',
      id: newLoc.id,
    });
    closeLocationModal();
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
      className="page-enter mx-auto max-w-[1500px] px-5 py-8 min-h-[96.3vh]"
    >
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm"
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
              <h1 className="text-2xl font-semibold tracking-tight text-stocksense-teal md:text-3xl">
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
              className="bg-[var(--stocksense-brand)] px-5 text-white"
              startContent={<FaPlus />}
            >
              New location
            </Button>
          )}
        </div>

        {canEditInventory && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
              className="mt-4 overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3"
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

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
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

      <motion.div variants={pageItemVariants} className="mt-6">
        <AnimatePresence initial={false}>
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
          <ModalHeader className={modalHeaderClass}>
            {locationModal.mode === 'edit'
              ? `Edit location ${locationModal.name || ''}`
              : 'Create new location'}
          </ModalHeader>
          <ModalBody className="space-y-4 pt-5">
            <Input
              label="Location name"
              value={locationModal.name}
              onValueChange={(name) =>
                setLocationModal((prev) => ({ ...prev, name }))
              }
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus
            />
            {locationModal.mode === 'edit' && (
              <EntityImageManager
                entityType="location"
                entityId={locationModal.locationId}
                imageUrl={locationModal.imageUrl}
                label="Location photo"
                onChange={handleLocationImageChange}
              />
            )}
          </ModalBody>
          <ModalFooter className={modalFooterClass}>
            <Button variant="light" radius="lg" onPress={closeLocationModal}>
              Cancel
            </Button>
            <Button
              radius="lg"
              onPress={handleSubmitLocation}
              isDisabled={!locationModal.name.trim()}
              className="bg-[var(--stocksense-brand)] text-white"
            >
              {locationModal.mode === 'edit' ? 'Save changes' : 'Add location'}
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
