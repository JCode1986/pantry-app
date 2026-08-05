"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import NativeInput from "@/components/ui/NativeInput";
import NativeButton from "@/components/ui/NativeButton";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";

export default function AreaDrawer({
  isOpen,
  onClose,
  activeArea,
  canEditInventory,
  renameValue,
  setRenameValue,
  onRename,
  onImageChange,
  onDelete,
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
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-lg font-semibold text-[var(--stocksense-brand)]"
                  title={activeArea?.name || "Storage Area"}
                >
                  {activeArea?.name || "Storage Area"}
                </div>
                <div
                  className="truncate text-sm text-gray-500"
                  title={activeArea?.location?.name || ""}
                >
                  {activeArea?.location?.name}
                </div>
              </div>
              {canEditInventory && (
                <NativeButton
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onClick={onRename}
                  isDisabled={!renameValue.trim()}
                >
                  Save
                </NativeButton>
              )}
              <MobileSheetCloseButton onPress={onClose} />
            </ModalHeader>

            <ModalBody className={`space-y-5 ${modalBodyClass}`}>
              {canEditInventory && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Area name</div>
                  <NativeInput
                    value={renameValue}
                    onValueChange={setRenameValue}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <NativeButton
                    onClick={onRename}
                    isDisabled={!renameValue.trim()}
                    className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                  >
                    Save name
                  </NativeButton>
                </div>
              )}

              {canEditInventory && activeArea?.id && (
                <EntityImageManager
                  entityType="storage_area"
                  entityId={activeArea.id}
                  imageUrl={activeArea.imageUrl}
                  label="Storage area photo"
                  onChange={onImageChange}
                />
              )}

              {canEditInventory && activeArea?.id && (
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onClick={onDelete}
                  >
                    Delete storage area
                  </NativeButton>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                  {activeArea?.categoriesCount ?? 0}{" "}
                  {(activeArea?.categoriesCount ?? 0) === 1 ? "category" : "categories"}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                  {activeArea?.itemsCount ?? 0}{" "}
                  {(activeArea?.itemsCount ?? 0) === 1 ? "item" : "items"}
                </span>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-gray-950">
                  Categories
                </div>

                <div className="space-y-2">
                  {(activeArea?.categories || []).slice(0, 10).map((category) => (
                    <div
                      key={category.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-stocksense-gray bg-white p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate font-medium text-gray-950"
                          title={category.name}
                        >
                          {category.name}
                        </div>
                        <div
                          className="truncate text-sm text-gray-500"
                          title={`${category.itemsCount} ${
                            category.itemsCount === 1 ? "item" : "items"
                          }`}
                        >
                          {category.itemsCount}{" "}
                          {category.itemsCount === 1 ? "item" : "items"}
                        </div>
                      </div>
                    </div>
                  ))}

                  {(activeArea?.categories || []).length === 0 && (
                    <div className="text-sm text-gray-500">
                      No categories in this area yet.
                    </div>
                  )}

                  {(activeArea?.categories || []).length > 10 && (
                    <div className="text-xs text-gray-400">
                      Showing first 10 categories...
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>

            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <NativeButton
                variant="light"
                className="rounded-xl max-md:hidden"
                onClick={onClose}
              >
                Close
              </NativeButton>
              {canEditInventory && (
                <NativeButton
                  className="rounded-xl bg-rose-600 text-white max-md:hidden"
                  onClick={onDelete}
                >
                  Delete area
                </NativeButton>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
