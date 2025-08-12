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
  deleteItem
} from '@/app/actions/server';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

const collapseVariants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.18 } },
  open: { height: 'auto', opacity: 1, transition: { duration: 0.22 } },
};

// --- small date helpers ---
const parseISO = (d) => (typeof d === 'string' ? new Date(`${d}T00:00:00`) : d ? new Date(d) : null);
const daysUntil = (d) => {
  const date = parseISO(d);
  if (!date) return Infinity;
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = (date - now) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
};
const isExpiringSoon = (d, withinDays) => daysUntil(d) <= withinDays;

export default function StorageAreasSection({ locationId, initialStorageAreas }) {
  const [storageAreas, setStorageAreas] = useState(initialStorageAreas);
  const [newStorageName, setNewStorageName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const [newCategoryName, setNewCategoryName] = useState({});
  const [editingCategoryName, setEditingCategoryName] = useState({});

  const [newItemData, setNewItemData] = useState({});
  const [editingItem, setEditingItem] = useState({}); // { [itemId]: {name, quantity, expiration_date} }

  const [expandedAreas, setExpandedAreas] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  // bulk-select state: { [categoryId]: { [itemId]: true } }
  const [selectedByCategory, setSelectedByCategory] = useState({});

  // filters
  const [search, setSearch] = useState('');
  const [expSoonEnabled, setExpSoonEnabled] = useState(false);
  const [expDays, setExpDays] = useState(7);

  // initialize expanded for everything on mount / when length changes
  useEffect(() => {
    const areaState = Object.fromEntries((storageAreas || []).map(a => [a.id, true]));
    const catState = Object.fromEntries(
      (storageAreas || []).flatMap(a => (a.categories || []).map(c => [c.id, true]))
    );
    setExpandedAreas(areaState);
    setExpandedCategories(catState);
  }, [storageAreas?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalAreas = storageAreas?.length || 0;
  const totalCategories = useMemo(
    () => (storageAreas || []).reduce((sum, a) => sum + (a.categories?.length || 0), 0),
    [storageAreas]
  );

  // ---------- Expand/Collapse helpers ----------
  const toggleArea = (id) => setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCategory = (id) => setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  const expandAllAreas = () =>
    setExpandedAreas(Object.fromEntries((storageAreas || []).map(a => [a.id, true])));
  const collapseAllAreas = () =>
    setExpandedAreas(Object.fromEntries((storageAreas || []).map(a => [a.id, false])));
  const expandAllCategoriesInArea = (area) =>
    setExpandedCategories(prev => ({ ...prev, ...Object.fromEntries((area.categories || []).map(c => [c.id, true])) }));
  const collapseAllCategoriesInArea = (area) =>
    setExpandedCategories(prev => ({ ...prev, ...Object.fromEntries((area.categories || []).map(c => [c.id, false])) }));

  // ---------- Storage Area CRUD ----------
  const handleAddStorageArea = async () => {
    if (!newStorageName.trim()) return;
    const result = await addStorageArea(locationId, newStorageName.trim());
    if (result?.data) {
      setStorageAreas(prev => [...prev, { ...result.data, categories: [] }]);
      setNewStorageName('');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) return;
    const result = await updateStorageArea(id, editingName.trim());
    if (!result?.error) {
      setStorageAreas(prev => prev.map(a => (a.id === id ? { ...a, name: editingName.trim() } : a)));
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDeleteStorageArea = async (id) => {
    if (!confirm('Delete this storage area?')) return;
    const result = await deleteStorageArea(id);
    if (!result?.error) {
      setStorageAreas(prev => prev.filter(a => a.id !== id));
    }
  };

  // ---------- Category CRUD ----------
  const handleAddCategory = async (storageAreaId) => {
    const name = newCategoryName[storageAreaId]?.trim();
    if (!name) return;
    const result = await addCategory(storageAreaId, name);
    if (result?.data) {
      setStorageAreas(prev =>
        prev.map(a =>
          a.id === storageAreaId
            ? { ...a, categories: [ ...(a.categories || []), result.data ] }
            : a
        )
      );
      setNewCategoryName(prev => ({ ...prev, [storageAreaId]: '' }));
      setExpandedCategories(prev => ({ ...prev, [result.data.id]: true }));
    }
  };

  const handleUpdateCategory = async (categoryId, storageAreaId) => {
    const name = editingCategoryName[categoryId]?.trim();
    if (!name) return;
    const result = await updateCategoryName(categoryId, name);
    if (!result?.error) {
      setStorageAreas(prev =>
        prev.map(a =>
          a.id === storageAreaId
            ? {
                ...a,
                categories: a.categories.map(c => (c.id === categoryId ? { ...c, name } : c)),
              }
            : a
        )
      );
      setEditingCategoryName(prev => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    }
  };

  const handleDeleteCategory = async (categoryId, storageAreaId) => {
    if (!confirm('Delete this category?')) return;
    const result = await deleteCategory(categoryId);
    if (!result?.error) {
      setStorageAreas(prev =>
        prev.map(a =>
          a.id === storageAreaId
            ? { ...a, categories: a.categories.filter(c => c.id !== categoryId) }
            : a
        )
      );
    }
  };

  // ---------- Item CRUD ----------
  const handleAddItem = async (categoryId) => {
    const item = newItemData[categoryId];
    if (!item?.name?.trim()) return;

    const payload = {
      name: item.name.trim(),
      quantity: Number.isFinite(+item.quantity) ? parseInt(item.quantity, 10) : 0,
      expiration_date: item.expiration || null,
    };

    const { data: created, error } = await addItem(categoryId, payload);
    if (error) {
      console.error(error);
      return;
    }

    setStorageAreas(prev =>
      prev.map(area => ({
        ...area,
        categories: (area.categories || []).map(cat =>
          cat.id === categoryId
            ? { ...cat, items: [ ...(cat.items || []), created ] }
            : cat
        ),
      }))
    );

    setNewItemData(prev => ({ ...prev, [categoryId]: {} }));
  };

  const handleUpdateItem = async (itemId, categoryId, storageAreaId, updatedFields) => {
    const result = await updateItem(itemId, updatedFields);
    if (!result?.error) {
      setStorageAreas(prev =>
        prev.map(area =>
          area.id === storageAreaId
            ? {
                ...area,
                categories: area.categories.map(cat =>
                  cat.id === categoryId
                    ? {
                        ...cat,
                        items: cat.items.map(it => (it.id === itemId ? { ...it, ...updatedFields } : it)),
                      }
                    : cat
                ),
              }
            : area
        )
      );
      setEditingItem(prev => ({ ...prev, [itemId]: undefined }));
    }
  };

  const handleDeleteItem = async (itemId, categoryId, storageAreaId) => {
    const result = await deleteItem(itemId);
    if (!result?.error) {
      setStorageAreas(prev =>
        prev.map(area =>
          area.id === storageAreaId
            ? {
                ...area,
                categories: area.categories.map(cat =>
                  cat.id === categoryId
                    ? { ...cat, items: cat.items.filter(it => it.id !== itemId) }
                    : cat
                ),
              }
            : area
        )
      );
    }
  };

  // bulk delete for a category
  const handleBulkDelete = async (categoryId, storageAreaId) => {
    const selectedMap = selectedByCategory[categoryId] || {};
    const ids = Object.keys(selectedMap).filter(k => selectedMap[k]);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected item${ids.length > 1 ? 's' : ''}?`)) return;

    // best-effort: delete sequentially to bubble any error
    for (const id of ids) {
      await deleteItem(id);
    }

    // update UI
    setStorageAreas(prev =>
      prev.map(area =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map(cat =>
                cat.id === categoryId
                  ? { ...cat, items: (cat.items || []).filter(i => !selectedMap[i.id]) }
                  : cat
              ),
            }
          : area
      )
    );

    // clear selection for that category
    setSelectedByCategory(prev => ({ ...prev, [categoryId]: {} }));
  };

  const toggleSelectItem = (categoryId, itemId) => {
    setSelectedByCategory(prev => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || {}), [itemId]: !(prev[categoryId]?.[itemId]) },
    }));
  };

  const selectAllInCategory = (category) => {
    const all = Object.fromEntries((category.items || []).map(i => [i.id, true]));
    setSelectedByCategory(prev => ({ ...prev, [category.id]: all }));
  };

  const clearSelectInCategory = (categoryId) => {
    setSelectedByCategory(prev => ({ ...prev, [categoryId]: {} }));
  };

  // ---------- Filtering ----------
  const normalizedSearch = search.trim().toLowerCase();
  const filterItem = (item) => {
    const nameOk = !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch);
    const expOk = !expSoonEnabled || isExpiringSoon(item.expiration_date, expDays);
    return nameOk && expOk;
  };
  const filterCategoryVisible = (category) => {
    const nameMatch = !normalizedSearch || category.name.toLowerCase().includes(normalizedSearch);
    if (nameMatch) return true;
    // if category name doesn't match, show if any item matches
    return (category.items || []).some(filterItem);
  };

  // ---------- UI ----------
  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{totalAreas}</span> storage {totalAreas === 1 ? 'area' : 'areas'} •{' '}
          <span className="font-medium">{totalCategories}</span> categories
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories or items…"
              className="border rounded-lg px-3 py-2 w-72 max-w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-gray-600 text-sm px-2 py-1 rounded hover:bg-gray-100"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={expSoonEnabled}
                onChange={() => setExpSoonEnabled(v => !v)}
              />
              Expiring ≤
            </label>
            <input
              type="number"
              min={1}
              value={expDays}
              onChange={(e) => setExpDays(Math.max(1, parseInt(e.target.value || '7', 10)))}
              className="border rounded px-2 py-1 w-16"
              disabled={!expSoonEnabled}
            />
            <span className="text-sm">days</span>
            {expSoonEnabled && (
              <button
                onClick={() => { setExpSoonEnabled(false); setExpDays(7); }}
                className="text-gray-600 text-sm px-2 py-1 rounded hover:bg-gray-100"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Storage Area */}
      <div className="flex gap-2 justify-between">
        <div className='flex gap-3 max-w-[700px] w-full'>
          <input
            value={newStorageName}
            onChange={(e) => setNewStorageName(e.target.value)}
            placeholder="New storage area (e.g., Pantry, Fridge, Garage shelf, Aisle #)"
            className="border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
          />
          <button
            onClick={handleAddStorageArea}
            className="bg-blue-600 max-w-[100px] w-full text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-[0.99] transition"
          >
            <FaPlus className="inline mr-1" /> Add
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={expandAllAreas}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Expand all areas
          </button>
          <button
            onClick={collapseAllAreas}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Collapse all areas
          </button>
        </div>
      </div>

      {/* Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {storageAreas.map((area) => (
          <motion.div
            key={area.id}
            layout
            className="rounded-2xl border bg-white shadow-sm p-4"
          >
            {/* Area header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleArea(area.id)}
                  className="text-blue-600 rounded-md p-1 hover:bg-blue-50"
                >
                  {expandedAreas[area.id] ? <FaChevronUp /> : <FaChevronDown />}
                </button>

                {editingId === area.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="border px-2 py-1 rounded-md w-56 sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold">{area.name}</h2>
                    <p className="text-xs text-gray-500">
                      {area.categories?.length || 0} {area.categories?.length === 1 ? 'category' : 'categories'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {editingId === area.id ? (
                  <>
                    <button onClick={() => handleSaveEdit(area.id)} className="text-green-600 rounded p-2 hover:bg-green-50">
                      <FaCheck />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-600 rounded p-2 hover:bg-gray-50">
                      <FaTimes />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingId(area.id); setEditingName(area.name); }}
                      className="text-yellow-600 rounded p-2 hover:bg-yellow-50"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteStorageArea(area.id)}
                      className="text-red-600 rounded p-2 hover:bg-red-50"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
                <button
                  onClick={() => expandAllCategoriesInArea(area)}
                  className="rounded-lg border px-2 py-1.5 text-xs hover:bg-gray-50"
                >
                  Expand cats
                </button>
                <button
                  onClick={() => collapseAllCategoriesInArea(area)}
                  className="rounded-lg border px-2 py-1.5 text-xs hover:bg-gray-50"
                >
                  Collapse cats
                </button>
              </div>
            </div>

            {/* Add category */}
            <div className="mt-3 flex gap-2">
              <input
                value={newCategoryName[area.id] || ''}
                onChange={(e) => setNewCategoryName({ ...newCategoryName, [area.id]: e.target.value })}
                placeholder="New category (e.g., Fruits, Tools, Cleaning…)"
                className="border px-3 py-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <button
                onClick={() => handleAddCategory(area.id)}
                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 active:scale-[0.99] transition"
              >
                <FaPlus />
              </button>
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
                  <div className="mt-4 space-y-3">
                    {(area.categories || [])
                      .filter(filterCategoryVisible)
                      .map((category) => {
                        const items = (category.items || []).filter(filterItem);
                        const selMap = selectedByCategory[category.id] || {};
                        const selectedCount = Object.values(selMap).filter(Boolean).length;
                        const allSelected = items.length > 0 && selectedCount === items.length;

                        return (
                          <motion.div key={category.id} layout className="rounded-xl border p-3">
                            {/* Category header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleCategory(category.id)}
                                  className="text-blue-600 rounded-md p-1 hover:bg-blue-50"
                                >
                                  {expandedCategories[category.id] ? <FaChevronUp /> : <FaChevronDown />}
                                </button>

                                {editingCategoryName[category.id] !== undefined ? (
                                  <input
                                    value={editingCategoryName[category.id]}
                                    onChange={(e) =>
                                      setEditingCategoryName({ ...editingCategoryName, [category.id]: e.target.value })
                                    }
                                    className="border px-2 py-1 rounded-md w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                ) : (
                                  <div>
                                    <h3 className="font-medium flex items-center gap-2">
                                      {category.name}
                                      {/* Show “expiring soon” badge if any item expiring in window */}
                                      {expSoonEnabled && items.some(i => isExpiringSoon(i.expiration_date, expDays)) && (
                                        <span className="text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                          Expiring soon
                                        </span>
                                      )}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      {items.length} {items.length === 1 ? 'item' : 'items'}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {editingCategoryName[category.id] !== undefined ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateCategory(category.id, area.id)}
                                      className="text-green-600 rounded p-2 hover:bg-green-50"
                                    >
                                      <FaCheck />
                                    </button>
                                    <button
                                      onClick={() => setEditingCategoryName({ ...editingCategoryName, [category.id]: undefined })}
                                      className="text-gray-600 rounded p-2 hover:bg-gray-50"
                                    >
                                      <FaTimes />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setEditingCategoryName({ ...editingCategoryName, [category.id]: category.name })}
                                      className="text-yellow-600 rounded p-2 hover:bg-yellow-50"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCategory(category.id, area.id)}
                                      className="text-red-600 rounded p-2 hover:bg-red-50"
                                    >
                                      <FaTrash />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Add item row */}
                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                              <input
                                value={newItemData[category.id]?.name || ''}
                                onChange={(e) =>
                                  setNewItemData({
                                    ...newItemData,
                                    [category.id]: { ...newItemData[category.id], name: e.target.value },
                                  })
                                }
                                placeholder="Item name"
                                className="border px-3 py-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-300"
                              />
                              <input
                                type="number"
                                min="0"
                                value={newItemData[category.id]?.quantity || ''}
                                onChange={(e) =>
                                  setNewItemData({
                                    ...newItemData,
                                    [category.id]: { ...newItemData[category.id], quantity: e.target.value },
                                  })
                                }
                                placeholder="Qty"
                                className="border px-3 py-2 rounded-md w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-green-300"
                              />
                              <input
                                type="date"
                                value={newItemData[category.id]?.expiration || ''}
                                onChange={(e) =>
                                  setNewItemData({
                                    ...newItemData,
                                    [category.id]: { ...newItemData[category.id], expiration: e.target.value },
                                  })
                                }
                                className="border px-3 py-2 rounded-md w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-green-300"
                              />
                              <button
                                onClick={() => handleAddItem(category.id)}
                                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 active:scale-[0.99] transition"
                              >
                                <FaPlus />
                              </button>
                            </div>

                            {/* Bulk controls */}
                            {items.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) selectAllInCategory({ ...category, items });
                                      else clearSelectInCategory(category.id);
                                    }}
                                  />
                                  Select all
                                </label>
                                {Object.values(selectedByCategory[category.id] || {}).some(Boolean) && (
                                  <button
                                    onClick={() => handleBulkDelete(category.id, area.id)}
                                    className="text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md"
                                  >
                                    Delete selected ({Object.values(selectedByCategory[category.id]).filter(Boolean).length})
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Items list (collapsible) */}
                            <AnimatePresence initial={false}>
                              {expandedCategories[category.id] && (
                                <motion.div
                                  key={`${category.id}-items`}
                                  variants={collapseVariants}
                                  initial="collapsed"
                                  animate="open"
                                  exit="collapsed"
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 space-y-2">
                                    {items.map((item) => {
                                      const soon = isExpiringSoon(item.expiration_date, expDays);
                                      const selected = !!(selectedByCategory[category.id]?.[item.id]);

                                      return (
                                        <motion.div
                                          key={item.id}
                                          layout
                                          className={`flex justify-between items-center border rounded-lg px-3 py-2 ${selected ? 'ring-2 ring-red-200' : ''}`}
                                        >
                                          {editingItem[item.id] !== undefined ? (
                                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                              <input
                                                value={editingItem[item.id].name}
                                                onChange={(e) =>
                                                  setEditingItem(prev => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], name: e.target.value },
                                                  }))
                                                }
                                                className="border px-2 py-1 rounded-md w-full sm:w-1/3"
                                              />
                                              <input
                                                type="number"
                                                min="0"
                                                value={editingItem[item.id].quantity}
                                                onChange={(e) =>
                                                  setEditingItem(prev => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], quantity: e.target.value },
                                                  }))
                                                }
                                                className="border px-2 py-1 rounded-md w-full sm:w-24"
                                              />
                                              <input
                                                type="date"
                                                value={editingItem[item.id].expiration_date || ''}
                                                onChange={(e) =>
                                                  setEditingItem(prev => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], expiration_date: e.target.value },
                                                  }))
                                                }
                                                className="border px-2 py-1 rounded-md w-full sm:w-48"
                                              />
                                              <div className="flex gap-2 items-center">
                                                <button
                                                  onClick={() =>
                                                    handleUpdateItem(item.id, category.id, area.id, editingItem[item.id])
                                                  }
                                                  className="text-green-600 rounded p-2 hover:bg-green-50"
                                                >
                                                  <FaCheck />
                                                </button>
                                                <button
                                                  onClick={() => setEditingItem(prev => ({ ...prev, [item.id]: undefined }))}
                                                  className="text-gray-600 rounded p-2 hover:bg-gray-50"
                                                >
                                                  <FaTimes />
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex items-start gap-3">
                                                <input
                                                  type="checkbox"
                                                  checked={selected}
                                                  onChange={() => toggleSelectItem(category.id, item.id)}
                                                  className="mt-1"
                                                />
                                                <div>
                                                  <p className="font-medium flex items-center gap-2">
                                                    {item.name}
                                                    {soon && (
                                                      <span className="text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                                        {daysUntil(item.expiration_date) < 0 ? 'Expired' : 'Soon'}
                                                      </span>
                                                    )}
                                                  </p>
                                                  <p className="text-sm text-gray-500">
                                                    Qty: {item.quantity} • Exp: {item.expiration_date || '—'}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex gap-2 items-center">
                                                <button
                                                  onClick={() =>
                                                    setEditingItem(prev => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        name: item.name,
                                                        quantity: item.quantity,
                                                        expiration_date: item.expiration_date || '',
                                                      },
                                                    }))
                                                  }
                                                  className="text-yellow-600 rounded p-2 hover:bg-yellow-50"
                                                >
                                                  <FaEdit />
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    if (!confirm('Delete this item?')) return;
                                                    await handleDeleteItem(item.id, category.id, area.id);
                                                  }}
                                                  className="text-red-600 rounded p-2 hover:bg-red-50"
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
      </div>
    </div>
  );
}


