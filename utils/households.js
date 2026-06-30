import { randomBytes } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getEffectivePlanId,
  getEffectivePlanLimits,
} from "@/utils/billingPlans";

const INVITE_DAYS = 7;

export function normalizeInviteEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidInviteEmail(value) {
  return /\S+@\S+\.\S+/.test(normalizeInviteEmail(value));
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
  const { data: member, error: memberError } = await admin
    .from("household_members")
    .select("household_id, user_id, email, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) throw memberError;

  if (member?.household_id) {
    const normalizedEmail = normalizeInviteEmail(email);
    let resolvedMember = member;

    if (!member.email && normalizedEmail) {
      const { data: updatedMember, error: updateMemberError } = await admin
        .from("household_members")
        .update({ email: normalizedEmail })
        .eq("user_id", userId)
        .select("household_id, user_id, email, role, joined_at")
        .single();

      if (updateMemberError) throw updateMemberError;
      resolvedMember = updatedMember;
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

  const nameSeed = normalizeInviteEmail(email).split("@")[0] || "My";
  const householdName = `${nameSeed}'s Household`;

  const { data: household, error: householdError } = await admin
    .from("households")
    .insert({ owner_id: userId, name: householdName })
    .select("id, owner_id, name, created_at, updated_at")
    .single();

  if (householdError) throw householdError;

  const { data: createdMember, error: createdMemberError } = await admin
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: userId,
      email: normalizeInviteEmail(email) || null,
      role: "owner",
    })
    .select("household_id, user_id, email, role, joined_at")
    .single();

  if (createdMemberError) throw createdMemberError;

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
