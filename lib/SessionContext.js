// 'use client';
// import { createContext, useContext, useEffect, useState } from 'react';
// import { supabase } from './supabaseClient';

// const SessionContext = createContext();

// export function SessionProvider({ children }) {
//     const [session, setSession] = useState(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         // Get current session on load
//         const getSession = async () => {
//             const { data: { session } } = await supabase.auth.getSession();
//             setSession(session);
//             setLoading(false);
//         };
//         getSession();

//         // Listen for auth state changes
//         const { data: listener } = supabase.auth.onAuthStateChange(
//             (event, session) => {
//                 setSession(session);
//             }
//         );

//         return () => {
//             listener.subscription.unsubscribe();
//         };
//     }, []);

//     return (
//         <SessionContext.Provider value={{ session, loading }}>
//             {children}
//         </SessionContext.Provider>
//     );
// }

// export function useSession() {
//     return useContext(SessionContext);
// }

// lib/SessionContext.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { refreshTokenIfNeeded } from '@/app/actions/auth';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Existing Supabase client session tracking
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
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
