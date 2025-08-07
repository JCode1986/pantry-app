import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ Auto-refresh session client-side
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Session token refreshed!', session);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out.');
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in.');
  }
});