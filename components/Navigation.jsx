'use client';
import Link from 'next/link';
import { useState } from 'react';
import { FaUtensils, FaSnowflake, FaHeart, FaBars, FaTimes, FaSignOutAlt, FaSpinner } from 'react-icons/fa';
import { logout } from '@/app/actions/auth';

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();

            localStorage.clear();
            // document.cookie = 'sb-icjhicevzeybasiwgxnm-auth-token=; Max-Age=0; path=/;';
            // document.cookie = 'sb-icjhicevzeybasiwgxnm-refresh-token=; Max-Age=0; path=/;';

            // ✅ Hard reload ensures Middleware sees no session
            window.location.href = '/login';
        } catch (err) {
            console.error('Logout failed:', err);
            setLoggingOut(false);
        }
    };


    return (
        <>
            <nav className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="flex items-center gap-1 text-gray-700 hover:text-blue-600">
                            <FaUtensils />
                            <span>Pantry</span>
                        </Link>
                        <Link href="/fridge" className="items-center gap-1 text-gray-700 hover:text-blue-600 hidden sm:flex">
                            <FaSnowflake />
                            <span>Fridge</span>
                        </Link>
                        <Link href="/favorites" className="items-center gap-1 text-gray-700 hover:text-blue-600 hidden sm:flex">
                            <FaHeart />
                            <span>Favorite Recipes</span>
                        </Link>
                    </div>

                    {/* Mobile menu toggle */}
                    <div className="sm:hidden">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 focus:outline-none">
                            {isOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Logout for desktop */}
                    <button
                        onClick={() => setShowModal(true)}
                        disabled={loggingOut}
                        className={`hidden sm:flex items-center gap-1 text-red-500 hover:text-red-700 cursor-pointer ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            <FaSnowflake className="inline-block mr-1" /> Fridge
                        </Link>
                        <Link
                            href="/favorites"
                            onClick={() => setIsOpen(false)}
                            className="block text-gray-700 hover:text-blue-600"
                        >
                            <FaHeart className="inline-block mr-1" /> Favorites
                        </Link>
                        <button
                            onClick={() => setShowModal(true)}
                            disabled={loggingOut}
                            className={`block text-red-500 hover:text-red-700 ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loggingOut ? (
                                <>
                                    <FaSpinner className="animate-spin inline-block mr-1" /> Logging out...
                                </>
                            ) : (
                                <>
                                    <FaSignOutAlt className="inline-block mr-1" /> Logout
                                </>
                            )}
                        </button>
                    </div>
                )}
            </nav>

            {/* Confirmation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
                        <h2 className="text-lg font-semibold mb-4">Confirm Logout</h2>
                        <p className="mb-6">Are you sure you want to log out?</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    handleLogout();
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                {loggingOut ? (
                                    <FaSpinner className="animate-spin inline-block mr-1" />
                                ) : (
                                    'Logout'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
