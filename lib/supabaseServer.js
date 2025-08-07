import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export function supabaseServer(access_token) {
  const client = createServerComponentClient({ cookies });

  if (access_token) {
    client.auth.set
    client.auth.setAuth(access_token);
  }

  return client;
}
