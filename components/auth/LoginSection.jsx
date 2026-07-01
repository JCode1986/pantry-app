'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { login } from '@/app/actions/auth';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Image from 'next/image';
import SiteFooter from '@/components/app-shell/SiteFooter';

const CREDENTIAL_VALIDATION_ERROR =
  'Enter a valid email and a password with at least 6 characters.';
const PASSWORD_MATCH_ERROR = 'Passwords do not match.';

function authErrorMessage(message, mode) {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'We could not log you in with that email and password. Check your password, or create an account if you are new.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'That email still needs to be confirmed. Check your inbox, then log in again.';
  }

  if (normalized.includes('already') || normalized.includes('registered')) {
    return 'An account may already exist for that email. Log in instead, or reset your password.';
  }

  return message || (mode === 'signup' ? 'Unable to create account.' : 'Unable to sign in.');
}

export default function LoginPage({ mode = 'login' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const confirmed = searchParams.get('confirmed') === '1';
  const urlError = searchParams.get('error');
  const isSignupMode = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [validationSubmitted, setValidationSubmitted] = useState(false);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const isBusy = loginLoading || signupLoading;

  // basic front-end validity guard
  const emailValid = useMemo(
    () => /\S+@\S+\.\S+/.test(email.trim()),
    [email]
  );
  const showEmailValidation = validationSubmitted && !emailValid;
  const showPasswordValidation = validationSubmitted && password.length < 6;
  const showConfirmValidation =
    isSignupMode && validationSubmitted && confirmPassword !== password;

  const validateCredentials = () => {
    setValidationSubmitted(true);

    if (!emailValid || password.length < 6) {
      setError(CREDENTIAL_VALIDATION_ERROR);
      return false;
    }

    if (isSignupMode && password !== confirmPassword) {
      setError(PASSWORD_MATCH_ERROR);
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (
      validationSubmitted &&
      emailValid &&
      password.length >= 6 &&
      error === CREDENTIAL_VALIDATION_ERROR
    ) {
      setError(null);
    }
    if (
      validationSubmitted &&
      isSignupMode &&
      password === confirmPassword &&
      error === PASSWORD_MATCH_ERROR
    ) {
      setError(null);
    }
  }, [confirmPassword, emailValid, error, isSignupMode, password, validationSubmitted]);

  useEffect(() => {
    if (confirmed) {
      setSuccessMessage('Email confirmed. Log in to continue.');
    }
  }, [confirmed]);

  useEffect(() => {
    if (!urlError) return;

    const messages = {
      'invalid-session': 'Your sign-in link expired or could not be verified. Try logging in again.',
      'sync-failed': 'We could not finish signing you in. Try logging in again.',
      'sync-exception': 'Something went wrong while signing you in. Try logging in again.',
    };

    setError(messages[urlError] || 'Something went wrong. Try again.');
  }, [urlError]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!validateCredentials()) return;

    setLoginLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await login({ email, password, redirectTo });
      if (result?.error) {
        setError(authErrorMessage(result.error, 'login'));
        return;
      }

      if (result?.success) {
        router.replace(result.redirectTo || '/');
        router.refresh();
      }
    } catch (err) {
      setError(authErrorMessage(err?.message, 'login'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignUp = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!validateCredentials()) return;

    setSignupLoading(true);
    setError(null);
    setSuccessMessage(null);

    const loginRedirect =
      redirectTo && redirectTo !== '/'
        ? `/login?confirmed=1&redirectTo=${encodeURIComponent(redirectTo)}`
        : '/login?confirmed=1';

    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/magic-link-sync?redirectTo=${encodeURIComponent(loginRedirect)}`
            : `http://localhost:3000/magic-link-sync?redirectTo=${encodeURIComponent(loginRedirect)}`,
      },
    });

    if (signErr) {
      setError(authErrorMessage(signErr.message, 'signup'));
    } else {
      const hasIdentity = Boolean(data?.user?.identities?.length);
      setSuccessMessage(
        hasIdentity
          ? 'Success! Check your email to confirm your account.'
          : 'An account already exists for this email. Log in instead, or reset your password if you cannot get in.'
      );
    }
    setSignupLoading(false);
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
  const pageCopy = isSignupMode
    ? {
        title: 'Create your WhereKeep account',
        subtitle: 'Start free. Upgrade later when you need unlimited inventory or shared access.',
        submit: 'Create account',
        loading: 'Creating account...',
        alternateLabel: 'Already have an account?',
        alternateHref: `/login${redirectTo && redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
        alternateText: 'Log in',
        passwordAutoComplete: 'new-password',
      }
    : {
        title: 'Log in to WhereKeep',
        subtitle: 'Welcome back. Continue managing your inventory.',
        submit: 'Log in',
        loading: 'Logging in...',
        alternateLabel: 'New to WhereKeep?',
        alternateHref: `/signup${redirectTo && redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
        alternateText: 'Create an account',
        passwordAutoComplete: 'current-password',
      };
  const formSubmit = isSignupMode ? handleSignUp : handleSignIn;

  return (
    <>
    <main className="page-enter min-h-[100vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[540px]"
      >
        {/* Card */}
        <div className="rounded-2xl border border-stocksense-gray bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-6 pb-4 bg-gradient-to-r from-stocksense-teal to-stocksense-sky">
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white">
                <Image
                  src="/wherekeep-app-icon.png"
                  alt=""
                  width={48}
                  height={48}
                  priority
                  className="rounded-xl"
                />
              </div>
              <div>
                <h1 className="text-white text-xl sm:text-2xl font-semibold leading-tight">
                  {pageCopy.title}
                </h1>
                <p className="text-white/80 text-xs sm:text-sm">{pageCopy.subtitle}</p>
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

            <form onSubmit={formSubmit} className="space-y-4" noValidate>
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
                {showEmailValidation && (
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
                    autoComplete={pageCopy.passwordAutoComplete}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white pr-10"
                  />
                </div>
                {showPasswordValidation && (
                  <p className="text-xs text-amber-700">Min length is 6 characters.</p>
                )}
              </motion.div>

              {isSignupMode && (
                <motion.div variants={item} className="space-y-1">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-stocksense-dark-gray">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-stocksense-gray px-3 py-2 outline-none focus:ring-2 focus:ring-stocksense-sky/60 focus:border-stocksense-sky bg-white"
                  />
                  {showConfirmValidation && (
                    <p className="text-xs text-amber-700">Passwords must match.</p>
                  )}
                </motion.div>
              )}

              {/* Submit */}
              <motion.div variants={item} className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={isBusy}
                  className={`w-full inline-flex items-center cursor-pointer justify-center rounded-lg px-4 py-2.5 text-white font-medium transition
                    ${!isBusy ? 'bg-stocksense-teal hover:bg-stocksense-tealDark' : 'bg-stocksense-teal/50 cursor-not-allowed'}
                  `}
                >
                  {isBusy ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
                      </svg>
                      <span>{pageCopy.loading}</span>
                    </span>
                  ) : (
                    pageCopy.submit
                  )}
                </button>

                <p className="text-center text-sm text-stocksense-dark-gray/75">
                  {pageCopy.alternateLabel}{' '}
                  <Link
                    href={pageCopy.alternateHref}
                    className="font-semibold text-stocksense-teal hover:text-stocksense-tealDark"
                  >
                    {pageCopy.alternateText}
                  </Link>
                </p>
              </motion.div>

              {/* Helper links */}
              <motion.div variants={item} className="flex flex-col gap-1 pt-1 text-xs text-stocksense-dark-gray/70 sm:flex-row sm:items-center sm:justify-between">
                {isSignupMode ? (
                  <>
                    <span>Use an email you can access for confirmation.</span>
                    <span>Invited? Sign up with that email.</span>
                  </>
                ) : (
                  <>
                    <Link href="/forgot-password" className="text-sm text-stocksense-teal hover:text-stocksense-tealDark">
                      Forgot password?
                    </Link>
                    <span>Use the email tied to your household.</span>
                  </>
                )}
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
          By continuing you agree to the{' '}
          <Link href="/terms" className="font-semibold text-stocksense-teal hover:text-stocksense-tealDark">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-semibold text-stocksense-teal hover:text-stocksense-tealDark">
            Privacy Policy
          </Link>
          .
        </motion.p>
      </motion.div>
    </main>
    <SiteFooter compact />
    </>
  );
}
