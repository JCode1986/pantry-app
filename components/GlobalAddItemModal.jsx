"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { FaPlus, FaSpinner } from "react-icons/fa";
import {
  addItemWithPath,
  getInventoryHierarchy,
} from "@/app/actions/server";
import { toNonNegativeInteger } from "@/utils/pantry/date";

const NEW_VALUE = "__new__";

const emptyForm = {
  locationName: "",
  storageAreaName: "",
  categoryName: "",
  itemName: "",
  quantity: "1",
  expirationDate: "",
};

const emptyItemFields = {
  itemName: "",
  quantity: "1",
  expirationDate: "",
};

function byId(items, id) {
  return (items ?? []).find((item) => String(item.id) === String(id)) ?? null;
}

export default function GlobalAddItemModal({ isOpen, onClose, onAdded, initialContext }) {
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(NEW_VALUE);
  const [storageAreaId, setStorageAreaId] = useState(NEW_VALUE);
  const [categoryId, setCategoryId] = useState(NEW_VALUE);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedLocation = useMemo(
    () => byId(locations, locationId),
    [locations, locationId]
  );

  const storageAreas = selectedLocation?.storageAreas ?? [];

  const selectedStorageArea = useMemo(
    () => byId(storageAreas, storageAreaId),
    [storageAreas, storageAreaId]
  );

  const categories = selectedStorageArea?.categories ?? [];

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadHierarchy = async () => {
      setIsLoading(true);
      setMessage("");

      const result = await getInventoryHierarchy();
      if (cancelled) return;

      if (result?.error) {
        setMessage(result.error);
        setLocations([]);
        setLocationId(NEW_VALUE);
      } else {
        const nextLocations = result?.data ?? [];
        const preferredLocationId = initialContext?.locationId
          ? String(initialContext.locationId)
          : null;
        const preferredLocation = preferredLocationId
          ? nextLocations.find((location) => String(location.id) === preferredLocationId)
          : null;

        setLocations(nextLocations);
        setLocationId(preferredLocation?.id ?? nextLocations[0]?.id ?? NEW_VALUE);
      }

      setIsLoading(false);
    };

    loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, [initialContext?.locationId, isOpen]);

  useEffect(() => {
    if (locationId === NEW_VALUE) {
      setStorageAreaId(NEW_VALUE);
      setCategoryId(NEW_VALUE);
      return;
    }

    if (storageAreas.some((area) => String(area.id) === String(storageAreaId))) {
      return;
    }

    const preferredStorageAreaId = initialContext?.storageAreaId
      ? String(initialContext.storageAreaId)
      : null;
    const preferredStorageArea = preferredStorageAreaId
      ? storageAreas.find((area) => String(area.id) === preferredStorageAreaId)
      : null;

    setStorageAreaId(preferredStorageArea?.id ?? storageAreas[0]?.id ?? NEW_VALUE);
  }, [initialContext?.storageAreaId, locationId, storageAreas]);

  useEffect(() => {
    if (storageAreaId === NEW_VALUE) {
      setCategoryId(NEW_VALUE);
      return;
    }

    if (categories.some((category) => String(category.id) === String(categoryId))) {
      return;
    }

    const preferredCategoryId = initialContext?.categoryId
      ? String(initialContext.categoryId)
      : null;
    const preferredCategory = preferredCategoryId
      ? categories.find((category) => String(category.id) === preferredCategoryId)
      : null;

    setCategoryId(preferredCategory?.id ?? categories[0]?.id ?? NEW_VALUE);
  }, [categories, initialContext?.categoryId, storageAreaId]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = () => {
    if (isSaving) return;
    setForm(emptyForm);
    setMessage("");
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

    const result = await addItemWithPath({
      locationId: locationId === NEW_VALUE ? null : locationId,
      locationName: form.locationName,
      storageAreaId: storageAreaId === NEW_VALUE ? null : storageAreaId,
      storageAreaName: form.storageAreaName,
      categoryId: categoryId === NEW_VALUE ? null : categoryId,
      categoryName: form.categoryName,
      itemName: form.itemName,
      quantity: toNonNegativeInteger(form.quantity, 0),
      expirationDate: form.expirationDate || null,
    });

    setIsSaving(false);

    if (result?.error) {
      setMessage(
        typeof result.error === "string"
          ? result.error
          : result.error?.message ?? "Could not add item."
      );
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

    window.dispatchEvent(
      new CustomEvent("stocksense:item-added", {
        detail: {
          item: added,
        },
      })
    );

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
    setMessage("");
    onAdded?.({
      itemName: addedName,
      destinationName: destination || "inventory",
    });
    if (closeAfterAdd) {
      onClose?.();
    }
    router.refresh();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      placement="center"
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="text-stocksense-teal">Add item</span>
              <span className="text-sm font-normal text-gray-500">
                Choose where it belongs, or create the missing location, area, or category.
              </span>
            </ModalHeader>

            <ModalBody className="space-y-4">
              {message && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {message}
                </div>
              )}

              {isLoading ? (
                <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-stocksense-gray bg-gray-50 text-sm text-gray-500">
                  <FaSpinner className="mr-2 animate-spin" />
                  Loading inventory...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Select
                        label="Location"
                        selectedKeys={new Set([String(locationId)])}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0];
                          if (value) setLocationId(String(value));
                        }}
                        isDisabled={isSaving}
                        variant="bordered"
                        radius="lg"
                        classNames={{
                          trigger: "border-stocksense-gray",
                        }}
                      >
                        {locations.map((location) => (
                          <SelectItem key={String(location.id)}>
                            {location.name}
                          </SelectItem>
                        ))}
                        <SelectItem key={NEW_VALUE}>+ New location</SelectItem>
                      </Select>
                      {locationId === NEW_VALUE && (
                        <Input
                          value={form.locationName}
                          onValueChange={(value) => updateForm("locationName", value)}
                          placeholder="Home"
                          isDisabled={isSaving}
                          variant="bordered"
                          radius="lg"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Select
                        label="Storage area"
                        selectedKeys={new Set([String(storageAreaId)])}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0];
                          if (value) setStorageAreaId(String(value));
                        }}
                        isDisabled={isSaving || locationId === NEW_VALUE}
                        variant="bordered"
                        radius="lg"
                        classNames={{
                          trigger: "border-stocksense-gray",
                        }}
                      >
                        {storageAreas.map((area) => (
                          <SelectItem key={String(area.id)}>
                            {area.name}
                          </SelectItem>
                        ))}
                        <SelectItem key={NEW_VALUE}>+ New storage area</SelectItem>
                      </Select>
                      {storageAreaId === NEW_VALUE && (
                        <Input
                          value={form.storageAreaName}
                          onValueChange={(value) => updateForm("storageAreaName", value)}
                          placeholder="Pantry"
                          isDisabled={isSaving}
                          variant="bordered"
                          radius="lg"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
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
                        classNames={{
                          trigger: "border-stocksense-gray",
                        }}
                      >
                        {categories.map((category) => (
                          <SelectItem key={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectItem key={NEW_VALUE}>+ New category</SelectItem>
                      </Select>
                      {categoryId === NEW_VALUE && (
                        <Input
                          value={form.categoryName}
                          onValueChange={(value) => updateForm("categoryName", value)}
                          placeholder="Snacks"
                          isDisabled={isSaving}
                          variant="bordered"
                          radius="lg"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_180px] gap-3">
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
                </>
              )}
            </ModalBody>

            <ModalFooter>
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
                className="rounded-xl bg-[#0E7488] text-white"
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
  );
}
