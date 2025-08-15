'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { login } from '@/app/actions/auth';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // basic front-end validity guard
  const emailValid = useMemo(
    () => /\S+@\S+\.\S+/.test(email.trim()),
    [email]
  );
  const canSubmit = emailValid && password.length >= 6 && !loading;

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await login({ email, password, redirectTo });
    } catch (err) {
      setError(err?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!emailValid || password.length < 6) {
      setError('Enter a valid email and a password with at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/magic-link-sync`
            : 'http://localhost:3000/magic-link-sync',
      },
    });

    if (signErr) {
      setError(signErr.message);
    } else {
      setSuccessMessage('Success! Check your email to confirm your account.');
    }
    setLoading(false);
  };

  // motion variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.04 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <main className="min-h-[100vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-stocksense-gray bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-6 pb-4 bg-gradient-to-r from-stocksense-teal to-stocksense-sky">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 grid place-items-center">
                {/* mini mark */}
                <span className="text-white font-bold text-lg">SS</span>
              </div>
              <div>
                <h1 className="text-white text-xl sm:text-2xl font-semibold leading-tight">
                  Welcome to StockSense
                </h1>
                <p className="text-white/80 text-xs sm:text-sm">Sign in to manage your pantry.</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="px-6 sm:px-8 py-6 space-y-4"
          >
            {/* Alerts */}
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2"
                  role="alert"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="popLayout">
              {successMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-3 py-2"
                  role="status"
                >
                  {successMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              {/* Email */}
              <motion.div variants={item} className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium text-stocksense-dark-gray">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white"
                />
                {!emailValid && email.length > 0 && (
                  <p className="text-xs text-amber-700">Please enter a valid email.</p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={item} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-stocksense-dark-gray">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-xs text-stocksense-teal hover:text-stocksense-tealDark"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      <span className="inline-flex items-center gap-1">
                        <FaEyeSlash className="h-3.5 w-3.5" /> Hide
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <FaEye className="h-3.5 w-3.5" /> Show
                      </span>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white pr-10"
                  />
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-amber-700">Min length is 6 characters.</p>
                )}
              </motion.div>

              {/* Submit */}
              <motion.div variants={item} className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full inline-flex items-center cursor-pointer justify-center rounded-lg px-4 py-2.5 text-white font-medium transition
                    ${canSubmit ? 'bg-stocksense-teal hover:bg-stocksense-tealDark' : 'bg-stocksense-teal/50 cursor-not-allowed'}
                  `}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
                      </svg>
                      Logging in…
                    </span>
                  ) : (
                    'Log in'
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <span className="h-px w-full bg-stocksense-gray" />
                  <span className="text-[11px] uppercase tracking-wide text-stocksense-dark-gray/70">
                    or
                  </span>
                  <span className="h-px w-full bg-stocksense-gray" />
                </div>

                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full cursor-pointer inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-white font-medium transition bg-stocksense-sky hover:bg-stocksense-teal disabled:opacity-60"
                >
                  {loading ? 'Signing up…' : 'Create account'}
                </button>
              </motion.div>

              {/* Helper links */}
              <motion.div variants={item} className="flex items-center justify-between pt-1">
                <a href="/forgot-password" className="text-sm text-stocksense-teal hover:text-stocksense-tealDark">
                  Forgot password?
                </a>
                <span className="text-[11px] text-stocksense-dark-gray/70">
                  Email will redirect to confirmation.
                </span>
              </motion.div>
            </form>
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center text-xs text-stocksense-dark-gray/70 mt-4"
        >
          By continuing you agree to the Terms & Privacy Policy.
        </motion.p>
      </motion.div>
    </main>
  );
}
