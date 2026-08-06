"use client";

import NativeButton from "@/components/ui/NativeButton";
import {
  useRef } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import NativeInput from "@/components/ui/NativeInput";
import { FaCamera, FaImage, FaTrash, FaUpload } from "react-icons/fa";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import NativeSelect from "@/components/ui/NativeSelect";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  modalTitleClass,
} from "@/components/modals/modalTheme";

export default function CategoryCreateModal({
  isOpen,
  onClose,
  categoryName,
  setCategoryName,
  locationId,
  areaId,
  filterLocations,
  createAreaOptions,
  onLocationChange,
  setAreaId,
  imageFile,
  imagePreview,
  imageMessage,
  onSelectImageFile,
  onClearImageFile,
  filterAreas,
  error,
  isCreating,
  onCreate,
}) {
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      placement="center"
      scrollBehavior="inside"
      classNames={{
        wrapper: "z-[100] max-md:items-end",
        base:
          "mx-0 my-0 w-full rounded-t-[1.75rem] rounded-b-none border border-white/70 bg-white shadow-2xl md:mx-4 md:my-8 md:max-w-lg md:rounded-[1.5rem]",
        closeButton: "hidden",
      }}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {(onCloseFromModal) => (
          <>
            <ModalHeader
              className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}
            >
              <span className={`min-w-0 flex-1 ${modalTitleClass}`}>Add category</span>
              <NativeButton
                size="sm"
                className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                onPress={onCreate}
                isLoading={isCreating}
                isDisabled={isCreating || !categoryName.trim() || !areaId}
              >
                Add
              </NativeButton>
              <MobileSheetCloseButton onPress={onCloseFromModal} />
            </ModalHeader>
            <ModalBody className={`space-y-3 ${modalBodyClass}`}>
              <NativeInput
                label="Category name"
                value={categoryName}
                onValueChange={setCategoryName}
                isDisabled={isCreating}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
              />
              <NativeSelect
                label="Location"
                aria-label="Category location"
                value={locationId ? String(locationId) : ""}
                onChange={onLocationChange}
                disabled={isCreating || filterLocations.length === 0}
                placeholder="Select location"
                options={filterLocations.map((location) => ({
                  value: String(location.id),
                  label: location.name,
                }))}
              />
              <NativeSelect
                label="Storage area"
                aria-label="Category storage area"
                value={areaId ? String(areaId) : ""}
                onChange={(value) => setAreaId(value || "")}
                disabled={isCreating || createAreaOptions.length === 0}
                placeholder="Select storage area"
                options={createAreaOptions.map((area) => ({
                  value: String(area.id),
                  label: area.name,
                }))}
              />
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                    Category photo optional
                  </div>
                  {imageFile ? (
                    <span className="rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
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
                      <NativeButton
                        size="sm"
                        variant="flat"
                        className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:hidden"
                        isDisabled={isCreating}
                        onPress={() => cameraInputRef.current?.click()}
                        startContent={<FaCamera className="h-3.5 w-3.5" />}
                      >
                        Take photo
                      </NativeButton>
                      <NativeButton
                        size="sm"
                        variant="flat"
                        className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                        isDisabled={isCreating}
                        onPress={() => imageInputRef.current?.click()}
                        startContent={<FaUpload className="h-3.5 w-3.5" />}
                      >
                        {imageFile ? "Change photo" : "Add photo"}
                      </NativeButton>
                      {imageFile ? (
                        <NativeButton
                          size="sm"
                          variant="flat"
                          className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                          isDisabled={isCreating}
                          onPress={onClearImageFile}
                          startContent={<FaTrash className="h-3.5 w-3.5" />}
                        >
                          Remove photo
                        </NativeButton>
                      ) : null}
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        onSelectImageFile(file);
                      }}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        onSelectImageFile(file);
                      }}
                    />
                    <p className="text-xs leading-5 text-gray-500 max-md:hidden">
                      {imageFile
                        ? imageFile.name
                        : "Take a photo or choose one from your camera roll. Max 5 MB."}
                    </p>
                    {imageMessage ? (
                      <p className="text-xs text-rose-700">{imageMessage}</p>
                    ) : null}
                  </div>
                </div>
              </div>
              {filterAreas.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Add a storage area before creating categories.
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <NativeButton
                variant="light"
                onPress={onCloseFromModal}
                isDisabled={isCreating}
                className="max-md:hidden"
              >
                Cancel
              </NativeButton>
              <NativeButton
                className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                onPress={onCreate}
                isLoading={isCreating}
                isDisabled={isCreating || !categoryName.trim() || !areaId}
              >
                Add Category
              </NativeButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
