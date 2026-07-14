"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/sessionOptions";
import { getVerifiedSession } from "@/lib/verifiedSession";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  HOUSEHOLD_ROLES,
  canManageHousehold,
  createInviteToken,
  getHouseholdBilling,
  getHouseholdForUser,
  getHouseholdMemberCount,
  getInviteExpirationDate,
  hasHouseholdInviteMetadata,
  isValidInviteEmail,
  normalizeHouseholdRole,
  normalizeInviteEmail,
} from "@/utils/households";
import { getCanonicalAppUrl } from "@/utils/urlSecurity";

function actionError(message) {
  return { data: null, error: message };
}

function isLocalAppOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function getRequestOrigin(headersList) {
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost || headersList.get("host");
  if (!host) return null;

  const forwardedProto = headersList.get("x-forwarded-proto");
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

async function getHouseholdAppUrl() {
  const configuredUrl = getCanonicalAppUrl();

  if (!isLocalAppOrigin(configuredUrl)) {
    return configuredUrl;
  }

  try {
    const requestOrigin = getRequestOrigin(await headers());
    if (requestOrigin && !isLocalAppOrigin(requestOrigin)) {
      return requestOrigin;
    }
  } catch {
    // Keep the configured local URL for local development and non-request contexts.
  }

  return configuredUrl;
}

async function getAuthedUser() {
  const { user, error } = await getVerifiedSession();

  if (error || !user?.id) {
    return { user: null, error: error || "Your session has expired. Please log in again." };
  }

  return { user, error: null };
}

async function getAuthedHousehold({ createIfMissing = true } = {}) {
  const { user, error } = await getAuthedUser();
  if (error) return { user: null, household: null, member: null, error };

  try {
    const { household, member } = await getHouseholdForUser({
      userId: user.id,
      email: user.email,
      createIfMissing: createIfMissing && !hasHouseholdInviteMetadata(user),
    });

    if (!household || !member) {
      return {
        user,
        household: null,
        member: null,
        error: "No household was found for this account.",
      };
    }

    return { user, household, member, error: null };
  } catch (err) {
    return {
      user,
      household: null,
      member: null,
      error: err?.message || "Could not load household details.",
    };
  }
}

function getUserDisplayName(user) {
  const metadata = user?.user_metadata ?? {};
  const name =
    metadata.preferred_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    "";

  return name ? String(name).trim() : "";
}

function getEmailDisplayName(email) {
  const name = String(email || "").split("@")[0]?.trim();
  return name || "";
}

function getInviteOwnerDisplayName(user) {
  return getUserDisplayName(user) || getEmailDisplayName(user?.email) || "the household owner";
}

async function getUserDisplayNameById(admin, userId, fallback = "") {
  if (!userId) return fallback;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    console.warn("Could not load household owner display name:", error);
    return fallback;
  }

  return getUserDisplayName(data?.user) || getEmailDisplayName(data?.user?.email) || fallback;
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

function getAcceptedInviteMetadata(user, requiresPasswordSetup) {
  const metadata = {
    ...(user?.user_metadata ?? {}),
    requires_password_setup: requiresPasswordSetup,
  };

  delete metadata.household_invite_token;
  delete metadata.household_invite_role;

  return metadata;
}

async function getMemberDisplayNames(admin, members = []) {
  const userIds = [
    ...new Set(
      (members ?? [])
        .map((member) => member?.user_id)
        .filter(Boolean)
    ),
  ];

  if (userIds.length === 0) return new Map();

  const results = await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) {
        console.warn("Could not load household member display name:", error);
        return [userId, ""];
      }

      return [userId, getUserDisplayName(data?.user)];
    })
  );

  return new Map(results);
}

function serializeMember(member, displayNamesByUserId = new Map()) {
  const displayName = displayNamesByUserId.get(member.user_id) || "";

  return {
    userId: member.user_id,
    email: member.email || "Unknown email",
    displayName: displayName || null,
    role: normalizeHouseholdRole(member.role),
    joinedAt: member.joined_at,
  };
}

function serializeInvite(invite, appUrl) {
  const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;
  const isExpired =
    invite.status === "expired" ||
    (invite.status === "pending" &&
      expiresAt &&
      !Number.isNaN(expiresAt.getTime()) &&
      expiresAt < new Date());

  return {
    id: invite.id,
    email: invite.email,
    role: normalizeHouseholdRole(invite.role),
    status: isExpired ? "expired" : invite.status,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
    link: `${appUrl}/invite/${invite.token}`,
  };
}

function isAlreadyRegisteredError(error) {
  return /already.*registered|already.*exists/i.test(error?.message || "");
}

function createEmailClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase email client is not configured.");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function sendExistingUserInviteEmail({
  email,
  redirectTo,
  householdName,
  ownerDisplayName,
  role,
}) {
  const supabase = createEmailClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
      data: {
        household_name: householdName,
        household_owner_name: ownerDisplayName,
        owner_display_name: ownerDisplayName,
        invited_by_display_name: ownerDisplayName,
        household_invite_role: normalizeHouseholdRole(role),
      },
    },
  });

  if (error) {
    return {
      sent: false,
      error: error.message || "Supabase could not send a login email.",
    };
  }

  return { sent: true, emailType: "magic_link", error: null };
}

async function sendInviteEmail({
  admin,
  email,
  householdName,
  ownerDisplayName,
  inviteToken,
  appUrl,
  role,
}) {
  const acceptPath = `/invite/${inviteToken}`;
  const redirectTo = `${appUrl}/magic-link-sync?redirectTo=${encodeURIComponent(acceptPath)}`;

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      household_name: householdName,
      household_owner_name: ownerDisplayName,
      owner_display_name: ownerDisplayName,
      invited_by_display_name: ownerDisplayName,
      household_invite_token: inviteToken,
      household_invite_role: normalizeHouseholdRole(role),
      requires_password_setup: true,
    },
  });

  if (error) {
    if (isAlreadyRegisteredError(error)) {
      return sendExistingUserInviteEmail({
        email,
        redirectTo,
        householdName,
        ownerDisplayName,
        role,
      });
    }

    return {
      sent: false,
      error: error.message || "Supabase could not send the invite email.",
    };
  }

  return { sent: true, emailType: "invite", error: null };
}

async function prepareExistingHouseholdForInviteAcceptance({
  admin,
  fromHouseholdId,
  toHouseholdId,
  userId,
  mergeExistingData = false,
}) {
  if (!fromHouseholdId || !toHouseholdId || fromHouseholdId === toHouseholdId) {
    return { error: null };
  }

  const { data: existingHousehold, error: householdError } = await admin
    .from("households")
    .select("id, owner_id")
    .eq("id", fromHouseholdId)
    .maybeSingle();

  if (householdError) throw householdError;
  if (!existingHousehold) return { error: null };

  if (existingHousehold.owner_id !== userId) {
    return {
      error:
        "This account already belongs to another household. Leave that household before accepting this invite.",
    };
  }

  const { count: otherMemberCount, error: membersError } = await admin
    .from("household_members")
    .select("*", { count: "exact", head: true })
    .eq("household_id", fromHouseholdId)
    .neq("user_id", userId);

  if (membersError) throw membersError;

  if ((otherMemberCount ?? 0) > 0) {
    return {
      error:
        "This account owns a household with other members. Remove those members before joining another household.",
    };
  }

  const [
    { count: locationCount, error: locationCountError },
    { count: shoppingListItemCount, error: shoppingListItemCountError },
  ] = await Promise.all([
    admin
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("household_id", fromHouseholdId),
    admin
      .from("shopping_list_items")
      .select("*", { count: "exact", head: true })
      .eq("household_id", fromHouseholdId),
  ]);

  if (locationCountError) throw locationCountError;
  if (shoppingListItemCountError) throw shoppingListItemCountError;

  const dataSummary = {
    locations: locationCount ?? 0,
    shoppingListItems: shoppingListItemCount ?? 0,
  };
  const hasSavedData =
    dataSummary.locations > 0 || dataSummary.shoppingListItems > 0;

  if (hasSavedData && !mergeExistingData) {
    return {
      requiresMerge: true,
      dataSummary,
    };
  }

  const scopedTableUpdates = [
    admin
      .from("locations")
      .update({ household_id: toHouseholdId })
      .eq("household_id", fromHouseholdId),
    admin
      .from("shopping_list_items")
      .update({ household_id: toHouseholdId })
      .eq("household_id", fromHouseholdId),
    admin
      .from("activity_events")
      .update({ household_id: toHouseholdId })
      .eq("household_id", fromHouseholdId),
  ];

  const updateResults = await Promise.all(scopedTableUpdates);
  const updateError = updateResults.find((result) => result.error)?.error;
  if (updateError) throw updateError;

  const { error: inviteDeleteError } = await admin
    .from("household_invites")
    .delete()
    .eq("household_id", fromHouseholdId);

  if (inviteDeleteError) throw inviteDeleteError;

  return {
    error: null,
    mergedExistingData: hasSavedData,
    dataSummary,
  };
}

export async function getHouseholdSharingAction() {
  const context = await getAuthedHousehold({ createIfMissing: true });
  if (context.error) return actionError(context.error);

  try {
    const admin = createAdminClient();
    const appUrl = await getHouseholdAppUrl();
    const { household, member } = context;
    const [{ data: members, error: membersError }, { data: invites, error: invitesError }] =
      await Promise.all([
        admin
          .from("household_members")
          .select("user_id, email, role, joined_at")
          .eq("household_id", household.id)
          .order("joined_at", { ascending: true }),
        admin
          .from("household_invites")
          .select("id, email, role, status, token, expires_at, created_at")
          .eq("household_id", household.id)
          .in("status", ["pending", "expired"])
          .order("created_at", { ascending: false }),
      ]);

    if (membersError) throw membersError;
    if (invitesError) throw invitesError;

    const billing = await getHouseholdBilling(household);
    const maxMembers = billing.limits.users ?? null;
    const memberCount = members?.length ?? 0;
    const displayNamesByUserId = await getMemberDisplayNames(admin, members);
    const isOwner = canManageHousehold(member, household, context.user.id);
    const canInvite =
      isOwner &&
      billing.effectivePlanId === "family" &&
      (maxMembers === null || memberCount < maxMembers);

    return {
      data: {
        household: {
          id: household.id,
          name: household.name,
          ownerId: household.owner_id,
        },
        currentUserRole: member.role,
        effectivePlanId: billing.effectivePlanId,
        maxMembers,
        memberCount,
        canInvite,
        members: (members ?? []).map((item) =>
          serializeMember(item, displayNamesByUserId)
        ),
        invites: (invites ?? []).map((invite) => serializeInvite(invite, appUrl)),
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not load household sharing.");
  }
}

export async function createHouseholdInviteAction(email, role = HOUSEHOLD_ROLES.EDITOR) {
  const normalizedEmail = normalizeInviteEmail(email);
  if (!isValidInviteEmail(normalizedEmail)) {
    return actionError("Enter a valid email address.");
  }
  const inviteRole = normalizeHouseholdRole(role, HOUSEHOLD_ROLES.EDITOR);
  if (inviteRole === HOUSEHOLD_ROLES.OWNER) {
    return actionError("Invites can be sent as Editor or Viewer. Ownership stays with the account holder.");
  }

  const context = await getAuthedHousehold({ createIfMissing: true });
  if (context.error) return actionError(context.error);

  const { user, household, member } = context;
  if (!canManageHousehold(member, household, user.id)) {
    return actionError("Only the household owner can invite members.");
  }

  try {
    const admin = createAdminClient();
    const billing = await getHouseholdBilling(household);
    if (billing.effectivePlanId !== "family") {
      return actionError("Upgrade to Family before inviting household members.");
    }

    const memberCount = await getHouseholdMemberCount(household.id);
    const maxMembers = billing.limits.users ?? null;
    if (maxMembers !== null && memberCount >= maxMembers) {
      return actionError(`Family includes up to ${maxMembers} members.`);
    }

    const { data: existingMember, error: existingMemberError } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", household.id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingMemberError) throw existingMemberError;
    if (existingMember) {
      return actionError("That email is already in this household.");
    }

    await admin
      .from("household_invites")
      .update({ status: "revoked" })
      .eq("household_id", household.id)
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    const token = createInviteToken();
    const { data: invite, error: inviteError } = await admin
      .from("household_invites")
      .insert({
        household_id: household.id,
        email: normalizedEmail,
        role: inviteRole,
        token,
        invited_by: user.id,
        expires_at: getInviteExpirationDate(),
      })
      .select("id, email, role, status, token, expires_at, created_at")
      .single();

    if (inviteError) throw inviteError;

    revalidatePath("/profile");
    const appUrl = await getHouseholdAppUrl();
    const emailResult = await sendInviteEmail({
      admin,
      email: normalizedEmail,
      householdName: household.name,
      ownerDisplayName: getInviteOwnerDisplayName(user),
      inviteToken: token,
      appUrl,
      role: inviteRole,
    });

    return {
      data: {
        invite: serializeInvite(invite, appUrl),
        emailSent: emailResult.sent,
        emailType: emailResult.emailType ?? null,
        emailError: emailResult.error,
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not create invite.");
  }
}

export async function revokeHouseholdInviteAction(inviteId) {
  if (!inviteId) return actionError("Invite is required.");

  const context = await getAuthedHousehold({ createIfMissing: true });
  if (context.error) return actionError(context.error);

  const { user, household, member } = context;
  if (!canManageHousehold(member, household, user.id)) {
    return actionError("Only the household owner can revoke invites.");
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("household_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId)
      .eq("household_id", household.id)
      .in("status", ["pending", "expired"]);

    if (error) throw error;

    revalidatePath("/profile");
    return { data: { id: inviteId }, error: null };
  } catch (err) {
    return actionError(err?.message || "Could not revoke invite.");
  }
}

export async function resendHouseholdInviteAction(inviteId) {
  if (!inviteId) return actionError("Invite is required.");

  const context = await getAuthedHousehold({ createIfMissing: true });
  if (context.error) return actionError(context.error);

  const { user, household, member } = context;
  if (!canManageHousehold(member, household, user.id)) {
    return actionError("Only the household owner can resend invites.");
  }

  try {
    const admin = createAdminClient();
    const billing = await getHouseholdBilling(household);
    if (billing.effectivePlanId !== "family") {
      return actionError("Upgrade to Family before inviting household members.");
    }

    const { data: existingInvite, error: inviteLookupError } = await admin
      .from("household_invites")
      .select("id, email, role, status")
      .eq("id", inviteId)
      .eq("household_id", household.id)
      .in("status", ["pending", "expired"])
      .maybeSingle();

    if (inviteLookupError) throw inviteLookupError;
    if (!existingInvite) return actionError("That invite is no longer active.");

    const { data: existingMember, error: existingMemberError } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", household.id)
      .eq("email", existingInvite.email)
      .maybeSingle();

    if (existingMemberError) throw existingMemberError;
    if (existingMember) {
      return actionError("That email is already in this household.");
    }

    const token = createInviteToken();
    const { data: invite, error: updateError } = await admin
      .from("household_invites")
      .update({
        token,
        status: "pending",
        expires_at: getInviteExpirationDate(),
        invited_by: user.id,
      })
      .eq("id", existingInvite.id)
      .eq("household_id", household.id)
      .select("id, email, role, status, token, expires_at, created_at")
      .single();

    if (updateError) throw updateError;

    const appUrl = await getHouseholdAppUrl();
    const emailResult = await sendInviteEmail({
      admin,
      email: invite.email,
      householdName: household.name,
      ownerDisplayName: getInviteOwnerDisplayName(user),
      inviteToken: token,
      appUrl,
      role: normalizeHouseholdRole(invite.role),
    });

    revalidatePath("/profile");
    return {
      data: {
        invite: serializeInvite(invite, appUrl),
        emailSent: emailResult.sent,
        emailType: emailResult.emailType ?? null,
        emailError: emailResult.error,
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not resend invite.");
  }
}

export async function removeHouseholdMemberAction(memberUserId) {
  if (!memberUserId) return actionError("Member is required.");

  const context = await getAuthedHousehold({ createIfMissing: true });
  if (context.error) return actionError(context.error);

  const { user, household, member } = context;
  if (!canManageHousehold(member, household, user.id)) {
    return actionError("Only the household owner can remove members.");
  }

  if (memberUserId === user.id) {
    return actionError("The household owner cannot be removed.");
  }

  try {
    const admin = createAdminClient();
    const { data: removedMember, error: lookupError } = await admin
      .from("household_members")
      .select("user_id, email, role")
      .eq("household_id", household.id)
      .eq("user_id", memberUserId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!removedMember) return actionError("That member was not found.");
    if (removedMember.role === "owner") {
      return actionError("The household owner cannot be removed.");
    }

    const { error: deleteError } = await admin
      .from("household_members")
      .delete()
      .eq("household_id", household.id)
      .eq("user_id", memberUserId)
      .neq("role", "owner");

    if (deleteError) throw deleteError;

    await admin
      .from("household_invites")
      .update({ status: "revoked" })
      .eq("household_id", household.id)
      .eq("email", removedMember.email)
      .eq("status", "pending");

    revalidatePath("/profile");
    revalidatePath("/");
    revalidatePath("/locations");
    revalidatePath("/areas");
    revalidatePath("/categories");
    revalidatePath("/items");
    revalidatePath("/shopping-list");

    return {
      data: {
        userId: memberUserId,
        email: removedMember.email,
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not remove member.");
  }
}

export async function updateHouseholdMemberRoleAction(memberUserId, role) {
  if (!memberUserId) return actionError("Member is required.");

  const nextRole = normalizeHouseholdRole(role, HOUSEHOLD_ROLES.VIEWER);
  if (nextRole === HOUSEHOLD_ROLES.OWNER) {
    return actionError("Ownership cannot be reassigned here.");
  }

  const context = await getAuthedHousehold({ createIfMissing: true });
  if (context.error) return actionError(context.error);

  const { user, household, member } = context;
  if (!canManageHousehold(member, household, user.id)) {
    return actionError("Only the household owner can change member roles.");
  }

  if (memberUserId === user.id) {
    return actionError("The household owner role cannot be changed.");
  }

  try {
    const admin = createAdminClient();
    const { data: updatedMember, error } = await admin
      .from("household_members")
      .update({ role: nextRole })
      .eq("household_id", household.id)
      .eq("user_id", memberUserId)
      .neq("role", "owner")
      .select("user_id, email, role, joined_at")
      .single();

    if (error) throw error;

    const displayNamesByUserId = await getMemberDisplayNames(admin, [
      updatedMember,
    ]);

    revalidatePath("/profile");
    revalidatePath("/");
    revalidatePath("/locations");
    revalidatePath("/areas");
    revalidatePath("/categories");
    revalidatePath("/items");
    revalidatePath("/shopping-list");
    revalidatePath("/shopping-list");

    return {
      data: { member: serializeMember(updatedMember, displayNamesByUserId) },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not update member role.");
  }
}

export async function getHouseholdInvitePreviewAction(token) {
  if (!token) return actionError("Invite link is missing.");

  try {
    const admin = createAdminClient();
    const { data: invite, error } = await admin
      .from("household_invites")
      .select("id, household_id, email, role, status, expires_at, accepted_by, households(owner_id, name)")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!invite) return actionError("This invite link was not found.");

    const ownerDisplayName = await getUserDisplayNameById(
      admin,
      invite.households?.owner_id,
      "the household owner"
    );

    let alreadyAccepted = false;
    let requiresPasswordSetup = false;
    const { user } = await getAuthedUser();

    if (
      user?.id &&
      invite.status === "accepted" &&
      normalizeInviteEmail(user.email) === normalizeInviteEmail(invite.email)
    ) {
      const { data: membership, error: membershipError } = await admin
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .eq("household_id", invite.household_id)
        .maybeSingle();

      if (membershipError) throw membershipError;

      alreadyAccepted = Boolean(membership?.household_id);
      requiresPasswordSetup = alreadyAccepted ? needsInvitePasswordSetup(user) : false;
    }

    return {
      data: {
        email: invite.email,
        role: normalizeHouseholdRole(invite.role),
        status: invite.status,
        expiresAt: invite.expires_at,
        householdName: invite.households?.name || "Household",
        ownerDisplayName,
        alreadyAccepted,
        requiresPasswordSetup,
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not load invite.");
  }
}

export async function acceptHouseholdInviteAction(token, options = {}) {
  if (!token) return actionError("Invite link is missing.");
  const mergeExistingData = Boolean(options?.mergeExistingData);

  const { user, error: authError } = await getAuthedUser();
  if (authError) return actionError(authError);

  try {
    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
      .from("household_invites")
      .select("id, household_id, email, role, status, expires_at, accepted_by, households(id, owner_id, name)")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) return actionError("This invite link was not found.");

    if (normalizeInviteEmail(user.email) !== normalizeInviteEmail(invite.email)) {
      return actionError(`This invite was sent to ${invite.email}. Log in with that email to accept it.`);
    }

    const household = invite.households;
    const ownerDisplayName = await getUserDisplayNameById(
      admin,
      household?.owner_id,
      "the household owner"
    );

    if (invite.status !== "pending") {
      if (invite.status === "accepted") {
        const { data: acceptedMembership, error: acceptedMembershipError } = await admin
          .from("household_members")
          .select("household_id")
          .eq("user_id", user.id)
          .eq("household_id", invite.household_id)
          .maybeSingle();

        if (acceptedMembershipError) throw acceptedMembershipError;

        if (acceptedMembership?.household_id) {
          return {
            data: {
              householdName: household?.name || "Household",
              ownerDisplayName,
              requiresPasswordSetup: needsInvitePasswordSetup(user),
              alreadyAccepted: true,
            },
            error: null,
          };
        }
      }

      return actionError("This invite is no longer active.");
    }

    const expiresAt = new Date(invite.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      await admin
        .from("household_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      return actionError("This invite has expired. Ask for a new one.");
    }

    const billing = await getHouseholdBilling(household);
    if (billing.effectivePlanId !== "family") {
      return actionError("This household needs an active Family plan before members can join.");
    }

    const memberCount = await getHouseholdMemberCount(invite.household_id);
    const maxMembers = billing.limits.users ?? null;
    if (maxMembers !== null && memberCount >= maxMembers) {
      return actionError(`This household is already at the ${maxMembers} member limit.`);
    }

    const { data: existingMembership, error: membershipError } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    let preparation = null;

    if (
      existingMembership?.household_id &&
      existingMembership.household_id !== invite.household_id
    ) {
      preparation = await prepareExistingHouseholdForInviteAcceptance({
        admin,
        fromHouseholdId: existingMembership.household_id,
        toHouseholdId: invite.household_id,
        userId: user.id,
        mergeExistingData,
      });

      if (preparation.error) return actionError(preparation.error);
      if (preparation.requiresMerge) {
        return {
          data: {
            requiresMerge: true,
            householdName: household?.name || "Household",
            ownerDisplayName,
            role: normalizeHouseholdRole(invite.role),
            dataSummary: preparation.dataSummary,
          },
          error: null,
        };
      }
    }

    const { error: insertError } = await admin
      .from("household_members")
      .upsert(
        {
          household_id: invite.household_id,
          user_id: user.id,
          email: normalizeInviteEmail(user.email),
          role: normalizeHouseholdRole(invite.role),
        },
        { onConflict: "user_id" }
      );

    if (insertError) throw insertError;

    if (
      existingMembership?.household_id &&
      existingMembership.household_id !== invite.household_id
    ) {
      const { error: deleteOldHouseholdError } = await admin
        .from("households")
        .delete()
        .eq("id", existingMembership.household_id)
        .eq("owner_id", user.id);

      if (deleteOldHouseholdError) throw deleteOldHouseholdError;
    }

    const { error: updateInviteError } = await admin
      .from("household_invites")
      .update({
        status: "accepted",
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateInviteError) throw updateInviteError;

    const requiresPasswordSetup = needsInvitePasswordSetup(user);
    const acceptedInviteMetadata = getAcceptedInviteMetadata(
      user,
      requiresPasswordSetup
    );

    const { data: updatedUser, error: updateUserError } =
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: acceptedInviteMetadata,
      });

    if (updateUserError) throw updateUserError;

    const session = await getSession();
    if (session?.user) {
      session.user = {
        ...session.user,
        user: updatedUser?.user ?? {
          ...user,
          user_metadata: acceptedInviteMetadata,
        },
      };
      await session.save();
    }

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/locations");
    revalidatePath("/areas");
    revalidatePath("/categories");
    revalidatePath("/items");

    return {
      data: {
        householdName: household?.name || "Household",
        ownerDisplayName,
        requiresPasswordSetup,
        mergedExistingData: Boolean(preparation?.mergedExistingData),
        dataSummary: preparation?.dataSummary ?? null,
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not accept invite.");
  }
}
