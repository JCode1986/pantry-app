"use server";

import { createClient } from "@/utils/supabase/server";
import { getSession } from "@/lib/sessionOptions";
import { createAdminClient } from "@/utils/supabase/admin";
import { getHouseholdForUser } from "@/utils/households";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const ACTION_FILTERS = new Set(["added", "updated", "deleted", "moved"]);

function normalizeLimit(value) {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

function normalizeAction(value) {
  const action = typeof value === "string" ? value.toLowerCase() : "";
  return ACTION_FILTERS.has(action) ? action : "all";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthedUser() {
  const session = await getSession();
  const user = session?.user?.user;

  if (!session?.user?.access_token || !user?.id) {
    return { user: null, error: "Your session has expired. Please log in again." };
  }

  return { user, error: null };
}

export async function getActivityFilterOptionsAction() {
  const { user, error } = await getAuthedUser();
  if (error) return { data: { members: [] }, error };

  try {
    const { household } = await getHouseholdForUser({
      userId: user.id,
      email: user.email,
      createIfMissing: true,
    });

    if (!household?.id) {
      return { data: { members: [] }, error: null };
    }

    const admin = createAdminClient();
    const { data, error: membersError } = await admin
      .from("household_members")
      .select("user_id, email, role")
      .eq("household_id", household.id)
      .order("joined_at", { ascending: true });

    if (membersError) throw membersError;

    return {
      data: {
        members: (data ?? []).map((member) => ({
          userId: member.user_id,
          email: member.email || "Unknown email",
          role: member.role,
        })),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { members: [] },
      error: err?.message || "Could not load activity filters.",
    };
  }
}

export async function getRecentActivityAction(filters = {}) {
  const { error: authError } = await getAuthedUser();
  if (authError) {
    return {
      data: { items: [], nextCursor: null, hasMore: false },
      error: authError,
    };
  }

  const limit = normalizeLimit(filters.limit);
  const action = normalizeAction(filters.action);
  const actorUserId = normalizeText(filters.actorUserId);
  const cursor = normalizeText(filters.cursor);

  try {
    const supabase = await createClient();
    let query = supabase
      .from("recent_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (action !== "all") {
      query = query.eq("action", action);
    }

    if (actorUserId) {
      query = query.eq("actor_user_id", actorUserId);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const items = rows.slice(0, limit);

    return {
      data: {
        items,
        hasMore: rows.length > limit,
        nextCursor: items.at(-1)?.created_at ?? null,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { items: [], nextCursor: null, hasMore: false },
      error: err?.message || "Could not load recent activity.",
    };
  }
}
