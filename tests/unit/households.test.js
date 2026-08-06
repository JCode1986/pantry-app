import { describe, expect, it } from "vitest";
import {
  HOUSEHOLD_ROLES,
  canEditHouseholdInventory,
  canManageHousehold,
  hasHouseholdInviteMetadata,
  isValidInviteEmail,
  normalizeHouseholdRole,
  normalizeInviteEmail,
} from "@/utils/householdRoles";

describe("household role helpers", () => {
  it("normalizes supported roles and legacy member roles", () => {
    expect(normalizeHouseholdRole(" OWNER ")).toBe(HOUSEHOLD_ROLES.OWNER);
    expect(normalizeHouseholdRole("member")).toBe(HOUSEHOLD_ROLES.EDITOR);
    expect(normalizeHouseholdRole("unknown", HOUSEHOLD_ROLES.VIEWER)).toBe(
      HOUSEHOLD_ROLES.VIEWER
    );
  });

  it("allows owners and editors to edit inventory but rejects viewers and missing members", () => {
    expect(canEditHouseholdInventory({ role: "owner" })).toBe(true);
    expect(canEditHouseholdInventory({ role: "editor" })).toBe(true);
    expect(canEditHouseholdInventory({ role: "viewer" })).toBe(false);
    expect(canEditHouseholdInventory(null)).toBe(false);
  });

  it("allows only the household owner user to manage owner-only settings", () => {
    expect(
      canManageHousehold(
        { role: "owner" },
        { id: "household_1", owner_id: "user_owner" },
        "user_owner"
      )
    ).toBe(true);
    expect(
      canManageHousehold(
        { role: "owner" },
        { id: "household_1", owner_id: "user_owner" },
        "user_editor"
      )
    ).toBe(false);
    expect(
      canManageHousehold(
        { role: "editor" },
        { id: "household_1", owner_id: "user_owner" },
        "user_owner"
      )
    ).toBe(false);
  });

  it("normalizes and validates invite emails conservatively", () => {
    expect(normalizeInviteEmail("  OWNER@Example.TEST ")).toBe("owner@example.test");
    expect(isValidInviteEmail("viewer@example.test")).toBe(true);
    expect(isValidInviteEmail("not-an-email")).toBe(false);
    expect(isValidInviteEmail("")).toBe(false);
  });

  it("detects users carrying invite metadata", () => {
    expect(hasHouseholdInviteMetadata({ invited_at: "2026-01-01T00:00:00Z" })).toBe(true);
    expect(
      hasHouseholdInviteMetadata({
        user_metadata: { household_invite_token: "invite_token" },
      })
    ).toBe(true);
    expect(hasHouseholdInviteMetadata({ user_metadata: {} })).toBe(false);
  });
});
