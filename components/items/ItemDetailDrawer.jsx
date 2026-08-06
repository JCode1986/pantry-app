"use client";

import NativeButton from "@/components/ui/NativeButton";
import NativeInput from "@/components/ui/NativeInput";
import Link from "next/link";
import DatePicker from "@/components/ui/NativeDatePicker";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import {
  FaBarcode,
  FaMapMarkedAlt,
  FaTags,
  FaWarehouse,
} from "react-icons/fa";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  modalSubtitleClass,
  modalTitleClass,
} from "@/components/modals/modalTheme";
import ImageWithLoader from "@/components/ui/ImageWithLoader";

function HierarchyImageTile({ imageUrl, icon: Icon, label }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] md:h-20 md:w-full">
      {imageUrl ? (
        <ImageWithLoader
          src={imageUrl}
          alt={`${label} image`}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </div>
  );
}

function ItemHierarchyCard({ item }) {
  if (!item) return null;

  const levels = [
    {
      key: "location",
      label: "Location",
      name: item.location?.name || "Unknown location",
      href: item.location?.id ? `/locations/${item.location.id}` : null,
      imageUrl: item.location?.imageUrl,
      icon: FaMapMarkedAlt,
    },
    {
      key: "area",
      label: "Storage Area",
      name: item.area?.name || "Storage area",
      href: item.area?.id ? `/areas/${item.area.id}` : null,
      imageUrl: item.area?.imageUrl,
      icon: FaWarehouse,
    },
    {
      key: "category",
      label: "Category",
      name: item.category?.name || "Category",
      href: item.category?.id ? `/categories/${item.category.id}` : null,
      imageUrl: item.category?.imageUrl,
      icon: FaTags,
    },
  ];

  return (
    <section className="rounded-3xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--stocksense-brand)]">
            Stored in
          </p>
          <h3 className="text-base font-semibold text-gray-950">Item location</h3>
        </div>
        <p className="text-xs text-gray-500">Location / Storage Area / Category</p>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {levels.map((level) => {
          const content = (
            <div className="flex h-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--stocksense-brand-border)] bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:flex-col md:items-stretch md:gap-3">
              <HierarchyImageTile
                imageUrl={level.imageUrl}
                icon={level.icon}
                label={level.label}
              />
              <div className="min-w-0 flex-1 md:text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {level.label}
                </p>
                <p
                  className="mt-0.5 whitespace-normal break-words text-sm font-semibold leading-5 text-gray-950"
                  title={level.name}
                >
                  {level.name}
                </p>
              </div>
            </div>
          );

          return level.href ? (
            <Link
              key={level.key}
              href={level.href}
              className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
            >
              {content}
            </Link>
          ) : (
            <div key={level.key}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

export default function ItemDetailDrawer({
  isOpen,
  activeItem,
  canEditInventory,
  editName,
  editQty,
  editExp,
  editBarcode,
  hasItemEditChanges,
  onClose,
  onSave,
  onMove,
  onDelete,
  onEditNameChange,
  onEditQtyChange,
  onEditExpChange,
  onEditBarcodeChange,
  onImageChange,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => (open ? null : onClose())}
      placement="right"
      size="lg"
      classNames={{
        base: "h-full rounded-none md:rounded-l-2xl",
        wrapper: "items-stretch justify-end",
      }}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex items-center gap-3 ${modalHeaderClass}`}>
              <div className="min-w-0 flex-1">
                <div
                  className={modalTitleClass}
                  title={activeItem?.name || "Item"}
                >
                  {activeItem?.name || "Item"}
                </div>
                <div className={modalSubtitleClass}>Item details</div>
              </div>
              {canEditInventory ? (
                <NativeButton
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onPress={onSave}
                  isDisabled={!hasItemEditChanges}
                >
                  Save
                </NativeButton>
              ) : null}
              <MobileSheetCloseButton onPress={onClose} />
            </ModalHeader>

            <ModalBody className={`space-y-5 ${modalBodyClass}`}>
              <ItemHierarchyCard item={activeItem} />

              {canEditInventory ? (
                <>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Item name</div>
                    <NativeInput
                      value={editName}
                      onValueChange={onEditNameChange}
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <QuantityStepperInput
                      label="Quantity"
                      value={editQty}
                      onValueChange={onEditQtyChange}
                      min={0}
                      classNames={modalInputClassNames}
                    />

                    <DatePicker
                      label="Expiration date"
                      labelPlacement="inside"
                      value={editExp || null}
                      onChange={(date) => onEditExpChange(date ? date.toString() : "")}
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                      showMonthAndYearPickers
                    />
                  </div>

                  <div className="space-y-2 max-md:hidden">
                    <div className="text-xs font-medium text-gray-600">Barcode</div>
                    <NativeInput
                      value={editBarcode}
                      onValueChange={onEditBarcodeChange}
                      placeholder="e.g., 012345678905"
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                      startContent={<FaBarcode className="text-gray-400" />}
                    />
                  </div>

                  <EntityImageManager
                    entityType="item"
                    entityId={activeItem?.id}
                    imageUrl={activeItem?.imageUrl}
                    label="Item photo"
                    onChange={onImageChange}
                  />

                  {activeItem?.barcode && (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 md:hidden">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <FaBarcode className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                        <span>Barcode</span>
                      </div>
                      <div
                        className="mt-1 truncate text-sm font-semibold text-gray-800"
                        title={activeItem.barcode}
                      >
                        {activeItem.barcode}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 max-md:flex-col">
                    <NativeButton
                      onPress={onSave}
                      isDisabled={!hasItemEditChanges}
                      className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    >
                      Save changes
                    </NativeButton>
                    <NativeButton
                      onPress={onMove}
                      className="w-full rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                    >
                      Move
                    </NativeButton>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <NativeButton
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={onDelete}
                    >
                      Delete item
                    </NativeButton>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-stocksense-gray bg-white p-3">
                    <div className="text-xs font-medium text-gray-500">Quantity</div>
                    <div className="mt-1 text-sm font-semibold text-gray-800">
                      {activeItem?.quantity ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-stocksense-gray bg-white p-3">
                    <div className="text-xs font-medium text-gray-500">Expiration</div>
                    <div className="mt-1 text-sm font-semibold text-gray-800">
                      {activeItem?.expiration_date || "None"}
                    </div>
                  </div>
                  {activeItem?.barcode && (
                    <div className="rounded-xl border border-stocksense-gray bg-white p-3 sm:col-span-2">
                      <div className="text-xs font-medium text-gray-500">Barcode</div>
                      <div className="mt-1 text-sm font-semibold text-gray-800">
                        {activeItem.barcode}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <NativeButton
                variant="light"
                className="rounded-xl max-md:hidden"
                onPress={onClose}
              >
                Close
              </NativeButton>
              {canEditInventory && (
                <NativeButton
                  className="rounded-xl bg-rose-600 text-white max-md:hidden"
                  onPress={onDelete}
                >
                  Delete
                </NativeButton>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
