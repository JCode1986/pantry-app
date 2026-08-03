"use client";

import NativeButton from "@/components/ui/NativeButton";
import {
  useRef } from "react";
import NativeInput from "@/components/ui/NativeInput";
import dynamic from "next/dynamic";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaCamera, FaImage, FaTrash, FaUpload } from "react-icons/fa";
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import useDesktopAutoFocus from "@/components/modals/useDesktopAutoFocus";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";

const EntityImageManager = dynamic(
  () => import("@/components/inventory/EntityImageManager"),
  { ssr: false }
);

const LOCATION_SUGGESTIONS = [
  "Home",
  "Apartment",
  "Garage",
  "Storage Unit",
  "Office",
];

export default function LocationEditorModal({
  locationModal,
  setLocationModal,
  isSavingLocation,
  locationImageMessage,
  onClose,
  onSubmit,
  onSelectImageFile,
  onClearImageFile,
  onImageChange,
  onRequestDelete,
}) {
  const locationImageInputRef = useRef(null);
  const locationCameraInputRef = useRef(null);
  const shouldAutoFocus = useDesktopAutoFocus(locationModal.open);

  return (
    <Modal
      isOpen={locationModal.open}
      onOpenChange={(open) => !open && onClose()}
      placement="center"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={mobileSheetModalClassNames}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        <ModalHeader
          className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}
        >
          <span className="min-w-0 flex-1 truncate">
            {locationModal.mode === "edit"
              ? `Edit location ${locationModal.name || ""}`
              : "Create Location"}
          </span>
          <NativeButton
            size="sm"
            radius="full"
            onPress={onSubmit}
            isDisabled={!locationModal.name.trim() || isSavingLocation}
            isLoading={isSavingLocation}
            className="h-10 shrink-0 bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
          >
            {locationModal.mode === "edit" ? "Save" : "Create"}
          </NativeButton>
          <MobileSheetCloseButton onPress={onClose} />
        </ModalHeader>
        <ModalBody className={`space-y-4 ${modalBodyClass}`}>
          <NativeInput
            label="Location name"
            value={locationModal.name}
            onValueChange={(name) => setLocationModal((prev) => ({ ...prev, name }))}
            isDisabled={isSavingLocation}
            variant="bordered"
            radius="lg"
            classNames={modalInputClassNames}
            autoFocus={shouldAutoFocus}
          />
          {locationModal.mode === "create" && (
            <MobileSuggestionChips
              suggestions={LOCATION_SUGGESTIONS}
              onSelect={(name) => setLocationModal((prev) => ({ ...prev, name }))}
            />
          )}
          {locationModal.mode === "create" && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 max-md:bg-white">
              <input
                ref={locationImageInputRef}
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
                ref={locationCameraInputRef}
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

              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                  Location photo optional
                </div>
                {locationModal.imageFile && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                    Ready to upload
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-32 sm:w-44">
                  {locationModal.imagePreview ? (
                    <ImageWithLoader
                      src={locationModal.imagePreview}
                      alt=""
                      className="h-full w-full object-contain"
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
                      isDisabled={isSavingLocation}
                      onPress={() => locationCameraInputRef.current?.click()}
                      startContent={<FaCamera className="h-3.5 w-3.5" />}
                    >
                      Take photo
                    </NativeButton>
                    <NativeButton
                      size="sm"
                      variant="flat"
                      className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                      isDisabled={isSavingLocation}
                      onPress={() => locationImageInputRef.current?.click()}
                      startContent={<FaUpload className="h-3.5 w-3.5" />}
                    >
                      {locationModal.imageFile ? "Change photo" : "Add photo"}
                    </NativeButton>
                    {locationModal.imageFile && (
                      <NativeButton
                        size="sm"
                        variant="flat"
                        className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                        isDisabled={isSavingLocation}
                        onPress={onClearImageFile}
                        startContent={<FaTrash className="h-3.5 w-3.5" />}
                      >
                        Remove photo
                      </NativeButton>
                    )}
                  </div>
                  <p className="text-xs leading-5 text-gray-500 max-md:hidden">
                    {locationModal.imageFile
                      ? locationModal.imageFile.name
                      : "Take a photo or choose one from your camera roll. Max 5 MB."}
                  </p>
                  {locationImageMessage && (
                    <p className="text-xs text-rose-700">{locationImageMessage}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {locationModal.mode === "edit" && (
            <EntityImageManager
              entityType="location"
              entityId={locationModal.locationId}
              imageUrl={locationModal.imageUrl}
              label="Location photo optional"
              onChange={onImageChange}
            />
          )}
          {locationModal.mode === "edit" && (
            <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
              <p className="text-sm font-semibold text-gray-950">Danger zone</p>
              <NativeButton
                className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                onPress={() => {
                  const target = {
                    id: locationModal.locationId,
                    name: locationModal.name,
                  };
                  onClose();
                  onRequestDelete(target);
                }}
              >
                Delete location
              </NativeButton>
            </div>
          )}
        </ModalBody>
        <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
          <NativeButton
            variant="light"
            radius="lg"
            onPress={onClose}
            isDisabled={isSavingLocation}
            className="max-md:hidden"
          >
            Cancel
          </NativeButton>
          <NativeButton
            radius="lg"
            onPress={onSubmit}
            isDisabled={!locationModal.name.trim() || isSavingLocation}
            isLoading={isSavingLocation}
            className="bg-[var(--stocksense-brand)] text-white max-md:hidden"
          >
            {locationModal.mode === "edit" ? (
              "Save changes"
            ) : (
              <>
                <span className="md:hidden">Create Location</span>
                <span className="max-md:hidden">Add location</span>
              </>
            )}
          </NativeButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
