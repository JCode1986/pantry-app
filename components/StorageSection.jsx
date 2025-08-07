'use client';

import { useState } from 'react';
import {
  addCategory,
  updateCategoryName,
  deleteCategory,
  addIngredient,
  updateIngredient,
  deleteIngredient
} from '@/app/actions/server';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

export default function StorageSection({ storage, categories }) {
  const [allCategories, setAllCategories] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [newIngredient, setNewIngredient] = useState({}); // { [categoryId]: { name, quantity } }
  const [editingIngredient, setEditingIngredient] = useState({}); // { [ingredientId]: { name, quantity } }

  // ➕ Add Category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const result = await addCategory(storage.id, newCategoryName.trim());
    if (result.error) {
      console.error(result.error);
      return;
    }
    setAllCategories([{ ...result.data, ingredients: [] }, ...allCategories]);
    setNewCategoryName('');
  };

  // ✏️ Edit Category Name
  const handleUpdateCategory = async (id) => {
    if (!editingCategoryName.trim()) return;
    const result = await updateCategoryName(id, editingCategoryName.trim());
    if (result.error) {
      console.error(result.error);
      return;
    }
    setAllCategories(allCategories.map(cat =>
      cat.id === id ? { ...cat, name: editingCategoryName } : cat
    ));
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  // 🗑️ Delete Category
  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category and all its ingredients?')) return;
    const result = await deleteCategory(id);
    if (result.error) {
      console.error(result.error);
      return;
    }
    setAllCategories(allCategories.filter(cat => cat.id !== id));
  };

  // ➕ Add Ingredient
  const handleAddIngredient = async (categoryId) => {
    const newItem = newIngredient[categoryId];
    if (!newItem?.name?.trim() || !newItem?.quantity?.trim()) return;
    const result = await addIngredient(categoryId, newItem.name.trim(), newItem.quantity.trim());
    if (result.error) {
      console.error(result.error);
      return;
    }
    setAllCategories(allCategories.map(cat =>
      cat.id === categoryId
        ? { ...cat, ingredients: [result.data, ...cat.ingredients] }
        : cat
    ));
    setNewIngredient({ ...newIngredient, [categoryId]: { name: '', quantity: '' } });
  };

  // ✏️ Edit Ingredient
  const handleUpdateIngredient = async (ingredientId) => {
    const updated = editingIngredient[ingredientId];
    if (!updated?.name?.trim() || !updated?.quantity?.trim()) return;
    const result = await updateIngredient(ingredientId, updated.name.trim(), updated.quantity.trim());
    if (result.error) {
      console.error(result.error);
      return;
    }
    setAllCategories(allCategories.map(cat => ({
      ...cat,
      ingredients: cat.ingredients.map(ing =>
        ing.id === ingredientId ? { ...ing, ...updated } : ing
      )
    })));
    setEditingIngredient({ ...editingIngredient, [ingredientId]: null });
  };

  // 🗑️ Delete Ingredient
  const handleDeleteIngredient = async (ingredientId, categoryId) => {
    if (!confirm('Delete this ingredient?')) return;
    const result = await deleteIngredient(ingredientId);
    if (result.error) {
      console.error(result.error);
      return;
    }
    setAllCategories(allCategories.map(cat =>
      cat.id === categoryId
        ? { ...cat, ingredients: cat.ingredients.filter(ing => ing.id !== ingredientId) }
        : cat
    ));
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🍱 {storage.name}</h1>

      {/* Add Category */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name"
          className="border rounded px-3 py-2 focus:outline-none focus:ring w-full"
        />
        <button
          onClick={handleAddCategory}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          <FaPlus /> Add
        </button>
      </div>

      {/* Categories */}
      {allCategories.length === 0 ? (
        <p className="text-gray-500">No categories yet. Add one above.</p>
      ) : (
        allCategories.map(category => (
          <div key={category.id} className="border rounded mb-4 p-4 shadow">
            <div className="flex justify-between items-center mb-2">
              {editingCategoryId === category.id ? (
                <>
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                  />
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handleUpdateCategory(category.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <FaCheck />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditingCategoryName('');
                      }}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">{category.name}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Ingredients */}
            <div className="ml-4">
              {category.ingredients.map(ingredient => (
                <div
                  key={ingredient.id}
                  className="flex justify-between items-center border-b py-1"
                >
                  {editingIngredient[ingredient.id] ? (
                    <>
                      <input
                        type="text"
                        value={editingIngredient[ingredient.id].name}
                        onChange={(e) =>
                          setEditingIngredient({
                            ...editingIngredient,
                            [ingredient.id]: {
                              ...editingIngredient[ingredient.id],
                              name: e.target.value
                            }
                          })
                        }
                        className="border rounded px-2 py-1 w-1/3"
                      />
                      <input
                        type="text"
                        value={editingIngredient[ingredient.id].quantity}
                        onChange={(e) =>
                          setEditingIngredient({
                            ...editingIngredient,
                            [ingredient.id]: {
                              ...editingIngredient[ingredient.id],
                              quantity: e.target.value
                            }
                          })
                        }
                        className="border rounded px-2 py-1 w-1/3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateIngredient(ingredient.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() =>
                            setEditingIngredient({
                              ...editingIngredient,
                              [ingredient.id]: null
                            })
                          }
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="w-1/3">{ingredient.name}</span>
                      <span className="w-1/3">{ingredient.quantity}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditingIngredient({
                              ...editingIngredient,
                              [ingredient.id]: {
                                name: ingredient.name,
                                quantity: ingredient.quantity
                              }
                            })
                          }
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteIngredient(ingredient.id, category.id)
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add Ingredient */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newIngredient[category.id]?.name || ''}
                  onChange={(e) =>
                    setNewIngredient({
                      ...newIngredient,
                      [category.id]: {
                        ...newIngredient[category.id],
                        name: e.target.value
                      }
                    })
                  }
                  className="border rounded px-2 py-1 w-1/3"
                />
                <input
                  type="text"
                  placeholder="Quantity"
                  value={newIngredient[category.id]?.quantity || ''}
                  onChange={(e) =>
                    setNewIngredient({
                      ...newIngredient,
                      [category.id]: {
                        ...newIngredient[category.id],
                        quantity: e.target.value
                      }
                    })
                  }
                  className="border rounded px-2 py-1 w-1/3"
                />
                <button
                  onClick={() => handleAddIngredient(category.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  <FaPlus />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
