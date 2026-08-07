export const HOUSEHOLD_ROLES = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
};

const VALID_HOUSEHOLD_ROLES = new Set(Object.values(HOUSEHOLD_ROLES));

export function normalizeHouseholdRole(value, fallback = HOUSEHOLD_ROLES.EDITOR) {
  const role = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (role === "member") return HOUSEHOLD_ROLES.EDITOR;
  return VALID_HOUSEHOLD_ROLES.has(role) ? role : fallback;
}

export function canEditHouseholdInventory(member) {
  const role = normalizeHouseholdRole(member?.role, HOUSEHOLD_ROLES.VIEWER);
  return role === HOUSEHOLD_ROLES.OWNER || role === HOUSEHOLD_ROLES.EDITOR;
}

export function canManageHousehold(member, household, userId) {
  return (
    normalizeHouseholdRole(member?.role, HOUSEHOLD_ROLES.VIEWER) ===
      HOUSEHOLD_ROLES.OWNER &&
    Boolean(household?.owner_id) &&
    household.owner_id === userId
  );
}

export function hasHouseholdInviteMetadata(user) {
  return Boolean(user?.invited_at || user?.user_metadata?.household_invite_token);
}

export function normalizeInviteEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidInviteEmail(value) {
  return /\S+@\S+\.\S+/.test(normalizeInviteEmail(value));
}
