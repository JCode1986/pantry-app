"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  FaBarcode,
  FaCamera,
  FaCheckCircle,
  FaImage,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTags,
  FaTrash,
  FaUpload,
  FaWarehouse,
} from "react-icons/fa";
import {
  addItemWithPath,
  getInventoryHierarchy,
  lookupProductByBarcode,
  uploadInventoryImage,
} from "@/app/actions/server";
import { toNonNegativeInteger } from "@/utils/pantry/date";
import { emitItemAdded } from "@/utils/clientEvents";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalHeaderClass,
  modalInputClassNames,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import BarcodeScannerModal from "@/components/items/BarcodeScannerModal";

const NEW_VALUE = "__new__";
const EMPTY_LIST = [];
const ITEM_IMAGE_ENTITY = "item";
const revealTransition = { duration: 0.2, ease: "easeOut" };
const revealMotion = {
  initial: { opacity: 0, height: 0, y: -6 },
  animate: { opacity: 1, height: "auto", y: 0 },
  exit: { opacity: 0, height: 0, y: -6 },
  transition: revealTransition,
};

const emptyForm = {
  locationName: "",
  storageAreaName: "",
  categoryName: "",
  itemName: "",
  barcode: "",
  quantity: "1",
  expirationDate: "",
};

const emptyItemFields = {
  itemName: "",
  barcode: "",
  quantity: "1",
  expirationDate: "",
};

const emptyValidationErrors = {
  locationName: "",
  storageAreaName: "",
  categoryName: "",
  itemName: "",
};

const invalidInputWrapperClass =
  "data-[invalid=true]:border-rose-500 data-[invalid=true]:bg-rose-50/40 focus-within:data-[invalid=true]:border-rose-500";

const invalidSelectTriggerClass =
  "data-[invalid=true]:border-rose-500 data-[invalid=true]:bg-rose-50/40 data-[invalid=true]:text-rose-700";

function getModalInputClassNames(isInvalid = false) {
  return {
    ...modalInputClassNames,
    inputWrapper: `${modalInputClassNames.inputWrapper} ${
      isInvalid ? invalidInputWrapperClass : ""
    }`,
  };
}

function getThemedSelectClassNames(isInvalid = false) {
  return {
    ...themedSelectClassNames,
    trigger: `${themedSelectClassNames.trigger} ${
      isInvalid ? invalidSelectTriggerClass : ""
    }`,
  };
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function cleanBarcode(value) {
  return typeof value === "string"
    ? value.trim().replace(/[^0-9A-Za-z._-]/g, "").slice(0, 80)
    : "";
}

function validateImageFile(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.has(file.type)) {
    return "Choose a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "Images must be 5 MB or smaller.";
  }
  return "";
}

function byId(items, id) {
  return (items ?? []).find((item) => String(item.id) === String(id)) ?? null;
}

function AddItemMessage({ message, upgradeHref, onLinkClick, className = "" }) {
  if (!message) return null;

  return (
    <motion.div
      layout
      {...revealMotion}
      role="alert"
      aria-live="polite"
      className={`overflow-hidden rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 ${className}`}
    >
      {message}
      {upgradeHref && (
        <Link
          href={upgradeHref}
          onClick={onLinkClick}
          className="ml-2 font-semibold underline underline-offset-2"
        >
          View plans
        </Link>
      )}
    </motion.div>
  );
}

function NewPathField({
  icon: Icon,
  title,
  label,
  value,
  onValueChange,
  placeholder,
  isDisabled,
  isInvalid = false,
  errorMessage = "",
}) {
  return (
    <motion.div
      layout
      {...revealMotion}
      className={`overflow-hidden rounded-xl border p-3 shadow-sm ${
        isInvalid
          ? "border-rose-200 bg-rose-50/60"
          : "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--stocksense-brand)] text-white">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-[var(--stocksense-brand)]">{title}</span>
      </div>
      <Input
        label={label}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
        variant="bordered"
        radius="lg"
        classNames={{
          ...getModalInputClassNames(isInvalid),
          inputWrapper:
            `border-[var(--stocksense-brand-border)] bg-white shadow-none focus-within:border-[var(--stocksense-brand)] ${
              isInvalid ? invalidInputWrapperClass : ""
            }`,
        }}
      />
    </motion.div>
  );
}

function getDefaultSelection(locations, context) {
  const preferredLocationId = context?.locationId
    ? String(context.locationId)
    : null;
  const location =
    (preferredLocationId
      ? locations.find((item) => String(item.id) === preferredLocationId)
      : null) ??
    locations[0] ??
    null;

  const storageAreas = location?.storageAreas ?? EMPTY_LIST;
  const preferredStorageAreaId = context?.storageAreaId
    ? String(context.storageAreaId)
    : null;
  const storageArea =
    (preferredStorageAreaId
      ? storageAreas.find((item) => String(item.id) === preferredStorageAreaId)
      : null) ??
    storageAreas[0] ??
    null;

  const categories = storageArea?.categories ?? EMPTY_LIST;
  const preferredCategoryId = context?.categoryId
    ? String(context.categoryId)
    : null;
  const category =
    (preferredCategoryId
      ? categories.find((item) => String(item.id) === preferredCategoryId)
      : null) ??
    categories[0] ??
    null;

  return {
    locationId: location?.id ?? NEW_VALUE,
    storageAreaId: storageArea?.id ?? NEW_VALUE,
    categoryId: category?.id ?? NEW_VALUE,
  };
}

export default function GlobalAddItemModal({ isOpen, onClose, onAdded, initialContext }) {
  const router = useRouter();
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(NEW_VALUE);
  const [storageAreaId, setStorageAreaId] = useState(NEW_VALUE);
  const [categoryId, setCategoryId] = useState(NEW_VALUE);
  const [form, setForm] = useState(emptyForm);
  const [validationErrors, setValidationErrors] = useState(emptyValidationErrors);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [upgradeHref, setUpgradeHref] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [productPreview, setProductPreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [imageMessage, setImageMessage] = useState("");

  const selectedLocation = useMemo(
    () => byId(locations, locationId),
    [locations, locationId]
  );

  const storageAreas = selectedLocation?.storageAreas ?? EMPTY_LIST;

  const selectedStorageArea = useMemo(
    () => byId(storageAreas, storageAreaId),
    [storageAreas, storageAreaId]
  );

  const categories = selectedStorageArea?.categories ?? EMPTY_LIST;
  const hasExistingLocations = locations.length > 0;
  const hasExistingStorageAreas = storageAreas.length > 0;
  const hasExistingCategories = categories.length > 0;
  const validationMessage =
    "Choose or create a location, storage area, and category before adding the item.";

  const getValidationErrors = useCallback(
    ({
      nextLocationId = locationId,
      nextStorageAreaId = storageAreaId,
      nextCategoryId = categoryId,
      nextForm = form,
    } = {}) => ({
      ...emptyValidationErrors,
      locationName:
        nextLocationId === NEW_VALUE && !nextForm.locationName.trim()
          ? "Location is required."
          : "",
      storageAreaName:
        nextStorageAreaId === NEW_VALUE && !nextForm.storageAreaName.trim()
          ? "Storage area is required."
          : "",
      categoryName:
        nextCategoryId === NEW_VALUE && !nextForm.categoryName.trim()
          ? "Category is required."
          : "",
      itemName: !nextForm.itemName.trim() ? "Item name is required." : "",
    }),
    [categoryId, form, locationId, storageAreaId]
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadHierarchy = async () => {
      setIsLoading(true);
      setMessage("");
      setUpgradeHref("");
      setValidationErrors(emptyValidationErrors);

      const result = await getInventoryHierarchy();
      if (cancelled) return;

      if (result?.error) {
        setMessage(result.error);
        setLocations([]);
        setLocationId(NEW_VALUE);
        setStorageAreaId(NEW_VALUE);
        setCategoryId(NEW_VALUE);
      } else {
        const nextLocations = result?.data ?? [];
        const selection = getDefaultSelection(nextLocations, initialContext);

        setLocations(nextLocations);
        setLocationId(selection.locationId);
        setStorageAreaId(selection.storageAreaId);
        setCategoryId(selection.categoryId);
      }

      setIsLoading(false);
    };

    loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, [initialContext, isOpen]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  useEffect(() => {
    const hasVisibleValidationErrors = Object.values(validationErrors).some(Boolean);
    const nextValidationErrors = getValidationErrors();
    const hasCurrentValidationErrors = Object.values(nextValidationErrors).some(Boolean);
    const hasCurrentDestinationErrors = Boolean(
      nextValidationErrors.locationName ||
        nextValidationErrors.storageAreaName ||
        nextValidationErrors.categoryName
    );

    if (hasVisibleValidationErrors && !hasCurrentValidationErrors) {
      setValidationErrors(emptyValidationErrors);
    }

    if (
      (message === validationMessage && !hasCurrentDestinationErrors) ||
      (message === "Complete the highlighted required fields." && !hasCurrentValidationErrors)
    ) {
      setMessage("");
    }
  }, [getValidationErrors, message, validationErrors, validationMessage]);

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    setImageMessage("");
  };

  const selectImageFile = (file) => {
    if (!file) return;

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setImageMessage(validationMessage);
      return;
    }

    setSelectedImageFile(file);
    setImageMessage("");
    setSelectedImagePreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key] && String(value).trim()) {
      setValidationErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const updateBarcode = (value) => {
    const barcode = cleanBarcode(value);
    setForm((prev) => ({ ...prev, barcode }));
    setBarcodeMessage("");
    if (barcode !== productPreview?.barcode) {
      setProductPreview(null);
    }
  };

  const lookupBarcode = async (barcodeValue) => {
    const barcode = cleanBarcode(barcodeValue ?? form.barcode);

    if (!barcode) {
      setBarcodeMessage("Enter or scan a barcode first.");
      return;
    }

    setIsScannerOpen(false);
    setIsLookingUpBarcode(true);
    setBarcodeMessage("");
    setProductPreview(null);
    setForm((prev) => ({ ...prev, barcode }));

    let result;
    try {
      result = await lookupProductByBarcode(barcode);
    } catch (error) {
      console.error("lookupProductByBarcode error:", error);
      setBarcodeMessage("Product lookup is unavailable right now.");
      setIsLookingUpBarcode(false);
      return;
    }

    setIsLookingUpBarcode(false);

    if (result?.error) {
      setBarcodeMessage(
        typeof result.error === "string"
          ? result.error
          : result.error?.message ?? "Could not look up that barcode."
      );
      return;
    }

    const product = result?.data;
    if (!product?.found) {
      setBarcodeMessage("No product match found. You can still add it manually.");
      return;
    }

    setProductPreview(product);
    setForm((prev) => ({
      ...prev,
      barcode: product.barcode || barcode,
      itemName: prev.itemName.trim() ? prev.itemName : product.name || prev.itemName,
    }));
    setBarcodeMessage(product.name ? "Product details added." : "Product image found.");
  };

  const selectLocation = (value) => {
    const nextLocationId = String(value);
    const nextLocation = byId(locations, nextLocationId);
    const nextStorageArea = nextLocation?.storageAreas?.[0] ?? null;
    const nextCategory = nextStorageArea?.categories?.[0] ?? null;

    setLocationId(nextLocationId);
    setStorageAreaId(nextStorageArea?.id ?? NEW_VALUE);
    setCategoryId(nextCategory?.id ?? NEW_VALUE);
    setValidationErrors((prev) => ({
      ...prev,
      locationName: "",
      storageAreaName: "",
      categoryName: "",
    }));
  };

  const selectStorageArea = (value) => {
    const nextStorageAreaId = String(value);
    const nextStorageArea = byId(storageAreas, nextStorageAreaId);
    const nextCategory = nextStorageArea?.categories?.[0] ?? null;

    setStorageAreaId(nextStorageAreaId);
    setCategoryId(nextCategory?.id ?? NEW_VALUE);
    setValidationErrors((prev) => ({
      ...prev,
      storageAreaName: "",
      categoryName: "",
    }));
  };

  const handleClose = () => {
    if (isSaving) return;
    setForm(emptyForm);
    setMessage("");
    setValidationErrors(emptyValidationErrors);
    setUpgradeHref("");
    setBarcodeMessage("");
    setProductPreview(null);
    clearSelectedImage();
    setIsScannerOpen(false);
    setIsLoading(true);
    onClose?.();
  };

  const handleSubmit = async ({ closeAfterAdd = false } = {}) => {
    setMessage("");

    const nextValidationErrors = getValidationErrors();

    const missingDestination =
      nextValidationErrors.locationName ||
      nextValidationErrors.storageAreaName ||
      nextValidationErrors.categoryName;
    const hasValidationErrors = Object.values(nextValidationErrors).some(Boolean);

    setValidationErrors(nextValidationErrors);

    if (hasValidationErrors) {
      setMessage(
        missingDestination
          ? validationMessage
          : "Complete the highlighted required fields."
      );
      return;
    }

    setIsSaving(true);

    let result;
    try {
      result = await addItemWithPath({
        locationId: locationId === NEW_VALUE ? null : locationId,
        locationName: form.locationName,
        storageAreaId: storageAreaId === NEW_VALUE ? null : storageAreaId,
        storageAreaName: form.storageAreaName,
        categoryId: categoryId === NEW_VALUE ? null : categoryId,
        categoryName: form.categoryName,
        itemName: form.itemName,
        barcode: form.barcode,
        productImageUrl: selectedImageFile ? null : productPreview?.imageUrl ?? null,
        quantity: toNonNegativeInteger(form.quantity, 0),
        expirationDate: form.expirationDate || null,
      });
    } catch (error) {
      console.error("addItemWithPath error:", error);
      setMessage("Could not add item.");
      setIsSaving(false);
      return;
    }

    if (result?.error) {
      setMessage(
        typeof result.error === "string"
          ? result.error
          : result.error?.message ?? "Could not add item."
      );
      setUpgradeHref(result.upgradeHref || "");
      setIsSaving(false);
      return;
    }

    let added = result.data;
    let imageUploadWarning = "";

    if (selectedImageFile && added?.id) {
      const formData = new FormData();
      formData.append("image", selectedImageFile);

      try {
        const imageResult = await uploadInventoryImage(
          ITEM_IMAGE_ENTITY,
          added.id,
          formData
        );

        if (imageResult?.error) {
          imageUploadWarning =
            typeof imageResult.error === "string"
              ? imageResult.error
              : "Item was added, but the photo could not be uploaded.";
        } else if (imageResult?.data) {
          added = {
            ...added,
            image_path: imageResult.data.imagePath ?? added.image_path,
            imageUrl: imageResult.data.imageUrl ?? added.imageUrl,
          };
        }
      } catch (error) {
        console.error("uploadInventoryImage after add error:", error);
        imageUploadWarning = "Item was added, but the photo could not be uploaded.";
      }
    }

    setIsSaving(false);

    setLocations((prev) => {
      const locationExists = prev.some(
        (location) => String(location.id) === String(added.locationId)
      );

      const nextLocations = locationExists
        ? prev.map((location) => {
            if (String(location.id) !== String(added.locationId)) return location;

            const areaExists = (location.storageAreas ?? []).some(
              (area) => String(area.id) === String(added.storageAreaId)
            );

            const nextAreas = areaExists
              ? (location.storageAreas ?? []).map((area) => {
                  if (String(area.id) !== String(added.storageAreaId)) return area;

                  const categoryExists = (area.categories ?? []).some(
                    (category) => String(category.id) === String(added.categoryId)
                  );

                  return {
                    ...area,
                    categories: categoryExists
                      ? area.categories
                      : [
                          ...(area.categories ?? []),
                          {
                            id: added.categoryId,
                            name: added.categoryName ?? "Category",
                          },
                        ].sort((a, b) => a.name.localeCompare(b.name)),
                  };
                })
              : [
                  ...(location.storageAreas ?? []),
                  {
                    id: added.storageAreaId,
                    name: added.storageAreaName ?? "Storage area",
                    categories: [
                      {
                        id: added.categoryId,
                        name: added.categoryName ?? "Category",
                      },
                    ],
                  },
                ].sort((a, b) => a.name.localeCompare(b.name));

            return {
              ...location,
              storageAreas: nextAreas,
            };
          })
        : [
            ...prev,
            {
              id: added.locationId,
              name: added.locationName ?? "Location",
              storageAreas: [
                {
                  id: added.storageAreaId,
                  name: added.storageAreaName ?? "Storage area",
                  categories: [
                    {
                      id: added.categoryId,
                      name: added.categoryName ?? "Category",
                    },
                  ],
                },
              ],
            },
          ].sort((a, b) => a.name.localeCompare(b.name));

      return nextLocations;
    });

    setLocationId(added.locationId ?? NEW_VALUE);
    setStorageAreaId(added.storageAreaId ?? NEW_VALUE);
    setCategoryId(added.categoryId ?? NEW_VALUE);

    emitItemAdded(added);

    const addedName = form.itemName.trim();
    const destination =
      categoryId === NEW_VALUE
        ? form.categoryName.trim()
        : categories.find((category) => String(category.id) === String(categoryId))
            ?.name;

    setForm((prev) => ({
      ...prev,
      locationName: "",
      storageAreaName: "",
      categoryName: "",
      ...emptyItemFields,
    }));
    setProductPreview(null);
    setBarcodeMessage("");
    clearSelectedImage();
    setMessage(imageUploadWarning);
    onAdded?.({
      itemName: addedName,
      destinationName: destination || "inventory",
    });
    if (closeAfterAdd && !imageUploadWarning) {
      setIsLoading(true);
      onClose?.();
    }
    router.refresh();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        placement="center"
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {() => (
            <>
            <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
              <span className="text-[var(--stocksense-brand)]">Add item</span>
              <span className="text-sm font-normal text-gray-500">
                Choose where it belongs, or create the missing location, area, or category.
              </span>
            </ModalHeader>

            <ModalBody className={`min-h-[150px] space-y-4 pb-3 ${modalBodyClass}`}>
              <AnimatePresence initial={false}>
                <AddItemMessage
                  message={message}
                  upgradeHref={upgradeHref}
                  onLinkClick={handleClose}
                  className="hidden sm:block"
                />
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={revealTransition}
                    className="flex min-h-[150px] items-center justify-center rounded-2xl border border-dashed border-stocksense-gray bg-gray-50 text-sm text-gray-500"
                  >
                    <FaSpinner className="mr-2 animate-spin" />
                    Loading inventory...
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={revealTransition}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className="rounded-2xl border border-stocksense-gray bg-gray-50/70 p-3 sm:bg-white">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-900">
                          Where it goes
                        </div>
                        <div className="text-xs text-gray-500">
                          Choose existing places or create the missing ones.
                        </div>
                      </div>

                      <motion.div layout className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <motion.div layout className="space-y-2">
                        {hasExistingLocations && (
                          <Select
                            label="Location"
                            selectedKeys={new Set([String(locationId)])}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              if (value) selectLocation(value);
                            }}
                            isDisabled={isSaving}
                            isInvalid={Boolean(validationErrors.locationName)}
                            variant="bordered"
                            radius="lg"
                            classNames={getThemedSelectClassNames(
                              Boolean(validationErrors.locationName)
                            )}
                          >
                            {locations.map((location) => (
                              <SelectItem key={String(location.id)}>
                                {location.name}
                              </SelectItem>
                            ))}
                            <SelectItem key={NEW_VALUE}>+ New location</SelectItem>
                          </Select>
                        )}
                        <AnimatePresence initial={false}>
                          {locationId === NEW_VALUE && (
                            <NewPathField
                              icon={FaMapMarkerAlt}
                              title="Create location"
                              label="Location name"
                              value={form.locationName}
                              onValueChange={(value) => updateForm("locationName", value)}
                              placeholder="e.g., Home"
                              isDisabled={isSaving}
                              isInvalid={Boolean(validationErrors.locationName)}
                              errorMessage={validationErrors.locationName}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <motion.div layout className="space-y-2">
                        {hasExistingStorageAreas && (
                          <Select
                            label="Storage area"
                            selectedKeys={new Set([String(storageAreaId)])}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              if (value) selectStorageArea(value);
                            }}
                            isDisabled={isSaving || locationId === NEW_VALUE}
                            isInvalid={Boolean(validationErrors.storageAreaName)}
                            variant="bordered"
                            radius="lg"
                            classNames={getThemedSelectClassNames(
                              Boolean(validationErrors.storageAreaName)
                            )}
                          >
                            {storageAreas.map((area) => (
                              <SelectItem key={String(area.id)}>
                                {area.name}
                              </SelectItem>
                            ))}
                            <SelectItem key={NEW_VALUE}>+ New storage area</SelectItem>
                          </Select>
                        )}
                        <AnimatePresence initial={false}>
                          {storageAreaId === NEW_VALUE && (
                            <NewPathField
                              icon={FaWarehouse}
                              title="Create storage area"
                              label="Storage area name"
                              value={form.storageAreaName}
                              onValueChange={(value) => updateForm("storageAreaName", value)}
                              placeholder="e.g., Kitchen pantry"
                              isDisabled={isSaving}
                              isInvalid={Boolean(validationErrors.storageAreaName)}
                              errorMessage={validationErrors.storageAreaName}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <motion.div layout className="space-y-2">
                        {hasExistingCategories && (
                          <Select
                            label="Category"
                            selectedKeys={new Set([String(categoryId)])}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              if (value) {
                                setCategoryId(String(value));
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  categoryName: "",
                                }));
                              }
                            }}
                            isDisabled={isSaving || storageAreaId === NEW_VALUE}
                            isInvalid={Boolean(validationErrors.categoryName)}
                            variant="bordered"
                            radius="lg"
                            classNames={getThemedSelectClassNames(
                              Boolean(validationErrors.categoryName)
                            )}
                          >
                            {categories.map((category) => (
                              <SelectItem key={String(category.id)}>
                                {category.name}
                              </SelectItem>
                            ))}
                            <SelectItem key={NEW_VALUE}>+ New category</SelectItem>
                          </Select>
                        )}
                        <AnimatePresence initial={false}>
                          {categoryId === NEW_VALUE && (
                            <NewPathField
                              icon={FaTags}
                              title="Create category"
                              label="Category name"
                              value={form.categoryName}
                              onValueChange={(value) => updateForm("categoryName", value)}
                              placeholder="e.g., Snacks or Shelf 1"
                              isDisabled={isSaving}
                              isInvalid={Boolean(validationErrors.categoryName)}
                              errorMessage={validationErrors.categoryName}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                      </motion.div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white p-3 shadow-sm">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-900">
                          Barcode (optional)
                        </div>
                        <div className="text-xs text-gray-500">
                          Skip this, or scan/enter a code to fill product details faster.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px]">
                        <Input
                          label="Barcode (optional)"
                          value={form.barcode}
                          onValueChange={updateBarcode}
                          placeholder="e.g., 012345678905"
                          isDisabled={isSaving || isLookingUpBarcode}
                          variant="bordered"
                          radius="lg"
                          startContent={<FaBarcode className="text-gray-400" />}
                          classNames={modalInputClassNames}
                        />
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                          <Button
                            className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                            onPress={() => setIsScannerOpen(true)}
                            isDisabled={isSaving || isLookingUpBarcode}
                            startContent={<FaBarcode />}
                          >
                            Scan
                          </Button>
                          <Button
                            variant="flat"
                            className="rounded-xl"
                            onPress={() => lookupBarcode()}
                            isDisabled={isSaving || isLookingUpBarcode || !form.barcode}
                            startContent={
                              isLookingUpBarcode ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaSearch />
                              )
                            }
                          >
                            Lookup
                          </Button>
                        </div>
                      </div>

                      {(barcodeMessage || productPreview) && (
                        <div className="mt-3 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3">
                          {productPreview ? (
                            <div className="flex items-center gap-3">
                              {productPreview.imageUrl && (
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-white">
                                  <img
                                    src={productPreview.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--stocksense-brand)]">
                                  <FaCheckCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">
                                    {productPreview.name || "Product found"}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-xs text-gray-600">
                                  {[productPreview.brand, productPreview.barcode]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-[var(--stocksense-brand)]">
                              {barcodeMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-stocksense-gray bg-white p-3 shadow-sm">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-900">
                          Item details
                        </div>
                        <div className="text-xs text-gray-500">
                          Add the name now. Quantity and expiration can be updated later.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_180px]">
                        <Input
                          label="Item name"
                          value={form.itemName}
                          onValueChange={(value) => updateForm("itemName", value)}
                          placeholder="e.g., Rice"
                          isDisabled={isSaving}
                          isInvalid={Boolean(validationErrors.itemName)}
                          errorMessage={validationErrors.itemName}
                          variant="bordered"
                          radius="lg"
                          classNames={getModalInputClassNames(
                            Boolean(validationErrors.itemName)
                          )}
                        />
                        <Input
                          label="Quantity"
                          type="number"
                          min={0}
                          value={form.quantity}
                          onValueChange={(value) => updateForm("quantity", value)}
                          isDisabled={isSaving}
                          variant="bordered"
                          radius="lg"
                          classNames={modalInputClassNames}
                        />
                        <Input
                          label="Expiration"
                          type="date"
                          value={form.expirationDate}
                          onValueChange={(value) => updateForm("expirationDate", value)}
                          isDisabled={isSaving}
                          variant="bordered"
                          radius="lg"
                          classNames={modalInputClassNames}
                        />
                      </div>

                      <div className="mt-3 rounded-xl border border-stocksense-gray bg-gray-50/70 p-3">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            selectImageFile(file);
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
                            selectImageFile(file);
                          }}
                        />

                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                            Item photo
                          </div>
                          {selectedImageFile && (
                            <span className="rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                              Ready to upload
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="h-28 w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:w-36">
                            {selectedImagePreview || productPreview?.imageUrl ? (
                              <img
                                src={selectedImagePreview || productPreview.imageUrl}
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
                              <Button
                                size="sm"
                                variant="flat"
                                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:hidden"
                                isDisabled={isSaving}
                                onPress={() => cameraInputRef.current?.click()}
                                startContent={<FaCamera className="h-3.5 w-3.5" />}
                              >
                                Take photo
                              </Button>
                              <Button
                                size="sm"
                                variant="flat"
                                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                                isDisabled={isSaving}
                                onPress={() => imageInputRef.current?.click()}
                                startContent={<FaUpload className="h-3.5 w-3.5" />}
                              >
                                {selectedImageFile ? "Choose different" : "Choose image"}
                              </Button>
                              {selectedImageFile && (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                                  isDisabled={isSaving}
                                  onPress={clearSelectedImage}
                                  startContent={<FaTrash className="h-3.5 w-3.5" />}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                            <p className="text-xs leading-5 text-gray-500">
                              {selectedImageFile
                                ? selectedImageFile.name
                                : productPreview?.imageUrl
                                ? "Barcode lookup image will be used unless you choose your own."
                                : "Take a photo or choose one from your camera roll. Max 5 MB."}
                            </p>
                            {imageMessage && (
                              <p className="text-xs text-rose-700">{imageMessage}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </ModalBody>

            <ModalFooter
              className="flex shrink-0 flex-col gap-2 border-t border-[var(--stocksense-brand-border)] bg-white sm:flex-row sm:items-center sm:justify-end"
            >
              <AnimatePresence initial={false}>
                <AddItemMessage
                  message={message}
                  upgradeHref={upgradeHref}
                  onLinkClick={handleClose}
                  className="w-full sm:hidden"
                />
              </AnimatePresence>

              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:justify-end">
                <Button variant="light" className="rounded-xl" onPress={handleClose} isDisabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl"
                  onPress={() => handleSubmit({ closeAfterAdd: true })}
                  isDisabled={isSaving || isLoading}
                >
                  Add & close
                </Button>
                <Button
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                  onPress={() => handleSubmit()}
                  isDisabled={isSaving || isLoading}
                  startContent={isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                >
                  {isSaving ? "Adding..." : "Add another"}
                </Button>
              </div>
            </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={lookupBarcode}
      />
    </>
  );
}
