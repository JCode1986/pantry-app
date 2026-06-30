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

const modalContentStyle = {
  fontFamily: 'var(--stocksense-font-family)',
};

const modalContentClass =
  'border border-[var(--stocksense-brand-border)] bg-white text-gray-700';

const modalHeaderClass =
  'border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)]';

const modalFooterClass =
  'border-t border-[var(--stocksense-brand-border)] bg-white';

const modalInputClassNames = {
  inputWrapper:
    'border-[var(--stocksense-brand-border)] bg-white focus-within:border-[var(--stocksense-brand)]',
  label: 'text-gray-600',
  input: 'text-gray-800',
};

export default function LocationsSection({ locations }) {
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
    locationId: null,
    name: '',
  });

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

  const closeLocationModal = () => {
    setLocationModal({
      open: false,
      mode: 'create',
      locationId: null,
      name: '',
    });
  };

  const openCreateLocationModal = () => {
    setMessage('');
    setUpgradeHref('');
    setLocationModal({
      open: true,
      mode: 'create',
      locationId: null,
      name: '',
    });
  };

  const openEditLocationModal = (location) => {
    setMessage('');
    setUpgradeHref('');
    setLocationModal({
      open: true,
      mode: 'edit',
      locationId: location.id,
      name: location.name,
    });
  };

  const handleSubmitLocation = async () => {
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
    closeLocationModal();
  };

  // Open the delete modal for a given location
  const openDeleteDialog = (loc) => {
    setDeleteDialog({
      open: true,
      isDeleting: false,
      locationId: loc.id,
      name: loc.name,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog((prev) => ({ ...prev, open: false, isDeleting: false }));
  };

  const handleConfirmDelete = async () => {
    const { locationId } = deleteDialog;
    if (!locationId) return;

    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

      await deleteLocation(locationId);

      setAllLocations((prev) => prev.filter((loc) => loc.id !== locationId));
    } finally {
      setDeleteDialog({
        open: false,
        isDeleting: false,
        locationId: null,
        name: '',
      });
    }
  };

  return (
    <motion.main
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="page-enter mx-auto max-w-6xl px-5 py-8 min-h-[96.3vh]"
    >
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
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

          <Button
            onPress={openCreateLocationModal}
            radius="lg"
            className="bg-[var(--stocksense-brand)] px-5 text-white"
            startContent={<FaPlus />}
          >
            New location
          </Button>
        </div>

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
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {allLocations.length === 0 ? (
              <li className="rounded-2xl border border-stocksense-gray bg-white p-5 text-sm text-gray-600 shadow-sm sm:col-span-2 lg:col-span-3">
                No locations yet. Create your first location to start organizing inventory.
              </li>
            ) : (
              allLocations.map((loc) => {
                return (
                  <motion.li
                    key={loc.id}
                    variants={itemVariants}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-stocksense-gray bg-white p-4 text-gray-700 shadow-sm transition hover:bg-gray-50 dark:text-gray-300"
                  >
                    {/* Left: icon + content */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="rounded-xl p-2 bg-gray-100 dark:bg-zinc-800 shrink-0">
                        <FaMapMarkerAlt className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2B3A3A]">{loc.name}</p>

                        {/* Counts */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-normal break-words">
                          <span className="font-medium">{loc.areasCount ?? 0}</span> Areas |{' '}
                          <span className="font-medium">{loc.categoriesCount ?? 0}</span> Categories |{' '}
                          <span className="font-medium">{loc.itemsCount ?? 0}</span> Items
                        </p>
                      </div>
                    </div>

                    {/* Right: meta + actions */}
                    <div className="mt-auto flex flex-col gap-3">
                      <span className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                        Created:{' '}
                        {loc.created_at ? new Date(loc.created_at).toLocaleString() : ''}
                      </span>

                      <div className="flex flex-wrap gap-x-3 gap-y-2">
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/locations/${loc.id}`)}
                          className="text-[var(--stocksense-brand)] hover:brightness-90 flex items-center gap-1 text-xs md:text-sm cursor-pointer"
                        >
                          <FaEye /> View
                        </motion.button>
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openEditLocationModal(loc)}
                          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 text-xs md:text-sm cursor-pointer"
                        >
                          <FaEdit /> Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openDeleteDialog(loc)}
                          className="text-rose-600 hover:text-rose-700 flex items-center gap-1 text-xs md:text-sm cursor-pointer"
                        >
                          <FaTrash /> Delete
                        </motion.button>
                      </div>
                    </div>
                  </motion.li>
                );
              })
            )}
          </motion.ul>
        </AnimatePresence>
      </motion.div>
      <Modal
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
          <ModalBody className="pt-5">
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
      </Modal>

      <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={
          deleteDialog.name
            ? `Delete location "${deleteDialog.name}"?`
            : 'Delete location?'
        }
        description="This will remove this location and any storage areas, categories, and items associated with it. This action cannot be undone."
      />
    </motion.main>
  );
}
