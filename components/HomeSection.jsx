'use client';
import { useState, useEffect } from 'react';
import { loadPantry, savePantry } from '../utils/localStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRegTrashAlt, FaPlus, FaHeart, FaSearch } from "react-icons/fa";
import { fetchRecipes } from '@/app/actions';
import { Button } from '@heroui/react';

export default function HomeSection() {
    const [pantry, setPantry] = useState([]);
    const [item, setItem] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setPantry(loadPantry());
    }, []);

    const addItem = () => {
        if (!item.trim()) return;
        const updated = [...pantry, item.trim()];
        setPantry(updated);
        savePantry(updated);
        setItem('');
        setError(null);
    };

    const removeItem = (index) => {
        const updated = pantry.filter((_, i) => i !== index);
        setPantry(updated);
        savePantry(updated);
    };

    const getRecipes = async () => {
        if (pantry.length === 0) {
            setError('Please add some pantry items first.')
            return;
        }
            setLoading(true);
            setError(null);
        try {
            const data = await fetchRecipes(pantry);
            setRecipes(data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch recipes. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    const saveRecipe = (recipe) => {
        const saved = JSON.parse(localStorage.getItem('favorites')) || [];
        const updated = [...saved, recipe];
        localStorage.setItem('favorites', JSON.stringify(updated));
        alert('Recipe saved!');
    };


    return (
        <main className="p-6 max-w-lg mx-auto">
            <h1 className="text-3xl font-bold text-center mb-6">🍽️ What’s in My Pantry?</h1>

            {/* Add Ingredient Form */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder="Add ingredient..."
                    className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-green-300"
                />
                <button
                    onClick={addItem}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    <FaPlus className="w-5 h-5" />
                    Add
                </button>
            </div>

            {/* Pantry List */}
            <ul className="space-y-2">
                <AnimatePresence>
                {pantry.map((p, index) => (
                    <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex justify-between items-center border p-2 rounded shadow-sm"
                    >
                    <span>{p}</span>
                    <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                    >
                        <FaRegTrashAlt className="w-5 h-5" />
                    </button>
                    </motion.li>
                ))}
                </AnimatePresence>
            </ul>

            {/* Find Recipes Button */}
             <div className="text-center mb-8 mt-5">
                <button
                    onClick={getRecipes}
                    className="bg-blue-600 flex justify-center gap-3 items-center text-white px-6 py-3 rounded hover:bg-blue-700 w-full cursor-pointer"
                >
                    <div>Find Recipes</div>
                    <FaSearch color='white' className='h-5 w-5'/>
                </button>
            </div>

            {/* Recipes Section */}
            {loading && <p className="text-center">Loading recipes...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}

                {recipes.length > 0 && (
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-center">🍳 Recipes</h2>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                        {recipes.map((recipe) => (
                        <div
                            key={recipe.id}
                            className="border rounded shadow hover:shadow-lg transition p-4"
                        >
                            <img
                            src={recipe.image}
                            alt={recipe.title}
                            className="rounded w-full h-40 object-cover mb-4"
                            />
                            <h3 className="text-lg font-semibold">{recipe.title}</h3>
                            <p className="text-sm text-gray-500">
                            Missing: {recipe.missedIngredientCount} ingredients
                            </p>
                            <button
                            onClick={() => saveRecipe(recipe)}
                            className="mt-3 inline-flex items-center gap-1 text-red-500 hover:text-red-700"
                            >
                            <FaHeart className="w-5 h-5" />
                                Save
                            </button>
                        </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
