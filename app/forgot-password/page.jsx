'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!emailValid) return;

    setSending(true);
    setError(null);
    setOk(null);

    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password`,
    });

    if (err) setError(err.message);
    else setOk('Check your email for a link to reset your password.');

    setSending(false);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  };
  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <main className="min-h-[100vh] flex items-center justify-center px-4 py-10 bg-gradient-to-br from-stocksense-teal/10 via-stocksense-sky/10 to-stocksense-lime/10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-stocksense-gray bg-white shadow-lg overflow-hidden">
          <div className="px-6 sm:px-8 pt-6 pb-4 bg-gradient-to-r from-stocksense-teal to-stocksense-sky">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 grid place-items-center">
                <span className="text-white font-bold text-lg">SS</span>
              </div>
              <div>
                <h1 className="text-white text-xl sm:text-2xl font-semibold leading-tight">
                  Forgot Password
                </h1>
                <p className="text-white/80 text-xs sm:text-sm">
                  Enter your email to receive a reset link.
                </p>
              </div>
            </div>
          </div>

          <motion.div variants={container} initial="hidden" animate="show" className="px-6 sm:px-8 py-6 space-y-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {ok && (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-3 py-2"
                >
                  {ok}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSend} className="space-y-4" noValidate>
              <motion.div variants={item} className="space-y-1">
                <label className="text-sm font-medium text-stocksense-dark-gray" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white"
                />
                {!emailValid && email.length > 0 && (
                  <p className="text-xs text-amber-700">Please enter a valid email.</p>
                )}
              </motion.div>

              <motion.div variants={item} className="pt-2">
                <button
                  type="submit"
                  disabled={!emailValid || sending}
                  className={`w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-white font-medium transition cursor-pointer
                    ${
                      !emailValid || sending
                        ? 'bg-stocksense-teal/50 cursor-not-allowed'
                        : 'bg-stocksense-teal hover:bg-stocksense-tealDark'
                    }`}
                >
                  {sending ? 'Sending…' : 'Send reset link'}
                </button>
              </motion.div>

              <motion.div variants={item} className="text-center">
                <a href="/login" className="text-sm text-stocksense-teal hover:text-stocksense-tealDark">
                  Back to Login
                </a>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
