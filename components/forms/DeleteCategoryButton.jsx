"use client";
import { deleteCategory } from "@/app/actions/server";
import { FaTrash } from "react-icons/fa";

export default function DeleteCategoryButton({ categoryId }) {
  const handleDelete = async () => {
    if (confirm("Delete this category and all its ingredients?")) {
      await deleteCategory(categoryId);
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-500 hover:text-red-700"
    >
      <FaTrash />
    </button>
  );
}
