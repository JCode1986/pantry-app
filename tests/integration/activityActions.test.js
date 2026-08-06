import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestHousehold, createTestUser } from "@/tests/helpers/factories";
import { createSupabaseMock, createSupabaseResponse } from "@/tests/mocks/supabase";

const activityMocks = vi.hoisted(() => ({
  getVerifiedSession: vi.fn(),
  getHouseholdForUser: vi.fn(),
  getHouseholdBilling: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  getInventoryImageUrls: vi.fn(),
  admin: null,
  supabase: null,
}));

vi.mock("@/lib/verifiedSession", () => ({
  getVerifiedSession: activityMocks.getVerifiedSession,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: activityMocks.createAdminClient,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: activityMocks.createClient,
}));

vi.mock("@/utils/households", async () => {
  const roles = await vi.importActual("@/utils/householdRoles");
  return {
    ...roles,
    getHouseholdForUser: activityMocks.getHouseholdForUser,
    getHouseholdBilling: activityMocks.getHouseholdBilling,
  };
});

vi.mock("@/utils/inventoryImages", () => ({
  INVENTORY_IMAGE_VARIANT: {
    CARD: "card",
  },
  getInventoryImageUrls: activityMocks.getInventoryImageUrls,
}));

const { getActivityFilterOptionsAction, getRecentActivityAction } = await import(
  "@/app/actions/activity"
);

describe("activity server actions", () => {
  beforeEach(() => {
    activityMocks.getVerifiedSession.mockResolvedValue({
      user: createTestUser(),
      error: null,
    });
    activityMocks.getHouseholdForUser.mockResolvedValue({
      household: createTestHousehold(),
      member: null,
    });
    activityMocks.getHouseholdBilling.mockResolvedValue({
      effectivePlanId: "family",
    });
    activityMocks.getInventoryImageUrls.mockResolvedValue(
      new Map([["items/rice.jpg", "https://example.test/rice.jpg"]])
    );
    activityMocks.admin = createSupabaseMock();
    activityMocks.supabase = createSupabaseMock();
    activityMocks.createAdminClient.mockReturnValue(activityMocks.admin);
    activityMocks.createClient.mockResolvedValue(activityMocks.supabase);
  });

  it("returns empty filter options when the session is invalid", async () => {
    activityMocks.getVerifiedSession.mockResolvedValue({
      user: null,
      error: "Your session has expired. Please log in again.",
    });

    await expect(getActivityFilterOptionsAction()).resolves.toEqual({
      data: { members: [], effectivePlanId: "free" },
      error: "Your session has expired. Please log in again.",
    });
  });

  it("loads activity filter members and effective plan for the household", async () => {
    activityMocks.admin = createSupabaseMock({
      household_members: createSupabaseResponse({
        data: [
          { user_id: "user_owner", email: "owner@example.test", role: "owner" },
          { user_id: "user_viewer", email: null, role: "viewer" },
        ],
      }),
    });
    activityMocks.createAdminClient.mockReturnValue(activityMocks.admin);

    const result = await getActivityFilterOptionsAction();

    const query = activityMocks.admin.__queries.get("household_members");
    expect(query.eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(query.order).toHaveBeenCalledWith("joined_at", { ascending: true });
    expect(result).toEqual({
      data: {
        members: [
          { userId: "user_owner", email: "owner@example.test", role: "owner" },
          { userId: "user_viewer", email: "Unknown email", role: "viewer" },
        ],
        effectivePlanId: "family",
      },
      error: null,
    });
  });

  it("applies filters, pagination, moved-path enrichment, actor fallback, and image enrichment", async () => {
    const movedRow = {
      id: "activity_1",
      entity_type: "item",
      entity_id: "item_1",
      actor_user_id: "user_editor",
      actor_email: null,
      action: "moved",
      item_name: "Rice",
      image_path: null,
      created_at: "2026-01-02T00:00:00.000Z",
      changes: {
        category_id: {
          from: "category_old",
          to: "category_new",
        },
      },
    };
    const extraRow = {
      id: "activity_2",
      entity_type: "item",
      entity_id: "item_2",
      actor_user_id: "user_owner",
      action: "added",
      created_at: "2026-01-01T00:00:00.000Z",
      changes: {},
    };

    activityMocks.supabase = createSupabaseMock({
      recent_activity: createSupabaseResponse({ data: [movedRow, extraRow] }),
      storage_categories: createSupabaseResponse({
        data: [
          { id: "category_old", name: "Old Cans", storage_area_id: "area_old" },
          { id: "category_new", name: "New Cans", storage_area_id: "area_new" },
        ],
      }),
      storage_areas: createSupabaseResponse({
        data: [
          { id: "area_old", name: "Old Pantry", location_id: "location_old" },
          { id: "area_new", name: "New Pantry", location_id: "location_new" },
        ],
      }),
      locations: createSupabaseResponse({
        data: [
          { id: "location_old", name: "Old Kitchen" },
          { id: "location_new", name: "New Kitchen" },
        ],
      }),
      items: createSupabaseResponse({
        data: [{ id: "item_1", image_path: "items/rice.jpg" }],
      }),
    });
    activityMocks.admin = createSupabaseMock({
      activity_log: createSupabaseResponse({ data: [] }),
      household_members: createSupabaseResponse({
        data: [{ user_id: "user_editor", email: "editor@example.test" }],
      }),
    });
    activityMocks.createClient.mockResolvedValue(activityMocks.supabase);
    activityMocks.createAdminClient.mockReturnValue(activityMocks.admin);

    const result = await getRecentActivityAction({
      limit: 1,
      action: "moved",
      actorUserId: "user_editor",
      cursor: "2026-01-03T00:00:00.000Z",
    });

    const activityQuery = activityMocks.supabase.__queries.get("recent_activity");
    expect(activityQuery.limit).toHaveBeenCalledWith(2);
    expect(activityQuery.eq).toHaveBeenCalledWith("action", "moved");
    expect(activityQuery.eq).toHaveBeenCalledWith("actor_user_id", "user_editor");
    expect(activityQuery.lt).toHaveBeenCalledWith("created_at", "2026-01-03T00:00:00.000Z");
    expect(result.error).toBeNull();
    expect(result.data.hasMore).toBe(true);
    expect(result.data.nextCursor).toBe("2026-01-02T00:00:00.000Z");
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]).toMatchObject({
      actor_email: "editor@example.test",
      imageUrl: "https://example.test/rice.jpg",
      changes: {
        from: {
          location: "Old Kitchen",
          area: "Old Pantry",
          category: "Old Cans",
        },
        to: {
          location: "New Kitchen",
          area: "New Pantry",
          category: "New Cans",
        },
      },
    });
  });
});
