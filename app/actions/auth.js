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

export async function refreshToken() {
  const session = await getSession();
  const refresh_token = session?.user?.refresh_token;

  if (!refresh_token) throw new Error("Missing refresh token");

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error || !data?.session) {
    throw new Error(error?.message || "Failed to refresh session");
  }

  const newSession = data.session;

  session.user = {
    access_token: newSession.access_token,
    refresh_token: newSession.refresh_token,
    expires_at: newSession.expires_at,
    user: newSession.user,
  };

  await session.save();
}

export async function getValidSession() {
  const session = await getSession();

  const user = session?.user;
  if (!user?.expires_at || !user?.refresh_token) return null;

  const now = Math.floor(Date.now() / 1000);

  if (now < user.expires_at - 60) {
    return session; // token is still valid
  }

  try {
    // attempt to refresh if user is active
    await refreshToken();
    // return await getSession();
  } catch (e) {
    console.warn("Token refresh failed. Logging out.");
    await logout();
    return null;
  }
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

