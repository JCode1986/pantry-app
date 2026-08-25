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
  modalSubtitleClass,
  modalTitleClass,
} from "@/components/modals/modalTheme";

export default function CategoryDrawer({
  isOpen,
  onClose,
  activeCategory,
  canEditInventory,
  renameValue,
  setRenameValue,
  onRename,
  isRenaming = false,
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
            <ModalHeader
              className={`flex flex-col gap-1 ${modalHeaderClass} max-md:flex-row max-md:items-center max-md:gap-3`}
            >
              <div
                className={`min-w-0 flex-1 ${modalTitleClass}`}
                title={activeCategory?.name || "Category"}
              >
                {activeCategory?.name || "Category"}
              </div>
              <div
                className={`${modalSubtitleClass} max-md:hidden`}
                title={`${activeCategory?.location?.name || ""} / ${activeCategory?.storageArea?.name || ""}`}
              >
                {activeCategory?.location?.name} &gt; {activeCategory?.storageArea?.name}
              </div>
              {canEditInventory && (
                <NativeButton
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onClick={onRename}
                  isLoading={isRenaming}
                  isDisabled={isRenaming || !renameValue.trim()}
                >
                  Save
                </NativeButton>
              )}
              <MobileSheetCloseButton onPress={onClose} />
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              {canEditInventory && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">
                    Category name
                  </div>
                  <NativeInput
                    value={renameValue}
                    onValueChange={setRenameValue}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                    isDisabled={isRenaming}
                  />
                  <NativeButton
                    onClick={onRename}
                    isLoading={isRenaming}
                    isDisabled={isRenaming || !renameValue.trim()}
                    className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                  >
                    Save name
                  </NativeButton>
                </div>
              )}

              {canEditInventory && activeCategory?.id && (
                <EntityImageManager
                  entityType="category"
                  entityId={activeCategory.id}
                  imageUrl={activeCategory.imageUrl}
                  label="Category photo"
                  onChange={onImageChange}
                />
              )}

              {canEditInventory && activeCategory?.id && (
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onClick={onDelete}
                    isDisabled={isRenaming}
                  >
                    Delete category
                  </NativeButton>
                </div>
              )}

              <div>
                <div className="mb-2 text-sm font-semibold text-gray-950">
                  Items ({activeCategory?.itemsCount ?? 0})
                </div>

                <div className="space-y-2">
                  {(activeCategory?.items || []).slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate font-medium text-gray-950"
                          title={item.name}
                        >
                          {item.name}
                        </div>
                        <div
                          className="truncate text-sm text-gray-500"
                          title={`Qty: ${item.quantity ?? 0} - Exp: ${item.expiration_date || "-"}`}
                        >
                          Qty: {item.quantity ?? 0} &bull; Exp:{" "}
                          {item.expiration_date || "-"}
                        </div>
                      </div>
                    </div>
                  ))}

                  {(activeCategory?.items || []).length === 0 && (
                    <div className="text-sm text-gray-500">
                      No items in this category yet.
                    </div>
                  )}

                  {(activeCategory?.items || []).length > 8 && (
                    <div className="text-xs text-gray-400">
                      Showing first 8 items...
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
                isDisabled={isRenaming}
              >
                Close
              </NativeButton>
              {canEditInventory && (
                <NativeButton
                  className="rounded-xl bg-rose-600 text-white max-md:hidden"
                  onClick={onDelete}
                  isDisabled={isRenaming}
                >
                  Delete category
                </NativeButton>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
