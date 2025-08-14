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
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 22 },
    },
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
    setAllLocations(allLocations.filter((loc) => loc.id !== id));
  };

  const handleEdit = async (id) => {
    if (!editingName.trim()) return;
    await updateLocationName(id, editingName.trim());
    setAllLocations(
      allLocations.map((loc) =>
        loc.id === id ? { ...loc, name: editingName } : loc
      )
    );
    setEditingId(null);
    setEditingName('');
  };

  return (
    <main className="p-5 max-w-6xl mx-auto mt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
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
          placeholder="New location (e.g., Home)"
          className="border border-gray-300 focus:border-[#0E7488] focus:ring-2 focus:ring-[#9FE7D7]/50 px-3 py-2 rounded w-full sm:w-1/2"
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

      {/* Mobile cards */}
      <AnimatePresence initial={false}>
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {allLocations.map((loc) => (
            <motion.div
              key={loc.id}
              variants={itemVariants}
              layout
              className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0E7488] to-[#23A094] text-white">
                <div className="rounded-lg bg-white/20 p-2">
                  <FaMapMarkedAlt className="h-4 w-4" />
                </div>

                {editingId === loc.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="Location name"
                    className="flex-1 bg-white/10 placeholder-white/70 text-white border border-white/30 rounded-md px-2 py-1 focus:outline-none"
                  />
                ) : (
                  <h3 className="font-semibold text-base truncate">{loc.name}</h3>
                )}
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                {/* Counts */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />
                    Areas: {loc.areasCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DDEFF0] px-2.5 py-1 text-xs font-medium text-[#0E7488]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0E7488]" />
                    Categories: {loc.categoriesCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F7F3] px-2.5 py-1 text-xs font-medium text-[#2B3A3A]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#23A094]" />
                    Items: {loc.itemsCount ?? 0}
                  </span>
                </div>

                {/* Actions */}
                {editingId === loc.id ? (
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleEdit(loc.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      <FaCheck /> Save
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEditingId(null)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <FaTimes /> Cancel
                    </motion.button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push(`/locations/${loc.id}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0E7488] px-3 py-2 text-sm font-medium text-white hover:bg-[#0B5563]"
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
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      <FaEdit /> Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDelete(loc.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600"
                    >
                      <FaTrash /> Delete
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {allLocations.length === 0 && (
            <motion.div
              variants={itemVariants}
              className="col-span-full text-center text-gray-500 border border-dashed rounded-xl p-8"
            >
              No locations yet — add your first one above.
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Desktop table */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-300 bg-white md:block hidden">
        <table className="min-w-full rounded-lg">
          <thead className="bg-[#EAF7F5] border-b border-gray-300">
            <tr>
              <th className="p-3 text-left text-[#0B5563] font-semibold md:w-[358px]">Location</th>
              <th className="p-3 text-left text-[#0B5563] font-semibold">Areas</th>
              <th className="p-3 text-left text-[#0B5563] font-semibold">Categories</th>
              <th className="p-3 text-left text-[#0B5563] font-semibold">Items</th>
              <th className="p-3 text-left text-[#0B5563] font-semibold md:w-[340px] w-full">
                Actions
              </th>
            </tr>
          </thead>
          <AnimatePresence component="tbody" initial={false}>
            <motion.tbody
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="[&>tr]:transition"
            >
              {allLocations.map((loc) => (
                <motion.tr
                  key={loc.id}
                  variants={itemVariants}
                  layout
                  className="border-b border-gray-100 hover:bg-[#F6FBFA]"
                >
                  <td className="p-3">
                    {editingId === loc.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="border-gray-300 border px-2 py-1 rounded w-full focus:border-[#0E7488] focus:ring-2 focus:ring-[#9FE7D7]/50"
                      />
                    ) : (
                      <span className="font-medium text-[#2B3A3A]">{loc.name}</span>
                    )}
                  </td>

                  <td className="p-3 tabular-nums">{loc.areasCount ?? 0}</td>
                  <td className="p-3 tabular-nums">{loc.categoriesCount ?? 0}</td>
                  <td className="p-3 tabular-nums">{loc.itemsCount ?? 0}</td>

                  <td className="p-3">
                    {editingId === loc.id ? (
                      <div className="flex flex-wrap gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleEdit(loc.id)}
                          className="text-emerald-700 hover:text-emerald-800 flex items-center gap-2"
                        >
                          <FaCheck /> Save
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
                        >
                          <FaTimes /> Cancel
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/locations/${loc.id}`)}
                          className="text-[#0E7488] hover:text-[#0B5563] flex items-center gap-2"
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
                          className="text-amber-600 hover:text-amber-700 flex items-center gap-2"
                        >
                          <FaEdit /> Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDelete(loc.id)}
                          className="text-rose-600 hover:text-rose-700 flex items-center gap-2"
                        >
                          <FaTrash /> Delete
                        </motion.button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}

              {allLocations.length === 0 && (
                <motion.tr variants={itemVariants}>
                  <td colSpan={5} className="p-5 text-center text-gray-500">
                    No locations yet — add your first one above.
                  </td>
                </motion.tr>
              )}
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>
    </main>
  );
}
