// lib/supabaseServerClient.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export function supabaseServerClient(req) {
  return createServerComponentClient({
    cookies: req.cookies, // pass the request cookies
  });
}
