// 'use client';
// import { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { FaRegTrashAlt, FaPlus, FaHeart, FaSearch } from "react-icons/fa";
// import { fetchRecipes } from '@/app/actions';
// import { supabase } from '@/lib/supabaseClient';

// export default function HomeSection({user}) {
//     const [pantry, setPantry] = useState([]);
//     const [item, setItem] = useState('');
//     const [recipes, setRecipes] = useState([]);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         const fetchUserAndPantry = async () => {
//             const { data, error } = await supabase
//                 .from('pantry_items')
//                 .select('*')
//                 .eq('user_id', user.id)
//                 .order('inserted_at', { ascending: false });

//             if (error) console.error('Error fetching pantry:', error);
//             else setPantry(data);
//         };

//         fetchUserAndPantry();
//     }, []);

//     const addItem = async () => {
//         if (!item.trim() || !user) return;
//         const { data, error } = await supabase
//             .from('pantry_items')
//             .insert([{ user_id: user.id, name: item.trim(), quantity: 1, expires_at: null }])
//             .select();

//         if (error) {
//             console.error('Error adding item:', error);
//             setError('Failed to add item.');
//             return;
//         }

//         setPantry([data[0], ...pantry]);
//         setItem('');
//         setError(null);
//     };

//     const removeItem = async (id) => {
//         const { error } = await supabase
//             .from('pantry_items')
//             .delete()
//             .eq('id', id);

//         if (error) {
//             console.error('Error removing item:', error);
//             setError('Failed to remove item.');
//             return;
//         }

//         setPantry(pantry.filter((p) => p.id !== id));
//     };

//     const getRecipes = async () => {
//         if (pantry.length === 0) {
//             setError('Please add some pantry items first.');
//             return;
//         }
//         setLoading(true);
//         setError(null);
//         try {
//             const pantryNames = pantry.map((p) => p.name);
//             const data = await fetchRecipes(pantryNames);
//             setRecipes(data);
//         } catch (err) {
//             console.error(err);
//             setError('Failed to fetch recipes. Try again later.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const saveRecipe = async (recipe) => {
//         if (!user) return;
//         const { error } = await supabase
//             .from('favorite_recipes')
//             .insert([{
//                 user_id: user.id,
//                 recipe_id: recipe.id,
//                 title: recipe.title,
//                 image_url: recipe.image
//             }]);

//         if (error) {
//             console.error('Error saving recipe:', error);
//             alert('Failed to save recipe.');
//         } else {
//             alert('Recipe saved!');
//         }
//     };

//     return (
//         <main className="p-6 max-w-lg mx-auto mt-44">
//             <h1 className="text-3xl font-bold text-center mb-6">🍽️ My Pantry?</h1>

//             {/* Add Ingredient Form */}
//             <div className="flex gap-2 mb-4">
//                 <input
//                     type="text"
//                     value={item}
//                     onChange={(e) => setItem(e.target.value)}
//                     maxLength={30}
//                     placeholder="Add ingredient..."
//                     className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-green-300"
//                 />
//                 <button
//                     onClick={addItem}
//                     className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
//                 >
//                     <FaPlus className="w-5 h-5" />
//                     Add
//                 </button>
//             </div>

//             {/* Find Recipes Button */}
//             <div className="text-center mb-8 mt-5">
//                 <button
//                     onClick={getRecipes}
//                     className="bg-blue-600 flex justify-center gap-3 items-center text-white px-6 py-3 rounded hover:bg-blue-700 w-full cursor-pointer"
//                 >
//                     <div>Find Recipes</div>
//                     <FaSearch color='white' className='h-5 w-5'/>
//                 </button>
//             </div>

//             {/* Pantry List */}
//             <ul className="space-y-2">
//                 <AnimatePresence>
//                     {pantry.map((p) => (
//                         <motion.li
//                             key={p.id}
//                             initial={{ opacity: 0, x: -20 }}
//                             animate={{ opacity: 1, x: 0 }}
//                             exit={{ opacity: 0, x: 20 }}
//                             className="flex justify-between items-center border p-2 rounded shadow-sm"
//                         >
//                             <span>{p.name}</span>
//                             <button
//                                 onClick={() => removeItem(p.id)}
//                                 className="text-red-600 hover:text-red-800"
//                             >
//                                 <FaRegTrashAlt className="w-5 h-5" />
//                             </button>
//                         </motion.li>
//                     ))}
//                 </AnimatePresence>
//             </ul>

//             {/* Recipes Section */}
//             {loading && <p className="text-center">Loading recipes...</p>}
//             {error && <p className="text-center text-red-500">{error}</p>}

//             {recipes.length > 0 && (
//                 <section>
//                     <h2 className="text-2xl font-semibold mb-4 text-center">🍳 Recipes</h2>
//                     <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
//                         {recipes.map((recipe) => (
//                             <div
//                                 key={recipe.id}
//                                 className="border rounded shadow hover:shadow-lg transition p-4"
//                             >
//                                 <img
//                                     src={recipe.image}
//                                     alt={recipe.title}
//                                     className="rounded w-full h-40 object-cover mb-4"
//                                 />
//                                 <h3 className="text-lg font-semibold">{recipe.title}</h3>
//                                 <p className="text-sm text-gray-500">
//                                     Missing: {recipe.missedIngredientCount} ingredients
//                                 </p>
//                                 <button
//                                     onClick={() => saveRecipe(recipe)}
//                                     className="mt-3 inline-flex items-center gap-1 text-red-500 hover:text-red-700"
//                                 >
//                                     <FaHeart className="w-5 h-5" />
//                                     Save
//                                 </button>
//                             </div>
//                         ))}
//                     </div>
//                 </section>
//             )}
//         </main>
//     );
// }

'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FaPlus, FaUtensils } from 'react-icons/fa';
import { addStorage } from '@/app/actions/server';

export default function HomeSection({ user, storages }) {
  const [allStorages, setAllStorages] = useState(storages);
  const [filter, setFilter] = useState('All');
  const [storageName, setStorageName] = useState('');

  console.log(user, 'user')

//   const addStorage = async () => {
//     if (!storageName.trim()) return;

//     const { data, error } = await supabase
//       .from('food_storages')
//       .insert([{ user_id: user.id, name: storageName.trim() }])
//       .select();

//     if (error) {
//       console.error('Error adding storage:', error);
//     } else {
//       setAllStorages([data[0], ...allStorages]);
//       setStorageName('');
//     }
//   };

    const addStorageHandler = async () => {
        if (!storageName.trim()) return;

        const result = await addStorage(storageName.trim());
        if (result.error) {
            console.error(result.error);
            return;
        }

        setAllStorages([result.data, ...allStorages]);
        setStorageName('');
    };

  const filteredStorages = filter === 'All'
    ? allStorages
    : allStorages.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

    return (
        <main className="p-6 max-w-4xl mx-auto mt-20">
            <h1 className="text-3xl font-bold mb-6">🍱 My Food Storages</h1>

            <div className='flex gap-5 justify-between'>
                {/* Add Storage */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={storageName}
                        onChange={(e) => setStorageName(e.target.value)}
                        placeholder="New storage name (e.g., Pantry)"
                        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-green-300"
                    />
                    <button
                        onClick={addStorageHandler}
                        className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        <FaPlus className="w-5 h-5" /> Add
                    </button>
                </div>
                {/* Filter Dropdown */}
                <div className="mb-4">
                    <label className="mr-2 font-medium">Filter:</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-[300px] border rounded px-3 py-2"
                    >
                    <option>All</option>
                    {allStorages?.map(s => (
                        <option key={s.id}>{s.name}</option>
                    ))}
                    </select>
                </div>
            </div>


            {/* Storages Table */}
            <table className="w-full border rounded shadow">
                <thead className="bg-gray-100">
                <tr>
                    <th className="p-3 text-left">Storage</th>
                    <th className="p-3 text-left">Ingredients</th>
                    <th className="p-3 text-left">Actions</th>
                </tr>
                </thead>
                <tbody>
                {filteredStorages?.map(storage => (
                    <tr key={storage.id} className="border-t">
                    <td className="p-3">{storage.name}</td>
                    <td className="p-3">{storage.ingredients.length}</td>
                    <td className="p-3">
                        <a
                        href={`/storage/${storage.id}`}
                        className="text-blue-600 hover:underline"
                        >
                        View/Add Ingredients
                        </a>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </main>
    );
}
