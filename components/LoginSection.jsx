'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { login, signup } from '@/app/actions/auth';

export default function LoginPage() {
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login({ email, password });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({ 
            email,
            password,
            options: {
                emailRedirectTo: `http://localhost:3000/magic-link-sync`
            }
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccessMessage('Check your email for confirmation!')
        }
        setLoading(false);
    };

    return (
        <main className="flex flex-col items-center justify-center h-[60vh] px-5">
            <div className="bg-white p-5 sm:p-8 rounded shadow max-w-md w-full border">
                <h1 className="text-2xl font-bold mb-4 text-center">🍽️ Pantry Login</h1>
                <form className="space-y-4" onSubmit={handleSignIn}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSignUp}
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                    >
                        {loading ? 'Signing up...' : 'Sign Up'}
                    </button>
                </form>
            </div>
        </main>
    );
}