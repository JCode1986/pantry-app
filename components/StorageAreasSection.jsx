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
} from '@/app/actions/server';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaChevronUp,
  FaSearch,
} from 'react-icons/fa';

const collapseVariants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  open: { height: 'auto', opacity: 1, transition: { duration: 0.25 } },
};

// --- small date helpers ---
const parseISO = (d) => (typeof d === 'string' ? new Date(`${d}T00:00:00`) : d ? new Date(d) : null);
const daysUntil = (d) => {
  const date = parseISO(d);
  if (!date) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
};
const isExpiringSoon = (d, withinDays) => daysUntil(d) <= withinDays;

export default function StorageAreasSection({ locationId, initialStorageAreas, locationName }) {
  const [storageAreas, setStorageAreas] = useState(initialStorageAreas);
  const [newStorageName, setNewStorageName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  console.log(initialStorageAreas, 'initialStorageAreas')

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
    for (const a of storageAreas) {
      for (const c of (a.categories || [])) n += (c.items?.length || 0);
    }
    return n;
  }, [storageAreas]);


  // ---------- Expand/Collapse helpers ----------
  const toggleArea = (id) => setExpandedAreas((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleCategory = (id) => setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  const expandAllAreas = () => setExpandedAreas(Object.fromEntries((storageAreas || []).map((a) => [a.id, true])));
  const collapseAllAreas = () => setExpandedAreas(Object.fromEntries((storageAreas || []).map((a) => [a.id, false])));
  const expandAllCategoriesInArea = (area) =>
    setExpandedCategories((prev) => ({ ...prev, ...Object.fromEntries((area.categories || []).map((c) => [c.id, true])) }));
  const collapseAllCategoriesInArea = (area) =>
    setExpandedCategories((prev) => ({ ...prev, ...Object.fromEntries((area.categories || []).map((c) => [c.id, false])) }));
  const allAreasExpanded =
    (storageAreas || []).length > 0 &&
    (storageAreas || []).every((a) => expandedAreas[a.id]);
  // const allCatsExpanded =
  //   (area.categories || []).length > 0 &&
  //   (area.categories || []).every((c) => expandedCategories[c.id]);



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
      setStorageAreas((prev) => prev.map((a) => (a.id === id ? { ...a, name: editingName.trim() } : a)));
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDeleteStorageArea = async (id) => {
    if (!confirm('Delete this storage area?')) return;
    const result = await deleteStorageArea(id);
    if (!result?.error) {
      setStorageAreas((prev) => prev.filter((a) => a.id !== id));
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
        prev.map((a) => (a.id === storageAreaId ? { ...a, categories: [...(a.categories || []), result.data] } : a))
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
            ? { ...a, categories: a.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)) }
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

  const handleDeleteCategory = async (categoryId, storageAreaId) => {
    if (!confirm('Delete this category?')) return;
    const result = await deleteCategory(categoryId);
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((a) => (a.id === storageAreaId ? { ...a, categories: a.categories.filter((c) => c.id !== categoryId) } : a))
      );
    }
  };

  // ---------- Item CRUD ----------
  const handleAddItem = async (categoryId) => {
    const item = newItemData[categoryId];
    if (!item?.name?.trim()) return;

    const payload = {
      name: item.name.trim(),
      quantity: Number.isFinite(+item.quantity) ? parseInt(String(item.quantity), 10) : 0,
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
        categories: (area.categories || []).map((cat) => (cat.id === categoryId ? { ...cat, items: [...(cat.items || []), created] } : cat)),
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
                cat.id === categoryId ? { ...cat, items: cat.items.map((it) => (it.id === itemId ? data : it)) } : cat
              ),
            }
          : area
      )
    );

    setEditingItem((prev) => ({ ...prev, [itemId]: undefined }));
  };

  const handleDeleteItem = async (itemId, categoryId, storageAreaId) => {
    const result = await deleteItem(itemId);
    if (!result?.error) {
      setStorageAreas((prev) =>
        prev.map((area) =>
          area.id === storageAreaId
            ? {
                ...area,
                categories: area.categories.map((cat) => (cat.id === categoryId ? { ...cat, items: cat.items.filter((it) => it.id !== itemId) } : cat)),
              }
            : area
        )
      );
    }
  };

  // bulk delete for a category
  const handleBulkDelete = async (categoryId, storageAreaId) => {
    const selectedMap = selectedByCategory[categoryId] || {};
    const ids = Object.keys(selectedMap).filter((k) => selectedMap[k]);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected item${ids.length > 1 ? 's' : ''}?`)) return;

    for (const id of ids) await deleteItem(id);

    setStorageAreas((prev) =>
      prev.map((area) =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map((cat) => (cat.id === categoryId ? { ...cat, items: (cat.items || []).filter((i) => !selectedMap[i.id]) } : cat)),
            }
          : area
      )
    );

    setSelectedByCategory((prev) => ({ ...prev, [categoryId]: {} }));
  };

  const toggleSelectItem = (categoryId, itemId) => {
    setSelectedByCategory((prev) => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || {}), [itemId]: !prev[categoryId]?.[itemId] },
    }));
  };

  const selectAllInCategory = (category) => {
    const all = Object.fromEntries((category.items || []).map((i) => [i.id, true]));
    setSelectedByCategory((prev) => ({ ...prev, [category.id]: all }));
  };

  const clearSelectInCategory = (categoryId) => {
    setSelectedByCategory((prev) => ({ ...prev, [categoryId]: {} }));
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
    return (category.items || []).some(filterItem);
  };

  // ---------- UI ----------
  return (
    <div className="space-y-6 transition-all duration-150">
      {/* Top: Title & Tools */}
      <div className="rounded-2xl border border-stocksense-gray bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stocksense-teal">Storage & Inventory</h1>
            <p className="text-sm text-gray-500">Add areas, group items by categories, and keep tabs on what’s expiring.</p>
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
                onChange={(e) => setExpDays(Math.max(1, parseInt(e.target.value || '7', 10)))}
                className={`border border-stocksense-gray rounded px-2 py-1 w-16 ${!expSoonEnabled && 'bg-gray-100 text-gray-400'}`}
                disabled={!expSoonEnabled}
              />
              <span className="text-sm">days</span>
            </div>
          </div>
        </div>

        {/* Stats + Add new area */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <p className='text-gray-500 text-sm'>Total for {locationName}:</p>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
              <strong>{totalAreas}</strong> {totalAreas === 1 ? 'Area' : 'Areas'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
              <strong>{totalCategories}</strong> {totalCategories === 1 ? 'Category' : 'Categories'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
              <strong>{totalItems}</strong> {totalItems === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          <button
            onClick={allAreasExpanded ? collapseAllAreas : expandAllAreas}
            className="rounded-xl border border-stocksense-gray px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer flex justify-between gap-2 items-center max-w-[142.06px] w-full"
          >
            {allAreasExpanded ? 'Collapse all Areas' : 'Expand all Areas'} <FaChevronUp className={`${allAreasExpanded ? '' : 'rotate-180'} transition-all duration-150 cursor-pointer`}/>
          </button>

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
              <span className="inline-flex items-center gap-2 w-max"><FaPlus /> Add Storage</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Areas */}
      <div className="grid grid-cols-1 gap-4">
        {storageAreas.map((area, aIdx) => (
          <motion.div
            key={area.id}
            // layout
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: aIdx * 0.02 }}
            className="rounded-2xl border border-stocksense-gray bg-white shadow-sm"
          >
            {/* Area header */}
            <div className="p-4 md:p-5 flex items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {
                  area.categories?.length ?
                  <button
                    onClick={() => toggleArea(area.id)}
                    className="text-[#0E7488] rounded-lg p-1.5 hover:bg-[#E6FAF6] border border-transparent hover:border-[#9FE7D7]"
                    aria-label={expandedAreas[area.id] ? 'Collapse area' : 'Expand area'}
                  >
                    <FaChevronUp className={`${expandedAreas[area.id] ? '' : 'rotate-180'} transition-all duration-150 cursor-pointer`}/>
                  </button>
                  :
                  null
                }

                {editingId === area.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="border border-stocksense-gray rounded-lg px-3 py-1.5 w-64 max-w-full focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                  />
                ) : (
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-stocksense-teal truncate">{area.name} <span className='text-sm text-gray-400 font-medium'>(Area)</span></h2>
                    <p className="text-xs text-gray-500">
                      {(area.categories?.length || 0)} {(area.categories?.length || 0) === 1 ? 'category' : 'categories'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {editingId === area.id ? (
                  <>
                    <button onClick={() => handleSaveEdit(area.id)} className="text-emerald-600 cursor-pointer rounded-lg p-2 hover:bg-emerald-50">
                      <FaCheck />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-600 cursor-pointer rounded-lg p-2 hover:bg-gray-50">
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
                      onClick={() => handleDeleteStorageArea(area.id)}
                      className="text-rose-600 cursor-pointer rounded-lg p-2 hover:bg-rose-50"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
                {/* <button
                  onClick={() => expandAllCategoriesInArea(area)}
                  className="rounded-lg border border-stocksense-gray px-2.5 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Expand categories
                </button>
                <button
                  onClick={() => collapseAllCategoriesInArea(area)}
                  className="rounded-lg border border-stocksense-gray px-2.5 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Collapse categories
                </button> */}
                {/* <button
                  onClick={() =>
                    allCatsExpanded
                      ? collapseAllCategoriesInArea(area)
                      : expandAllCategoriesInArea(area)
                  }
                  className="rounded-lg border border-stocksense-gray px-2.5 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                >
                  {allCatsExpanded ? 'Collapse categories' : 'Expand categories'}
                </button> */}

              </div>
            </div>

            {/* Add category */}
            <div className="px-4 md:px-5 pb-4">
              <div className="flex gap-2">
                <input
                  value={newCategoryName[area.id] || ''}
                  onChange={(e) => setNewCategoryName({ ...newCategoryName, [area.id]: e.target.value })}
                  placeholder={`Add category in ${area.name} (e.g., Fruits, Tools, Cleaning)`}
                  className="border border-stocksense-gray rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                />
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAddCategory(area.id)}
                  className="rounded-xl px-3 py-2 bg-[#0E7488] text-white hover:bg-[#0B5563] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2 w-max"><FaPlus /> Add Category</span>
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
                        const allSelected = items.length > 0 && selectedCount === items.length;

                        return (
                          <motion.div
                            key={category.id}
                            // layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: cIdx * 0.02 }}
                            className="rounded-xl border border-stocksense-gray bg-white shadow-sm"
                          >
                            {/* Category header */}
                            <div className="p-3 sm:p-4 flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {
                                  items.length ?
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="text-[#0E7488] rounded-lg p-1 hover:bg-[#E6FAF6] border border-transparent hover:border-[#9FE7D7]"
                                    aria-label={expandedCategories[category.id] ? 'Collapse category' : 'Expand category'}
                                  >
                                    <FaChevronUp className={`${expandedCategories[category.id] ? '' : 'rotate-180'} transition-all duration-150 cursor-pointer`}/>
                                  </button>
                                  :
                                  null
                                }

                                {editingCategoryName[category.id] !== undefined ? (
                                  <input
                                    value={editingCategoryName[category.id]}
                                    onChange={(e) => setEditingCategoryName({ ...editingCategoryName, [category.id]: e.target.value })}
                                    className="border border-stocksense-gray rounded-lg px-2.5 py-1.5 w-56 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
                                  />
                                ) : (
                                  <div className="min-w-0">
                                    <h3 className="font-medium text-stocksense-teal truncate">{category.name} <span className='text-gray-400 text-sm'>(Category)</span></h3>
                                    <p className="text-xs text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 shrink-0">
                                {editingCategoryName[category.id] !== undefined ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateCategory(category.id, area.id)}
                                      className="text-emerald-600 cursor-pointer rounded-lg p-2 hover:bg-emerald-50"
                                    >
                                      <FaCheck />
                                    </button>
                                    <button
                                      onClick={() => setEditingCategoryName({ ...editingCategoryName, [category.id]: undefined })}
                                      className="text-gray-600 cursor-pointer rounded-lg p-2 hover:bg-gray-50"
                                    >
                                      <FaTimes />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setEditingCategoryName({ ...editingCategoryName, [category.id]: category.name })}
                                      className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCategory(category.id, area.id)}
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
                                      [category.id]: { ...newItemData[category.id], name: e.target.value },
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
                                      [category.id]: { ...newItemData[category.id], quantity: e.target.value },
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
                                      [category.id]: { ...newItemData[category.id], expiration: e.target.value },
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
                                  <span className="inline-flex items-center gap-2 w-max"><FaPlus /> Add Item</span>
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
                                  className="overflow-hidden pl-8"
                                >
                                  {items.length > 0 && (
                                    <div className="px-3 sm:px-4 flex flex-wrap items-center text-sm h-[34px] mb-2 gap-2">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className='cursor-pointer'
                                          checked={allSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) selectAllInCategory({ ...category, items });
                                            else clearSelectInCategory(category.id);
                                          }}
                                        />
                                        Select all Items
                                      </label>
                                      {Object.values(selectedByCategory[category.id] || {}).some(Boolean) && (
                                        <button
                                          onClick={() => handleBulkDelete(category.id, area.id)}
                                          className="text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md cursor-pointer"
                                        >
                                          Delete selected items ({Object.values(selectedByCategory[category.id]).filter(Boolean).length})
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  <div className={`${items.length && 'pb-4 '} px-3 sm:px-4 space-y-2`}>
                                    {items.map((item, iIdx) => {
                                      const soon = isExpiringSoon(item.expiration_date, expDays);
                                      const selected = !!(selectedByCategory[category.id]?.[item.id]);

                                      return (
                                        <motion.div
                                          key={item.id}
                                          // layout
                                          initial={{ opacity: 0, y: 6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.18, delay: iIdx * 0.015 }}
                                          className={`flex justify-between items-center border border-stocksense-gray rounded-xl px-3 py-2 bg-white ${selected ? 'ring-2 ring-rose-200' : ''}`}
                                        >
                                          {editingItem[item.id] !== undefined ? (
                                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                              <input
                                                value={editingItem[item.id].name}
                                                onChange={(e) =>
                                                  setEditingItem((prev) => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], name: e.target.value },
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
                                                    [item.id]: { ...prev[item.id], quantity: e.target.value },
                                                  }))
                                                }
                                                className="border border-stocksense-gray rounded-lg px-2 py-1 w-full sm:w-24"
                                              />
                                              <input
                                                type="date"
                                                value={editingItem[item.id].expiration_date || ''}
                                                onChange={(e) =>
                                                  setEditingItem((prev) => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], expiration_date: e.target.value },
                                                  }))
                                                }
                                                className="border border-stocksense-gray rounded-lg px-2 py-1 w-full sm:w-48"
                                              />
                                              <div className="flex gap-2 items-center">
                                                <button
                                                  onClick={() => {
                                                    const e = editingItem[item.id] || {};
                                                    const updated = {
                                                      name: (e.name ?? '').trim() || item.name,
                                                      quantity: Number.isFinite(+e.quantity) ? parseInt(String(e.quantity), 10) : (item.quantity ?? 0),
                                                      expiration_date: e.expiration_date ?? item.expiration_date ?? null,
                                                    };
                                                    handleUpdateItem(item.id, category.id, area.id, updated);
                                                  }}
                                                  className="text-emerald-600 cursor-pointer rounded-lg p-2 hover:bg-emerald-50"
                                                >
                                                  <FaCheck />
                                                </button>
                                                <button
                                                  onClick={() => setEditingItem((prev) => ({ ...prev, [item.id]: undefined }))}
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
                                                  onChange={() => toggleSelectItem(category.id, item.id)}
                                                  className="mt-1"
                                                />
                                                <div className="min-w-0">
                                                  <p className="font-medium text-stocksense-teal truncate">
                                                    {item.name}
                                                    {soon && (
                                                      <span className="ml-2 text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                                        {daysUntil(item.expiration_date) < 0 ? 'Expired' : 'Soon'}
                                                      </span>
                                                    )}
                                                  </p>
                                                  <p className="text-sm text-gray-500 truncate">
                                                    Qty: {item.quantity} • Exp: {item.expiration_date || '—'}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex gap-2 items-center shrink-0">
                                                <button
                                                  onClick={() =>
                                                    setEditingItem((prev) => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        name: item.name,
                                                        quantity: item.quantity,
                                                        expiration_date: item.expiration_date || '',
                                                      },
                                                    }))
                                                  }
                                                  className="text-amber-600 cursor-pointer rounded-lg p-2 hover:bg-amber-50"
                                                >
                                                  <FaEdit />
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    if (!confirm('Delete this item?')) return;
                                                    await handleDeleteItem(item.id, category.id, area.id);
                                                  }}
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
      </div>
    </div>
  );
}

