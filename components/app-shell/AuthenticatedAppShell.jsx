import { Suspense } from "react";
import Navigation from "@/components/app-shell/Navigation";
import LazySupportChatbot from "@/components/app-shell/LazySupportChatbot";
import InviteAcceptedModal from "@/components/auth/InviteAcceptedModal";
import InvitePasswordSetupModal from "@/components/auth/InvitePasswordSetupModal";
import { getSessionForLayout } from "@/app/actions/auth";
import { Providers } from "@/components/app-shell/Providers";
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

function addDays(date, days) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error) {
  if (!error) return null;
  return error.message || error.code || String(error);
}

function logNavigationWarning(message, details) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(message, details);
}

async function getNavigationAttentionCounts(supabase, withinDays = 3) {
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
      .select("*", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .lt("expiration_date", today),
    supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .gte("expiration_date", today)
      .lte("expiration_date", cutoff),
    supabase
      .from("shopping_list_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "needed"),
    supabase.from("locations").select("*", { count: "exact", head: true }),
    supabase.from("storage_areas").select("*", { count: "exact", head: true }),
    supabase.from("storage_categories").select("*", { count: "exact", head: true }),
    supabase.from("items").select("*", { count: "exact", head: true }),
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
    locationsCount: locationsCount ?? 0,
    storageAreasCount: storageAreasCount ?? 0,
    categoriesCount: categoriesCount ?? 0,
    itemsCount: itemsCount ?? 0,
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
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId),
    admin
      .from("household_invites")
      .select("*", { count: "exact", head: true })
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

function getPreferredName(user) {
  const metadata = user?.user_metadata ?? {};
  const name =
    metadata.preferred_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    "";

  return name ? String(name).trim() : "";
}

function needsInvitePasswordSetup(user) {
  return (
    user?.user_metadata?.requires_password_setup !== false &&
    Boolean(
      user?.user_metadata?.requires_password_setup ||
        user?.invited_at ||
        user?.user_metadata?.household_invite_token
    )
  );
}

export async function getAuthenticatedAppShellState() {
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
}

export default async function AuthenticatedAppShell({ children }) {
  const {
    currentUser,
    canEditInventory,
    attentionCounts,
    navigationSummary,
  } = await getAuthenticatedAppShellState();

  if (!currentUser?.id) {
    return children;
  }

  return (
    <Providers isAuthenticated>
      <Navigation
        canEditInventory={canEditInventory}
        attentionCounts={attentionCounts}
        navigationSummary={navigationSummary}
        initialPreferredName={getPreferredName(currentUser)}
      />
      <div className="wherekeep-auth-shell bg-gradient-to-br from-stocksense-teal/10 via-stocksense-sky/10 to-stocksense-lime/10">
        {children}
      </div>
      <InvitePasswordSetupModal
        requiresPasswordSetup={needsInvitePasswordSetup(currentUser)}
      />
      <Suspense fallback={null}>
        <InviteAcceptedModal />
      </Suspense>
      <LazySupportChatbot />
    </Providers>
  );
}
