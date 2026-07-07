"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { FaBoxOpen, FaEdit, FaMapMarkedAlt, FaTags, FaTrash, FaWarehouse } from "react-icons/fa";
import { deleteLocation, updateLocationName } from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
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

      <header className="mb-6 overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm max-md:hidden">
        <div className="border-t-4 border-[var(--entity-location-accent)] p-5">
          <Link
            href="/locations"
            className="inline-flex items-center text-sm font-medium text-[var(--stocksense-brand)] hover:underline"
          >
            Back to locations
          </Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 gap-4">
              {currentImageUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-location-border)] bg-white">
                  <img src={currentImageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--entity-location-border)] bg-[var(--entity-location-soft)] text-[var(--entity-location-accent)]">
                  <FaMapMarkedAlt className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Location
                </p>
                <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-stocksense-teal">
                  {name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500">
                  Manage this location while seeing the hierarchy clearly: storage
                  areas contain categories, and categories contain items.
                </p>
              </div>
            </div>

            {canEditInventory && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="flat"
                  className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700"
                  onPress={() => {
                    setEditName(name);
                    setEditOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit
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

      {canEditInventory && (
        <Modal isOpen={editOpen} onOpenChange={setEditOpen} placement="center">
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={modalHeaderClass}>Edit location</ModalHeader>
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
                </ModalBody>
                <ModalFooter className={modalFooterClass}>
                  <Button variant="light" onPress={onClose} isDisabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white"
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
