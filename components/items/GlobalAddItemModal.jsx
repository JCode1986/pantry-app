"use client";

import { useEffect, useMemo, useState } from "react";
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
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTags,
  FaWarehouse,
} from "react-icons/fa";
import {
  addItemWithPath,
  getInventoryHierarchy,
  lookupProductByBarcode,
} from "@/app/actions/server";
import { toNonNegativeInteger } from "@/utils/pantry/date";
import { emitItemAdded } from "@/utils/clientEvents";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import BarcodeScannerModal from "@/components/items/BarcodeScannerModal";

const NEW_VALUE = "__new__";
const EMPTY_LIST = [];
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

function cleanBarcode(value) {
  return typeof value === "string"
    ? value.trim().replace(/[^0-9A-Za-z._-]/g, "").slice(0, 80)
    : "";
}

function byId(items, id) {
  return (items ?? []).find((item) => String(item.id) === String(id)) ?? null;
}

function NewPathField({
  icon: Icon,
  title,
  label,
  value,
  onValueChange,
  placeholder,
  isDisabled,
}) {
  return (
    <motion.div
      layout
      {...revealMotion}
      className="overflow-hidden rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3 shadow-sm"
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
        variant="bordered"
        radius="lg"
        classNames={{
          inputWrapper: "border-[var(--stocksense-brand-border)] bg-white",
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
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(NEW_VALUE);
  const [storageAreaId, setStorageAreaId] = useState(NEW_VALUE);
  const [categoryId, setCategoryId] = useState(NEW_VALUE);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [upgradeHref, setUpgradeHref] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [productPreview, setProductPreview] = useState(null);

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

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadHierarchy = async () => {
      setIsLoading(true);
      setMessage("");
      setUpgradeHref("");

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

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
  };

  const selectStorageArea = (value) => {
    const nextStorageAreaId = String(value);
    const nextStorageArea = byId(storageAreas, nextStorageAreaId);
    const nextCategory = nextStorageArea?.categories?.[0] ?? null;

    setStorageAreaId(nextStorageAreaId);
    setCategoryId(nextCategory?.id ?? NEW_VALUE);
  };

  const handleClose = () => {
    if (isSaving) return;
    setForm(emptyForm);
    setMessage("");
    setUpgradeHref("");
    setBarcodeMessage("");
    setProductPreview(null);
    setIsScannerOpen(false);
    setIsLoading(true);
    onClose?.();
  };

  const handleSubmit = async ({ closeAfterAdd = false } = {}) => {
    setMessage("");

    if (!form.itemName.trim()) {
      setMessage("Item name is required.");
      return;
    }

    if (locationId === NEW_VALUE && !form.locationName.trim()) {
      setMessage("Location is required.");
      return;
    }

    if (storageAreaId === NEW_VALUE && !form.storageAreaName.trim()) {
      setMessage("Storage area is required.");
      return;
    }

    if (categoryId === NEW_VALUE && !form.categoryName.trim()) {
      setMessage("Category is required.");
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
        productImageUrl: productPreview?.imageUrl ?? null,
        quantity: toNonNegativeInteger(form.quantity, 0),
        expirationDate: form.expirationDate || null,
      });
    } catch (error) {
      console.error("addItemWithPath error:", error);
      setMessage("Could not add item.");
      return;
    } finally {
      setIsSaving(false);
    }

    if (result?.error) {
      setMessage(
        typeof result.error === "string"
          ? result.error
          : result.error?.message ?? "Could not add item."
      );
      setUpgradeHref(result.upgradeHref || "");
      return;
    }

    const added = result.data;
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
    setMessage("");
    onAdded?.({
      itemName: addedName,
      destinationName: destination || "inventory",
    });
    if (closeAfterAdd) {
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

            <ModalBody className={`min-h-[150px] space-y-4 ${modalBodyClass}`}>
              <AnimatePresence initial={false}>
                {message && (
                  <motion.div
                    layout
                    {...revealMotion}
                    className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                      {message}
                      {upgradeHref && (
                        <Link
                          href={upgradeHref}
                          onClick={handleClose}
                          className="ml-2 font-semibold underline underline-offset-2"
                        >
                          View plans
                        </Link>
                      )}
                    </motion.div>
                )}
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
                    className="space-y-4"
                  >
                    <motion.div layout className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <motion.div layout className="space-y-2">
                        <Select
                          label="Location"
                          selectedKeys={new Set([String(locationId)])}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0];
                            if (value) selectLocation(value);
                          }}
                          isDisabled={isSaving}
                          variant="bordered"
                          radius="lg"
                          classNames={themedSelectClassNames}
                        >
                          {locations.map((location) => (
                            <SelectItem key={String(location.id)}>
                              {location.name}
                            </SelectItem>
                          ))}
                          <SelectItem key={NEW_VALUE}>+ New location</SelectItem>
                        </Select>
                        <AnimatePresence initial={false}>
                          {locationId === NEW_VALUE && (
                            <NewPathField
                              icon={FaMapMarkerAlt}
                              title="Create location"
                              label="Location name"
                              value={form.locationName}
                              onValueChange={(value) => updateForm("locationName", value)}
                              placeholder="Home"
                              isDisabled={isSaving}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <motion.div layout className="space-y-2">
                        <Select
                          label="Storage area"
                          selectedKeys={new Set([String(storageAreaId)])}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0];
                            if (value) selectStorageArea(value);
                          }}
                          isDisabled={isSaving || locationId === NEW_VALUE}
                          variant="bordered"
                          radius="lg"
                          classNames={themedSelectClassNames}
                        >
                          {storageAreas.map((area) => (
                            <SelectItem key={String(area.id)}>
                              {area.name}
                            </SelectItem>
                          ))}
                          <SelectItem key={NEW_VALUE}>+ New storage area</SelectItem>
                        </Select>
                        <AnimatePresence initial={false}>
                          {storageAreaId === NEW_VALUE && (
                            <NewPathField
                              icon={FaWarehouse}
                              title="Create storage area"
                              label="Storage area name"
                              value={form.storageAreaName}
                              onValueChange={(value) => updateForm("storageAreaName", value)}
                              placeholder="Pantry"
                              isDisabled={isSaving}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <motion.div layout className="space-y-2">
                        <Select
                          label="Category"
                          selectedKeys={new Set([String(categoryId)])}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0];
                            if (value) setCategoryId(String(value));
                          }}
                          isDisabled={isSaving || storageAreaId === NEW_VALUE}
                          variant="bordered"
                          radius="lg"
                          classNames={themedSelectClassNames}
                        >
                          {categories.map((category) => (
                            <SelectItem key={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                          <SelectItem key={NEW_VALUE}>+ New category</SelectItem>
                        </Select>
                        <AnimatePresence initial={false}>
                          {categoryId === NEW_VALUE && (
                            <NewPathField
                              icon={FaTags}
                              title="Create category"
                              label="Category name"
                              value={form.categoryName}
                              onValueChange={(value) => updateForm("categoryName", value)}
                              placeholder="Snacks"
                              isDisabled={isSaving}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>

                    <div className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white p-3 shadow-sm">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px]">
                        <Input
                          label="Barcode"
                          value={form.barcode}
                          onValueChange={updateBarcode}
                          placeholder="Scan or enter UPC / EAN"
                          isDisabled={isSaving || isLookingUpBarcode}
                          variant="bordered"
                          radius="lg"
                          startContent={<FaBarcode className="text-gray-400" />}
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

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_180px]">
                      <Input
                        label="Item name"
                        value={form.itemName}
                        onValueChange={(value) => updateForm("itemName", value)}
                        placeholder="Rice"
                        isDisabled={isSaving}
                        variant="bordered"
                        radius="lg"
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
                      />
                      <Input
                        label="Expiration"
                        type="date"
                        value={form.expirationDate}
                        onValueChange={(value) => updateForm("expirationDate", value)}
                        isDisabled={isSaving}
                        variant="bordered"
                        radius="lg"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </ModalBody>

            <ModalFooter className={modalFooterClass}>
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
