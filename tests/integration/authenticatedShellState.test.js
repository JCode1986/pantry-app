import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestHousehold, createTestMember, createTestUser } from "@/tests/helpers/factories";
import { createSupabaseMock, createSupabaseResponse } from "@/tests/mocks/supabase";
import { HOUSEHOLD_ROLES } from "@/utils/householdRoles";

const shellMocks = vi.hoisted(() => ({
  getSessionForLayout: vi.fn(),
  getHouseholdForUser: vi.fn(),
  getHouseholdBilling: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  admin: null,
  supabase: null,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    cache: (fn) => fn,
  };
});

vi.mock("@/app/actions/auth", () => ({
  getSessionForLayout: shellMocks.getSessionForLayout,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: shellMocks.createAdminClient,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: shellMocks.createClient,
}));

vi.mock("@/utils/households", async () => {
  const roles = await vi.importActual("@/utils/householdRoles");
  return {
    ...roles,
    getHouseholdForUser: shellMocks.getHouseholdForUser,
    getHouseholdBilling: shellMocks.getHouseholdBilling,
  };
});

const {
  getAuthenticatedAppShellState,
  getPreferredName,
  needsInvitePasswordSetup,
} = await import("@/components/app-shell/authenticatedShellState");

describe("authenticated app-shell state", () => {
  beforeEach(() => {
    shellMocks.getSessionForLayout.mockResolvedValue({
      user: {
        user: createTestUser({
          user_metadata: { preferred_name: "Owner" },
        }),
      },
    });
    shellMocks.getHouseholdForUser.mockResolvedValue({
      household: createTestHousehold({ name: "Family Home" }),
      member: createTestMember({ role: HOUSEHOLD_ROLES.EDITOR }),
    });
    shellMocks.getHouseholdBilling.mockResolvedValue({
      effectivePlanId: "family",
    });
    shellMocks.admin = createSupabaseMock({
      household_members: createSupabaseResponse({ count: 3 }),
      household_invites: createSupabaseResponse({ count: 1 }),
    });
    shellMocks.supabase = createSupabaseMock();
    shellMocks.supabase.auth.getUser.mockResolvedValue({
      data: {
        user: createTestUser({
          user_metadata: { preferred_name: "Owner" },
        }),
      },
      error: null,
    });
    shellMocks.supabase.rpc.mockResolvedValue(
      createSupabaseResponse({
        data: [
          {
            expired_count: 2,
            expiring_soon_count: 4,
            shopping_list_needed_items: 5,
            shopping_list_items_count: 6,
            locations_count: 7,
            storage_areas_count: 8,
            categories_count: 9,
            items_count: 10,
            low_stock_count: 11,
          },
        ],
      })
    );
    shellMocks.createAdminClient.mockReturnValue(shellMocks.admin);
    shellMocks.createClient.mockResolvedValue(shellMocks.supabase);
  });

  it("derives display names and invite password setup flags", () => {
    expect(getPreferredName({ user_metadata: { full_name: "Full Name" } })).toBe("Full Name");
    expect(getPreferredName({ user_metadata: {} })).toBe("");
    expect(
      needsInvitePasswordSetup({
        invited_at: "2026-01-01T00:00:00.000Z",
        user_metadata: {},
      })
    ).toBe(true);
    expect(
      needsInvitePasswordSetup({
        invited_at: "2026-01-01T00:00:00.000Z",
        user_metadata: { requires_password_setup: false },
      })
    ).toBe(false);
  });

  it("combines session, household, billing, member counts, invite counts, and summary RPC counts", async () => {
    const state = await getAuthenticatedAppShellState();

    expect(state.currentUser).toMatchObject({ id: "user_owner" });
    expect(state.canEditInventory).toBe(true);
    expect(state.navigationSummary).toEqual({
      householdName: "Family Home",
      householdRole: "editor",
      effectivePlanId: "family",
      isFamilyPlan: true,
      displayName: "Owner",
    });
    expect(state.attentionCounts).toMatchObject({
      memberCount: 3,
      inviteCount: 1,
      expiredCount: 2,
      expiringSoonCount: 4,
      shoppingListNeededItems: 5,
      shoppingListItemsCount: 6,
      locationsCount: 7,
      storageAreasCount: 8,
      categoriesCount: 9,
      itemsCount: 10,
      lowStockCount: 11,
      summaryCountsLoaded: true,
    });
    expect(shellMocks.supabase.rpc).toHaveBeenCalledWith(
      "wherekeep_inventory_summary_counts",
      { p_within_days: 3 }
    );
  });

  it("returns empty unauthenticated shell state when no user can be resolved", async () => {
    shellMocks.getSessionForLayout.mockResolvedValue(null);
    shellMocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const state = await getAuthenticatedAppShellState();

    expect(state.currentUser).toBeNull();
    expect(state.canEditInventory).toBe(true);
    expect(state.navigationSummary.effectivePlanId).toBe("free");
    expect(state.attentionCounts.itemsCount).toBe(0);
  });

  it("falls back to count queries when the summary RPC is unavailable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    shellMocks.supabase = createSupabaseMock({
      items: [
        createSupabaseResponse({ count: 1 }),
        createSupabaseResponse({ count: 2 }),
        createSupabaseResponse({ count: 9 }),
      ],
      shopping_list_items: createSupabaseResponse({ count: 3 }),
      locations: createSupabaseResponse({ count: 4 }),
      storage_areas: createSupabaseResponse({ count: 5 }),
      storage_categories: createSupabaseResponse({ count: 6 }),
    });
    shellMocks.supabase.auth.getUser.mockResolvedValue({
      data: {
        user: createTestUser({
          user_metadata: { preferred_name: "Owner" },
        }),
      },
      error: null,
    });
    shellMocks.supabase.rpc.mockResolvedValue(
      createSupabaseResponse({ data: null, error: { message: "RPC missing" } })
    );
    shellMocks.createClient.mockResolvedValue(shellMocks.supabase);

    const state = await getAuthenticatedAppShellState();

    expect(state.attentionCounts).toMatchObject({
      expiredCount: 1,
      expiringSoonCount: 2,
      shoppingListNeededItems: 3,
      locationsCount: 4,
      storageAreasCount: 5,
      categoriesCount: 6,
      itemsCount: 9,
      lowStockCount: 0,
      shoppingListItemsCount: 0,
      summaryCountsLoaded: false,
    });
    expect(shellMocks.supabase.__queryHistory.get("items")).toHaveLength(3);
  });
});
