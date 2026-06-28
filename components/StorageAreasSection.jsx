'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  FaCheck,
  FaTimes,
  FaChevronUp,
  FaSearch,
  FaArrowsAlt 
} from 'react-icons/fa';
import ConfirmDeleteModal from './modals/ConfirmDeleteModal';
import MoveItemsModal from './storage/MoveItemsModal';
import OpenGlobalAddItemButton from './OpenGlobalAddItemButton';
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

export default function StorageAreasSection({
  locationId,
  initialStorageAreas,
  locationName,
  // optional: pass all locations if you want true cross-location moves
  allLocations,
}) {
  const [storageAreas, setStorageAreas] = useState(initialStorageAreas ?? []);
  const [newStorageName, setNewStorageName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const [newCategoryName, setNewCategoryName] = useState({});
  const [editingCategoryName, setEditingCategoryName] = useState({});

  const [newItemData, setNewItemData] = useState({});
  const [editingItem, setEditingItem] = useState({});

  const [expandedAreas, setExpandedAreas] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

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

  // initialize expanded for everything on mount / when length changes
  useEffect(() => {
    const areaState = Object.fromEntries((storageAreas || []).map((a) => [a.id, true]));
    const catState = Object.fromEntries(
      (storageAreas || []).flatMap((a) => (a.categories || []).map((c) => [c.id, true]))
    );
    setExpandedAreas(areaState);
    setExpandedCategories(catState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageAreas?.length]);

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

  // ---------- Storage Area CRUD ----------
  const handleAddStorageArea = async () => {
    if (!newStorageName.trim()) return;
    const result = await addStorageArea(locationId, newStorageName.trim());
    if (result?.data) {
      setStorageAreas((prev) => [...prev, { ...result.data, categories: [] }]);
      setNewStorageName('');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) return;
    const result = await updateStorageArea(id, editingName.trim());
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name: editingName.trim() } : a))
      );
      setEditingId(null);
      setEditingName('');
    }
  };

  const performDeleteStorageArea = async (id) => {
    const result = await deleteStorageArea(id);
    if (!result?.error) {
      setStorageAreas((prev) => prev.filter((a) => a.id !== id));
    } else {
      console.error('deleteStorageArea error:', result.error);
    }
  };

  // ---------- Category CRUD ----------
  const handleAddCategory = async (storageAreaId) => {
    const name = (newCategoryName[storageAreaId] || '').trim();
    if (!name) return;

    const result = await addCategory(storageAreaId, name);
    if (result?.error) {
      console.error('addCategory error:', result.error);
      alert(result.error.message || 'Failed to add category');
      return;
    }

    if (result?.data) {
      setStorageAreas((prev) =>
        prev.map((a) =>
          a.id === storageAreaId
            ? { ...a, categories: [...(a.categories || []), result.data] }
            : a
        )
      );
      setNewCategoryName((prev) => ({ ...prev, [storageAreaId]: '' }));
      setExpandedCategories((prev) => ({ ...prev, [result.data.id]: true }));
    }
  };

  const handleUpdateCategory = async (categoryId, storageAreaId) => {
    const name = (editingCategoryName[categoryId] || '').trim();
    if (!name) return;
    const result = await updateCategoryName(categoryId, name);
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((a) =>
          a.id === storageAreaId
            ? {
                ...a,
                categories: a.categories.map((c) =>
                  c.id === categoryId ? { ...c, name } : c
                ),
              }
            : a
        )
      );
      setEditingCategoryName((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    }
  };

  const performDeleteCategory = async (categoryId, storageAreaId) => {
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
    } else {
      console.error('deleteCategory error:', result.error);
    }
  };

  // ---------- Item CRUD ----------
  const handleAddItem = async (categoryId) => {
    const item = newItemData[categoryId];
    if (!item?.name?.trim()) return;

    const payload = {
      name: item.name.trim(),
      quantity: toNonNegativeInteger(item.quantity, 0),
      expiration_date: item.expiration || null,
    };

    const { data: created, error } = await addItem(categoryId, payload);
    if (error) {
      console.error(error);
      return;
    }

    setStorageAreas((prev) =>
      prev.map((area) => ({
        ...area,
        categories: (area.categories || []).map((cat) =>
          cat.id === categoryId
            ? { ...cat, items: [...(cat.items || []), created] }
            : cat
        ),
      }))
    );

    setNewItemData((prev) => ({ ...prev, [categoryId]: {} }));
  };

  const handleUpdateItem = async (itemId, categoryId, storageAreaId, updated) => {
    const { data, error } = await updateItem(itemId, updated);
    if (error) {
      console.error(error);
      return;
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
                      items: cat.items.map((it) =>
                        it.id === itemId ? data : it
                      ),
                    }
                  : cat
              ),
            }
          : area
      )
    );

    setEditingItem((prev) => ({ ...prev, [itemId]: undefined }));
  };

  const performDeleteItem = async (itemId, categoryId, storageAreaId) => {
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
    } else {
      console.error('deleteItem error:', result.error);
    }
  };

  const performBulkDeleteItems = async (itemIds, categoryId, storageAreaId) => {
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
  };

  const handleConfirmDelete = async () => {
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
    setSelectedByCategory((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [itemId]: !prev[categoryId]?.[itemId],
      },
    }));
  };

  const selectAllInCategory = (category) => {
    const all = Object.fromEntries((category.items || []).map((i) => [i.id, true]));
    setSelectedByCategory((prev) => ({ ...prev, [category.id]: all }));
  };

  const clearSelectInCategory = (categoryId) => {
    setSelectedByCategory((prev) => ({ ...prev, [categoryId]: {} }));
  };

  // ---------- Move items logic ----------

  const openMoveModal = (areaId, categoryId, singleItemId = null) => {
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
    const {
      sourceAreaId,
      sourceCategoryId,
      targetLocationId,
      targetAreaId,
      targetCategoryId,
      itemIds,
    } = moveModal;

    if (!targetCategoryId || itemIds.length === 0) return;

    // 🔎 Find source area/category in current state
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

  // ---------- UI ----------
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 transition-all duration-150"
    >
      {/* Top: Title & Tools */}
      <motion.div
        variants={pageItemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-4 md:p-5 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stocksense-teal">
              Storage &amp; Inventory
            </h1>
            <p className="text-sm text-gray-500">
              Add areas, group items by categories, and keep tabs on what’s expiring.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories or items…"
                className="pl-9 pr-3 py-2 rounded-xl border border-stocksense-gray focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50 w-72 max-w-full"
              />
            </div>

            {/* Expiring filter */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
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

        {/* Stats + Add new area */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-gray-500 text-sm">Total for {locationName}:</p>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
              <strong>{totalAreas}</strong> {totalAreas === 1 ? 'Area' : 'Areas'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
              <strong>{totalCategories}</strong>{' '}
              {totalCategories === 1 ? 'Category' : 'Categories'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
              <strong>{totalItems}</strong> {totalItems === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          <button
            onClick={allAreasExpanded ? collapseAllAreas : expandAllAreas}
            className="rounded-xl border border-stocksense-gray px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer flex justify-between gap-2 items-center max-w-[150px] w-full"
          >
            {allAreasExpanded ? 'Collapse all Areas' : 'Expand all Areas'}
            <FaChevronUp
              className={`${
                allAreasExpanded ? '' : 'rotate-180'
              } transition-all duration-150 cursor-pointer`}
            />
          </button>
          <OpenGlobalAddItemButton
            context={{
              locationId,
            }}
          />
        </div>

        {/* Add area */}
        <div className="mt-4">
          <div className="flex gap-2 sm:gap-3">
            <input
              value={newStorageName}
              onChange={(e) => setNewStorageName(e.target.value)}
              placeholder="Add a new storage area (e.g., Pantry, Fridge, Garage shelf)"
              className="border border-stocksense-gray rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
            />
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddStorageArea}
              className="rounded-xl px-4 py-2 bg-gradient-to-br from-[#0E7488] to-[#0B5563] text-white shadow hover:brightness-110 cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 w-max">
                <FaPlus /> Add Storage
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Areas */}
      <motion.div variants={pageVariants} className="grid grid-cols-1 gap-4">
        {storageAreas.map((area, aIdx) => (
          <motion.div
            key={area.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: aIdx * 0.02 }}
            className="rounded-2xl border border-stocksense-gray bg-white shadow-sm"
          >
            {/* Area header */}
            <div className="p-4 md:p-5 flex items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {area.categories?.length ? (
                  <button
                    onClick={() => toggleArea(area.id)}
                    className="text-[#0E7488] rounded-lg p-1.5 hover:bg-[#E6FAF6] border border-transparent hover:border-[#9FE7D7]"
                    aria-label={expandedAreas[area.id] ? 'Collapse area' : 'Expand area'}
                  >
                    <FaChevronUp
                      className={`${
                        expandedAreas[area.id] ? '' : 'rotate-180'
                      } transition-all duration-150 cursor-pointer`}
                    />
                  </button>
                ) : null}

                {editingId === area.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="border border-stocksense-gray rounded-lg px-3 py-1.5 w-64 max-w-full focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                  />
                ) : (
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-stocksense-teal truncate">
                      {area.name}{' '}
                      <span className="text-sm text-gray-400 font-medium">(Area)</span>
                    </h2>
                    <p className="text-xs text-gray-500">
                      {area.categories?.length || 0}{' '}
                      {area.categories?.length === 1 ? 'category' : 'categories'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {editingId === area.id ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(area.id)}
                      className="text-emerald-600 cursor-pointer rounded-lg p-2 hover:bg-emerald-50"
                    >
                      <FaCheck />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-600 cursor-pointer rounded-lg p-2 hover:bg-gray-50"
                    >
                      <FaTimes />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(area.id);
                        setEditingName(area.name);
                      }}
                      className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
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
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Add category */}
            <div className="px-4 md:px-5 pb-4">
              <div className="flex gap-2">
                <input
                  value={newCategoryName[area.id] || ''}
                  onChange={(e) =>
                    setNewCategoryName({
                      ...newCategoryName,
                      [area.id]: e.target.value,
                    })
                  }
                  placeholder={`Add category in ${area.name} (e.g., Fruits, Tools, Cleaning)`}
                  className="border border-stocksense-gray rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                />
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAddCategory(area.id)}
                  className="rounded-xl px-3 py-2 bg-[#0E7488] text-white hover:bg-[#0B5563] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2 w-max">
                    <FaPlus /> Add Category
                  </span>
                </motion.button>
              </div>
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
                  <div className="px-4 md:px-5 pb-5 space-y-3">
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
                            className="rounded-xl border border-stocksense-gray bg-white shadow-sm"
                          >
                            {/* Category header */}
                            <div className="p-3 sm:p-4 flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {items.length ? (
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="text-[#0E7488] rounded-lg p-1 hover:bg-[#E6FAF6] border border-transparent hover:border-[#9FE7D7]"
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

                                {editingCategoryName[category.id] !== undefined ? (
                                  <input
                                    value={editingCategoryName[category.id]}
                                    onChange={(e) =>
                                      setEditingCategoryName({
                                        ...editingCategoryName,
                                        [category.id]: e.target.value,
                                      })
                                    }
                                    className="border border-stocksense-gray rounded-lg px-2.5 py-1.5 w-56 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                                  />
                                ) : (
                                  <div className="min-w-0">
                                    <h3 className="font-medium text-stocksense-teal truncate">
                                      {category.name}{' '}
                                      <span className="text-gray-400 text-sm">
                                        (Category)
                                      </span>
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      {items.length}{' '}
                                      {items.length === 1 ? 'item' : 'items'}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 shrink-0">
                                {editingCategoryName[category.id] !== undefined ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleUpdateCategory(category.id, area.id)
                                      }
                                      className="text-emerald-600 cursor-pointer rounded-lg p-2 hover:bg-emerald-50"
                                    >
                                      <FaCheck />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setEditingCategoryName({
                                          ...editingCategoryName,
                                          [category.id]: undefined,
                                        })
                                      }
                                      className="text-gray-600 cursor-pointer rounded-lg p-2 hover:bg-gray-50"
                                    >
                                      <FaTimes />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        setEditingCategoryName({
                                          ...editingCategoryName,
                                          [category.id]: category.name,
                                        })
                                      }
                                      className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
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
                                    >
                                      <FaTrash />
                                    </button>

                                  </>
                                )}
                              </div>
                            </div>

                            {/* Add item row */}
                            <div className="px-3 sm:px-4 pb-3">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  value={newItemData[category.id]?.name || ''}
                                  onChange={(e) =>
                                    setNewItemData({
                                      ...newItemData,
                                      [category.id]: {
                                        ...newItemData[category.id],
                                        name: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={`Add Item in ${category.name}`}
                                  className="border border-stocksense-gray rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={newItemData[category.id]?.quantity || ''}
                                  onChange={(e) =>
                                    setNewItemData({
                                      ...newItemData,
                                      [category.id]: {
                                        ...newItemData[category.id],
                                        quantity: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="Qty"
                                  className="border border-stocksense-gray rounded-lg px-3 py-2 w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                                />
                                <input
                                  type="date"
                                  value={newItemData[category.id]?.expiration || ''}
                                  onChange={(e) =>
                                    setNewItemData({
                                      ...newItemData,
                                      [category.id]: {
                                        ...newItemData[category.id],
                                        expiration: e.target.value,
                                      },
                                    })
                                  }
                                  className="border border-stocksense-gray rounded-lg px-3 py-2 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                                />
                                <motion.button
                                  whileHover={{ y: -1 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleAddItem(category.id)}
                                  className="rounded-lg px-3 py-2 bg-[#0E7488] text-white hover:bg-[#0B5563] cursor-pointer"
                                >
                                  <span className="inline-flex items-center gap-2 w-max">
                                    <FaPlus /> Add Item
                                  </span>
                                </motion.button>
                              </div>
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
                                  {items.length > 0 && (
                                    <div className="px-3 sm:px-4 flex flex-wrap items-center text-sm h-[34px] mb-2 gap-2">
                                      <h3 className='font-medium text-lg text-stocksense-teal truncate'>Items</h3>
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
                                            className="text-[#0E7488] border border-[#9FE7D7] bg-[#E6FAF6] hover:bg-[#d5f3ea] px-3 py-1.5 rounded-md cursor-pointer"
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
                                          className={`flex justify-between items-center border border-stocksense-gray rounded-xl px-3 py-2 bg-white ${
                                            selected ? 'ring-2 ring-rose-200' : ''
                                          }`}
                                        >
                                          {editingItem[item.id] !== undefined ? (
                                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                              <input
                                                value={editingItem[item.id].name}
                                                onChange={(e) =>
                                                  setEditingItem((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      ...prev[item.id],
                                                      name: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="border border-stocksense-gray rounded-lg px-2 py-1 w-full sm:w-1/3"
                                              />
                                              <input
                                                type="number"
                                                min="0"
                                                value={editingItem[item.id].quantity}
                                                onChange={(e) =>
                                                  setEditingItem((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      ...prev[item.id],
                                                      quantity: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="border border-stocksense-gray rounded-lg px-2 py-1 w-full sm:w-24"
                                              />
                                              <input
                                                type="date"
                                                value={
                                                  editingItem[item.id].expiration_date ||
                                                  ''
                                                }
                                                onChange={(e) =>
                                                  setEditingItem((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      ...prev[item.id],
                                                      expiration_date: e.target.value,
                                                    },
                                                  }))
                                                }
                                                className="border border-stocksense-gray rounded-lg px-2 py-1 w-full sm:w-48"
                                              />
                                              <div className="flex gap-2 items-center">
                                                <button
                                                  onClick={() => {
                                                    const e =
                                                      editingItem[item.id] || {};
                                                    const updated = {
                                                      name:
                                                        (e.name ?? '').trim() ||
                                                        item.name,
                                                      quantity:
                                                        toNonNegativeInteger(
                                                          e.quantity,
                                                          item.quantity ?? 0
                                                        ),
                                                      expiration_date:
                                                        e.expiration_date ??
                                                        item.expiration_date ??
                                                        null,
                                                    };
                                                    handleUpdateItem(
                                                      item.id,
                                                      category.id,
                                                      area.id,
                                                      updated
                                                    );
                                                  }}
                                                  className="text-emerald-600 cursor-pointer rounded-lg p-2 hover:bg-emerald-50"
                                                >
                                                  <FaCheck />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setEditingItem((prev) => ({
                                                      ...prev,
                                                      [item.id]: undefined,
                                                    }))
                                                  }
                                                  className="text-gray-600 cursor-pointer rounded-lg p-2 hover:bg-gray-50"
                                                >
                                                  <FaTimes />
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex items-start gap-3 min-w-0">
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
                                                <div className="min-w-0">
                                                  <p className="font-medium text-stocksense-teal truncate">
                                                    {item.name}
                                                    {soon && (
                                                      <span className="ml-2 text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                                        {daysUntil(
                                                          item.expiration_date
                                                        ) < 0
                                                          ? 'Expired'
                                                          : 'Soon'}
                                                      </span>
                                                    )}
                                                  </p>
                                                  <p className="text-sm text-gray-500 truncate">
                                                    Qty: {item.quantity} • Exp:{' '}
                                                    {item.expiration_date || '—'}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex gap-2 items-center shrink-0">
                                                {/* Move single item */}
                                                <button
                                                  onClick={() =>
                                                    openMoveModal(
                                                      area.id,
                                                      category.id,
                                                      item.id
                                                    )
                                                  }
                                                  className="text-[#0E7488] cursor-pointer rounded-lg p-2 hover:bg-[#E6FAF6]"
                                                  title="Move item to another category"
                                                >
                                                  <FaArrowsAlt />
                                                </button>

                                                <button
                                                  onClick={() =>
                                                    setEditingItem((prev) => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        name: item.name,
                                                        quantity: item.quantity,
                                                        expiration_date:
                                                          item.expiration_date ||
                                                          '',
                                                      },
                                                    }))
                                                  }
                                                  className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
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
                                                >
                                                  <FaTrash />
                                                </button>

                                              </div>
                                            </>
                                          )}
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

      <MoveItemsModal
        moveModal={moveModal}
        setMoveModal={setMoveModal}
        locationsForMove={locationsForMove}
        storageAreas={storageAreas}
        currentLocationId={locationId}
        onConfirm={handleConfirmMove}
      />

      {/* Reusable delete confirmation modal */}
      <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={deleteTitle}
        description={deleteDescription}
      />

    </motion.div>
  );
}
