"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
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

export default function CategoryDrawer({
  isOpen,
  onClose,
  activeCategory,
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
        base: "rounded-none md:rounded-l-2xl h-full md:h-[calc(100vh-24px)] md:my-3",
        wrapper: "items-stretch justify-end",
      }}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader
              className={`flex flex-col gap-1 ${modalHeaderClass} max-md:flex-row max-md:gap-3`}
            >
              <div
                className="min-w-0 flex-1 truncate text-lg font-semibold text-[var(--stocksense-brand)]"
                title={activeCategory?.name || "Category"}
              >
                {activeCategory?.name || "Category"}
              </div>
              <div
                className="truncate text-sm text-gray-500 max-md:hidden"
                title={`${activeCategory?.location?.name || ""} / ${activeCategory?.storageArea?.name || ""}`}
              >
                {activeCategory?.location?.name} &gt; {activeCategory?.storageArea?.name}
              </div>
              {canEditInventory && (
                <Button
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onClick={onRename}
                  isDisabled={!renameValue.trim()}
                >
                  Save
                </Button>
              )}
              <MobileSheetCloseButton onPress={onClose} />
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              {canEditInventory && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">
                    Category name
                  </div>
                  <Input
                    value={renameValue}
                    onValueChange={setRenameValue}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <Button
                    onClick={onRename}
                    isDisabled={!renameValue.trim()}
                    className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                  >
                    Save name
                  </Button>
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
                  <Button
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onClick={onDelete}
                  >
                    Delete category
                  </Button>
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
              <Button
                variant="light"
                className="rounded-xl max-md:hidden"
                onClick={onClose}
              >
                Close
              </Button>
              {canEditInventory && (
                <Button
                  className="rounded-xl bg-rose-600 text-white max-md:hidden"
                  onClick={onDelete}
                >
                  Delete category
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
