import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestHousehold, createTestMember, createTestUser } from "@/tests/helpers/factories";
import { createSupabaseMock, createSupabaseResponse } from "@/tests/mocks/supabase";
import { HOUSEHOLD_ROLES } from "@/utils/householdRoles";

const shoppingMocks = vi.hoisted(() => ({
  getVerifiedSession: vi.fn(),
  getHouseholdForUser: vi.fn(),
  getHouseholdBilling: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  getInventoryImageUrl: vi.fn(),
  getInventoryImageUrls: vi.fn(),
  admin: null,
  supabase: null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: shoppingMocks.revalidatePath,
}));

vi.mock("@/lib/verifiedSession", () => ({
  getVerifiedSession: shoppingMocks.getVerifiedSession,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: shoppingMocks.createAdminClient,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: shoppingMocks.createClient,
}));

vi.mock("@/utils/households", async () => {
  const roles = await vi.importActual("@/utils/householdRoles");
  return {
    ...roles,
    getHouseholdForUser: shoppingMocks.getHouseholdForUser,
    getHouseholdBilling: shoppingMocks.getHouseholdBilling,
  };
});

vi.mock("@/utils/inventoryImages", () => ({
  INVENTORY_IMAGE_VARIANT: {
    CARD: "card",
  },
  getInventoryImageUrl: shoppingMocks.getInventoryImageUrl,
  getInventoryImageUrls: shoppingMocks.getInventoryImageUrls,
}));

const {
  addShoppingListItemAction,
  bulkDeleteShoppingListItemsAction,
  bulkUpdateShoppingListItemsAction,
  deleteItemAndAddToShoppingListAction,
  updateShoppingListItemAction,
  deleteShoppingListItemAction,
  getShoppingListAction,
  moveShoppingListItemToInventoryAction,
} = await import("@/app/actions/shoppingList");

function setShoppingContext({ role = HOUSEHOLD_ROLES.OWNER } = {}) {
  shoppingMocks.getVerifiedSession.mockResolvedValue({
    user: createTestUser(),
    error: null,
  });
  shoppingMocks.getHouseholdForUser.mockResolvedValue({
    household: createTestHousehold(),
    member: createTestMember({ role }),
  });
  shoppingMocks.getHouseholdBilling.mockResolvedValue({
    billing: null,
    effectivePlanId: "family",
    limits: { users: 5, locations: null, items: null },
  });
}

describe("shopping list server actions", () => {
  beforeEach(() => {
    setShoppingContext();
    shoppingMocks.admin = createSupabaseMock();
    shoppingMocks.supabase = createSupabaseMock();
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);
    shoppingMocks.createClient.mockResolvedValue(shoppingMocks.supabase);
    shoppingMocks.getInventoryImageUrl.mockResolvedValue(null);
    shoppingMocks.getInventoryImageUrls.mockResolvedValue(new Map());
  });

  it("validates item names before reading session state", async () => {
    const result = await addShoppingListItemAction({ name: "   " });

    expect(result).toEqual({
      data: null,
      error: "Shopping list item name is required.",
    });
    expect(shoppingMocks.getVerifiedSession).not.toHaveBeenCalled();
  });

  it("rejects viewer attempts to mutate the shopping list", async () => {
    setShoppingContext({ role: HOUSEHOLD_ROLES.VIEWER });

    const result = await addShoppingListItemAction({ name: "Rice" });

    expect(result).toEqual({
      data: null,
      error: "You have view-only access to this household inventory.",
    });
    expect(shoppingMocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects source items outside the current household", async () => {
    shoppingMocks.admin = createSupabaseMock({
      items: createSupabaseResponse({
        data: {
          id: "item_other",
          name: "Other Item",
          quantity: 1,
          category_id: "category_other",
        },
      }),
      storage_categories: createSupabaseResponse({
        data: { id: "category_other", name: "Other", storage_area_id: "area_other" },
      }),
      storage_areas: createSupabaseResponse({
        data: { id: "area_other", name: "Other Area", location_id: "location_other" },
      }),
      locations: createSupabaseResponse({
        data: { id: "location_other", name: "Other Home", household_id: "household_other" },
      }),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await addShoppingListItemAction({
      name: "Rice",
      sourceItemId: "item_other",
    });

    expect(result).toEqual({
      data: null,
      error: "That source item is not in your household.",
    });
  });

  it("creates shopping list entries scoped to the active household", async () => {
    shoppingMocks.admin = createSupabaseMock({
      shopping_list_items: createSupabaseResponse({
        data: {
          id: "shopping_1",
          household_id: "household_1",
          name: "Rice",
          quantity: 2,
          status: "needed",
          source_item_id: null,
          source_category_id: null,
          added_by: "user_owner",
          image_path: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      }),
      activity_events: createSupabaseResponse(),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await addShoppingListItemAction({
      name: "  Rice  ",
      quantity: "2",
      status: "unknown",
    });

    const insertQuery = shoppingMocks.admin.__queries.get("shopping_list_items");
    expect(insertQuery.insert).toHaveBeenCalledWith({
      household_id: "household_1",
      name: "Rice",
      quantity: 2,
      status: "needed",
      source_item_id: null,
      source_category_id: null,
      added_by: "user_owner",
    });
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      id: "shopping_1",
      householdId: "household_1",
      name: "Rice",
      quantity: 2,
      status: "needed",
    });
    expect(shoppingMocks.revalidatePath).toHaveBeenCalledWith("/shopping-list");
  });

  it("loads shopping list entries for the active household and default needed status", async () => {
    shoppingMocks.admin = createSupabaseMock({
      shopping_list_items: createSupabaseResponse({
        data: [
          {
            id: "shopping_1",
            household_id: "household_1",
            name: "Rice",
            quantity: 1,
            status: "needed",
            source_item_id: null,
            source_category_id: null,
            added_by: "user_owner",
            image_path: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await getShoppingListAction();

    const query = shoppingMocks.admin.__queries.get("shopping_list_items");
    expect(query.eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(query.eq).toHaveBeenCalledWith("status", "needed");
    expect(result.error).toBeNull();
    expect(result.data.items).toEqual([
      expect.objectContaining({
        id: "shopping_1",
        householdId: "household_1",
        name: "Rice",
      }),
    ]);
  });

  it("updates only shopping list entries in the active household", async () => {
    shoppingMocks.admin = createSupabaseMock({
      shopping_list_items: [
        createSupabaseResponse({
          data: {
            id: "shopping_1",
            name: "Rice",
            quantity: 2,
            status: "needed",
            image_path: null,
          },
        }),
        createSupabaseResponse({
          data: {
            id: "shopping_1",
            household_id: "household_1",
            name: "Rice",
            quantity: 0,
            status: "purchased",
            source_item_id: null,
            source_category_id: null,
            added_by: "user_owner",
            image_path: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-02T00:00:00.000Z",
          },
        }),
      ],
      activity_events: createSupabaseResponse(),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await updateShoppingListItemAction("shopping_1", {
      quantity: "-5",
      status: "purchased",
    });

    const queries = shoppingMocks.admin.__queryHistory.get("shopping_list_items");
    expect(queries[0].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(queries[1].update).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 0,
        status: "purchased",
      })
    );
    expect(queries[1].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(result.error).toBeNull();
    expect(result.data.quantity).toBe(0);
  });

  it("bulk updates only matched shopping list entries in the active household", async () => {
    shoppingMocks.admin = createSupabaseMock({
      shopping_list_items: [
        createSupabaseResponse({
          data: [
            {
              id: "shopping_1",
              name: "Rice",
              quantity: 1,
              status: "needed",
              image_path: null,
            },
            {
              id: "shopping_2",
              name: "Beans",
              quantity: 2,
              status: "needed",
              image_path: null,
            },
          ],
        }),
        createSupabaseResponse({
          data: [
            {
              id: "shopping_1",
              household_id: "household_1",
              name: "Rice",
              quantity: 1,
              status: "purchased",
              source_item_id: null,
              source_category_id: null,
              added_by: "user_owner",
              image_path: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
            {
              id: "shopping_2",
              household_id: "household_1",
              name: "Beans",
              quantity: 2,
              status: "purchased",
              source_item_id: null,
              source_category_id: null,
              added_by: "user_owner",
              image_path: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
          ],
        }),
      ],
      activity_events: createSupabaseResponse(),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await bulkUpdateShoppingListItemsAction(
      ["shopping_1", "shopping_2", "shopping_1", ""],
      { status: "purchased" }
    );

    const queries = shoppingMocks.admin.__queryHistory.get("shopping_list_items");
    expect(queries[0].in).toHaveBeenCalledWith("id", ["shopping_1", "shopping_2"]);
    expect(queries[1].update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "purchased" })
    );
    expect(queries[1].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(queries[1].in).toHaveBeenCalledWith("id", ["shopping_1", "shopping_2"]);
    expect(result.error).toBeNull();
    expect(result.data.items).toHaveLength(2);
  });

  it("deletes only shopping list entries in the active household", async () => {
    shoppingMocks.admin = createSupabaseMock({
      shopping_list_items: [
        createSupabaseResponse({
          data: {
            id: "shopping_1",
            household_id: "household_1",
            name: "Rice",
            quantity: 1,
            status: "needed",
            source_item_id: null,
            source_category_id: null,
            added_by: "user_owner",
            image_path: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        }),
        createSupabaseResponse(),
      ],
      activity_events: createSupabaseResponse(),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await deleteShoppingListItemAction("shopping_1");

    const queries = shoppingMocks.admin.__queryHistory.get("shopping_list_items");
    expect(queries[0].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(queries[1].delete).toHaveBeenCalledTimes(1);
    expect(queries[1].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(result.error).toBeNull();
    expect(result.data.id).toBe("shopping_1");
  });

  it("bulk deletes only matched shopping list entries in the active household", async () => {
    shoppingMocks.admin = createSupabaseMock({
      shopping_list_items: [
        createSupabaseResponse({
          data: [
            {
              id: "shopping_1",
              household_id: "household_1",
              name: "Rice",
              quantity: 1,
              status: "needed",
              source_item_id: null,
              source_category_id: null,
              added_by: "user_owner",
              image_path: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
        createSupabaseResponse(),
      ],
      activity_events: createSupabaseResponse(),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await bulkDeleteShoppingListItemsAction(["shopping_1", "shopping_1"]);

    const queries = shoppingMocks.admin.__queryHistory.get("shopping_list_items");
    expect(queries[0].eq).toHaveBeenCalledWith("household_id", "household_1");
    expect(queries[1].delete).toHaveBeenCalledTimes(1);
    expect(queries[1].in).toHaveBeenCalledWith("id", ["shopping_1"]);
    expect(result.error).toBeNull();
    expect(result.data.items).toHaveLength(1);
  });

  it("requires a destination category when moving a shopping list entry to inventory", async () => {
    const result = await moveShoppingListItemToInventoryAction("shopping_1", {});

    expect(result).toEqual({
      data: null,
      error: "Choose a category for this item.",
    });
    expect(shoppingMocks.getVerifiedSession).not.toHaveBeenCalled();
  });

  it("moves a shopping list entry into inventory with household-scoped destination checks", async () => {
    shoppingMocks.supabase = createSupabaseMock({
      items: createSupabaseResponse({ count: 0 }),
    });
    shoppingMocks.createClient.mockResolvedValue(shoppingMocks.supabase);
    shoppingMocks.admin = createSupabaseMock({
      storage_categories: createSupabaseResponse({
        data: { id: "category_1", name: "Cans", storage_area_id: "area_1" },
      }),
      storage_areas: createSupabaseResponse({
        data: { id: "area_1", name: "Pantry", location_id: "location_1" },
      }),
      locations: createSupabaseResponse({
        data: { id: "location_1", name: "Kitchen", household_id: "household_1" },
      }),
      shopping_list_items: [
        createSupabaseResponse({
          data: {
            id: "shopping_1",
            household_id: "household_1",
            name: "Rice",
            quantity: 3,
            status: "needed",
            source_item_id: null,
            source_category_id: null,
            added_by: "user_owner",
            image_path: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        }),
        createSupabaseResponse(),
      ],
      items: createSupabaseResponse({
        data: {
          id: "item_1",
          name: "Rice",
          quantity: 3,
          expiration_date: null,
          category_id: "category_1",
          image_path: null,
        },
      }),
      activity_events: createSupabaseResponse(),
    });
    shoppingMocks.createAdminClient.mockReturnValue(shoppingMocks.admin);

    const result = await moveShoppingListItemToInventoryAction("shopping_1", {
      categoryId: "category_1",
    });

    const itemQuery = shoppingMocks.admin.__queries.get("items");
    expect(itemQuery.insert).toHaveBeenCalledWith({
      category_id: "category_1",
      name: "Rice",
      quantity: 3,
      expiration_date: null,
      image_path: null,
    });
    expect(result.error).toBeNull();
    expect(result.data.inventoryItem).toMatchObject({
      id: "item_1",
      locationId: "location_1",
      storageAreaId: "area_1",
      categoryId: "category_1",
    });
  });

  it("requires an item id before moving inventory items to the shopping list", async () => {
    const result = await deleteItemAndAddToShoppingListAction("");

    expect(result).toEqual({
      data: null,
      error: "Item is required.",
    });
    expect(shoppingMocks.getVerifiedSession).not.toHaveBeenCalled();
  });
});
