'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';
import {
  addStorageArea,
  updateStorageArea,
  deleteStorageArea,
  addCategory,
  updateCategoryName,
  deleteCategory,
  addItem,
  updateItem,
  deleteItem,
  updateItemLocation,
} from '@/app/actions/server';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronUp,
  FaSearch,
  FaArrowsAlt,
  FaBoxOpen,
  FaLayerGroup,
  FaWarehouse,
  FaTags,
  FaBarcode,
} from 'react-icons/fa';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import MoveItemsModal from '@/components/items/MoveItemsModal';
import OpenGlobalAddItemButton from '@/components/ui/OpenGlobalAddItemButton';
import { emitInventoryChange, emitItemAdded } from '@/utils/clientEvents';
import EntityImageManager from '@/components/inventory/EntityImageManager';
import {
  daysUntil,
  isExpiringSoon,
  toNonNegativeInteger,
  toPositiveInteger,
} from '@/utils/pantry/date';
import { containsQuery } from '@/utils/pantry/search';

const collapseVariants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  open: { height: 'auto', opacity: 1, transition: { duration: 0.25 } },
};

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const pageItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, type: 'spring', stiffness: 120 },
  },
};

const modalContentStyle = {
  fontFamily: 'var(--stocksense-font-family)',
};

const modalContentClass =
  'flex w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl sm:w-full';

const modalHeaderClass =
  'shrink-0 border-b border-gray-200 bg-white text-base font-semibold text-gray-950';

const modalBodyClass = 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5';

const modalFooterClass =
  'flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white sm:flex-row sm:justify-end';

const modalInputClassNames = {
  inputWrapper:
    'border-gray-200 bg-white focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]',
  label: 'text-gray-700',
  input: 'text-gray-900 placeholder:text-gray-400',
};

const modalPrimaryButtonClass =
  'bg-[var(--stocksense-brand)] text-white hover:brightness-95';

export default function StorageAreasSection({
  locationId,
  initialStorageAreas,
  locationName,
  // optional: pass all locations if you want true cross-location moves
  allLocations,
  canEditInventory = true,
}) {
  const [storageAreas, setStorageAreas] = useState(initialStorageAreas ?? []);
  const [areaModal, setAreaModal] = useState({
    open: false,
    mode: 'create',
    areaId: null,
    name: '',
    imageUrl: null,
    image_path: null,
    locationName: '',
  });
  const [categoryModal, setCategoryModal] = useState({
    open: false,
    mode: 'create',
    areaId: null,
    categoryId: null,
    areaName: '',
    name: '',
  });
  const [itemModal, setItemModal] = useState({
    open: false,
    mode: 'create',
    areaId: null,
    categoryId: null,
    itemId: null,
    categoryName: '',
    name: '',
    quantity: '',
    expirationDate: '',
    imageUrl: null,
    image_path: null,
  });
  const [limitNotice, setLimitNotice] = useState(null);

  const [expandedAreas, setExpandedAreas] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [mobileCategorySheet, setMobileCategorySheet] = useState(null);

  // bulk-select state: { [categoryId]: { [itemId]: true } }
  const [selectedByCategory, setSelectedByCategory] = useState({});

  // filters
  const [search, setSearch] = useState('');
  const [expSoonEnabled, setExpSoonEnabled] = useState(false);
  const [expDays, setExpDays] = useState(7);

  // Move items modal state
  const [moveModal, setMoveModal] = useState({
    open: false,
    sourceAreaId: null,
    sourceCategoryId: null,
    targetLocationId: locationId,
    targetAreaId: null,
    targetCategoryId: null,
    itemIds: [],
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    entityType: null,  // 'area' | 'category' | 'item' | 'bulk-items'
    payload: null,
    isDeleting: false,
  });

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.storageAreaId || String(item.locationId) !== String(locationId)) {
        return;
      }

      const itemSummary = {
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 0,
        expiration_date: item.expiration_date ?? null,
        category_id: item.category_id ?? item.categoryId,
      };

      setStorageAreas((prev) => {
        const areaExists = (prev ?? []).some(
          (area) => String(area.id) === String(item.storageAreaId)
        );

        if (!areaExists) {
          return [
            ...(prev ?? []),
            {
              id: item.storageAreaId,
              name: item.storageAreaName ?? 'Storage area',
              categories: [
                {
                  id: item.categoryId,
                  name: item.categoryName ?? 'Category',
                  items: [itemSummary],
                },
              ],
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        }

        return (prev ?? []).map((area) => {
          if (String(area.id) !== String(item.storageAreaId)) return area;

          const categories = area.categories ?? [];
          const categoryExists = categories.some(
            (category) => String(category.id) === String(item.categoryId)
          );

          const nextCategories = categoryExists
            ? categories.map((category) => {
                if (String(category.id) !== String(item.categoryId)) {
                  return category;
                }

                if ((category.items ?? []).some((i) => String(i.id) === String(item.id))) {
                  return category;
                }

                return {
                  ...category,
                  items: [...(category.items ?? []), itemSummary],
                };
              })
            : [
                ...categories,
                {
                  id: item.categoryId,
                  name: item.categoryName ?? 'Category',
                  items: [itemSummary],
                },
              ];

          return {
            ...area,
            categories: nextCategories,
          };
        });
      });

      setExpandedAreas((prev) => ({
        ...prev,
        [item.storageAreaId]: true,
      }));
      setExpandedCategories((prev) => ({
        ...prev,
        [item.categoryId]: true,
      }));
    };

    window.addEventListener('stocksense:item-added', handleItemAdded);

    return () => {
      window.removeEventListener('stocksense:item-added', handleItemAdded);
    };
  }, [locationId]);

  const openDeleteDialog = (entityType, payload) => {
    if (!canEditInventory) return;
    setDeleteDialog({
      open: true,
      entityType,
      payload,
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


  // Build locations list for the modal, normalize storageAreas vs storage_areas
  const locationsForMove = useMemo(() => {
    if (allLocations && allLocations.length) {
      return allLocations.map((loc) => ({
        ...loc,
        storageAreas: loc.storageAreas || loc.storage_areas || [],
      }));
    }
    // fallback: only current location with current storageAreas
    return [
      {
        id: locationId,
        name: locationName,
        storageAreas,
      },
    ];
  }, [allLocations, locationId, locationName, storageAreas]);

  const expansionSignature = useMemo(
    () =>
      (storageAreas || [])
        .map((area) => `${area.id}:${(area.categories || []).map((c) => c.id).join(',')}`)
        .join('|'),
    [storageAreas]
  );

  useEffect(() => {
    const areaState = {};
    const catState = {};

    for (const areaGroup of expansionSignature.split('|')) {
      if (!areaGroup) continue;

      const [areaId, categoryList = ''] = areaGroup.split(':');
      if (areaId) areaState[areaId] = true;

      for (const categoryId of categoryList.split(',')) {
        if (categoryId) catState[categoryId] = true;
      }
    }

    setExpandedAreas(areaState);
    setExpandedCategories(catState);
  }, [expansionSignature]);

  const totalAreas = storageAreas?.length || 0;
  const totalCategories = useMemo(
    () => (storageAreas || []).reduce((sum, a) => sum + (a.categories?.length || 0), 0),
    [storageAreas]
  );

  const totalItems = useMemo(() => {
    let n = 0;
    for (const a of storageAreas ?? []) {
      for (const c of a.categories || []) n += c.items?.length || 0;
    }
    return n;
  }, [storageAreas]);

  // ---------- Expand/Collapse helpers ----------
  const toggleArea = (id) =>
    setExpandedAreas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const toggleCategory = (id) =>
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const expandAllAreas = () =>
    setExpandedAreas(Object.fromEntries((storageAreas || []).map((a) => [a.id, true])));

  const collapseAllAreas = () =>
    setExpandedAreas(Object.fromEntries((storageAreas || []).map((a) => [a.id, false])));

  const allAreasExpanded =
    (storageAreas || []).length > 0 &&
    (storageAreas || []).every((a) => expandedAreas[a.id]);

  // ---------- Modal helpers ----------
  const closeAreaModal = () =>
    setAreaModal({
      open: false,
      mode: 'create',
      areaId: null,
      name: '',
      imageUrl: null,
      image_path: null,
      locationName: '',
    });

  const closeCategoryModal = () =>
    setCategoryModal({
      open: false,
      mode: 'create',
      areaId: null,
      categoryId: null,
      areaName: '',
      name: '',
    });

  const closeItemModal = () =>
    setItemModal({
      open: false,
      mode: 'create',
      areaId: null,
      categoryId: null,
      itemId: null,
      categoryName: '',
      name: '',
      quantity: '',
      expirationDate: '',
      imageUrl: null,
      image_path: null,
    });

  // ---------- Storage Area CRUD ----------
  const openCreateAreaModal = () =>
    canEditInventory &&
    setAreaModal({
      open: true,
      mode: 'create',
      areaId: null,
      name: '',
      imageUrl: null,
      image_path: null,
      locationName,
    });

  const openEditAreaModal = (area) =>
    canEditInventory &&
    setAreaModal({
      open: true,
      mode: 'edit',
      areaId: area.id,
      name: area.name,
      imageUrl: area.imageUrl ?? null,
      image_path: area.image_path ?? null,
      locationName,
    });

  const handleAreaImageChange = ({ imagePath, imageUrl }) => {
    setAreaModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
    }));
    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === areaModal.areaId
          ? { ...area, image_path: imagePath ?? null, imageUrl: imageUrl ?? null }
          : area
      )
    );
    emitInventoryChange({
      entity: 'storage_area',
      action: imagePath ? 'image_updated' : 'image_removed',
      id: areaModal.areaId,
    });
  };

  const submitAreaModal = async () => {
    if (!canEditInventory) return;
    const name = areaModal.name.trim();
    if (!name) return;

    if (areaModal.mode === 'edit') {
      const result = await updateStorageArea(areaModal.areaId, name);
      if (!result?.error) {
        setStorageAreas((prev) =>
          prev.map((a) => (a.id === areaModal.areaId ? { ...a, name } : a))
        );
        emitInventoryChange({
          entity: 'storage_area',
          action: 'updated',
          id: areaModal.areaId,
        });
        closeAreaModal();
      }
      return;
    }

    const result = await addStorageArea(locationId, name);
    if (result?.data) {
      setStorageAreas((prev) => [...prev, { ...result.data, categories: [] }]);
      emitInventoryChange({
        entity: 'storage_area',
        action: 'added',
        id: result.data.id,
      });
      closeAreaModal();
    }
  };

  const performDeleteStorageArea = async (id) => {
    if (!canEditInventory) return;
    const result = await deleteStorageArea(id);
    if (!result?.error) {
      setStorageAreas((prev) => prev.filter((a) => a.id !== id));
      emitInventoryChange({
        entity: 'storage_area',
        action: 'deleted',
        id,
      });
    } else {
      console.error('deleteStorageArea error:', result.error);
    }
  };

  // ---------- Category CRUD ----------
  const openCreateCategoryModal = (area) =>
    canEditInventory &&
    setCategoryModal({
      open: true,
      mode: 'create',
      areaId: area.id,
      categoryId: null,
      areaName: area.name,
      name: '',
    });

  const openEditCategoryModal = (area, category) =>
    canEditInventory &&
    setCategoryModal({
      open: true,
      mode: 'edit',
      areaId: area.id,
      categoryId: category.id,
      areaName: area.name,
      name: category.name,
    });

  const submitCategoryModal = async () => {
    if (!canEditInventory) return;
    const name = categoryModal.name.trim();
    if (!name) return;

    if (categoryModal.mode === 'edit') {
      const result = await updateCategoryName(categoryModal.categoryId, name);
      if (!result?.error) {
        setStorageAreas((prev) =>
          prev.map((a) =>
            a.id === categoryModal.areaId
              ? {
                  ...a,
                  categories: a.categories.map((c) =>
                    c.id === categoryModal.categoryId ? { ...c, name } : c
                  ),
                }
              : a
          )
        );
        emitInventoryChange({
          entity: 'category',
          action: 'updated',
          id: categoryModal.categoryId,
        });
        closeCategoryModal();
      }
      return;
    }

    const result = await addCategory(categoryModal.areaId, name);
    if (result?.error) {
      console.error('addCategory error:', result.error);
      alert(result.error.message || 'Failed to add category');
      return;
    }

    if (result?.data) {
      setStorageAreas((prev) =>
        prev.map((a) =>
          a.id === categoryModal.areaId
            ? { ...a, categories: [...(a.categories || []), result.data] }
            : a
        )
      );
      closeCategoryModal();
      setExpandedCategories((prev) => ({ ...prev, [result.data.id]: true }));
      emitInventoryChange({
        entity: 'category',
        action: 'added',
        id: result.data.id,
      });
    }
  };

  const performDeleteCategory = async (categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    const result = await deleteCategory(categoryId);
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((a) =>
          a.id === storageAreaId
            ? {
                ...a,
                categories: a.categories.filter((c) => c.id !== categoryId),
              }
            : a
        )
      );
      emitInventoryChange({
        entity: 'category',
        action: 'deleted',
        id: categoryId,
      });
    } else {
      console.error('deleteCategory error:', result.error);
    }
  };

  // ---------- Item CRUD ----------
  const openCreateItemModal = (area, category) =>
    canEditInventory &&
    setItemModal({
      open: true,
      mode: 'create',
      areaId: area.id,
      categoryId: category.id,
      itemId: null,
      categoryName: category.name,
      name: '',
      quantity: '',
      expirationDate: '',
      imageUrl: null,
      image_path: null,
    });

  const openEditItemModal = (area, category, item) =>
    canEditInventory &&
    setItemModal({
      open: true,
      mode: 'edit',
      areaId: area.id,
      categoryId: category.id,
      itemId: item.id,
      categoryName: category.name,
      name: item.name,
      quantity: String(item.quantity ?? 0),
      expirationDate: item.expiration_date || '',
      imageUrl: item.imageUrl ?? null,
      image_path: item.image_path ?? null,
    });

  const handleItemImageChange = ({ imagePath, imageUrl }) => {
    setItemModal((prev) => ({
      ...prev,
      image_path: imagePath ?? null,
      imageUrl: imageUrl ?? null,
    }));
    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === itemModal.areaId
          ? {
              ...area,
              categories: area.categories.map((cat) =>
                cat.id === itemModal.categoryId
                  ? {
                      ...cat,
                      items: cat.items.map((item) =>
                        item.id === itemModal.itemId
                          ? {
                              ...item,
                              image_path: imagePath ?? null,
                              imageUrl: imageUrl ?? null,
                            }
                          : item
                      ),
                    }
                  : cat
              ),
            }
          : area
      )
    );
    emitInventoryChange({
      entity: 'item',
      action: imagePath ? 'image_updated' : 'image_removed',
      id: itemModal.itemId,
    });
  };

  const submitItemModal = async () => {
    if (!canEditInventory) return;
    if (!itemModal.name.trim()) return;
    setLimitNotice(null);

    const payload = {
      name: itemModal.name.trim(),
      quantity: toNonNegativeInteger(itemModal.quantity, 0),
      expiration_date: itemModal.expirationDate || null,
    };

    if (itemModal.mode === 'edit') {
      const { data, error } = await updateItem(itemModal.itemId, payload);
      if (error) {
        console.error(error);
        return;
      }

      setStorageAreas((prev) =>
        prev.map((area) =>
          area.id === itemModal.areaId
            ? {
                ...area,
                categories: area.categories.map((cat) =>
                  cat.id === itemModal.categoryId
                    ? {
                        ...cat,
                        items: cat.items.map((it) =>
                          it.id === itemModal.itemId
                            ? {
                                ...it,
                                ...data,
                                imageUrl: it.imageUrl,
                              }
                            : it
                        ),
                      }
                    : cat
                ),
              }
            : area
        )
      );
      emitInventoryChange({
        entity: 'item',
        action: 'updated',
        id: itemModal.itemId,
      });
      closeItemModal();
      return;
    }

    const result = await addItem(itemModal.categoryId, payload);
    if (result?.error) {
      setLimitNotice({
        message:
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Could not add item.',
        upgradeHref: result.upgradeHref,
      });
      return;
    }

    const created = result?.data;
    if (!created) return;

    setStorageAreas((prev) =>
      prev.map((area) => ({
        ...area,
        categories: (area.categories || []).map((cat) =>
          cat.id === itemModal.categoryId
            ? { ...cat, items: [...(cat.items || []), created] }
            : cat
        ),
      }))
    );

    emitItemAdded({
      ...created,
      locationId,
      locationName,
      storageAreaId: itemModal.areaId,
      storageAreaName:
        storageAreas.find((area) => String(area.id) === String(itemModal.areaId))
          ?.name ?? null,
      categoryId: itemModal.categoryId,
      categoryName: itemModal.categoryName,
    });
    closeItemModal();
  };

  const performDeleteItem = async (itemId, categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    const result = await deleteItem(itemId);
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((area) =>
          area.id === storageAreaId
            ? {
                ...area,
                categories: area.categories.map((cat) =>
                  cat.id === categoryId
                    ? {
                        ...cat,
                        items: cat.items.filter((it) => it.id !== itemId),
                      }
                    : cat
                ),
              }
            : area
        )
      );
      emitInventoryChange({
        entity: 'item',
        action: 'deleted',
        id: itemId,
      });
    } else {
      console.error('deleteItem error:', result.error);
    }
  };

  const performBulkDeleteItems = async (itemIds, categoryId, storageAreaId) => {
    if (!canEditInventory) return;
    for (const id of itemIds) {
      await deleteItem(id);
    }

    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map((cat) =>
                cat.id === categoryId
                  ? {
                      ...cat,
                      items: (cat.items || []).filter((i) => !itemIds.includes(i.id)),
                    }
                  : cat
              ),
            }
          : area
      )
    );

    setSelectedByCategory((prev) => ({ ...prev, [categoryId]: {} }));
    emitInventoryChange({
      entity: 'item',
      action: 'deleted',
      ids: itemIds,
    });
  };

  const handleConfirmDelete = async () => {
    if (!canEditInventory) return;
    const { entityType, payload } = deleteDialog;
    if (!entityType || !payload) return;

    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      if (entityType === 'area') {
        await performDeleteStorageArea(payload.areaId);
      } else if (entityType === 'category') {
        await performDeleteCategory(payload.categoryId, payload.storageAreaId);
      } else if (entityType === 'item') {
        await performDeleteItem(
          payload.itemId,
          payload.categoryId,
          payload.storageAreaId
        );
      } else if (entityType === 'bulk-items') {
        await performBulkDeleteItems(
          payload.itemIds,
          payload.categoryId,
          payload.storageAreaId
        );
      }
    } catch (e) {
      console.error('Error during delete:', e);
    } finally {
      closeDeleteDialog();
    }
  };

  const deleteTitle = (() => {
    const { entityType, payload } = deleteDialog;
    if (!entityType || !payload) return 'Delete';

    if (entityType === 'area') {
      return `Delete storage area "${payload.name}"?`;
    }
    if (entityType === 'category') {
      return `Delete category "${payload.name}"?`;
    }
    if (entityType === 'item') {
      return `Delete item "${payload.itemName}"?`;
    }
    if (entityType === 'bulk-items') {
      return `Delete ${payload.count} items?`;
    }
    return 'Delete';
  })();

  const deleteDescription = (() => {
    const { entityType, payload } = deleteDialog;
    if (!entityType || !payload) return '';

    if (entityType === 'area') {
      return 'This will remove this storage area and all of its categories and items. This action cannot be undone.';
    }
    if (entityType === 'category') {
      return `This will remove the category "${payload.name}" in ${payload.areaName}, including all items inside it. This action cannot be undone.`;
    }
    if (entityType === 'item') {
      return `This will permanently delete "${payload.itemName}" from ${payload.categoryName} in ${payload.areaName}.`;
    }
    if (entityType === 'bulk-items') {
      return `This will permanently delete ${payload.count} selected item${
        payload.count > 1 ? 's' : ''
      } from ${payload.categoryName} in ${payload.areaName}.`;
    }
    return '';
  })();



  const toggleSelectItem = (categoryId, itemId) => {
    if (!canEditInventory) return;
    setSelectedByCategory((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [itemId]: !prev[categoryId]?.[itemId],
      },
    }));
  };

  const selectAllInCategory = (category) => {
    if (!canEditInventory) return;
    const all = Object.fromEntries((category.items || []).map((i) => [i.id, true]));
    setSelectedByCategory((prev) => ({ ...prev, [category.id]: all }));
  };

  const clearSelectInCategory = (categoryId) => {
    if (!canEditInventory) return;
    setSelectedByCategory((prev) => ({ ...prev, [categoryId]: {} }));
  };

  // ---------- Move items logic ----------

  const openMoveModal = (areaId, categoryId, singleItemId = null) => {
    if (!canEditInventory) return;
    const selectedMap = selectedByCategory[categoryId] || {};
    let itemIds = Object.keys(selectedMap).filter((k) => selectedMap[k]);

    // If nothing selected but a single item action triggered it, move that one
    if (itemIds.length === 0 && singleItemId) {
      itemIds = [singleItemId];
    }

    if (itemIds.length === 0) {
      alert('Select at least one item to move.');
      return;
    }

    // Default target: current location + same area/category
    setMoveModal({
      open: true,
      sourceAreaId: areaId,
      sourceCategoryId: categoryId,
      targetLocationId: locationId,
      targetAreaId: areaId,
      targetCategoryId: categoryId,
      itemIds,
    });
  };

  const handleConfirmMove = async () => {
    if (!canEditInventory) return;
    const {
      sourceAreaId,
      sourceCategoryId,
      targetLocationId,
      targetAreaId,
      targetCategoryId,
      itemIds,
    } = moveModal;

    if (!targetCategoryId || itemIds.length === 0) return;
    if (String(targetCategoryId) === String(sourceCategoryId)) return;

    // Find source area/category in current state
    const sourceArea = storageAreas.find(
      (a) => String(a.id) === String(sourceAreaId)
    );
    const sourceCat = sourceArea?.categories?.find(
      (c) => String(c.id) === String(sourceCategoryId)
    );
    const itemsToMove = (sourceCat?.items || []).filter((it) =>
      itemIds.includes(it.id)
    );

    // --- DB update: only change category_id ---
    const results = await Promise.all(
      itemsToMove.map((it) =>
        updateItemLocation(it.id, {
          categoryId: targetCategoryId,
        })
      )
    );

    const hasError = results.some((r) => r?.error);
    if (hasError) {
      console.error('Error moving some items:', results);
      alert('There was a problem moving one or more items. Nothing was changed.');
      return;
    }

    // --- Local state update ---
    if (String(targetLocationId) === String(locationId)) {
      setStorageAreas((prev) =>
        prev.map((area) => {
          if (
            String(area.id) !== String(sourceAreaId) &&
            String(area.id) !== String(targetAreaId)
          ) {
            return area;
          }

          return {
            ...area,
            categories: (area.categories || []).map((cat) => {
              // remove from source
              if (String(cat.id) === String(sourceCategoryId)) {
                return {
                  ...cat,
                  items: (cat.items || []).filter((it) => !itemIds.includes(it.id)),
                };
              }

              // add to target (same location case)
              if (String(cat.id) === String(targetCategoryId)) {
                return {
                  ...cat,
                  items: [
                    ...(cat.items || []),
                    ...itemsToMove.map((it) => ({
                      ...it,
                      category_id: targetCategoryId,
                    })),
                  ],
                };
              }

              return cat;
            }),
          };
        })
      );
    } else {
      // different location: just remove from source; other location UI will fetch fresh data
      setStorageAreas((prev) =>
        prev.map((area) => {
          if (String(area.id) !== String(sourceAreaId)) return area;
          return {
            ...area,
            categories: (area.categories || []).map((cat) =>
              String(cat.id) === String(sourceCategoryId)
                ? {
                    ...cat,
                    items: (cat.items || []).filter((it) => !itemIds.includes(it.id)),
                  }
                : cat
            ),
          };
        })
      );
    }

    // Clear selection on source category and close modal
    setSelectedByCategory((prev) => ({
      ...prev,
      [sourceCategoryId]: {},
    }));

    setMoveModal({
      open: false,
      sourceAreaId: null,
      sourceCategoryId: null,
      targetLocationId: locationId,
      targetAreaId: null,
      targetCategoryId: null,
      itemIds: [],
    });
    emitInventoryChange({
      entity: 'item',
      action: 'moved',
      ids: itemIds,
    });
  };



  // ---------- Filtering ----------
  const normalizedSearch = search.trim().toLowerCase();
  const filterItem = (item) => {
    const nameOk =
      !normalizedSearch || containsQuery(item.name, normalizedSearch);
    const expOk =
      !expSoonEnabled || isExpiringSoon(item.expiration_date, expDays);
    return nameOk && expOk;
  };

  const filterCategoryVisible = (category) => {
    const nameMatch =
      !normalizedSearch || containsQuery(category.name, normalizedSearch);
    if (nameMatch) return true;
    return (category.items || []).some(filterItem);
  };

  const activeMobileCategory = useMemo(() => {
    if (!mobileCategorySheet) return null;

    const area = (storageAreas ?? []).find(
      (item) => String(item.id) === String(mobileCategorySheet.areaId)
    );
    const category = area?.categories?.find(
      (item) => String(item.id) === String(mobileCategorySheet.categoryId)
    );

    if (!area || !category) return null;

    return {
      area,
      category,
      items: (category.items ?? []).filter(filterItem),
    };
  }, [mobileCategorySheet, storageAreas, normalizedSearch, expSoonEnabled, expDays]);

  // ---------- UI ----------
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 transition-all duration-150"
    >
      {limitNotice && (
        <motion.div
          variants={pageItemVariants}
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {limitNotice.message}
          {limitNotice.upgradeHref && (
            <Link
              href={limitNotice.upgradeHref}
              className="ml-2 font-semibold underline underline-offset-2"
            >
              View plans
            </Link>
          )}
        </motion.div>
      )}

      {/* Top: Summary & tools */}
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm max-md:hidden md:p-5"
      >
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stocksense-teal">
              Inventory overview
            </h1>
            <p className="text-sm text-gray-500">{locationName}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            {/* Search */}
            <div className="relative min-w-0">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories or items..."
                className="h-11 w-full rounded-xl border border-stocksense-gray pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]/50"
              />
            </div>

            {/* Expiring filter */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={expSoonEnabled}
                  onChange={() => setExpSoonEnabled((v) => !v)}
                  className="w-5 h-5 border border-stocksense-gray rounded cursor-pointer"
                />
                Expiring in
              </label>
              <input
                type="number"
                min={1}
                value={expDays}
                onChange={(e) =>
                  setExpDays(toPositiveInteger(e.target.value, 7))
                }
                className={`border border-stocksense-gray rounded px-2 py-1 w-16 ${
                  !expSoonEnabled && 'bg-gray-100 text-gray-400'
                }`}
                disabled={!expSoonEnabled}
              />
              <span className="text-sm">days</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Areas
            </p>
            <p className="mt-1 text-2xl font-semibold text-stocksense-teal">
              {totalAreas}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Categories
            </p>
            <p className="mt-1 text-2xl font-semibold text-stocksense-teal">
              {totalCategories}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Items
            </p>
            <p className="mt-1 text-2xl font-semibold text-stocksense-teal">
              {totalItems}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {canEditInventory && (
            <div className="flex flex-wrap gap-2">
              <OpenGlobalAddItemButton
                canEditInventory={canEditInventory}
                context={{
                  locationId,
                }}
              />
              <button
                onClick={openCreateAreaModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-2 text-sm font-medium text-[var(--stocksense-brand)] hover:brightness-95"
              >
                <FaPlus /> New storage area
              </button>
            </div>
          )}

          <button
            onClick={allAreasExpanded ? collapseAllAreas : expandAllAreas}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stocksense-gray px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
          >
            {allAreasExpanded ? 'Collapse all' : 'Expand all'}
            <FaChevronUp
              className={`${
                allAreasExpanded ? '' : 'rotate-180'
              } transition-all duration-150 cursor-pointer`}
            />
          </button>
        </div>

      </motion.div>

      {/* Mobile hierarchy */}
      <motion.div variants={pageVariants} className="grid grid-cols-1 gap-3 md:hidden">
        <motion.div variants={pageItemVariants} className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              Storage areas
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse the places inside this location.
            </p>
          </div>
          {canEditInventory && storageAreas.length > 0 && (
            <button
              onClick={openCreateAreaModal}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
            >
              <FaPlus className="h-3 w-3" /> Add
            </button>
          )}
        </motion.div>

        {storageAreas.length === 0 && (
          <motion.div
            variants={pageItemVariants}
            className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center shadow-sm"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
              <FaWarehouse className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">
              No storage areas yet
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Add an item or create the first storage area for this location.
            </p>
            {canEditInventory && (
              <div className="mt-4 grid gap-2">
                <OpenGlobalAddItemButton
                  canEditInventory={canEditInventory}
                  context={{ locationId }}
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                >
                  Add item here
                </OpenGlobalAddItemButton>
                <button
                  onClick={openCreateAreaModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[var(--stocksense-brand)] shadow-sm"
                >
                  <FaPlus /> New storage area
                </button>
              </div>
            )}
          </motion.div>
        )}

        {storageAreas.map((area, aIdx) => {
          const areaNameMatches =
            normalizedSearch && containsQuery(area.name, normalizedSearch);
          const visibleCategories = areaNameMatches
            ? area.categories || []
            : (area.categories || []).filter((category) =>
                filterCategoryVisible(category)
              );
          const areaItemCount = (area.categories || []).reduce(
            (sum, category) => sum + (category.items?.length || 0),
            0
          );

          if (
            (normalizedSearch || expSoonEnabled) &&
            !areaNameMatches &&
            visibleCategories.length === 0
          ) {
            return null;
          }

          return (
            <motion.article
              key={area.id}
              variants={pageItemVariants}
              className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm"
            >
              <div className="border-t-4 border-[var(--entity-area-accent)] p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={Boolean(expandedAreas[area.id])}
                    aria-label={`${expandedAreas[area.id] ? 'Collapse' : 'Expand'} ${area.name}`}
                  >
                    {area.imageUrl ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-area-border)] bg-white">
                        <img
                          src={area.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
                        <FaWarehouse className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-gray-900">
                        {area.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {(area.categories || []).length}{' '}
                        {(area.categories || []).length === 1 ? 'category' : 'categories'} |{' '}
                        {areaItemCount} {areaItemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    <FaChevronUp
                      className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                        expandedAreas[area.id] ? '' : 'rotate-180'
                      }`}
                    />
                  </button>
                </div>

                {canEditInventory && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <OpenGlobalAddItemButton
                      canEditInventory={canEditInventory}
                      context={{ locationId, storageAreaId: area.id }}
                      variant="flat"
                      className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-2 text-xs text-[var(--stocksense-brand)]"
                    >
                      Add
                    </OpenGlobalAddItemButton>
                    <button
                      onClick={() => openEditAreaModal(area)}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-700"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() =>
                        openDeleteDialog('area', {
                          areaId: area.id,
                          name: area.name,
                        })
                      }
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs font-medium text-rose-700"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence initial={false}>
                {expandedAreas[area.id] && (
                  <motion.div
                    key={`${area.id}-mobile-content`}
                    variants={collapseVariants}
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-gray-100 bg-gray-50/70 p-3">
                      {visibleCategories.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-sm text-gray-500">
                          {search || expSoonEnabled
                            ? 'No matching categories or items.'
                            : 'No categories yet.'}
                        </div>
                      ) : (
                        visibleCategories.map((category) => {
                          const items = (category.items || []).filter(filterItem);

                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() =>
                                setMobileCategorySheet({
                                  areaId: area.id,
                                  categoryId: category.id,
                                })
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                                  <FaTags className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    {category.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {items.length} {items.length === 1 ? 'item' : 'items'}
                                  </p>
                                </div>
                              </div>
                              <FaChevronUp className="h-3.5 w-3.5 rotate-90 text-gray-400" />
                            </button>
                          );
                        })
                      )}

                      {canEditInventory && (
                        <button
                          onClick={() => openCreateCategoryModal(area)}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--stocksense-brand-border)] bg-white text-sm font-medium text-[var(--stocksense-brand)]"
                        >
                          <FaLayerGroup /> New category
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </motion.div>

      {/* Desktop hierarchy */}
      <motion.div variants={pageVariants} className="hidden grid-cols-1 gap-4 md:grid">
        {storageAreas.length === 0 && (
          <motion.div
            variants={pageItemVariants}
            className="rounded-2xl border border-dashed border-stocksense-gray bg-white p-8 text-center shadow-sm"
          >
            <h2 className="text-lg font-semibold text-stocksense-teal">
              No storage areas yet
            </h2>
            {canEditInventory && (
              <button
                onClick={openCreateAreaModal}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-4 py-2 text-sm font-medium text-white hover:brightness-95"
              >
                <FaPlus /> New storage area
              </button>
            )}
          </motion.div>
        )}
        {storageAreas.map((area, aIdx) => (
          <motion.div
            key={area.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: aIdx * 0.02 }}
            className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm"
          >
            {/* Area header */}
            <div className="border-t-4 border-[var(--entity-area-accent)] p-4 md:p-5 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {area.categories?.length ? (
                  <button
                    onClick={() => toggleArea(area.id)}
                    className="text-[var(--stocksense-brand)] rounded-lg p-1.5 hover:bg-[var(--stocksense-brand-soft)] border border-transparent hover:border-[var(--stocksense-brand-border)]"
                    aria-label={expandedAreas[area.id] ? 'Collapse area' : 'Expand area'}
                  >
                    <FaChevronUp
                      className={`${
                        expandedAreas[area.id] ? '' : 'rotate-180'
                      } transition-all duration-150 cursor-pointer`}
                    />
                  </button>
                ) : null}

                {area.imageUrl ? (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                    <img
                      src={area.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
                    <FaWarehouse className="h-5 w-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {area.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {area.categories?.length || 0}{' '}
                    {area.categories?.length === 1 ? 'category' : 'categories'} in this storage area
                  </p>
                </div>
              </div>

              {canEditInventory && (
                <div className="flex flex-wrap justify-end gap-2 shrink-0">
                  <button
                    onClick={() => openCreateCategoryModal(area)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)] hover:brightness-95"
                  >
                    <FaLayerGroup /> New category
                  </button>
                  <button
                    onClick={() => openEditAreaModal(area)}
                    className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
                    title="Edit storage area"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() =>
                      openDeleteDialog('area', {
                        areaId: area.id,
                        name: area.name,
                      })
                    }
                    className="text-rose-600 cursor-pointer rounded-lg p-2 hover:bg-rose-50"
                    title="Delete storage area"
                  >
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>

            {/* Categories list */}
            <AnimatePresence initial={false}>
              {expandedAreas[area.id] && (
                <motion.div
                  key={`${area.id}-content`}
                  variants={collapseVariants}
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 bg-gray-50/70 px-3 py-4 md:px-5 space-y-3">
                    {(area.categories || []).filter((c) =>
                      filterCategoryVisible(c)
                    ).length === 0 && (
                      <div className="rounded-xl border border-dashed border-stocksense-gray bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
                        {search || expSoonEnabled
                          ? 'No matching categories or items.'
                          : 'No categories yet.'}
                      </div>
                    )}
                    {(area.categories || [])
                      .filter((c) => filterCategoryVisible(c))
                      .map((category, cIdx) => {
                        const items = (category.items || []).filter(filterItem);
                        const selMap = selectedByCategory[category.id] || {};
                        const selectedCount = Object.values(selMap).filter(Boolean).length;
                        const allSelected =
                          items.length > 0 && selectedCount === items.length;

                        return (
                          <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: cIdx * 0.02 }}
                            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                          >
                            {/* Category header */}
                            <div className="p-3 sm:p-4 flex items-start justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                {items.length ? (
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="text-[var(--stocksense-brand)] rounded-lg p-1 hover:bg-[var(--stocksense-brand-soft)] border border-transparent hover:border-[var(--stocksense-brand-border)]"
                                    aria-label={
                                      expandedCategories[category.id]
                                        ? 'Collapse category'
                                        : 'Expand category'
                                    }
                                  >
                                    <FaChevronUp
                                      className={`${
                                        expandedCategories[category.id]
                                          ? ''
                                          : 'rotate-180'
                                      } transition-all duration-150 cursor-pointer`}
                                    />
                                  </button>
                                ) : null}

                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                                  <FaTags className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {category.name}
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    {items.length}{' '}
                                    {items.length === 1 ? 'item' : 'items'} in this category
                                  </p>
                                </div>
                              </div>

                              {canEditInventory && (
                                <div className="flex flex-wrap justify-end gap-2 shrink-0">
                                  <button
                                    onClick={() => openCreateItemModal(area, category)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)] hover:brightness-95"
                                  >
                                    <FaBoxOpen /> Add item
                                  </button>
                                  <button
                                    onClick={() => openEditCategoryModal(area, category)}
                                    className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
                                    title="Edit category"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    onClick={() =>
                                      openDeleteDialog('category', {
                                        categoryId: category.id,
                                        storageAreaId: area.id,
                                        name: category.name,
                                        areaName: area.name,
                                      })
                                    }
                                    className="text-rose-600 cursor-pointer rounded-lg p-2 hover:bg-rose-50"
                                    title="Delete category"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Items list (collapsible) */}
                            <AnimatePresence initial={false}>
                              {expandedCategories[category.id] && (
                                <motion.div
                                  key={`${category.id}-items`}
                                  variants={collapseVariants}
                                  initial="collapsed"
                                  animate="open"
                                  exit="collapsed"
                                  className="overflow-hidden sm:pl-8"
                                >
                                  {canEditInventory && items.length > 0 && (
                                    <div className="px-3 sm:px-4 flex flex-wrap items-center text-sm mb-2 gap-2">
                                      <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 truncate">
                                        Items
                                      </h3>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="cursor-pointer"
                                          checked={allSelected}
                                          onChange={(e) => {
                                            if (e.target.checked)
                                              selectAllInCategory({ ...category, items });
                                            else clearSelectInCategory(category.id);
                                          }}
                                        />
                                        Select all
                                      </label>

                                      {Object.values(
                                        selectedByCategory[category.id] || {}
                                      ).some(Boolean) && (
                                        <>
                                          <button
                                            onClick={() =>
                                              openMoveModal(area.id, category.id)
                                            }
                                            className="text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] hover:brightness-95 px-3 py-1.5 rounded-md cursor-pointer"
                                          >
                                            Move selected items
                                          </button>
                                          <button
                                            onClick={() => {
                                              const selectedMap = selectedByCategory[category.id] || {};
                                              const ids = Object.keys(selectedMap).filter((k) => selectedMap[k]);
                                              if (!ids.length) return;

                                              openDeleteDialog('bulk-items', {
                                                itemIds: ids,
                                                categoryId: category.id,
                                                storageAreaId: area.id,
                                                categoryName: category.name,
                                                areaName: area.name,
                                                count: ids.length,
                                              });
                                            }}
                                            className="text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md cursor-pointer"
                                          >
                                            Delete selected items (
                                            {Object.values(selectedByCategory[category.id] || {}).filter(Boolean).length}
                                            )
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  <div
                                    className={`${
                                      items.length && 'pb-4 '
                                    } px-3 sm:px-4 space-y-2`}
                                  >
                                    {items.map((item, iIdx) => {
                                      const soon = isExpiringSoon(
                                        item.expiration_date,
                                        expDays
                                      );
                                      const selected = !!(
                                        selectedByCategory[category.id]?.[item.id]
                                      );

                                      return (
                                        <motion.div
                                          key={item.id}
                                          initial={{ opacity: 0, y: 6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{
                                            duration: 0.18,
                                            delay: iIdx * 0.015,
                                          }}
                                          className={`flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 transition hover:border-[var(--stocksense-brand-border)] hover:bg-white sm:flex-row sm:items-center sm:justify-between ${
                                            selected ? 'ring-2 ring-rose-200' : ''
                                          }`}
                                        >
                                          <>
                                            <div className="flex items-start gap-3 min-w-0">
                                              {canEditInventory && (
                                                <input
                                                  type="checkbox"
                                                  checked={selected}
                                                  onChange={() =>
                                                    toggleSelectItem(
                                                      category.id,
                                                      item.id
                                                    )
                                                  }
                                                  className="mt-1"
                                                />
                                              )}
                                              {item.imageUrl ? (
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                                                  <img
                                                    src={item.imageUrl}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                  />
                                                </div>
                                              ) : (
                                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                                                  <FaBoxOpen className="h-4 w-4" />
                                                </div>
                                              )}
                                              <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">
                                                  {item.name}
                                                  {soon && (
                                                    <span className="ml-2 text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                                      {daysUntil(item.expiration_date) < 0
                                                        ? 'Expired'
                                                        : 'Soon'}
                                                    </span>
                                                  )}
                                                </p>
                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                                                  <span>Qty: {item.quantity}</span>
                                                  <span>Exp: {item.expiration_date || '-'}</span>
                                                  {item.barcode && (
                                                    <span className="inline-flex min-w-0 items-center gap-1 text-xs">
                                                      <FaBarcode className="h-3 w-3" />
                                                      <span className="truncate">{item.barcode}</span>
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            {canEditInventory && (
                                              <div className="flex items-center gap-2 self-end shrink-0 sm:self-auto">
                                                <button
                                                  onClick={() =>
                                                    openMoveModal(
                                                      area.id,
                                                      category.id,
                                                      item.id
                                                    )
                                                  }
                                                  className="text-[var(--stocksense-brand)] cursor-pointer rounded-lg p-2 hover:bg-[var(--stocksense-brand-soft)]"
                                                  title="Move item to another category"
                                                >
                                                  <FaArrowsAlt />
                                                </button>

                                                <button
                                                  onClick={() =>
                                                    openEditItemModal(area, category, item)
                                                  }
                                                  className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
                                                  title="Edit item"
                                                >
                                                  <FaEdit />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    openDeleteDialog('item', {
                                                      itemId: item.id,
                                                      itemName: item.name,
                                                      categoryId: category.id,
                                                      storageAreaId: area.id,
                                                      categoryName: category.name,
                                                      areaName: area.name,
                                                    })
                                                  }
                                                  className="text-rose-600 cursor-pointer rounded-lg p-2 hover:bg-rose-50"
                                                  title="Delete item"
                                                >
                                                  <FaTrash />
                                                </button>
                                              </div>
                                            )}
                                          </>
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      <Modal
        isOpen={Boolean(activeMobileCategory)}
        onOpenChange={(open) => {
          if (!open) setMobileCategorySheet(null);
        }}
        placement="bottom"
        scrollBehavior="inside"
        size="full"
        classNames={{
          wrapper: "items-end",
        }}
      >
        <ModalContent
          className={`${modalContentClass} max-h-[88dvh] rounded-b-none sm:rounded-2xl`}
          style={modalContentStyle}
        >
          {() => (
            <>
              <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
                <span className="text-gray-950">
                  {activeMobileCategory?.category?.name || 'Category'}
                </span>
                <span className="text-sm font-normal text-gray-500">
                  {activeMobileCategory?.area?.name} | {locationName}
                </span>
              </ModalHeader>

              <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                {canEditInventory && activeMobileCategory && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        openCreateItemModal(
                          activeMobileCategory.area,
                          activeMobileCategory.category
                        );
                      }}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-3 text-sm font-medium text-white"
                    >
                      <FaBoxOpen /> Add item
                    </button>
                    <button
                      onClick={() =>
                        openEditCategoryModal(
                          activeMobileCategory.area,
                          activeMobileCategory.category
                        )
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-700"
                    >
                      <FaEdit /> Edit category
                    </button>
                  </div>
                )}

                {activeMobileCategory?.items?.length ? (
                  activeMobileCategory.items.map((item) => {
                    const soon = isExpiringSoon(item.expiration_date, expDays);

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                      >
                        <div className="flex min-w-0 gap-3">
                          {item.imageUrl ? (
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                              <FaBoxOpen className="h-4 w-4" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {item.name}
                              </p>
                              {soon && (
                                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
                                  {daysUntil(item.expiration_date) < 0
                                    ? 'Expired'
                                    : 'Soon'}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                              <span>Qty: {item.quantity}</span>
                              <span>Exp: {item.expiration_date || '-'}</span>
                              {item.barcode && (
                                <span className="inline-flex min-w-0 items-center gap-1 text-xs">
                                  <FaBarcode className="h-3 w-3" />
                                  <span className="truncate">{item.barcode}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {canEditInventory && activeMobileCategory && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              onClick={() =>
                                openMoveModal(
                                  activeMobileCategory.area.id,
                                  activeMobileCategory.category.id,
                                  item.id
                                )
                              }
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                              title="Move item"
                            >
                              <FaArrowsAlt />
                            </button>
                            <button
                              onClick={() =>
                                openEditItemModal(
                                  activeMobileCategory.area,
                                  activeMobileCategory.category,
                                  item
                                )
                              }
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700"
                              title="Edit item"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() =>
                                openDeleteDialog('item', {
                                  itemId: item.id,
                                  itemName: item.name,
                                  categoryId: activeMobileCategory.category.id,
                                  storageAreaId: activeMobileCategory.area.id,
                                  categoryName: activeMobileCategory.category.name,
                                  areaName: activeMobileCategory.area.name,
                                })
                              }
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                              title="Delete item"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    No items in this category yet.
                  </div>
                )}

                {canEditInventory && activeMobileCategory && (
                  <button
                    onClick={() => {
                      setMobileCategorySheet(null);
                      openDeleteDialog('category', {
                        categoryId: activeMobileCategory.category.id,
                        storageAreaId: activeMobileCategory.area.id,
                        name: activeMobileCategory.category.name,
                        areaName: activeMobileCategory.area.name,
                      });
                    }}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700"
                  >
                    <FaTrash /> Delete category
                  </button>
                )}
              </ModalBody>

              <ModalFooter className={modalFooterClass}>
                <Button
                  variant="light"
                  radius="lg"
                  onPress={() => setMobileCategorySheet(null)}
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {canEditInventory && <Modal
        isOpen={areaModal.open}
        onOpenChange={(open) => !open && closeAreaModal()}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
            {areaModal.mode === 'edit'
              ? `Edit storage area in ${areaModal.locationName || locationName}`
              : `Create new storage in ${areaModal.locationName || locationName}`}
          </ModalHeader>
          <ModalBody className={modalBodyClass}>
            <Input
              label="Storage area name"
              value={areaModal.name}
              onValueChange={(name) => setAreaModal((prev) => ({ ...prev, name }))}
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus
            />
            {areaModal.mode === 'edit' && (
              <EntityImageManager
                entityType="storage_area"
                entityId={areaModal.areaId}
                imageUrl={areaModal.imageUrl}
                label="Storage area photo"
                onChange={handleAreaImageChange}
              />
            )}
          </ModalBody>
          <ModalFooter className={modalFooterClass}>
            <Button variant="light" radius="lg" onPress={closeAreaModal}>
              Cancel
            </Button>
            <Button
              color="primary"
              radius="lg"
              onPress={submitAreaModal}
              isDisabled={!areaModal.name.trim()}
              className={modalPrimaryButtonClass}
            >
              {areaModal.mode === 'edit' ? 'Save changes' : 'Add area'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>}

      {canEditInventory && <Modal
        isOpen={categoryModal.open}
        onOpenChange={(open) => !open && closeCategoryModal()}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
            {categoryModal.mode === 'edit'
              ? `Edit category in ${categoryModal.areaName || 'storage area'}`
              : `Create new category in ${categoryModal.areaName || 'storage area'}`}
          </ModalHeader>
          <ModalBody className={modalBodyClass}>
            <Input
              label="Category name"
              value={categoryModal.name}
              onValueChange={(name) =>
                setCategoryModal((prev) => ({ ...prev, name }))
              }
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus
            />
          </ModalBody>
          <ModalFooter className={modalFooterClass}>
            <Button variant="light" radius="lg" onPress={closeCategoryModal}>
              Cancel
            </Button>
            <Button
              color="primary"
              radius="lg"
              onPress={submitCategoryModal}
              isDisabled={!categoryModal.name.trim()}
              className={modalPrimaryButtonClass}
            >
              {categoryModal.mode === 'edit' ? 'Save changes' : 'Add category'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>}

      {canEditInventory && <Modal
        isOpen={itemModal.open}
        onOpenChange={(open) => !open && closeItemModal()}
        placement="center"
        backdrop="blur"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
            {itemModal.mode === 'edit'
              ? `Edit item in ${itemModal.categoryName || 'category'}`
              : `Create new item in ${itemModal.categoryName || 'category'}`}
          </ModalHeader>
          <ModalBody className={`space-y-3 ${modalBodyClass}`}>
            <Input
              label="Item name"
              value={itemModal.name}
              onValueChange={(name) => setItemModal((prev) => ({ ...prev, name }))}
              variant="bordered"
              radius="lg"
              classNames={modalInputClassNames}
              autoFocus
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                min="0"
                label="Quantity"
                value={itemModal.quantity}
                onValueChange={(quantity) =>
                  setItemModal((prev) => ({ ...prev, quantity }))
                }
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
              />
              <Input
                type="date"
                label="Expiration date"
                value={itemModal.expirationDate}
                onValueChange={(expirationDate) =>
                  setItemModal((prev) => ({ ...prev, expirationDate }))
                }
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
              />
            </div>
            {itemModal.mode === 'edit' && (
              <EntityImageManager
                entityType="item"
                entityId={itemModal.itemId}
                imageUrl={itemModal.imageUrl}
                label="Item photo"
                onChange={handleItemImageChange}
              />
            )}
          </ModalBody>
          <ModalFooter className={modalFooterClass}>
            <Button variant="light" radius="lg" onPress={closeItemModal}>
              Cancel
            </Button>
            <Button
              color="primary"
              radius="lg"
              onPress={submitItemModal}
              isDisabled={!itemModal.name.trim()}
              className={modalPrimaryButtonClass}
            >
              {itemModal.mode === 'edit' ? 'Save changes' : 'Add item'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>}

      {canEditInventory && <MoveItemsModal
        moveModal={moveModal}
        setMoveModal={setMoveModal}
        locationsForMove={locationsForMove}
        storageAreas={storageAreas}
        currentLocationId={locationId}
        onConfirm={handleConfirmMove}
      />}

      {/* Reusable delete confirmation modal */}
      {canEditInventory && <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={deleteTitle}
        description={deleteDescription}
      />}

    </motion.div>
  );
}
