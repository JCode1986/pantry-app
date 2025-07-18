// 'use server';
// import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';

// export const supabaseServer = async () => {
//     const cookieStore = await cookies();
//     return createServerComponentClient({ cookies: cookieStore });
// };

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
