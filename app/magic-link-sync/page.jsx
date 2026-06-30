'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import WhereKeepLoader from '@/components/WhereKeepLoader';

export default function MagicLinkSyncPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  useEffect(() => {
    const syncSession = async () => {
      try {
        // ✅ Get Supabase session from localStorage
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.error('No session found or error:', error);
          router.push('/login?error=invalid-session');
          return;
        }

        // ✅ Send session to API to store in Iron Session
        const res = await fetch('/api/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: session.user,
          }),
        });

        if (!res.ok) {
          console.error('Failed to sync session:', await res.text());
          router.push('/login?error=sync-failed');
          return;
        }

        // ✅ Redirect to homepage (or dashboard)
        const safeRedirect =
          redirectTo.startsWith('/') && !redirectTo.startsWith('//')
            ? redirectTo
            : '/';

        router.push(safeRedirect);
      } catch (err) {
        console.error('Sync error:', err);
        router.push('/login?error=sync-exception');
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
