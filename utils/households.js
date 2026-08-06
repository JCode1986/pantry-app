import { randomBytes } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getEffectivePlanId,
  getEffectivePlanLimits,
} from "@/utils/billingPlans";
export {
  HOUSEHOLD_ROLES,
  canEditHouseholdInventory,
  canManageHousehold,
  hasHouseholdInviteMetadata,
  isValidInviteEmail,
  normalizeHouseholdRole,
  normalizeInviteEmail,
} from "@/utils/householdRoles";
import {
  HOUSEHOLD_ROLES,
  normalizeHouseholdRole,
} from "@/utils/householdRoles";

const INVITE_DAYS = 7;

function isDuplicateOwnerHouseholdError(error) {
  return (
    error?.code === "23505" ||
    /households_owner_id_key|duplicate key value violates unique constraint/i.test(
      error?.message || ""
    )
  );
}

export async function getCanEditInventoryForUser(user) {
  if (!user?.id) return false;

  const { member } = await getHouseholdForUser({
    userId: user.id,
    email: user.email,
    createIfMissing: !hasHouseholdInviteMetadata(user),
  });

  return canEditHouseholdInventory(member);
}

export function createInviteToken() {
  return randomBytes(24).toString("hex");
}

export function getInviteExpirationDate() {
  const date = new Date();
  date.setDate(date.getDate() + INVITE_DAYS);
  return date.toISOString();
}

export async function getHouseholdForUser({
  userId,
  email,
  createIfMissing = false,
}) {
  if (!userId) return { household: null, member: null };

  const admin = createAdminClient();
  const normalizedEmail = normalizeInviteEmail(email);

  async function getOwnedHousehold() {
    const { data: household, error } = await admin
      .from("households")
      .select("id, owner_id, name, created_at, updated_at")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) throw error;
    return household ?? null;
  }

  async function ensureOwnerMember(household) {
    if (!household?.id) return null;

    const { data: ownerMember, error } = await admin
      .from("household_members")
      .upsert(
        {
          household_id: household.id,
          user_id: userId,
          email: normalizedEmail || null,
          role: HOUSEHOLD_ROLES.OWNER,
        },
        { onConflict: "user_id" }
      )
      .select("household_id, user_id, email, role, joined_at")
      .single();

    if (error) throw error;
    return {
      ...ownerMember,
      role: normalizeHouseholdRole(ownerMember.role),
    };
  }

  const { data: member, error: memberError } = await admin
    .from("household_members")
    .select("household_id, user_id, email, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) throw memberError;

  if (member?.household_id) {
    let resolvedMember = {
      ...member,
      role: normalizeHouseholdRole(member.role),
    };

    if ((!member.email && normalizedEmail) || member.role === "member") {
      const { data: updatedMember, error: updateMemberError } = await admin
        .from("household_members")
        .update({
          email: member.email || normalizedEmail || null,
          role: normalizeHouseholdRole(member.role),
        })
        .eq("user_id", userId)
        .select("household_id, user_id, email, role, joined_at")
        .single();

      if (updateMemberError) throw updateMemberError;
      resolvedMember = {
        ...updatedMember,
        role: normalizeHouseholdRole(updatedMember.role),
      };
    }

    const { data: household, error: householdError } = await admin
      .from("households")
      .select("id, owner_id, name, created_at, updated_at")
      .eq("id", resolvedMember.household_id)
      .single();

    if (householdError) throw householdError;
    return { household, member: resolvedMember };
  }

  if (!createIfMissing) return { household: null, member: null };

  const existingOwnedHousehold = await getOwnedHousehold();
  if (existingOwnedHousehold?.id) {
    const ownerMember = await ensureOwnerMember(existingOwnedHousehold);
    return { household: existingOwnedHousehold, member: ownerMember };
  }

  const nameSeed = normalizedEmail.split("@")[0] || "My";
  const householdName = `${nameSeed}'s Household`;

  let { data: household, error: householdError } = await admin
    .from("households")
    .insert({ owner_id: userId, name: householdName })
    .select("id, owner_id, name, created_at, updated_at")
    .single();

  if (isDuplicateOwnerHouseholdError(householdError)) {
    household = await getOwnedHousehold();
    householdError = household ? null : householdError;
  }

  if (householdError) throw householdError;

  const createdMember = await ensureOwnerMember(household);

  return { household, member: createdMember };
}

export async function getHouseholdBilling(household) {
  if (!household?.owner_id) {
    return {
      billing: null,
      effectivePlanId: "free",
      limits: getEffectivePlanLimits({ planId: "free", status: "free" }),
    };
  }

  const admin = createAdminClient();
  const { data: billing, error } = await admin
    .from("user_billing")
    .select("plan_id, status, current_period_end, cancel_at_period_end")
    .eq("user_id", household.owner_id)
    .maybeSingle();

  if (error) throw error;

  const effectivePlanId = getEffectivePlanId(billing);

  return {
    billing,
    effectivePlanId,
    limits: getEffectivePlanLimits(billing),
  };
}

export async function getHouseholdMemberCount(householdId) {
  if (!householdId) return 0;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("household_members")
    .select("*", { count: "exact", head: true })
    .eq("household_id", householdId);

  if (error) throw error;
  return count ?? 0;
}

export async function getCurrentHouseholdIdForUser(userId) {
  const { household } = await getHouseholdForUser({
    userId,
    createIfMissing: true,
  });

  return household?.id ?? null;
}
