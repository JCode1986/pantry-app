"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaCamera, FaImage, FaPlus, FaShoppingBasket, FaTrash, FaUpload } from "react-icons/fa";
import { uploadInventoryImage } from "@/app/actions/server";
import { addShoppingListItemAction } from "@/app/actions/shoppingList";
import { toNonNegativeInteger } from "@/utils/pantry/date";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";
import useDesktopAutoFocus from "@/components/modals/useDesktopAutoFocus";
import ImageWithLoader from "@/components/ui/ImageWithLoader";

const EMPTY_FORM = {
  name: "",
  quantity: "1",
};

const SHOPPING_SUGGESTIONS = ["Milk", "Bread", "Eggs", "Rice", "Dog food"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function validateImageFile(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.has(file.type)) return "Choose a JPG, PNG, WebP, or GIF image.";
  if (file.size > MAX_IMAGE_SIZE) return "Images must be 5 MB or smaller.";
  return "";
}

export default function AddShoppingListItemModal({
  isOpen,
  onClose,
  onAdded,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const shouldAutoFocus = useDesktopAutoFocus(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setMessage("");
    setImageFile(null);
    setImagePreview("");
    setImageMessage("");
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleClose = () => {
    if (isSaving) return;
    setMessage("");
    setImageMessage("");
    onClose?.();
  };

  const chooseImage = (file) => {
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setImageMessage(error);
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
    setImageMessage("");
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    setImageMessage("");
  };

  const handleSubmit = async ({ closeAfterAdd = true } = {}) => {
    const name = form.name.trim();
    if (!name) {
      setMessage("Item name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    let result;
    try {
      result = await addShoppingListItemAction({
        name,
        quantity: toNonNegativeInteger(form.quantity, 1),
      });
    } catch (error) {
      console.error("addShoppingListItemAction error:", error);
      setMessage("Could not add shopping list item.");
      setIsSaving(false);
      return;
    }

    if (result?.error) {
      setIsSaving(false);
      setMessage(result.error);
      return;
    }

    let nextItem = result.data;
    let imageUploadWarning = "";

    if (imageFile && nextItem?.id) {
      const formData = new FormData();
      formData.append("image", imageFile);

      try {
        const imageResult = await uploadInventoryImage(
          "shopping_list_item",
          nextItem.id,
          formData
        );

        if (imageResult?.error) {
          imageUploadWarning =
            typeof imageResult.error === "string"
              ? imageResult.error
              : "Shopping list item was added, but the photo could not be uploaded.";
        } else if (imageResult?.data) {
          nextItem = {
            ...nextItem,
            image_path: imageResult.data.imagePath ?? nextItem.image_path ?? null,
            imagePath: imageResult.data.imagePath ?? nextItem.imagePath ?? null,
            imageUrl: imageResult.data.imageUrl ?? nextItem.imageUrl ?? null,
          };
        }
      } catch (error) {
        console.error("shopping list image upload error:", error);
        imageUploadWarning = "Shopping list item was added, but the photo could not be uploaded.";
      }
    }

    onAdded?.(nextItem);
    setForm(EMPTY_FORM);
    removeImage();
    setMessage(imageUploadWarning);
    setIsSaving(false);

    if (closeAfterAdd && !imageUploadWarning) {
      onClose?.();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      placement="center"
      size="md"
      scrollBehavior="inside"
      classNames={mobileSheetModalClassNames}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <span className="inline-flex min-w-0 flex-1 items-center gap-2 truncate">
                <FaShoppingBasket className="h-4 w-4 shrink-0" />
                <span className="truncate">Add to shopping list</span>
              </span>
              <Button
                size="sm"
                className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                onPress={() => handleSubmit({ closeAfterAdd: true })}
                isLoading={isSaving}
                startContent={!isSaving ? <FaPlus className="h-3.5 w-3.5" /> : null}
              >
                Add
              </Button>
              <MobileSheetCloseButton onPress={handleClose} />
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              {message ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {message}
                </p>
              ) : null}

              <Input
                label="Item"
                value={form.name}
                onValueChange={(value) => updateForm("name", value)}
                placeholder="e.g., Milk, paper towels, coffee"
                variant="bordered"
                radius="lg"
                isDisabled={isSaving}
                classNames={modalInputClassNames}
                autoFocus={shouldAutoFocus}
              />
              <MobileSuggestionChips
                suggestions={SHOPPING_SUGGESTIONS}
                onSelect={(name) => updateForm("name", name)}
              />

              <QuantityStepperInput
                label="Quantity"
                value={form.quantity}
                onValueChange={(value) => updateForm("quantity", value)}
                min={0}
                isDisabled={isSaving}
                classNames={modalInputClassNames}
              />

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 max-md:bg-white">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900">
                  <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                  Photo optional
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
                    {imagePreview ? (
                      <ImageWithLoader
                        src={imagePreview}
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
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        chooseImage(file);
                      }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        chooseImage(file);
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:hidden"
                        isDisabled={isSaving}
                        onPress={() => cameraInputRef.current?.click()}
                        startContent={<FaCamera className="h-3.5 w-3.5" />}
                      >
                        Take photo
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                        isDisabled={isSaving}
                        onPress={() => fileInputRef.current?.click()}
                        startContent={<FaUpload className="h-3.5 w-3.5" />}
                      >
                        {imageFile ? "Change photo" : "Add photo"}
                      </Button>
                      {imageFile ? (
                        <Button
                          size="sm"
                          variant="flat"
                          className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                          isDisabled={isSaving}
                          onPress={removeImage}
                          startContent={<FaTrash className="h-3.5 w-3.5" />}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs leading-5 text-gray-500 max-md:hidden">
                      Take a photo or choose one from your camera roll. Max 5 MB.
                    </p>
                    {imageMessage ? <p className="text-xs text-rose-700">{imageMessage}</p> : null}
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <Button
                variant="light"
                className="rounded-xl max-md:hidden"
                onPress={handleClose}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="flat"
                className="rounded-xl max-md:hidden"
                onPress={() => handleSubmit({ closeAfterAdd: false })}
                isDisabled={isSaving}
              >
                Add another
              </Button>
              <Button
                className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                onPress={() => handleSubmit({ closeAfterAdd: true })}
                isLoading={isSaving}
                startContent={!isSaving ? <FaPlus /> : null}
              >
                <span className="md:hidden">Create Shopping List Item</span>
                <span className="max-md:hidden">Add</span>
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
