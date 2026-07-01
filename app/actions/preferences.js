"use server";

import { getSession } from "@/lib/sessionOptions";
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
} from "@/utils/appPreferences";
import {
  getHouseholdBilling,
  getHouseholdForUser,
} from "@/utils/households";

const APPEARANCE_UPGRADE_MESSAGE =
  "Appearance customization requires a Plus or Family plan.";

async function createAuthedClient() {
  const session = await getSession();
  const accessToken = session?.user?.access_token;
  const refreshToken = session?.user?.refresh_token;
  const user = session?.user?.user;
  const userId = user?.id;

  if (!accessToken || !refreshToken || !userId) {
    return {
      supabase: null,
      user: null,
      userId: null,
      error: "Your session has expired. Please log in again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return {
      supabase: null,
      user: null,
      userId: null,
      error: error.message || "Your session has expired. Please log in again.",
    };
  }

  return { supabase, user, userId, error: null };
}

async function canCustomizeAppearance(user) {
  const { household } = await getHouseholdForUser({
    userId: user?.id,
    email: user?.email,
    createIfMissing: true,
  });
  const billing = await getHouseholdBilling(household);

  return billing.effectivePlanId !== "free";
}

export async function getUserPreferencesAction() {
  const { supabase, user, userId, error } = await createAuthedClient();

  if (error) {
    return {
      data: DEFAULT_PREFERENCES,
      error,
    };
  }

  try {
    const hasAppearanceAccess = await canCustomizeAppearance(user);

    if (!hasAppearanceAccess) {
      return {
        data: DEFAULT_PREFERENCES,
        error: null,
      };
    }
  } catch (err) {
    console.error("getUserPreferencesAction billing error:", err);
    return {
      data: DEFAULT_PREFERENCES,
      error: err?.message || "Could not verify appearance access.",
    };
  }

  const { data, error: fetchError } = await supabase
    .from("user_preferences")
    .select("theme_id, font_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("getUserPreferencesAction error:", fetchError);
    return {
      data: DEFAULT_PREFERENCES,
      error: fetchError.message || "Could not load preferences.",
    };
  }

  return {
    data: normalizePreferences({
      themeId: data?.theme_id,
      fontId: data?.font_id,
    }),
    error: null,
  };
}

export async function updateUserPreferencesAction(preferences) {
  const normalized = normalizePreferences(preferences);
  const { supabase, user, userId, error } = await createAuthedClient();

  if (error) {
    return { data: normalized, error };
  }

  try {
    const hasAppearanceAccess = await canCustomizeAppearance(user);

    if (!hasAppearanceAccess) {
      return {
        data: DEFAULT_PREFERENCES,
        error: APPEARANCE_UPGRADE_MESSAGE,
      };
    }
  } catch (err) {
    console.error("updateUserPreferencesAction billing error:", err);
    return {
      data: normalized,
      error: err?.message || "Could not verify appearance access.",
    };
  }

  const { data, error: upsertError } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        theme_id: normalized.themeId,
        font_id: normalized.fontId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("theme_id, font_id")
    .single();

  if (upsertError) {
    console.error("updateUserPreferencesAction error:", upsertError);
    return {
      data: normalized,
      error: upsertError.message || "Could not save preferences.",
    };
  }

  return {
    data: normalizePreferences({
      themeId: data?.theme_id,
      fontId: data?.font_id,
    }),
    error: null,
  };
}
