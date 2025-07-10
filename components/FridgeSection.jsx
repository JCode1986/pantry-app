'use client';
import { useState, useEffect } from 'react';
import { FaRegTrashAlt, FaPlus } from "react-icons/fa";
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function FridgeSection() {
    const router = useRouter()
    const [fridge, setFridge] = useState([]);
    const [item, setItem] = useState('');
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    // useEffect(() => {
    //     const fetchUserAndFridge = async () => {
    //         const { data: { session } } = await supabase.auth.getSession();
    //         if (!session?.user) {
    //             router.push('/login');
    //             return;
    //         }
    //         setUser(session.user);

    //         const { data, error } = await supabase
    //             .from('fridge_items')
    //             .select('*')
    //             .eq('user_id', session.user.id)
    //             .order('inserted_at', { ascending: false });

    //         if (error) console.error('Error fetching fridge:', error);
    //         else setFridge(data);
    //     };

    //     fetchUserAndFridge();
    // }, []);

    const addItem = async () => {
        if (!item.trim() || !user) return;
        const { data, error } = await supabase
            .from('fridge_items')
            .insert([{ user_id: user.id, name: item.trim(), quantity: 1, expires_at: null }])
            .select();

        if (error) {
            console.error('Error adding item:', error);
            setError('Failed to add item.');
            return;
        }

        setFridge([data[0], ...fridge]);
        setItem('');
        setError(null);
    };

    const removeItem = async (id) => {
        const { error } = await supabase
            .from('fridge_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error removing item:', error);
            setError('Failed to remove item.');
            return;
        }

        setFridge(fridge.filter((f) => f.id !== id));
    };

    return (
        <main className="p-6 max-w-lg mx-auto mt-44">
            <h1 className="text-3xl font-bold text-center mb-6">❄️ My Fridge</h1>
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder="Add fridge item..."
                    className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-blue-300"
                />
                <button
                    onClick={addItem}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    <FaPlus className="w-5 h-5" />
                    Add
                </button>
            </div>
            <ul className="space-y-2">
                {fridge.map((f) => (
                    <li
                        key={f.id}
                        className="flex justify-between items-center border p-2 rounded shadow-sm"
                    >
                        <span>{f.name}</span>
                        <button
                            onClick={() => removeItem(f.id)}
                            className="text-red-600 hover:text-red-800"
                        >
                            <FaRegTrashAlt className="w-5 h-5" />
                        </button>
                    </li>
                ))}
            </ul>
        </main>
    );
}
