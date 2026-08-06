import { HOUSEHOLD_ROLES } from "@/utils/householdRoles";

export function createTestUser(overrides = {}) {
  return {
    id: "user_owner",
    email: "owner@example.test",
    user_metadata: {},
    ...overrides,
  };
}

export function createTestHousehold(overrides = {}) {
  return {
    id: "household_1",
    owner_id: "user_owner",
    name: "Test Household",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createTestMember(overrides = {}) {
  return {
    household_id: "household_1",
    user_id: "user_owner",
    email: "owner@example.test",
    role: HOUSEHOLD_ROLES.OWNER,
    joined_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createTestLocation(overrides = {}) {
  return {
    id: "location_1",
    household_id: "household_1",
    name: "Kitchen",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createTestStorageArea(overrides = {}) {
  return {
    id: "area_1",
    location_id: "location_1",
    name: "Pantry",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createTestCategory(overrides = {}) {
  return {
    id: "category_1",
    storage_area_id: "area_1",
    name: "Canned Goods",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createTestItem(overrides = {}) {
  return {
    id: "item_1",
    category_id: "category_1",
    name: "Black Beans",
    quantity: 2,
    expiration_date: "2026-12-31",
    barcode: "123456789012",
    notes: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createTestShoppingListEntry(overrides = {}) {
  return {
    id: "shopping_1",
    household_id: "household_1",
    name: "Rice",
    quantity: 1,
    status: "needed",
    source_item_id: null,
    source_category_id: null,
    added_by: "user_owner",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function createRoleFixtures() {
  return {
    owner: createTestMember({ role: HOUSEHOLD_ROLES.OWNER }),
    editor: createTestMember({ user_id: "user_editor", role: HOUSEHOLD_ROLES.EDITOR }),
    viewer: createTestMember({ user_id: "user_viewer", role: HOUSEHOLD_ROLES.VIEWER }),
    nonMember: null,
  };
}
