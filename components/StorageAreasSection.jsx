'use client';

import { useState } from 'react';
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

export default function StorageAreasSection({ locationId, initialStorageAreas }) {
  const [storageAreas, setStorageAreas] = useState(initialStorageAreas);
  const [newStorageName, setNewStorageName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const [newCategoryName, setNewCategoryName] = useState({});
  const [editingCategoryName, setEditingCategoryName] = useState({});

  const [newItemData, setNewItemData] = useState({});
  const [editingItemData, setEditingItemData] = useState({});

  const [expandedAreas, setExpandedAreas] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  const [editingItemName, setEditingItemName] = useState({});

  const toggleArea = (id) => {
    setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddStorageArea = async () => {
    if (!newStorageName.trim()) return;
    const result = await addStorageArea(locationId, newStorageName.trim());
    if (result?.data) {
      setStorageAreas([...storageAreas, { ...result.data, categories: [] }]);
      setNewStorageName('');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) return;
    const result = await updateStorageArea(id, editingName.trim());
    if (result?.data) {
      setStorageAreas(storageAreas.map(area =>
        area.id === id ? { ...area, name: editingName.trim() } : area
      ));
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDeleteStorageArea = async (id) => {
    if (!confirm('Delete this storage area?')) return;
    const result = await deleteStorageArea(id);
    if (!result?.error) {
      setStorageAreas(storageAreas.filter(area => area.id !== id));
    }
  };

  const handleAddCategory = async (storageAreaId) => {
    const name = newCategoryName[storageAreaId]?.trim();
    if (!name) return;
    const result = await addCategory(storageAreaId, name);
    if (result?.data) {
      setStorageAreas(storageAreas.map(area =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: [...(area.categories || []), result.data]
            }
          : area
      ));
      setNewCategoryName({ ...newCategoryName, [storageAreaId]: '' });
    }
  };

  const handleUpdateCategory = async (categoryId, storageAreaId) => {
    const name = editingCategoryName[categoryId]?.trim();
    if (!name) return;
    const result = await updateCategoryName(categoryId, name);
    if (result?.data) {
      setStorageAreas(storageAreas.map(area =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map(cat =>
                cat.id === categoryId ? { ...cat, name } : cat
              )
            }
          : area
      ));
      const updatedEditing = { ...editingCategoryName };
      delete updatedEditing[categoryId];
      setEditingCategoryName(updatedEditing);
    }
  };

  const handleDeleteCategory = async (categoryId, storageAreaId) => {
    if (!confirm('Delete this category?')) return;
    const result = await deleteCategory(categoryId);
    if (!result?.error) {
      setStorageAreas(storageAreas.map(area =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.filter(cat => cat.id !== categoryId)
            }
          : area
      ));
    }
  };

  const handleAddItem = async (categoryId) => {
    const item = newItemData[categoryId];
    if (!item?.name?.trim()) return;

    const result = await addItem(categoryId, {
      name: item.name.trim(),
      quantity: parseInt(item.quantity) || 0,
      expiration_date: item.expiration || null,
    });

    if (result?.data) {
      setStorageAreas(storageAreas.map(area => ({
        ...area,
        categories: area.categories.map(cat =>
          cat.id === categoryId
            ? { ...cat, items: [...(cat.items || []), result.data] }
            : cat
        )
      })));
      setNewItemData({ ...newItemData, [categoryId]: {} });
    }
  };

  const handleUpdateItem = async (itemId, categoryId, storageAreaId, updatedFields) => {
    const result = await updateItem(itemId, updatedFields);
    if (result?.data) {
      setStorageAreas(storageAreas.map(area =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map(cat =>
                cat.id === categoryId
                  ? {
                      ...cat,
                      items: cat.items.map(item =>
                        item.id === itemId ? { ...item, ...updatedFields } : item
                      ),
                    }
                  : cat
              ),
            }
          : area
      ));
      setEditingItemName({ ...editingItemName, [itemId]: undefined });
    }
  };

  const handleDeleteItem = async (itemId, categoryId, storageAreaId) => {
    if (!confirm('Delete this item?')) return;
    const result = await deleteItem(itemId);
    if (!result?.error) {
      setStorageAreas(storageAreas.map(area =>
        area.id === storageAreaId
          ? {
              ...area,
              categories: area.categories.map(cat =>
                cat.id === categoryId
                  ? {
                      ...cat,
                      items: cat.items.filter(item => item.id !== itemId)
                    }
                  : cat
              )
            }
          : area
      ));
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newStorageName}
          onChange={(e) => setNewStorageName(e.target.value)}
          placeholder="New Storage Area"
          className="border px-4 py-2 rounded w-full"
        />
        <button
          onClick={handleAddStorageArea}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <FaPlus className="inline mr-1" /> Add
        </button>
      </div>

      {storageAreas.map(area => (
        <div key={area.id} className="border rounded p-4 bg-white shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleArea(area.id)} className="text-blue-600">
                {expandedAreas[area.id] ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              {editingId === area.id ? (
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="border px-2 py-1 rounded w-full"
                />
              ) : (
                <h2 className="text-lg font-semibold">{area.name}</h2>
              )}
            </div>
            <div className="flex gap-2">
              {editingId === area.id ? (
                <>
                  <button onClick={() => handleSaveEdit(area.id)} className="text-green-600"><FaCheck /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-600"><FaTimes /></button>
                </>
              ) : (
                <>
                  <button onClick={() => {
                    setEditingId(area.id);
                    setEditingName(area.name);
                  }} className="text-yellow-600"><FaEdit /></button>
                  <button onClick={() => handleDeleteStorageArea(area.id)} className="text-red-600"><FaTrash /></button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <input
              value={newCategoryName[area.id] || ''}
              onChange={(e) => setNewCategoryName({ ...newCategoryName, [area.id]: e.target.value })}
              placeholder="New Category Name"
              className="border px-3 py-2 rounded w-full"
            />
            <button onClick={() => handleAddCategory(area.id)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              <FaPlus />
            </button>
          </div>

          {expandedAreas[area.id] && (
            <div className="pl-4 space-y-2">
              {(area.categories || []).map(category => (
                <div key={category.id} className="border rounded px-3 py-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleCategory(category.id)} className="text-blue-600">
                        {expandedCategories[category.id] ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                      {editingCategoryName[category.id] !== undefined ? (
                        <input
                          value={editingCategoryName[category.id]}
                          onChange={(e) => setEditingCategoryName({ ...editingCategoryName, [category.id]: e.target.value })}
                          className="border px-2 py-1 rounded w-full"
                        />
                      ) : (
                        <span className="font-semibold">{category.name}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingCategoryName[category.id] !== undefined ? (
                        <>
                          <button onClick={() => handleUpdateCategory(category.id, area.id)} className="text-green-600"><FaCheck /></button>
                          <button onClick={() => setEditingCategoryName({ ...editingCategoryName, [category.id]: undefined })} className="text-gray-600"><FaTimes /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingCategoryName({ ...editingCategoryName, [category.id]: category.name })} className="text-yellow-600"><FaEdit /></button>
                          <button onClick={() => handleDeleteCategory(category.id, area.id)} className="text-red-600"><FaTrash /></button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 my-2">
                    <input
                      value={newItemData[category.id]?.name || ''}
                      onChange={(e) =>
                        setNewItemData({
                          ...newItemData,
                          [category.id]: { ...newItemData[category.id], name: e.target.value }
                        })
                      }
                      placeholder="Item Name"
                      className="border px-2 py-1 rounded w-full"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newItemData[category.id]?.quantity || ''}
                      onChange={(e) =>
                        setNewItemData({
                          ...newItemData,
                          [category.id]: { ...newItemData[category.id], quantity: e.target.value }
                        })
                      }
                      placeholder="Quantity"
                      className="border px-2 py-1 rounded w-24"
                    />
                    <input
                      type="date"
                      value={newItemData[category.id]?.expiration || ''}
                      onChange={(e) =>
                        setNewItemData({
                          ...newItemData,
                          [category.id]: { ...newItemData[category.id], expiration: e.target.value }
                        })
                      }
                      className="border px-2 py-1 rounded w-48"
                    />
                    <button
                      onClick={() => handleAddItem(category.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      <FaPlus />
                    </button>
                  </div>
                  
                  {expandedCategories[category.id] && (
                    <>
                      <div className="ml-4 space-y-1">
                        {(category.items || []).map(item => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center border px-3 py-2 rounded"
                          >
                            {editingItemName[item.id] !== undefined ? (
                              <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <input
                                  value={editingItemName[item.id].name}
                                  onChange={(e) =>
                                    setEditingItemName({
                                      ...editingItemName,
                                      [item.id]: {
                                        ...editingItemName[item.id],
                                        name: e.target.value,
                                      },
                                    })
                                  }
                                  className="border px-2 py-1 rounded w-full sm:w-1/3"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={editingItemName[item.id].quantity}
                                  onChange={(e) =>
                                    setEditingItemName({
                                      ...editingItemName,
                                      [item.id]: {
                                        ...editingItemName[item.id],
                                        quantity: e.target.value,
                                      },
                                    })
                                  }
                                  className="border px-2 py-1 rounded w-24"
                                />
                                <input
                                  type="date"
                                  value={editingItemName[item.id].expiration_date || ''}
                                  onChange={(e) =>
                                    setEditingItemName({
                                      ...editingItemName,
                                      [item.id]: {
                                        ...editingItemName[item.id],
                                        expiration_date: e.target.value,
                                      },
                                    })
                                  }
                                  className="border px-2 py-1 rounded w-48"
                                />
                                <div className="flex gap-2 items-center">
                                  <button
                                    onClick={() =>
                                      handleUpdateItem(
                                        item.id,
                                        category.id,
                                        area.id,
                                        editingItemName[item.id]
                                      )
                                    }
                                    className="text-green-600"
                                  >
                                    <FaCheck />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingItemName({
                                        ...editingItemName,
                                        [item.id]: undefined,
                                      })
                                    }
                                    className="text-gray-600"
                                  >
                                    <FaTimes />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-gray-500">
                                    Qty: {item.quantity} | Exp: {item.expiration_date || '—'}
                                  </p>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <button
                                    onClick={() =>
                                      setEditingItemName({
                                        ...editingItemName,
                                        [item.id]: {
                                          name: item.name,
                                          quantity: item.quantity,
                                          expiration_date: item.expiration_date || '',
                                        },
                                      })
                                    }
                                    className="text-yellow-600"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, category.id, area.id)}
                                    className="text-red-600"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
