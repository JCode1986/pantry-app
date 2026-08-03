"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import NativeInput from "@/components/ui/NativeInput";
import NativeButton from "@/components/ui/NativeButton";
import { FaImage, FaPlus } from "react-icons/fa";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import NativeSelect from "@/components/ui/NativeSelect";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";

export default function AreaCreateModal({
  isOpen,
  onOpen,
  onClose,
  locationId,
  setLocationId,
  filterLocations,
  areaName,
  setAreaName,
  imageFile,
  imagePreview,
  imageMessage,
  onSelectImageFile,
  onClearImageFile,
  isCreating,
  onCreate,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) onOpen();
        else onClose();
      }}
      placement="center"
      scrollBehavior="inside"
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {(onCloseFromModal) => (
          <>
            <ModalHeader className={modalHeaderClass}>Add Storage Area</ModalHeader>
            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              <NativeSelect
                label="Location"
                aria-label="Storage area location"
                value={locationId ? String(locationId) : ""}
                onChange={(value) => setLocationId(value || "")}
                disabled={isCreating || filterLocations.length === 0}
                placeholder="Select location"
                options={filterLocations.map((location) => ({
                  value: String(location.id),
                  label: location.name,
                }))}
              />
              <NativeInput
                label="Storage area name"
                value={areaName}
                onValueChange={setAreaName}
                placeholder="e.g., Pantry, drawer, cabinet, shelf"
                radius="lg"
                variant="bordered"
                isDisabled={isCreating || filterLocations.length === 0}
                classNames={modalInputClassNames}
                autoFocus
              />
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                    Storage area photo
                  </div>
                  {imageFile ? (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                      Ready to upload
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
                    {imagePreview ? (
                      <ImageWithLoader
                        src={imagePreview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-gray-400">
                        Optional photo
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)]">
                        <FaImage className="h-3.5 w-3.5" />
                        {imageFile ? "Change photo" : "Add photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isCreating || filterLocations.length === 0}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            onSelectImageFile(file);
                          }}
                        />
                      </label>
                      {imageFile ? (
                        <NativeButton
                          variant="flat"
                          className="rounded-xl border border-gray-200 bg-white text-gray-600"
                          onPress={onClearImageFile}
                          isDisabled={isCreating}
                        >
                          Remove
                        </NativeButton>
                      ) : null}
                    </div>
                    <p className="text-xs leading-5 text-gray-500">
                      {imageFile
                        ? imageFile.name
                        : "Choose a photo now, or add one later from edit."}
                    </p>
                    {imageMessage ? (
                      <p className="text-xs text-[var(--stocksense-brand)]">
                        {imageMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              {filterLocations.length === 0 ? (
                <p className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm text-[var(--stocksense-brand)]">
                  Create a location first, then add a storage area inside it.
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter className={modalFooterClass}>
              <NativeButton variant="light" onPress={onCloseFromModal} isDisabled={isCreating}>
                Cancel
              </NativeButton>
              <NativeButton
                className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                onPress={onCreate}
                isLoading={isCreating}
                isDisabled={
                  isCreating ||
                  !areaName.trim() ||
                  !locationId ||
                  filterLocations.length === 0
                }
                startContent={!isCreating ? <FaPlus /> : null}
              >
                Add Storage Area
              </NativeButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
