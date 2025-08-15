'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  // confirm valid & match
  const pwValid = useMemo(() => pw.length >= 6, [pw]);
  const match = useMemo(() => pw === pw2, [pw, pw2]);
  const canSubmit = pwValid && match && authed && !saving;

  useEffect(() => {
    // After the Supabase magic link, there should be a session.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setAuthed(!!data?.session);
      setChecking(false);
    };
    check();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    setOk(null);

    const { error: err } = await supabase.auth.updateUser({ password: pw });
    if (err) setError(err.message);
    else setOk('Password updated! You can now log in with your new password.');

    setSaving(false);
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
                  Reset Password
                </h1>
                <p className="text-white/80 text-xs sm:text-sm">
                  Set a new password for your account.
                </p>
              </div>
            </div>
          </div>

          <motion.div variants={container} initial="hidden" animate="show" className="px-6 sm:px-8 py-6 space-y-4">
            {/* Status */}
            <AnimatePresence>
              {checking && (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-stocksense-gray bg-white text-stocksense-dark-gray text-sm px-3 py-2"
                >
                  Checking your session…
                </motion.div>
              )}
            </AnimatePresence>

            {!checking && !authed && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm px-3 py-2">
                We couldn’t find an active reset session. Please open the reset link from your email again.
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
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

            {/* Form */}
            {authed && (
              <form onSubmit={handleSave} className="space-y-4" noValidate>
                <motion.div variants={item} className="space-y-1">
                  <label className="text-sm font-medium text-stocksense-dark-gray" htmlFor="pw">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="pw"
                      type={showPw ? 'text' : 'password'}
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stocksense-teal"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pw.length > 0 && !pwValid && (
                    <p className="text-xs text-amber-700">Min length is 6 characters.</p>
                  )}
                </motion.div>

                <motion.div variants={item} className="space-y-1">
                  <label className="text-sm font-medium text-stocksense-dark-gray" htmlFor="pw2">
                    Confirm password
                  </label>
                  <input
                    id="pw2"
                    type={showPw ? 'text' : 'password'}
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white"
                  />
                  {pw2.length > 0 && !match && (
                    <p className="text-xs text-rose-700">Passwords do not match.</p>
                  )}
                </motion.div>

                <motion.div variants={item} className="pt-2">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-white font-medium transition
                      ${
                        canSubmit
                          ? 'bg-stocksense-teal hover:bg-stocksense-tealDark'
                          : 'bg-stocksense-teal/50 cursor-not-allowed'
                      }`}
                  >
                    {saving ? 'Updating…' : 'Update password'}
                  </button>
                </motion.div>

                <motion.div variants={item} className="text-center">
                  <a href="/login" className="text-sm text-stocksense-teal hover:text-stocksense-tealDark">
                    Back to Login
                  </a>
                </motion.div>
              </form>
            )}
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
