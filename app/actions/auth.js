'use server';

import { getSession } from "@/lib/sessionOptions";
import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

export async function login({ email, password }) {
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

    redirect("/")
}

export async function logout() {
  const session = await getSession();

  // 1️⃣ Supabase sign out (client-side session)
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out Supabase:', error);
    throw new Error('Failed to sign out');
  }

  // 2️⃣ Destroy Iron Session (server-side session)
  session.destroy();

  // 3️⃣ Return success so client can redirect
  return { success: true };
}

