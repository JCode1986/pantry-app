"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  FaArrowsAlt,
  FaBarcode,
  FaBoxOpen,
  FaCalendarAlt,
  FaChevronLeft,
  FaEdit,
  FaTags,
  FaTrash,
} from "react-icons/fa";
import {
  deleteCategory,
  deleteItem,
  updateCategoryName,
  updateItemLocation,
  updateItem,
} from "@/app/actions/server";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import MoveItemsModal from "@/components/items/MoveItemsModal";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import { emitInventoryChange } from "@/utils/clientEvents";
import { toNonNegativeInteger } from "@/utils/pantry/date";

function formatExpiration(value) {
  if (!value) return "None";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const emptyItemModal = {
  open: false,
  itemId: null,
  name: "",
  quantity: "0",
  expirationDate: "",
  barcode: "",
  imageUrl: null,
};

export default function CategoryDetailClient({
  category,
  area,
  location,
  initialItems = [],
  moveLocations = [],
  canEditInventory = true,
}) {
  const router = useRouter();
  const [categoryName, setCategoryName] = useState(category?.name ?? "");
  const [categoryImageUrl, setCategoryImageUrl] = useState(
    category?.imageUrl ?? null
  );
  const [items, setItems] = useState(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState(category?.name ?? "");
  const [itemModal, setItemModal] = useState(emptyItemModal);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    entityType: null,
    payload: null,
    isDeleting: false,
  });
  const [moveModal, setMoveModal] = useState({
    open: false,
    sourceAreaId: null,
    sourceCategoryId: null,
    targetLocationId: location?.id ?? null,
    targetAreaId: null,
    targetCategoryId: null,
    itemIds: [],
  });
  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity ?? 0),
    0
  );
  const normalizedMoveLocations = useMemo(
    () =>
      (moveLocations ?? []).map((moveLocation) => ({
        ...moveLocation,
        storageAreas:
          moveLocation.storageAreas ?? moveLocation.storage_areas ?? [],
      })),
    [moveLocations]
  );
  const currentStorageAreas = useMemo(() => {
    const currentLocation = normalizedMoveLocations.find(
      (moveLocation) => String(moveLocation.id) === String(location?.id)
    );

    if (currentLocation?.storageAreas?.length) {
      return currentLocation.storageAreas;
    }

    if (!area?.id || !category?.id) return [];

    return [
      {
        id: area.id,
        name: area.name,
        categories: [{ id: category.id, name: categoryName }],
      },
    ];
  }, [area?.id, area?.name, category?.id, categoryName, location?.id, normalizedMoveLocations]);

  const closeItemModal = () => setItemModal(emptyItemModal);

  useEffect(() => {
    if (!location?.id || !area?.id || !category?.id) return;

    const context = {
      locationId: location.id,
      storageAreaId: area.id,
      categoryId: category.id,
    };

    window.dispatchEvent(
      new CustomEvent("stocksense:set-add-item-context", {
        detail: context,
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("stocksense:set-add-item-context", {
          detail: null,
        })
      );
    };
  }, [area?.id, category?.id, location?.id]);

  const openEditItem = (item) => {
    if (!canEditInventory) return;
    setItemModal({
      open: true,
      itemId: item.id,
      name: item.name ?? "",
      quantity: String(item.quantity ?? 0),
      expirationDate: item.expiration_date ?? "",
      barcode: item.barcode ?? "",
      imageUrl: item.imageUrl ?? null,
    });
  };

  const openDeleteItem = (item) => {
    if (!canEditInventory) return;
    setDeleteDialog({
      open: true,
      entityType: "item",
      payload: item,
      isDeleting: false,
    });
  };

  const openMoveItem = (item) => {
    if (!canEditInventory || !item?.id) return;

    setMoveModal({
      open: true,
      sourceAreaId: area?.id ?? null,
      sourceCategoryId: category.id,
      targetLocationId: location?.id ?? null,
      targetAreaId: area?.id ?? null,
      targetCategoryId: category.id,
      itemIds: [item.id],
    });
  };

  const openDeleteCategory = () => {
    if (!canEditInventory) return;
    setDeleteDialog({
      open: true,
      entityType: "category",
      payload: {
        id: category.id,
        name: categoryName,
      },
      isDeleting: false,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      entityType: null,
      payload: null,
      isDeleting: false,
    });
  };

  const saveCategoryName = async () => {
    if (!canEditInventory) return;
    const name = editCategoryName.trim();
    if (!name || !category?.id) return;

    setIsSaving(true);
    const previousName = categoryName;
    setCategoryName(name);

    try {
      const result = await updateCategoryName(category.id, name);
      if (result?.error) throw result.error;
      setEditCategoryOpen(false);
      emitInventoryChange({
        entity: "category",
        action: "updated",
        id: category.id,
      });
      router.refresh();
    } catch (err) {
      console.error("updateCategoryName error:", err);
      setCategoryName(previousName);
      setEditCategoryName(previousName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryImageChange = ({ imageUrl }) => {
    setCategoryImageUrl(imageUrl ?? null);
    emitInventoryChange({
      entity: "category",
      action: imageUrl ? "image_updated" : "image_removed",
      id: category?.id,
    });
  };

  const saveItem = async () => {
    if (!canEditInventory || !itemModal.itemId) return;
    const name = itemModal.name.trim();
    if (!name) return;

    const payload = {
      name,
      quantity: toNonNegativeInteger(itemModal.quantity, 0),
      expiration_date: itemModal.expirationDate || null,
      barcode: itemModal.barcode,
    };

    setIsSaving(true);

    try {
      const result = await updateItem(itemModal.itemId, payload);
      if (result?.error) throw result.error;

      setItems((prev) =>
        prev.map((item) =>
          String(item.id) === String(itemModal.itemId)
            ? {
                ...item,
                name: result.data?.name ?? payload.name,
                quantity: result.data?.quantity ?? payload.quantity,
                expiration_date:
                  result.data?.expiration_date ?? payload.expiration_date,
                barcode: result.data?.barcode ?? (payload.barcode.trim() || null),
              }
            : item
        )
      );
      emitInventoryChange({
        entity: "item",
        action: "updated",
        id: itemModal.itemId,
      });
      closeItemModal();
      router.refresh();
    } catch (err) {
      console.error("updateItem error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemImageChange = ({ imagePath, imageUrl }) => {
    const itemId = itemModal.itemId;
    if (!itemId) return;

    setItems((prev) =>
      prev.map((item) =>
        String(item.id) === String(itemId)
          ? {
              ...item,
              image_path: imagePath ?? null,
              imageUrl: imageUrl ?? null,
            }
          : item
      )
    );
    setItemModal((prev) => ({
      ...prev,
      imageUrl: imageUrl ?? null,
    }));
    emitInventoryChange({
      entity: "item",
      action: imagePath ? "image_updated" : "image_removed",
      id: itemId,
    });
  };

  const confirmDelete = async () => {
    if (!canEditInventory || !deleteDialog.payload) return;
    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      if (deleteDialog.entityType === "item") {
        const itemId = deleteDialog.payload.id;
        const result = await deleteItem(itemId);
        if (result?.error) throw result.error;

        setItems((prev) => prev.filter((item) => String(item.id) !== String(itemId)));
        emitInventoryChange({
          entity: "item",
          action: "deleted",
          id: itemId,
        });
        closeDeleteDialog();
        router.refresh();
        return;
      }

      if (deleteDialog.entityType === "category") {
        const result = await deleteCategory(category.id);
        if (result?.error) throw result.error;

        emitInventoryChange({
          entity: "category",
          action: "deleted",
          id: category.id,
        });
        closeDeleteDialog();
        router.replace("/categories");
      }
    } catch (err) {
      console.error("delete detail entity error:", err);
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const confirmMove = async () => {
    if (!canEditInventory) return;
    const { sourceCategoryId, targetCategoryId, itemIds } = moveModal;

    if (!targetCategoryId || itemIds.length === 0) return;
    if (String(targetCategoryId) === String(sourceCategoryId)) return;

    const results = await Promise.all(
      itemIds.map((itemId) =>
        updateItemLocation(itemId, {
          categoryId: targetCategoryId,
        })
      )
    );

    const hasError = results.some((result) => result?.error);
    if (hasError) {
      console.error("move category detail item errors:", results);
      return;
    }

    const moved = new Set(itemIds.map(String));
    setItems((prev) => prev.filter((item) => !moved.has(String(item.id))));
    setMoveModal({
      open: false,
      sourceAreaId: null,
      sourceCategoryId: null,
      targetLocationId: location?.id ?? null,
      targetAreaId: null,
      targetCategoryId: null,
      itemIds: [],
    });
    emitInventoryChange({
      entity: "item",
      action: "moved",
      ids: itemIds,
    });
    router.refresh();
  };

  return (
    <main className="page-enter mx-auto max-w-[1500px] space-y-5 p-6 pt-8 md:min-h-[100vh] max-md:px-4 max-md:pb-0 max-md:pt-4">
      <header className="content-enter md:hidden">
        <Link
          href="/categories"
          className="inline-flex items-center text-sm font-medium text-[var(--stocksense-brand)]"
        >
          Back to categories
        </Link>

        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-slate-900/5">
          <div className="h-44 bg-[var(--entity-category-soft)]">
            {categoryImageUrl ? (
              <img
                src={categoryImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[var(--entity-category-accent)]">
                <FaTags className="h-14 w-14" />
              </div>
            )}
          </div>

          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Category
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-950">
              {categoryName}
            </h1>
            <p className="mt-1 truncate text-sm text-gray-500">
              {location?.name ?? "Unknown location"}
            </p>
            <p className="truncate text-sm text-gray-500">
              {area?.name ?? "Unknown area"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <FaBoxOpen className="h-4 w-4 text-[var(--stocksense-brand)]" />
                <p className="mt-2 text-xl font-semibold leading-none text-gray-950">
                  {items.length}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-4 text-gray-500">
                  Items
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <FaBoxOpen className="h-4 w-4 text-[var(--stocksense-brand)]" />
                <p className="mt-2 text-xl font-semibold leading-none text-gray-950">
                  {totalQuantity}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-4 text-gray-500">
                  Units
                </p>
              </div>
            </div>

            {canEditInventory && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="flat"
                  className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  onPress={() => {
                    setEditCategoryName(categoryName);
                    setEditCategoryOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit category
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={openDeleteCategory}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="content-enter flex flex-wrap items-center gap-2 text-sm text-gray-500 max-md:hidden">
        <Link
          href="/categories"
          className="inline-flex items-center gap-1 hover:text-[var(--stocksense-brand)]"
        >
          <FaChevronLeft className="h-3 w-3" />
          Categories
        </Link>
        {area?.id && (
          <>
            <span>/</span>
            <Link href={`/areas/${area.id}`} className="hover:underline">
              {area.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-700">{categoryName}</span>
      </nav>

      <header className="content-enter overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm max-md:hidden">
        <div className="border-t-4 border-[var(--entity-category-accent)] p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 gap-3">
              {categoryImageUrl ? (
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-category-border)] bg-gray-50">
                  <img
                    src={categoryImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                  <FaTags className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Category
                </p>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
                  {categoryName}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {location?.name ?? "Unknown location"} /{" "}
                  {area?.name ?? "Unknown area"}
                </p>
                <div className="mt-3 inline-flex rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs text-[var(--stocksense-brand)]">
                  <strong>{items.length}</strong>&nbsp;
                  {items.length === 1 ? "item" : "items"}
                </div>
              </div>
            </div>

            {canEditInventory && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <OpenGlobalAddItemButton
                  context={{
                    locationId: location?.id,
                    storageAreaId: area?.id,
                    categoryId: category.id,
                  }}
                />
                <Button
                  variant="flat"
                  className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700"
                  onPress={() => {
                    setEditCategoryName(categoryName);
                    setEditCategoryOpen(true);
                  }}
                  startContent={<FaEdit />}
                >
                  Edit
                </Button>
                <Button
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={openDeleteCategory}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="md:hidden">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-950">Items</h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse what is stored in this category.
            </p>
          </div>
          {canEditInventory && (
            <OpenGlobalAddItemButton
              context={{
                locationId: location?.id,
                storageAreaId: area?.id,
                categoryId: category.id,
              }}
              className="h-9 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
            >
              Add
            </OpenGlobalAddItemButton>
          )}
        </div>

        <div className="mt-3 grid gap-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex min-w-0 gap-3 p-4">
                {item.imageUrl ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-item-border)] bg-white">
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                    <FaBoxOpen className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold leading-6 text-gray-950">
                    {item.name}
                  </p>
                  <div className="mt-2 grid gap-0.5 text-sm leading-5 text-gray-500">
                    <span>Qty: {item.quantity ?? 0}</span>
                    <span>Exp: {formatExpiration(item.expiration_date)}</span>
                    {item.barcode && (
                      <span className="truncate">Barcode: {item.barcode}</span>
                    )}
                  </div>
                </div>
              </div>

              {canEditInventory && (
                <div className="grid grid-cols-3 gap-2 border-t border-gray-200 bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={() => openMoveItem(item)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-sm font-semibold text-[var(--stocksense-brand)]"
                  >
                    <FaArrowsAlt className="h-3.5 w-3.5" />
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditItem(item)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteItem(item)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}

          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-7 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                <FaBoxOpen className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-950">
                No items yet
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Add an item to start filling this category.
              </p>
              {canEditInventory && (
                <div className="mt-5 flex justify-center">
                  <OpenGlobalAddItemButton
                    context={{
                      locationId: location?.id,
                      storageAreaId: area?.id,
                      categoryId: category.id,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="content-stagger grid grid-cols-1 gap-3 max-md:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm"
          >
            <div className="flex min-w-0 gap-3">
              {item.imageUrl ? (
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                  <FaBoxOpen className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-semibold text-gray-950">
                  {item.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <FaBoxOpen className="h-3 w-3" />
                    Qty: {item.quantity ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FaCalendarAlt className="h-3 w-3" />
                    Exp: {formatExpiration(item.expiration_date)}
                  </span>
                  {item.barcode && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <FaBarcode className="h-3 w-3" />
                      <span className="truncate">{item.barcode}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {canEditInventory && (
              <div className="mt-auto grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                  onPress={() => openMoveItem(item)}
                  startContent={<FaArrowsAlt />}
                >
                  Move
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700"
                  onPress={() => openEditItem(item)}
                  startContent={<FaEdit />}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                  onPress={() => openDeleteItem(item)}
                  startContent={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            )}
          </article>
        ))}

        {items.length === 0 && (
          <div className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center text-gray-500 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            No items in this category yet.
            {canEditInventory && (
              <div className="mt-4 flex justify-center">
                <OpenGlobalAddItemButton
                  context={{
                    locationId: location?.id,
                    storageAreaId: area?.id,
                    categoryId: category.id,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {canEditInventory && (
        <Modal
          isOpen={editCategoryOpen}
          onOpenChange={setEditCategoryOpen}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {(onClose) => (
              <>
                <ModalHeader className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}>
                  <span className="min-w-0 flex-1 truncate">Edit category</span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={saveCategoryName}
                    isLoading={isSaving}
                    isDisabled={!editCategoryName.trim()}
                  >
                    Save
                  </Button>
                  <MobileSheetCloseButton onPress={onClose} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Category name"
                    value={editCategoryName}
                    onValueChange={setEditCategoryName}
                    isDisabled={isSaving}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <EntityImageManager
                    entityType="category"
                    entityId={category.id}
                    imageUrl={categoryImageUrl}
                    label="Category photo"
                    onChange={handleCategoryImageChange}
                  />
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={() => {
                        onClose();
                        openDeleteCategory();
                      }}
                    >
                      Delete category
                    </Button>
                  </div>
                </ModalBody>
                <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                  <Button
                    variant="light"
                    onPress={onClose}
                    isDisabled={isSaving}
                    className="max-md:hidden"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    onPress={saveCategoryName}
                    isLoading={isSaving}
                    isDisabled={!editCategoryName.trim()}
                  >
                    Save changes
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {canEditInventory && (
        <Modal
          isOpen={itemModal.open}
          onOpenChange={(open) => {
            if (!open) closeItemModal();
          }}
          placement="center"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            {() => (
              <>
                <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">Edit item</span>
                    <span className="block truncate text-sm font-normal text-gray-500">
                      {categoryName}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                    onPress={saveItem}
                    isLoading={isSaving}
                    isDisabled={isSaving || !itemModal.name.trim()}
                  >
                    Save
                  </Button>
                  <MobileSheetCloseButton onPress={closeItemModal} />
                </ModalHeader>
                <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                  <Input
                    label="Item name"
                    value={itemModal.name}
                    onValueChange={(value) =>
                      setItemModal((prev) => ({ ...prev, name: value }))
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <QuantityStepperInput
                      label="Quantity"
                      min={0}
                      value={itemModal.quantity}
                      onValueChange={(value) =>
                        setItemModal((prev) => ({ ...prev, quantity: value }))
                      }
                      classNames={modalInputClassNames}
                    />
                    <Input
                      label="Expiration"
                      type="date"
                      value={itemModal.expirationDate}
                      onValueChange={(value) =>
                        setItemModal((prev) => ({
                          ...prev,
                          expirationDate: value,
                        }))
                      }
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                  </div>
                  <Input
                    label="Barcode"
                    value={itemModal.barcode}
                    onValueChange={(value) =>
                      setItemModal((prev) => ({ ...prev, barcode: value }))
                    }
                    variant="bordered"
                    radius="lg"
                    startContent={<FaBarcode className="text-gray-400" />}
                    classNames={modalInputClassNames}
                  />
                  <EntityImageManager
                    entityType="item"
                    entityId={itemModal.itemId}
                    imageUrl={itemModal.imageUrl}
                    label="Item photo"
                    onChange={handleItemImageChange}
                  />
                  <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                    <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                    <Button
                      className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                      onPress={() => {
                        const target = {
                          id: itemModal.itemId,
                          name: itemModal.name,
                        };
                        closeItemModal();
                        openDeleteItem(target);
                      }}
                    >
                      Delete item
                    </Button>
                  </div>
                </ModalBody>
                <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                  <Button
                    variant="light"
                    onPress={closeItemModal}
                    isDisabled={isSaving}
                    className="max-md:hidden"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                    onPress={saveItem}
                    isLoading={isSaving}
                    isDisabled={!itemModal.name.trim()}
                  >
                    Save changes
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {canEditInventory && (
        <MoveItemsModal
          moveModal={moveModal}
          setMoveModal={setMoveModal}
          locationsForMove={normalizedMoveLocations}
          storageAreas={currentStorageAreas}
          currentLocationId={location?.id ?? null}
          onConfirm={confirmMove}
        />
      )}

      {canEditInventory && (
        <ConfirmDeleteModal
          isOpen={deleteDialog.open}
          isDeleting={deleteDialog.isDeleting}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDelete}
          title={
            deleteDialog.entityType === "category"
              ? `Delete category "${deleteDialog.payload?.name ?? categoryName}"?`
              : `Delete "${deleteDialog.payload?.name ?? "item"}"?`
          }
          description={
            deleteDialog.entityType === "category"
              ? `This will delete "${deleteDialog.payload?.name ?? categoryName}" and all items inside it. This cannot be undone.`
              : `This will permanently delete "${deleteDialog.payload?.name ?? "this item"}" from ${categoryName}. This cannot be undone.`
          }
        />
      )}
    </main>
  );
}
