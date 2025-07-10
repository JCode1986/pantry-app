'use client';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useState } from 'react';
import { FaUtensils, FaSnowflake, FaHeart, FaBars, FaTimes, FaSignOutAlt, FaSpinner } from 'react-icons/fa';

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
            setLoggingOut(false);
            return;
        }

        // Force session refresh to prevent stale state
        await supabase.auth.refreshSession();

        // Hard redirect ensures Middleware detects logout
        window.location.href = '/login';
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/"
                        className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
                    >
                        <FaUtensils />
                        <span>Pantry</span>
                    </Link>
                    <Link
                        href="/fridge"
                        className="items-center gap-1 text-gray-700 hover:text-blue-600 hidden sm:flex"
                    >
                        <FaSnowflake />
                        <span>Fridge</span>
                    </Link>
                    <Link
                        href="/favorites"
                        className="items-center gap-1 text-gray-700 hover:text-blue-600 hidden sm:flex"
                    >
                        <FaHeart />
                        <span>Favorites</span>
                    </Link>
                </div>

                {/* Mobile menu toggle */}
                <div className="sm:hidden">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-gray-700 focus:outline-none"
                    >
                        {isOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
                    </button>
                </div>

                {/* Logout for desktop */}
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={`hidden sm:flex items-center gap-1 text-red-500 hover:text-red-700 ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loggingOut ? <FaSpinner className="animate-spin" /> : <FaSignOutAlt />}
                    <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
            </div>

            {/* Mobile dropdown menu */}
            {isOpen && (
                <div className="sm:hidden px-4 pb-3 space-y-2">
                    <Link
                        href="/fridge"
                        onClick={() => setIsOpen(false)}
                        className="block text-gray-700 hover:text-blue-600"
                    >
                        <FaSnowflake className="inline-block mr-1" />
                        Fridge
                    </Link>
                    <Link
                        href="/favorites"
                        onClick={() => setIsOpen(false)}
                        className="block text-gray-700 hover:text-blue-600"
                    >
                        <FaHeart className="inline-block mr-1" />
                        Favorites
                    </Link>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className={`block text-red-500 hover:text-red-700 ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loggingOut ? (
                            <>
                                <FaSpinner className="animate-spin inline-block mr-1" />
                                Logging out...
                            </>
                        ) : (
                            <>
                                <FaSignOutAlt className="inline-block mr-1" />
                                Logout
                            </>
                        )}
                    </button>
                </div>
            )}
        </nav>
    );
}
