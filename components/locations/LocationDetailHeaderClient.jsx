"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { FaBoxOpen, FaEdit, FaMapMarkedAlt, FaTags, FaTrash, FaWarehouse } from "react-icons/fa";
import { deleteLocation, updateLocationName } from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import { emitInventoryChange } from "@/utils/clientEvents";

export default function LocationDetailHeaderClient({
  location,
  imageUrl,
  canEditInventory = true,
  stats = {},
}) {
  const router = useRouter();
  const [name, setName] = useState(location?.name ?? "");
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl ?? null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(location?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const mobileStats = [
    {
      label: "Storage areas",
      value: stats.totalAreas ?? 0,
      icon: FaWarehouse,
    },
    {
      label: "Categories",
      value: stats.totalCategories ?? 0,
      icon: FaTags,
    },
    {
      label: "Items",
      value: stats.totalItems ?? 0,
      icon: FaBoxOpen,
    },
  ];

  const saveLocation = async () => {
    const nextName = editName.trim();
    if (!canEditInventory || !location?.id || !nextName) return;

    setIsSaving(true);
    try {
      const result = await updateLocationName(location.id, nextName);
      if (result?.error) throw result.error;
      setName(nextName);
      setEditOpen(false);
      emitInventoryChange({
        entity: "location",
        action: "updated",
        id: location.id,
      });
      router.refresh();
    } catch (err) {
      console.error("updateLocationName error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!canEditInventory || !location?.id) return;

    setIsDeleting(true);
    try {
      const result = await deleteLocation(location.id);
      if (result?.error) throw result.error;
      emitInventoryChange({
        entity: "location",
        action: "deleted",
        id: location.id,
      });
      router.replace("/locations");
    } catch (err) {
      console.error("deleteLocation error:", err);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="mb-4 md:hidden">
        <Link
          href="/locations"
          className="inline-flex items-center text-sm font-medium text-[var(--stocksense-brand)]"
        >
          Back to locations
        </Link>

        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-slate-900/5">
          <div className="h-44 bg-[var(--entity-location-soft)]">
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[var(--entity-location-accent)]">
                <FaMapMarkedAlt className="h-14 w-14" />
              </div>
            )}
          </div>

          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Location
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-950">
              {name}
            </h1>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {mobileStats.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                >
                  <Icon className="h-4 w-4 text-[var(--stocksense-brand)]" />
                  <p className="mt-2 text-xl font-semibold leading-none text-gray-950">
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-4 text-gray-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {canEditInventory && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="flat"
                  className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  onPress={() => {
                    setEditName(name);
                    setEditOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit location
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={() => setDeleteOpen(true)}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <header className="mb-6 max-md:hidden">
        <Link
          href="/locations"
          className="inline-flex items-center text-sm font-semibold text-[var(--stocksense-brand)] transition hover:text-[var(--stocksense-brand-dark)]"
        >
          Back to locations
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            {currentImageUrl ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-location-border)] bg-white shadow-sm">
                <img src={currentImageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--entity-location-border)] bg-[var(--entity-location-soft)] text-[var(--entity-location-accent)] shadow-sm">
                <FaMapMarkedAlt className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--stocksense-brand)]">
                Location
              </p>
              <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-gray-950">
                {name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Everything stored in this space.
              </p>
              <p className="mt-2 text-sm font-medium text-gray-500">
                {stats.totalAreas ?? 0} storage areas &bull;{' '}
                {stats.totalCategories ?? 0} categories &bull;{' '}
                {stats.totalItems ?? 0} items
              </p>
            </div>
          </div>

          {canEditInventory && (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                size="sm"
                variant="flat"
                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] shadow-sm"
                onPress={() => {
                  setEditName(name);
                  setEditOpen(true);
                }}
                startContent={<FaEdit />}
              >
                Edit location
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                className="rounded-xl shadow-sm"
                onPress={() => setDeleteOpen(true)}
                startContent={<FaTrash />}
              >
                Delete location
              </Button>
            </div>
          )}
        </div>
      </header>

      {canEditInventory && (
        <Modal
          isOpen={editOpen}
          onOpenChange={setEditOpen}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Edit location</span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={saveLocation}
                    isLoading={isSaving}
                    isDisabled={!editName.trim()}
                  >
                    Save
                  </Button>
                  <MobileSheetCloseButton onPress={onClose} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Location name"
                    value={editName}
                    onValueChange={setEditName}
                    variant="bordered"
                    radius="lg"
                    isDisabled={isSaving}
                    classNames={modalInputClassNames}
                  />
                  <EntityImageManager
                    entityType="location"
                    entityId={location.id}
                    imageUrl={currentImageUrl}
                    label="Location photo"
                    onChange={({ imageUrl: nextImageUrl }) => {
                      setCurrentImageUrl(nextImageUrl ?? null);
                    }}
                  />
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={() => {
                        onClose();
                        setDeleteOpen(true);
                      }}
                    >
                      Delete location
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
                    onPress={saveLocation}
                    isLoading={isSaving}
                    isDisabled={!editName.trim()}
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
          isOpen={deleteOpen}
          isDeleting={isDeleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
          title={`Delete location "${name}"?`}
          description={`This will delete "${name}" and everything stored inside it. This cannot be undone.`}
        />
      )}
    </>
  );
}
