'use server';

import { getSession } from "@/lib/sessionOptions";
import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function login({ email, password }) {
  const supabase = await createClient()
  const session = await getSession();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
      throw new Error(error.message);
  }

  // Store tokens securely in Iron Session
  session.user = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.session.user,
  };
  await session.save();

  revalidatePath('/', 'layout')
  redirect("/")
}

export async function logout() {
  const session = await getSession();

  // ✅ Destroy Iron Session
  session.destroy();

  // ✅ Clear Supabase Auth (client-side cookie)
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out Supabase:', error);
    throw new Error('Failed to sign out');
  }

  return { success: true };
}

