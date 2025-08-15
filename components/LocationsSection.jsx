'use client';

import { useState } from 'react';
import {
  addLocation,
  deleteLocation,
  updateLocationName,
} from '@/app/actions/server';
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaEye,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function LocationsSection({ locations }) {
  const router = useRouter();
  const [allLocations, setAllLocations] = useState(locations);
  const [locationName, setLocationName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Motion variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
  };

  const handleAdd = async () => {
    if (!locationName.trim()) return;
    const newLoc = await addLocation(locationName.trim());
    setAllLocations([
      ...allLocations,
      { ...newLoc, areasCount: 0, categoriesCount: 0, itemsCount: 0 },
    ]);
    setLocationName('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this location?')) return;
    await deleteLocation(id);
    setAllLocations((prev) => prev.filter((loc) => loc.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleEditSave = async (id) => {
    const name = editingName.trim();
    if (!name) return;
    // optimistic
    setAllLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, name } : loc)));
    await updateLocationName(id, name);
    setEditingId(null);
    setEditingName('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName('');
  };

  const onEditKey = (e, id) => {
    if (e.key === 'Enter') handleEditSave(id);
    if (e.key === 'Escape') handleEditCancel();
  };

  return (
    <main className="p-5 max-w-6xl mx-auto min-h-[96.3vh]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mt-8">
        <div className="text-3xl font-bold flex gap-3 items-center justify-center md:justify-start">
          <div className="rounded-xl p-3 text-white bg-gradient-to-br from-[#0E7488] to-[#0B5563] shadow-sm border border-white/10">
            <FaMapMarkedAlt className="h-5 w-5" />
          </div>
          <h1 className="tracking-tight text-stocksense-teal">My Locations</h1>
        </div>
        <span className="text-sm text-gray-500 text-center md:text-right">
          Total: {allLocations.length}
        </span>
      </div>

      {/* Add Location */}
      <div className="flex gap-2 my-6 md:justify-start justify-center">
        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="New location (e.g., Home, Work, Grocery Store)"
          className="w-full max-w-[500px] rounded-lg border text-sm md:text-base border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className="bg-[#0E7488] text-white px-4 py-2 rounded shadow-sm hover:bg-[#0B5563] flex items-center gap-2"
        >
          <FaPlus /> Add
        </motion.button>
      </div>

      {/* List */}
      <div className="border shadow border-stocksense-gray rounded-lg bg-white overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-gray-200 dark:divide-zinc-800"
          >
            {allLocations.length === 0 ? (
              <li className="p-5 text-gray-600 dark:text-gray-400 text-sm">
                No locations yet — add your first one above.
              </li>
            ) : (
              allLocations.map((loc, idx) => {
                const isEditing = editingId === loc.id;
                return (
                  <motion.li
                    key={loc.id}
                    variants={itemVariants}
                    className="flex items-start justify-between gap-3 p-4 text-gray-700 dark:text-gray-300"
                  >
                    {/* Left: icon + content */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="rounded-xl p-2 bg-gray-100 dark:bg-zinc-800 shrink-0">
                        <FaMapMarkerAlt className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>

                      <div className="min-w-0">
                        {/* Name / Edit field */}
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => onEditKey(e, loc.id)}
                            className="text-sm font-medium text-[#2B3A3A] border border-gray-300 rounded px-2 py-1 focus:border-[#0E7488] focus:ring-2 focus:ring-[#9FE7D7]/50"
                          />
                        ) : (
                          <p className="text-sm font-medium text-[#2B3A3A]">{loc.name}</p>
                        )}

                        {/* Counts */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-normal break-words">
                          <span className="font-medium">{loc.areasCount ?? 0}</span> Areas ·{' '}
                          <span className="font-medium">{loc.categoriesCount ?? 0}</span> Categories ·{' '}
                          <span className="font-medium">{loc.itemsCount ?? 0}</span> Items
                        </p>
                      </div>
                    </div>

                    {/* Right: meta + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0 text-right">
                      <span className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                        Created:{' '}
                        {loc.created_at ? new Date(loc.created_at).toLocaleString() : ''}
                      </span>

                      {isEditing ? (
                        <div className="flex gap-3">
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleEditSave(loc.id)}
                            className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-xs md:text-sm"
                          >
                            <FaCheck /> Save
                          </motion.button>
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleEditCancel}
                            className="text-gray-600 hover:text-gray-700 flex items-center gap-1 text-xs md:text-sm"
                          >
                            <FaTimes /> Cancel
                          </motion.button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push(`/locations/${loc.id}`)}
                            className="text-[#0E7488] hover:text-[#0B5563] flex items-center gap-1 text-xs md:text-sm cursor-pointer"
                          >
                            <FaEye /> View
                          </motion.button>
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setEditingId(loc.id);
                              setEditingName(loc.name);
                            }}
                            className="text-amber-600 hover:text-amber-700 flex items-center gap-1 text-xs md:text-sm cursor-pointer"
                          >
                            <FaEdit /> Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDelete(loc.id)}
                            className="text-rose-600 hover:text-rose-700 flex items-center gap-1 text-xs md:text-sm cursor-pointer"
                          >
                            <FaTrash /> Delete
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.li>
                );
              })
            )}
          </motion.ul>
        </AnimatePresence>
      </div>
    </main>
  );
}
