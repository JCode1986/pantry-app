"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/sessionOptions";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  HOUSEHOLD_ROLES,
  canManageHousehold,
  createInviteToken,
  getHouseholdBilling,
  getHouseholdForUser,
  getHouseholdMemberCount,
  getInviteExpirationDate,
  isValidInviteEmail,
  normalizeHouseholdRole,
  normalizeInviteEmail,
} from "@/utils/households";

function actionError(message) {
  return { data: null, error: message };
}

async function getAppUrl() {
  const headersList = await headers();
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    headersList.get("origin") ||
    "http://localhost:3000"
  );
}

async function getAuthedUser() {
  const session = await getSession();
  const user = session?.user?.user;

  if (!session?.user?.access_token || !user?.id) {
    return { user: null, error: "Your session has expired. Please log in again." };
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
      createIfMissing,
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

function serializeMember(member) {
  return {
    userId: member.user_id,
    email: member.email || "Unknown email",
    role: normalizeHouseholdRole(member.role),
    joinedAt: member.joined_at,
  };
}

function serializeInvite(invite, appUrl) {
  return {
    id: invite.id,
    email: invite.email,
    role: normalizeHouseholdRole(invite.role),
    status: invite.status,
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

async function sendExistingUserInviteEmail({ email, redirectTo }) {
  const supabase = createEmailClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
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

async function sendInviteEmail({ admin, email, householdName, inviteToken, appUrl, role }) {
  const acceptPath = `/invite/${inviteToken}`;
  const redirectTo = `${appUrl}/magic-link-sync?redirectTo=${encodeURIComponent(acceptPath)}`;

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      household_name: householdName,
      household_invite_token: inviteToken,
      household_invite_role: normalizeHouseholdRole(role),
    },
  });

  if (error) {
    if (isAlreadyRegisteredError(error)) {
      return sendExistingUserInviteEmail({ email, redirectTo });
    }

    return {
      sent: false,
      error: error.message || "Supabase could not send the invite email.",
    };
  }

  return { sent: true, emailType: "invite", error: null };
}

export async function getHouseholdSharingAction() {
  const context = await getAuthedHousehold({ createIfMissing: true });
  if (context.error) return actionError(context.error);

  try {
    const admin = createAdminClient();
    const appUrl = await getAppUrl();
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
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

    if (membersError) throw membersError;
    if (invitesError) throw invitesError;

    const billing = await getHouseholdBilling(household);
    const maxMembers = billing.limits.users ?? null;
    const memberCount = members?.length ?? 0;
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
        members: (members ?? []).map(serializeMember),
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
    const appUrl = await getAppUrl();
    const emailResult = await sendInviteEmail({
      admin,
      email: normalizedEmail,
      householdName: household.name,
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
      .eq("status", "pending");

    if (error) throw error;

    revalidatePath("/profile");
    return { data: { id: inviteId }, error: null };
  } catch (err) {
    return actionError(err?.message || "Could not revoke invite.");
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

    revalidatePath("/profile");
    revalidatePath("/");
    revalidatePath("/locations");
    revalidatePath("/areas");
    revalidatePath("/categories");
    revalidatePath("/items");
    revalidatePath("/shopping-list");
    revalidatePath("/shopping-list");

    return {
      data: { member: serializeMember(updatedMember) },
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
      .select("email, role, status, expires_at, households(name)")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!invite) return actionError("This invite link was not found.");

    return {
      data: {
        email: invite.email,
        role: normalizeHouseholdRole(invite.role),
        status: invite.status,
        expiresAt: invite.expires_at,
        householdName: invite.households?.name || "Household",
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not load invite.");
  }
}

export async function acceptHouseholdInviteAction(token) {
  if (!token) return actionError("Invite link is missing.");

  const { user, error: authError } = await getAuthedUser();
  if (authError) return actionError(authError);

  try {
    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
      .from("household_invites")
      .select("id, household_id, email, role, status, expires_at, households(id, owner_id, name)")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) return actionError("This invite link was not found.");
    if (invite.status !== "pending") return actionError("This invite is no longer active.");

    const expiresAt = new Date(invite.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      await admin
        .from("household_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      return actionError("This invite has expired. Ask for a new one.");
    }

    if (normalizeInviteEmail(user.email) !== normalizeInviteEmail(invite.email)) {
      return actionError(`This invite was sent to ${invite.email}. Log in with that email to accept it.`);
    }

    const household = invite.households;
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

    if (
      existingMembership?.household_id &&
      existingMembership.household_id !== invite.household_id
    ) {
      const { count: personalLocationCount, error: countError } = await admin
        .from("locations")
        .select("*", { count: "exact", head: true })
        .eq("household_id", existingMembership.household_id);

      if (countError) throw countError;

      if ((personalLocationCount ?? 0) > 0) {
        return actionError(
          "This account already has its own household with inventory. Use a different email or move that data before joining."
        );
      }

      await admin
        .from("household_members")
        .delete()
        .eq("user_id", user.id)
        .eq("household_id", existingMembership.household_id);

      await admin
        .from("households")
        .delete()
        .eq("id", existingMembership.household_id)
        .eq("owner_id", user.id);
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

    const { error: updateInviteError } = await admin
      .from("household_invites")
      .update({
        status: "accepted",
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateInviteError) throw updateInviteError;

    const { data: updatedUser, error: updateUserError } =
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          requires_password_setup: true,
        },
      });

    if (updateUserError) throw updateUserError;

    const session = await getSession();
    if (session?.user) {
      session.user = {
        ...session.user,
        user: updatedUser?.user ?? {
          ...user,
          user_metadata: {
            ...(user.user_metadata ?? {}),
            requires_password_setup: true,
          },
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
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not accept invite.");
  }
}
