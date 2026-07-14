'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import WhereKeepLoader from '@/components/ui/WhereKeepLoader';

export default function MagicLinkSyncPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '';

  useEffect(() => {
    const getInviteRedirectFromSession = (session) => {
      const token = session?.user?.user_metadata?.household_invite_token;

      if (typeof token !== 'string' || !token.trim()) {
        return '/';
      }

      return `/invite/${encodeURIComponent(token.trim())}`;
    };

    const getSafeRedirect = (value, fallback = '/') => {
      return value && value.startsWith('/') && !value.startsWith('//')
        ? value
        : fallback;
    };

    const redirectToLogin = (errorCode) => {
      const safeRedirect =
        getSafeRedirect(redirectTo, '/');
      const params = new URLSearchParams({
        error: errorCode,
      });

      if (safeRedirect !== '/') {
        params.set('redirectTo', safeRedirect);
      }

      router.replace(`/login?${params.toString()}`);
    };

    const syncSession = async () => {
      try {
        let activeSession = null;
        let sessionError = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (session?.access_token && session?.refresh_token) {
            activeSession = session;
            break;
          }

          sessionError = error;
          await new Promise((resolve) => window.setTimeout(resolve, 200));
        }

        if (sessionError || !activeSession) {
          console.error('No session found or error:', sessionError);
          redirectToLogin('invalid-session');
          return;
        }

        const res = await fetch('/api/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: activeSession.access_token,
            refresh_token: activeSession.refresh_token,
            expires_at: activeSession.expires_at,
            user: activeSession.user,
          }),
        });

        if (!res.ok) {
          let errorCode = 'sync-failed';
          try {
            const payload = await res.json();
            if (typeof payload?.code === 'string') errorCode = payload.code;
            console.error('Failed to sync session:', payload);
          } catch {
            console.error('Failed to sync session:', await res.text());
          }
          redirectToLogin(errorCode);
          return;
        }

        const safeRedirect = getSafeRedirect(
          redirectTo,
          getInviteRedirectFromSession(activeSession)
        );

        window.location.replace(safeRedirect);
      } catch (err) {
        console.error('Sync error:', err);
        redirectToLogin('sync-exception');
      }
    };

    syncSession();
  }, [redirectTo, router]);

  return (
    <main className="page-enter flex h-screen items-center justify-center px-4">
      <WhereKeepLoader
        label="Syncing your session..."
        detail="Please wait, redirecting shortly."
      />
    </main>
  );
}
