import { cache } from "react";
import { getSessionForLayout } from "@/app/actions/auth";
import {
  HOUSEHOLD_ROLES,
  canEditHouseholdInventory,
  getHouseholdBilling,
  getHouseholdForUser,
  hasHouseholdInviteMetadata,
  normalizeHouseholdRole,
} from "@/utils/households";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { addDays, toDateString } from "@/utils/pantry/date";

function getErrorMessage(error) {
  if (!error) return null;
  return error.message || error.code || String(error);
}

function logNavigationWarning(message, details) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(message, details);
}

function firstRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

function normalizeSummaryCounts(row) {
  if (!row) return null;

  return {
    expiredCount: Number(row.expired_count ?? 0),
    expiringSoonCount: Number(row.expiring_soon_count ?? 0),
    shoppingListNeededItems: Number(row.shopping_list_needed_items ?? 0),
    shoppingListItemsCount: Number(row.shopping_list_items_count ?? 0),
    locationsCount: Number(row.locations_count ?? 0),
    storageAreasCount: Number(row.storage_areas_count ?? 0),
    categoriesCount: Number(row.categories_count ?? 0),
    itemsCount: Number(row.items_count ?? 0),
    lowStockCount: Number(row.low_stock_count ?? 0),
    summaryCountsLoaded: true,
  };
}

async function getNavigationAttentionCounts(supabase, withinDays = 3) {
  try {
    const { data, error } = await supabase.rpc(
      "wherekeep_inventory_summary_counts",
      { p_within_days: withinDays }
    );
    const counts = normalizeSummaryCounts(firstRpcRow(data));

    if (!error && counts) return counts;
    if (error) {
      logNavigationWarning(
        "Navigation summary RPC unavailable; falling back to count queries.",
        getErrorMessage(error)
      );
    }
  } catch (err) {
    logNavigationWarning(
      "Navigation summary RPC failed; falling back to count queries.",
      getErrorMessage(err)
    );
  }

  const today = toDateString(new Date());
  const cutoff = toDateString(addDays(new Date(), withinDays));

  const [
    { count: expiredCount = 0, error: expiredError },
    { count: expiringSoonCount = 0, error: expiringSoonError },
    { count: shoppingListNeededItems = 0, error: shoppingListError },
    { count: locationsCount = 0, error: locationsError },
    { count: storageAreasCount = 0, error: storageAreasError },
    { count: categoriesCount = 0, error: categoriesError },
    { count: itemsCount = 0, error: itemsError },
  ] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .lt("expiration_date", today),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .gte("expiration_date", today)
      .lte("expiration_date", cutoff),
    supabase
      .from("shopping_list_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "needed"),
    supabase.from("locations").select("id", { count: "exact", head: true }),
    supabase.from("storage_areas").select("id", { count: "exact", head: true }),
    supabase.from("storage_categories").select("id", { count: "exact", head: true }),
    supabase.from("items").select("id", { count: "exact", head: true }),
  ]);

  if (
    expiredError ||
    expiringSoonError ||
    shoppingListError ||
    locationsError ||
    storageAreasError ||
    categoriesError ||
    itemsError
  ) {
    logNavigationWarning("Navigation attention counts unavailable.", {
      expiredError: getErrorMessage(expiredError),
      expiringSoonError: getErrorMessage(expiringSoonError),
      shoppingListError: getErrorMessage(shoppingListError),
      locationsError: getErrorMessage(locationsError),
      storageAreasError: getErrorMessage(storageAreasError),
      categoriesError: getErrorMessage(categoriesError),
      itemsError: getErrorMessage(itemsError),
    });
    return {
      expiredCount: 0,
      expiringSoonCount: 0,
      shoppingListNeededItems: 0,
      locationsCount: 0,
      storageAreasCount: 0,
      categoriesCount: 0,
      itemsCount: 0,
    };
  }

  return {
    expiredCount: expiredCount ?? 0,
    expiringSoonCount: expiringSoonCount ?? 0,
    shoppingListNeededItems: shoppingListNeededItems ?? 0,
    shoppingListItemsCount: 0,
    locationsCount: locationsCount ?? 0,
    storageAreasCount: storageAreasCount ?? 0,
    categoriesCount: categoriesCount ?? 0,
    itemsCount: itemsCount ?? 0,
    lowStockCount: 0,
    summaryCountsLoaded: false,
  };
}

async function getNavigationHouseholdCounts(householdId) {
  if (!householdId) {
    return {
      memberCount: 0,
      inviteCount: 0,
    };
  }

  const admin = createAdminClient();
  const [
    { count: memberCount = 0, error: membersError },
    { count: inviteCount = 0, error: invitesError },
  ] = await Promise.all([
    admin
      .from("household_members")
      .select("user_id", { count: "exact", head: true })
      .eq("household_id", householdId),
    admin
      .from("household_invites")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("status", "pending"),
  ]);

  if (membersError || invitesError) {
    logNavigationWarning("Navigation household counts unavailable.", {
      membersError: getErrorMessage(membersError),
      invitesError: getErrorMessage(invitesError),
    });
    return {
      memberCount: 0,
      inviteCount: 0,
    };
  }

  return {
    memberCount: memberCount ?? 0,
    inviteCount: inviteCount ?? 0,
  };
}

export function getPreferredName(user) {
  const metadata = user?.user_metadata ?? {};
  const name =
    metadata.preferred_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    "";

  return name ? String(name).trim() : "";
}

export function needsInvitePasswordSetup(user) {
  return (
    user?.user_metadata?.requires_password_setup !== false &&
    Boolean(
      user?.user_metadata?.requires_password_setup ||
        user?.invited_at ||
        user?.user_metadata?.household_invite_token
    )
  );
}

export const getAuthenticatedAppShellState = cache(async function getAuthenticatedAppShellState() {
  const session = await getSessionForLayout();
  let currentUser = session?.user?.user ?? null;
  let canEditInventory = true;
  let attentionCounts = {
    expiredCount: 0,
    expiringSoonCount: 0,
    shoppingListNeededItems: 0,
    locationsCount: 0,
    storageAreasCount: 0,
    categoriesCount: 0,
    itemsCount: 0,
    shoppingListItemsCount: 0,
    lowStockCount: 0,
    summaryCountsLoaded: false,
    memberCount: 0,
    inviteCount: 0,
  };
  let navigationSummary = {
    householdName: "",
    householdRole: "",
    effectivePlanId: "free",
    isFamilyPlan: false,
    displayName: "",
  };
  let supabase = null;

  if (!currentUser?.id) {
    try {
      supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUser = user ?? null;
    } catch (err) {
      logNavigationWarning("Navigation Supabase user unavailable.", getErrorMessage(err));
    }
  }

  if (currentUser?.id) {
    try {
      if (!supabase) supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user?.id === currentUser.id) {
        currentUser = user;
      } else if (!user) {
        currentUser = null;
      }
    } catch (err) {
      logNavigationWarning("Navigation Supabase display name unavailable.", getErrorMessage(err));
      currentUser = null;
    }
  }

  if (currentUser?.id) {
    try {
      const { household, member } = await getHouseholdForUser({
        userId: currentUser.id,
        email: currentUser.email,
        createIfMissing: !hasHouseholdInviteMetadata(currentUser),
      });
      const billing = await getHouseholdBilling(household);
      canEditInventory = canEditHouseholdInventory(member);
      navigationSummary = {
        householdName: household?.name || "",
        householdRole: normalizeHouseholdRole(member?.role, HOUSEHOLD_ROLES.VIEWER),
        effectivePlanId: billing.effectivePlanId,
        isFamilyPlan: billing.effectivePlanId === "family",
        displayName: getPreferredName(currentUser),
      };
      attentionCounts = {
        ...attentionCounts,
        ...(await getNavigationHouseholdCounts(household?.id)),
      };
    } catch (err) {
      logNavigationWarning("Navigation household summary unavailable.", getErrorMessage(err));
    }

    try {
      if (!supabase) supabase = await createClient();
      attentionCounts = {
        ...attentionCounts,
        ...(await getNavigationAttentionCounts(supabase)),
      };
    } catch (err) {
      logNavigationWarning("Navigation attention counts unavailable.", getErrorMessage(err));
    }
  }

  return {
    currentUser,
    canEditInventory,
    attentionCounts,
    navigationSummary,
  };
});
