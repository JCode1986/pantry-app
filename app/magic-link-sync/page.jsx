'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function MagicLinkSync() {
  const router = useRouter();

  useEffect(() => {
    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;

      if (session?.access_token) {
        // Send token to API to save Iron Session
        const res = await fetch('/api/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user,
          }),
        });

        if (res.ok) {
          console.log('✅ Iron Session synced');
          router.push('/'); // Redirect to home/dashboard
        } else {
          console.error('❌ Failed to sync Iron Session');
        }
      } else {
        console.warn('No Supabase session found in localStorage');
        router.push('/login');
      }
    };

    syncSession();
  }, [router]);

  return (
    <main className="flex justify-center items-center h-screen">
      <p>Setting up your session...</p>
    </main>
  );
}
