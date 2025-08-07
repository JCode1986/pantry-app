'use client';
import { useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import { addStorage, deleteStorage, updateStorageName } from '@/app/actions/server';

export default function HomeSection({ user, storages }) {
  const [allStorages, setAllStorages] = useState(storages || []);
  const [filter, setFilter] = useState('All');
  const [storageName, setStorageName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Add new storage
  const addStorageHandler = async () => {
    if (!storageName.trim()) return;
    try {
      const newStorage = await addStorage(storageName.trim());
      setAllStorages([newStorage, ...allStorages]);
      setStorageName('');
    } catch (err) {
      console.error('Error adding storage:', err);
    }
  };

  // Start editing a storage name
  const startEditing = (id, currentName) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Save edited name
  const saveEditHandler = async (id) => {
    if (!editingName.trim()) return;
    try {
      await updateStorageName(id, editingName.trim());
      setAllStorages(
        allStorages.map((storage) =>
          storage.id === id ? { ...storage, name: editingName.trim() } : storage
        )
      );
      cancelEditing();
    } catch (err) {
      console.error('Error updating storage:', err);
    }
  };

  // Delete storage
  const deleteStorageHandler = async (id) => {
    if (!confirm('Are you sure you want to delete this storage?')) return;
    try {
      await deleteStorage(id);
      setAllStorages(allStorages.filter((storage) => storage.id !== id));
    } catch (err) {
      console.error('Error deleting storage:', err);
    }
  };

  const filteredStorages =
    filter === 'All'
      ? allStorages
      : allStorages.filter((s) =>
          s.name.toLowerCase().includes(filter.toLowerCase())
        );

  return (
    <main className="p-6 max-w-5xl mx-auto mt-20">
      <h1 className="text-3xl font-bold mb-6">🍱 My Food Storages</h1>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        {/* Add Storage */}
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={storageName}
            onChange={(e) => setStorageName(e.target.value)}
            placeholder="New storage name (e.g., Pantry)"
            className="border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-green-300 w-full sm:w-[300px]"
          />
          <button
            onClick={addStorageHandler}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            <FaPlus /> Add
          </button>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="font-medium">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-[200px] border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
          >
            <option>All</option>
            {allStorages?.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Storages Table */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white rounded-lg">
          <thead className="bg-blue-50 border-b">
            <tr>
              <th className="p-3 text-left text-gray-700 font-semibold">Storage</th>
              <th className="p-3 text-left text-gray-700 font-semibold">Ingredients</th>
              <th className="p-3 text-left text-gray-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStorages?.map((storage, idx) => (
              <tr
                key={storage.id}
                className={`border-b ${
                  idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                } hover:bg-gray-100 transition`}
              >
                <td className="p-3">
                  {editingId === storage.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="border px-2 py-1 rounded w-full focus:outline-none focus:ring focus:ring-yellow-300"
                    />
                  ) : (
                    <span className="font-medium">{storage.name}</span>
                  )}
                </td>
                <td className="p-3">{storage.ingredients?.length || 0}</td>
                <td className="p-3 flex flex-wrap gap-2">
                  <a
                    href={`/storage/${storage.id}`}
                    className="text-blue-600 hover:text-blue-800 transition"
                  >
                    View/Add Ingredients
                  </a>
                  {editingId === storage.id ? (
                    <>
                      <button
                        onClick={() => saveEditHandler(storage.id)}
                        className="text-green-600 hover:text-green-800 flex items-center gap-1"
                      >
                        <FaCheck /> Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <FaTimes /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(storage.id, storage.name)}
                        className="text-yellow-500 hover:text-yellow-700 flex items-center gap-1"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => deleteStorageHandler(storage.id)}
                        className="text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <FaTrash /> Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
