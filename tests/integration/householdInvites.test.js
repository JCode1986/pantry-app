import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionMock } from "@/tests/mocks/session";
import { createTestUser } from "@/tests/helpers/factories";
import { createSupabaseMock, createSupabaseResponse } from "@/tests/mocks/supabase";

const inviteMocks = vi.hoisted(() => ({
  getVerifiedSession: vi.fn(),
  getSession: vi.fn(),
  createAdminClient: vi.fn(),
  createSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
  headers: vi.fn(),
  getHouseholdBilling: vi.fn(),
  getHouseholdMemberCount: vi.fn(),
  createInviteToken: vi.fn(),
  getInviteExpirationDate: vi.fn(),
  admin: null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: inviteMocks.revalidatePath,
}));

vi.mock("next/headers", () => ({
  headers: inviteMocks.headers,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: inviteMocks.createSupabaseClient,
}));

vi.mock("@/lib/sessionOptions", () => ({
  getSession: inviteMocks.getSession,
}));

vi.mock("@/lib/verifiedSession", () => ({
  getVerifiedSession: inviteMocks.getVerifiedSession,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: inviteMocks.createAdminClient,
}));

vi.mock("@/utils/households", async () => {
  const roles = await vi.importActual("@/utils/householdRoles");
  return {
    ...roles,
    createInviteToken: inviteMocks.createInviteToken,
    getInviteExpirationDate: inviteMocks.getInviteExpirationDate,
    getHouseholdBilling: inviteMocks.getHouseholdBilling,
    getHouseholdForUser: vi.fn(),
    getHouseholdMemberCount: inviteMocks.getHouseholdMemberCount,
    getCurrentHouseholdIdForUser: vi.fn(),
    getCanEditInventoryForUser: vi.fn(),
  };
});

const { acceptHouseholdInviteAction, getHouseholdInvitePreviewAction } =
  await import("@/app/actions/household");

function createAdminWithAuth(tableResponses = {}) {
  const admin = createSupabaseMock(tableResponses);
  admin.auth.admin = {
    getUserById: vi.fn(async (userId) => ({
      data: {
        user: createTestUser({
          id: userId,
          email: "owner@example.test",
          user_metadata: { preferred_name: "Owner Name" },
        }),
      },
      error: null,
    })),
    updateUserById: vi.fn(async (userId, payload) => ({
      data: {
        user: createTestUser({
          id: userId,
          email: "viewer@example.test",
          user_metadata: payload.user_metadata,
        }),
      },
      error: null,
    })),
    inviteUserByEmail: vi.fn(async () => ({ error: null })),
  };
  return admin;
}

function pendingInvite(overrides = {}) {
  return {
    id: "invite_1",
    household_id: "household_1",
    email: "viewer@example.test",
    role: "viewer",
    status: "pending",
    expires_at: "2099-01-01T00:00:00.000Z",
    accepted_by: null,
    households: {
      id: "household_1",
      owner_id: "user_owner",
      name: "Family Home",
    },
    ...overrides,
  };
}

describe("household invite actions", () => {
  beforeEach(() => {
    inviteMocks.getVerifiedSession.mockResolvedValue({
      user: createTestUser({ id: "user_viewer", email: "viewer@example.test" }),
      error: null,
    });
    inviteMocks.getSession.mockResolvedValue(
      createSessionMock(createTestUser({ id: "user_viewer", email: "viewer@example.test" }))
    );
    inviteMocks.getHouseholdBilling.mockResolvedValue({
      effectivePlanId: "family",
      limits: { users: 5, locations: null, items: null },
    });
    inviteMocks.getHouseholdMemberCount.mockResolvedValue(2);
    inviteMocks.createInviteToken.mockReturnValue("invite_token");
    inviteMocks.getInviteExpirationDate.mockReturnValue("2099-01-08T00:00:00.000Z");
    inviteMocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
    inviteMocks.admin = createAdminWithAuth();
    inviteMocks.createAdminClient.mockReturnValue(inviteMocks.admin);
  });

  it("rejects missing invite preview tokens before touching Supabase", async () => {
    await expect(getHouseholdInvitePreviewAction("")).resolves.toEqual({
      data: null,
      error: "Invite link is missing.",
    });
    expect(inviteMocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("marks already accepted invite previews for the signed-in invited member", async () => {
    inviteMocks.getVerifiedSession.mockResolvedValue({
      user: createTestUser({
        id: "user_viewer",
        email: "viewer@example.test",
        user_metadata: { requires_password_setup: true },
      }),
      error: null,
    });
    inviteMocks.admin = createAdminWithAuth({
      household_invites: createSupabaseResponse({
        data: pendingInvite({
          status: "accepted",
          households: { owner_id: "user_owner", name: "Family Home" },
        }),
      }),
      household_members: createSupabaseResponse({
        data: { household_id: "household_1" },
      }),
    });
    inviteMocks.createAdminClient.mockReturnValue(inviteMocks.admin);

    const result = await getHouseholdInvitePreviewAction("invite_token");

    expect(result).toEqual({
      data: {
        email: "viewer@example.test",
        role: "viewer",
        status: "accepted",
        expiresAt: "2099-01-01T00:00:00.000Z",
        householdName: "Family Home",
        ownerDisplayName: "Owner Name",
        alreadyAccepted: true,
        requiresPasswordSetup: true,
      },
      error: null,
    });
  });

  it("expires pending invites when the expiration date has passed", async () => {
    inviteMocks.admin = createAdminWithAuth({
      household_invites: [
        createSupabaseResponse({
          data: pendingInvite({ expires_at: "2000-01-01T00:00:00.000Z" }),
        }),
        createSupabaseResponse(),
      ],
    });
    inviteMocks.createAdminClient.mockReturnValue(inviteMocks.admin);

    const result = await acceptHouseholdInviteAction("invite_token");

    const queries = inviteMocks.admin.__queryHistory.get("household_invites");
    expect(queries[1].update).toHaveBeenCalledWith({ status: "expired" });
    expect(queries[1].eq).toHaveBeenCalledWith("id", "invite_1");
    expect(result).toEqual({
      data: null,
      error: "This invite has expired. Ask for a new one.",
    });
  });

  it("requires an active Family plan before a member can join", async () => {
    inviteMocks.getHouseholdBilling.mockResolvedValue({
      effectivePlanId: "free",
      limits: { users: 1, locations: 1, items: 50 },
    });
    inviteMocks.admin = createAdminWithAuth({
      household_invites: createSupabaseResponse({ data: pendingInvite() }),
    });
    inviteMocks.createAdminClient.mockReturnValue(inviteMocks.admin);

    await expect(acceptHouseholdInviteAction("invite_token")).resolves.toEqual({
      data: null,
      error: "This household needs an active Family plan before members can join.",
    });
  });

  it("returns a merge requirement before moving existing household data", async () => {
    inviteMocks.admin = createAdminWithAuth({
      household_invites: createSupabaseResponse({ data: pendingInvite() }),
      household_members: createSupabaseResponse({
        data: { household_id: "old_household" },
      }),
      households: createSupabaseResponse({
        data: { id: "old_household", owner_id: "user_viewer" },
      }),
      locations: createSupabaseResponse({ count: 2 }),
      shopping_list_items: createSupabaseResponse({ count: 1 }),
    });
    inviteMocks.createAdminClient.mockReturnValue(inviteMocks.admin);

    const result = await acceptHouseholdInviteAction("invite_token");

    expect(result).toEqual({
      data: {
        requiresMerge: true,
        householdName: "Family Home",
        ownerDisplayName: "Owner Name",
        role: "viewer",
        dataSummary: {
          locations: 2,
          shoppingListItems: 1,
        },
      },
      error: null,
    });
  });
});
