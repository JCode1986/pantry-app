"use client";
import { useState } from "react";
import { addCategory } from "@/app/actions/server";
import { FaPlus } from "react-icons/fa";

export default function AddCategoryForm({ storageId }) {
  const [name, setName] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addCategory(storageId, name.trim());
    window.location.reload();
  };

  return (
    <div className="flex gap-2 mb-6">
      <input
        type="text"
        placeholder="New category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-3 py-2 flex-1 focus:ring focus:ring-green-300"
      />
      <button
        onClick={handleAdd}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        <FaPlus /> Add
      </button>
    </div>
  );
}
