'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MagicLinkSyncPage() {
  const router = useRouter();

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

        console.log(session, 'sesssssion')

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
        router.push('/');
      } catch (err) {
        console.error('Sync error:', err);
        router.push('/login?error=sync-exception');
      }
    };

    syncSession();
  }, [router]);

  return (
    <main className="flex justify-center items-center h-screen">
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">🔄 Syncing your session...</h1>
        <p className="text-gray-600 mb-6">Please wait, redirecting shortly.</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
      </div>
    </main>
  );
}
