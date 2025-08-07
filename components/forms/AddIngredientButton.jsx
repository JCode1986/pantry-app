"use client";
import { useState } from "react";
import { addIngredient } from "@/app/actions/server";
import { FaPlus } from "react-icons/fa";

export default function AddIngredientForm({ categoryId }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  const handleAdd = async () => {
    if (!name.trim() || !quantity.trim()) return;
    await addIngredient(categoryId, name.trim(), quantity.trim());
    window.location.reload();
  };

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="Ingredient name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-3 py-1 flex-1 focus:ring focus:ring-blue-300"
      />
      <input
        type="text"
        placeholder="Qty"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="border rounded px-3 py-1 w-20 focus:ring focus:ring-blue-300"
      />
      <button
        onClick={handleAdd}
        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
      >
        <FaPlus />
      </button>
    </div>
  );
}
