import { NextResponse } from "next/server";
import { getSession } from "@/lib/sessionOptions";
import { createClient } from "@/utils/supabase/server";

export async function GET(req) {
  try {
    const session = await getSession();
    session.destroy();

    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Logout route error:", err);
  }

  return NextResponse.redirect(new URL("/login", req.url));
}
