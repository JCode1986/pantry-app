'use client'
import { useState } from 'react'
import { addLocation, deleteLocation, updateLocationName } from '@/app/actions/server'
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaEye } from 'react-icons/fa'
import { useRouter } from 'next/navigation';

export default function HomeSection({ locations }) {
    const router = useRouter();
    const [allLocations, setAllLocations] = useState(locations)
    const [locationName, setLocationName] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editingName, setEditingName] = useState('')

    const handleAdd = async () => {
        if (!locationName.trim()) return
        const newLoc = await addLocation(locationName.trim())
        setAllLocations([newLoc, ...allLocations])
        setLocationName('')
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this location?')) return
        await deleteLocation(id)
        setAllLocations(allLocations.filter(loc => loc.id !== id))
    }

    const handleEdit = async (id) => {
        if (!editingName.trim()) return
        await updateLocationName(id, editingName.trim())
        setAllLocations(allLocations.map(loc => loc.id === id ? { ...loc, name: editingName } : loc))
        setEditingId(null)
        setEditingName('')
    }

  return (
    <main className="p-6 max-w-4xl mx-auto mt-20">
      <h1 className="text-3xl font-bold mb-6">🏠 My Locations</h1>

      {/* Add Location */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="New location (e.g., Home)"
          className="border px-3 py-2 rounded w-full sm:w-1/2"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          <FaPlus /> Add
        </button>
      </div>

      {/* Locations Table */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white rounded-lg">
          <thead className="bg-blue-50 border-b">
            <tr>
              <th className="p-3 text-left text-gray-700 font-semibold">Location</th>
              <th className="p-3 text-left text-gray-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allLocations.map((loc) => (
              <tr key={loc.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-3">
                  {editingId === loc.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="border px-2 py-1 rounded w-full"
                    />
                  ) : (
                    loc.name
                  )}
                </td>
                <td className="p-3 flex gap-2">
                  {editingId === loc.id ? (
                    <>
                      <button
                        onClick={() => handleEdit(loc.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FaCheck /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <FaTimes /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                        <button
                            onClick={() => router.push(`/locations/${loc.id}`)}
                            className="text-yellow-500 hover:text-yellow-700"
                        >
                            <FaEye /> View
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(loc.id)
                          setEditingName(loc.name)
                        }}
                        className="text-yellow-500 hover:text-yellow-700"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(loc.id)}
                        className="text-red-500 hover:text-red-700"
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
  )
}
