'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { refreshTokenIfNeeded } from '@/app/actions/auth';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Existing Supabase client session tracking
  useEffect(() => {
    let isActive = true;
    let subscription = null;

    const startSessionTracking = async () => {
      try {
        const { supabase } = await import('./supabaseClient');
        if (!isActive) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isActive) return;

        setSession(session);
        setLoading(false);

        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, nextSession) => {
            setSession(nextSession);
          }
        );
        subscription = listener.subscription;
      } catch (error) {
        console.error('Supabase session tracking failed:', error);
        if (isActive) setLoading(false);
      }
    };

    startSessionTracking();

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, []);

  // 🔁 New: background refresh loop for Iron Session + Supabase
  useEffect(() => {
    if (!session) return; // not logged in on client

    let isMounted = true;
    let timerId;

    async function scheduleNextRefresh() {
      const res = await refreshTokenIfNeeded();
      if (!isMounted) return;

      if (!res?.ok) {
        // Session is gone or refresh failed – stop the loop
        return;
      }

      const expiresAt = res.expires_at;
      if (!expiresAt) return;

      const now = Math.floor(Date.now() / 1000);
      // Refresh again ~90s before expiry, minimum 30s from now
      const msUntilNext =
        Math.max(30_000, (expiresAt - now - 90) * 1000);

      timerId = setTimeout(scheduleNextRefresh, msUntilNext);
    }

    // Kick off the loop once when a session exists
    scheduleNextRefresh();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [session?.access_token]); // restart the loop if the session changes

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
