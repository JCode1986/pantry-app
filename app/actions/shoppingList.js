"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/verifiedSession";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { toNonNegativeInteger } from "@/utils/pantry/date";
import {
  canEditHouseholdInventory,
  getHouseholdBilling,
  getHouseholdForUser,
} from "@/utils/households";

const SHOPPING_LIST_STATUSES = new Set(["needed", "purchased", "dismissed"]);

function actionError(message) {
  return { data: null, error: message };
}

function normalizeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value, fallback = "needed") {
  const status = typeof value === "string" ? value.toLowerCase() : "";
  return SHOPPING_LIST_STATUSES.has(status) ? status : fallback;
}

function normalizeOptionalId(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => normalizeOptionalId(id)).filter(Boolean))];
}

function serializeShoppingListItem(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    quantity: row.quantity ?? 0,
    status: row.status,
    sourceItemId: row.source_item_id,
    sourceCategoryId: row.source_category_id,
    addedBy: row.added_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthedHousehold() {
  const { user, error: sessionError } = await getVerifiedSession();

  if (sessionError || !user?.id) {
    return {
      user: null,
      household: null,
      member: null,
      error: sessionError || "Your session has expired. Please log in again.",
    };
  }

  try {
    const { household, member } = await getHouseholdForUser({
      userId: user.id,
      email: user.email,
      createIfMissing: true,
    });

    if (!household?.id) {
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

function requireShoppingListEditor(context) {
  return canEditHouseholdInventory(context?.member)
    ? null
    : "You have view-only access to this household inventory.";
}

async function recordShoppingListActivity({
  admin,
  household,
  user,
  shoppingListItem,
  action,
  changes = {},
}) {
  if (!household?.id || !user?.id || !shoppingListItem?.id) return;

  const { error } = await admin.from("activity_events").insert({
    household_id: household.id,
    actor_user_id: user.id,
    actor_email: user.email ?? null,
    entity_type: "shopping_list_item",
    entity_id: shoppingListItem.id,
    action,
    name_at_event: shoppingListItem.name,
    item_name: shoppingListItem.name,
    quantity: shoppingListItem.quantity ?? 0,
    changes,
  });

  if (error) {
    console.error("recordShoppingListActivity error:", error);
  }
}

async function getCategoryPath(admin, categoryId) {
  if (!categoryId) return null;

  const { data: category, error: categoryError } = await admin
    .from("storage_categories")
    .select("id, name, storage_area_id")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError || !category) return null;

  const { data: area } = category.storage_area_id
    ? await admin
        .from("storage_areas")
        .select("id, name, location_id")
        .eq("id", category.storage_area_id)
        .maybeSingle()
    : { data: null };

  const { data: location } = area?.location_id
    ? await admin
        .from("locations")
        .select("id, name, household_id")
        .eq("id", area.location_id)
        .maybeSingle()
    : { data: null };

  return {
    householdId: location?.household_id ?? null,
    location: location?.name ?? null,
    area: area?.name ?? null,
    category: category.name ?? null,
    locationId: location?.id ?? null,
    storageAreaId: area?.id ?? null,
    categoryId: category.id,
  };
}

async function getItemSnapshot(admin, itemId) {
  if (!itemId) return { item: null, path: null };

  const { data: item, error } = await admin
    .from("items")
    .select("id, name, quantity, expiration_date, category_id")
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw error;
  if (!item) return { item: null, path: null };

  const path = await getCategoryPath(admin, item.category_id);
  return { item, path };
}

async function enforceItemLimit() {
  const { household } = await getAuthedHousehold();
  const { limits } = await getHouseholdBilling(household);
  if (limits.items === null) return null;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true });

  if (error) throw error;

  if ((count ?? 0) >= limits.items) {
    return `Free plan includes ${limits.items} items. Upgrade to Plus or Family for unlimited items.`;
  }

  return null;
}

function revalidateShoppingListPaths() {
  revalidatePath("/");
  revalidatePath("/locations");
  revalidatePath("/areas");
  revalidatePath("/categories");
  revalidatePath("/items");
  revalidatePath("/shopping-list");
}

export async function getShoppingListAction(filters = {}) {
  const context = await getAuthedHousehold();
  if (context.error) {
    return { data: { items: [] }, error: context.error };
  }

  const status = normalizeStatus(filters.status, "needed");
  const includeAll = filters.status === "all";

  try {
    const admin = createAdminClient();
    let query = admin
      .from("shopping_list_items")
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      )
      .eq("household_id", context.household.id)
      .order("created_at", { ascending: false });

    if (!includeAll) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: { items: (data ?? []).map(serializeShoppingListItem) },
      error: null,
    };
  } catch (err) {
    return {
      data: { items: [] },
      error: err?.message || "Could not load shopping list.",
    };
  }
}

export async function addShoppingListItemAction(input = {}) {
  const name = normalizeName(input.name);
  if (!name) return actionError("Shopping list item name is required.");

  const context = await getAuthedHousehold();
  if (context.error) return actionError(context.error);
  const permissionError = requireShoppingListEditor(context);
  if (permissionError) return actionError(permissionError);

  try {
    const admin = createAdminClient();
    const sourceItemId = normalizeOptionalId(input.sourceItemId);
    const sourceItemSnapshot = sourceItemId
      ? await getItemSnapshot(admin, sourceItemId)
      : { item: null, path: null };

    if (sourceItemId && !sourceItemSnapshot.item) {
      return actionError("Source item was not found.");
    }

    if (sourceItemId && sourceItemSnapshot.path?.householdId !== context.household.id) {
      return actionError("That source item is not in your household.");
    }

    const sourceCategoryId =
      normalizeOptionalId(input.sourceCategoryId) ??
      sourceItemSnapshot.item?.category_id ??
      null;
    const sourcePath = sourceCategoryId
      ? await getCategoryPath(admin, sourceCategoryId)
      : null;

    if (sourceCategoryId && sourcePath?.householdId !== context.household.id) {
      return actionError("That category is not in your household.");
    }

    const { data, error } = await admin
      .from("shopping_list_items")
      .insert({
        household_id: context.household.id,
        name,
        quantity: toNonNegativeInteger(input.quantity, 1),
        status: normalizeStatus(input.status, "needed"),
        source_item_id: sourceItemId,
        source_category_id: sourceCategoryId,
        added_by: context.user.id,
      })
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    await recordShoppingListActivity({
      admin,
      household: context.household,
      user: context.user,
      shoppingListItem: data,
      action: "added",
      changes: {
        source: sourcePath
          ? {
              location: sourcePath.location,
              area: sourcePath.area,
              category: sourcePath.category,
              category_id: sourcePath.categoryId,
            }
          : null,
        status: data.status,
      },
    });

    revalidateShoppingListPaths();
    return { data: serializeShoppingListItem(data), error: null };
  } catch (err) {
    return actionError(err?.message || "Could not add shopping list item.");
  }
}

export async function updateShoppingListItemAction(itemId, updates = {}) {
  if (!itemId) return actionError("Shopping list item is required.");

  const context = await getAuthedHousehold();
  if (context.error) return actionError(context.error);
  const permissionError = requireShoppingListEditor(context);
  if (permissionError) return actionError(permissionError);

  const payload = { updated_at: new Date().toISOString() };
  const changes = {};

  if (typeof updates.name === "string") {
    const name = normalizeName(updates.name);
    if (!name) return actionError("Shopping list item name is required.");
    payload.name = name;
    changes.name = { to: name };
  }

  if (updates.quantity !== undefined) {
    payload.quantity = toNonNegativeInteger(updates.quantity, 0);
    changes.quantity = { to: payload.quantity };
  }

  if (updates.status !== undefined) {
    payload.status = normalizeStatus(updates.status, "needed");
    changes.status = { to: payload.status };
  }

  if (Object.keys(payload).length === 1) {
    return actionError("No valid shopping list updates were provided.");
  }

  try {
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("shopping_list_items")
      .select("id, name, quantity, status")
      .eq("id", itemId)
      .eq("household_id", context.household.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return actionError("Shopping list item was not found.");

    for (const key of Object.keys(changes)) {
      changes[key].from = existing[key];
    }

    const { data, error } = await admin
      .from("shopping_list_items")
      .update(payload)
      .eq("id", itemId)
      .eq("household_id", context.household.id)
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    await recordShoppingListActivity({
      admin,
      household: context.household,
      user: context.user,
      shoppingListItem: data,
      action: "updated",
      changes,
    });

    revalidateShoppingListPaths();
    return { data: serializeShoppingListItem(data), error: null };
  } catch (err) {
    return actionError(err?.message || "Could not update shopping list item.");
  }
}

export async function bulkUpdateShoppingListItemsAction(itemIds = [], updates = {}) {
  const ids = normalizeIdList(itemIds);
  if (ids.length === 0) return actionError("Select at least one shopping list item.");

  const context = await getAuthedHousehold();
  if (context.error) return actionError(context.error);
  const permissionError = requireShoppingListEditor(context);
  if (permissionError) return actionError(permissionError);

  const payload = { updated_at: new Date().toISOString() };
  const changes = {};

  if (updates.status !== undefined) {
    payload.status = normalizeStatus(updates.status, "needed");
    changes.status = { to: payload.status };
  }

  if (Object.keys(payload).length === 1) {
    return actionError("No valid shopping list updates were provided.");
  }

  try {
    const admin = createAdminClient();
    const { data: existing = [], error: existingError } = await admin
      .from("shopping_list_items")
      .select("id, name, quantity, status")
      .eq("household_id", context.household.id)
      .in("id", ids);

    if (existingError) throw existingError;
    if (existing.length === 0) {
      return actionError("No selected shopping list items were found.");
    }

    const existingById = new Map(existing.map((item) => [String(item.id), item]));
    const matchedIds = ids.filter((id) => existingById.has(String(id)));

    const { data = [], error } = await admin
      .from("shopping_list_items")
      .update(payload)
      .eq("household_id", context.household.id)
      .in("id", matchedIds)
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      );

    if (error) throw error;

    await Promise.all(
      data.map((item) => {
        const previous = existingById.get(String(item.id));
        const itemChanges = {
          ...changes,
          status: changes.status
            ? { from: previous?.status, to: changes.status.to }
            : undefined,
        };

        return recordShoppingListActivity({
          admin,
          household: context.household,
          user: context.user,
          shoppingListItem: item,
          action: "updated",
          changes: Object.fromEntries(
            Object.entries(itemChanges).filter(([, value]) => value !== undefined)
          ),
        });
      })
    );

    revalidateShoppingListPaths();
    return { data: { items: data.map(serializeShoppingListItem) }, error: null };
  } catch (err) {
    return actionError(err?.message || "Could not update selected shopping list items.");
  }
}

export async function deleteShoppingListItemAction(itemId) {
  if (!itemId) return actionError("Shopping list item is required.");

  const context = await getAuthedHousehold();
  if (context.error) return actionError(context.error);
  const permissionError = requireShoppingListEditor(context);
  if (permissionError) return actionError(permissionError);

  try {
    const admin = createAdminClient();
    const { data: existing, error: lookupError } = await admin
      .from("shopping_list_items")
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      )
      .eq("id", itemId)
      .eq("household_id", context.household.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing) return actionError("Shopping list item was not found.");

    const { error } = await admin
      .from("shopping_list_items")
      .delete()
      .eq("id", itemId)
      .eq("household_id", context.household.id);

    if (error) throw error;

    await recordShoppingListActivity({
      admin,
      household: context.household,
      user: context.user,
      shoppingListItem: existing,
      action: "deleted",
      changes: {
        snapshot: {
          name: existing.name,
          quantity: existing.quantity,
          status: existing.status,
        },
      },
    });

    revalidateShoppingListPaths();
    return { data: serializeShoppingListItem(existing), error: null };
  } catch (err) {
    return actionError(err?.message || "Could not delete shopping list item.");
  }
}

export async function bulkDeleteShoppingListItemsAction(itemIds = []) {
  const ids = normalizeIdList(itemIds);
  if (ids.length === 0) return actionError("Select at least one shopping list item.");

  const context = await getAuthedHousehold();
  if (context.error) return actionError(context.error);
  const permissionError = requireShoppingListEditor(context);
  if (permissionError) return actionError(permissionError);

  try {
    const admin = createAdminClient();
    const { data: existing = [], error: lookupError } = await admin
      .from("shopping_list_items")
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      )
      .eq("household_id", context.household.id)
      .in("id", ids);

    if (lookupError) throw lookupError;
    if (existing.length === 0) {
      return actionError("No selected shopping list items were found.");
    }

    const matchedIds = existing.map((item) => item.id);
    const { error } = await admin
      .from("shopping_list_items")
      .delete()
      .eq("household_id", context.household.id)
      .in("id", matchedIds);

    if (error) throw error;

    await Promise.all(
      existing.map((item) =>
        recordShoppingListActivity({
          admin,
          household: context.household,
          user: context.user,
          shoppingListItem: item,
          action: "deleted",
          changes: {
            snapshot: {
              name: item.name,
              quantity: item.quantity,
              status: item.status,
            },
          },
        })
      )
    );

    revalidateShoppingListPaths();
    return { data: { items: existing.map(serializeShoppingListItem) }, error: null };
  } catch (err) {
    return actionError(err?.message || "Could not delete selected shopping list items.");
  }
}

export async function moveShoppingListItemToInventoryAction(itemId, input = {}) {
  if (!itemId) return actionError("Shopping list item is required.");

  const categoryId = normalizeOptionalId(input.categoryId);
  if (!categoryId) return actionError("Choose a category for this item.");

  const context = await getAuthedHousehold();
  if (context.error) return actionError(context.error);
  const permissionError = requireShoppingListEditor(context);
  if (permissionError) return actionError(permissionError);

  try {
    const admin = createAdminClient();
    const itemLimitError = await enforceItemLimit();
    if (itemLimitError) return actionError(itemLimitError);

    const destinationPath = await getCategoryPath(admin, categoryId);
    if (!destinationPath || destinationPath.householdId !== context.household.id) {
      return actionError("That category is not in your household.");
    }

    const { data: shoppingListItem, error: lookupError } = await admin
      .from("shopping_list_items")
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      )
      .eq("id", itemId)
      .eq("household_id", context.household.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!shoppingListItem) return actionError("Shopping list item was not found.");

    const { data: inventoryItem, error: insertError } = await admin
      .from("items")
      .insert({
        category_id: categoryId,
        name: shoppingListItem.name,
        quantity: toNonNegativeInteger(shoppingListItem.quantity, 0),
        expiration_date: null,
      })
      .select("id, name, quantity, expiration_date, category_id")
      .single();

    if (insertError) throw insertError;

    const { error: deleteError } = await admin
      .from("shopping_list_items")
      .delete()
      .eq("id", shoppingListItem.id)
      .eq("household_id", context.household.id);

    if (deleteError) {
      await admin.from("items").delete().eq("id", inventoryItem.id);
      throw deleteError;
    }

    await recordShoppingListActivity({
      admin,
      household: context.household,
      user: context.user,
      shoppingListItem,
      action: "deleted",
      changes: {
        moved_to_inventory: {
          item_id: inventoryItem.id,
          location: destinationPath.location,
          area: destinationPath.area,
          category: destinationPath.category,
          category_id: destinationPath.categoryId,
        },
        snapshot: {
          name: shoppingListItem.name,
          quantity: shoppingListItem.quantity,
          status: shoppingListItem.status,
        },
      },
    });

    revalidateShoppingListPaths();
    return {
      data: {
        shoppingListItem: serializeShoppingListItem(shoppingListItem),
        inventoryItem: {
          id: inventoryItem.id,
          name: inventoryItem.name,
          quantity: inventoryItem.quantity ?? 0,
          expirationDate: inventoryItem.expiration_date ?? null,
          categoryId: inventoryItem.category_id,
          locationId: destinationPath.locationId,
          locationName: destinationPath.location,
          storageAreaId: destinationPath.storageAreaId,
          storageAreaName: destinationPath.area,
          categoryName: destinationPath.category,
        },
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not move shopping list item to inventory.");
  }
}

export async function deleteItemAndAddToShoppingListAction(itemId) {
  if (!itemId) return actionError("Item is required.");

  const context = await getAuthedHousehold();
  if (context.error) return actionError(context.error);
  const permissionError = requireShoppingListEditor(context);
  if (permissionError) return actionError(permissionError);

  try {
    const admin = createAdminClient();
    const { item, path } = await getItemSnapshot(admin, itemId);

    if (!item) return actionError("Item was not found.");
    if (path?.householdId !== context.household.id) {
      return actionError("That item is not in your household.");
    }

    const { data: shoppingListItem, error: insertError } = await admin
      .from("shopping_list_items")
      .insert({
        household_id: context.household.id,
        name: item.name,
        quantity: item.quantity ?? 0,
        status: "needed",
        source_item_id: item.id,
        source_category_id: item.category_id,
        added_by: context.user.id,
      })
      .select(
        "id, household_id, name, quantity, status, source_item_id, source_category_id, added_by, created_at, updated_at"
      )
      .single();

    if (insertError) throw insertError;

    const { error: deleteError } = await admin
      .from("items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      await admin
        .from("shopping_list_items")
        .delete()
        .eq("id", shoppingListItem.id)
        .eq("household_id", context.household.id);
      throw deleteError;
    }

    await recordShoppingListActivity({
      admin,
      household: context.household,
      user: context.user,
      shoppingListItem,
      action: "added",
      changes: {
        from_deleted_item: {
          item_id: item.id,
          name: item.name,
          quantity: item.quantity ?? 0,
          expiration_date: item.expiration_date ?? null,
        },
        source: {
          location: path.location,
          area: path.area,
          category: path.category,
          category_id: path.categoryId,
        },
      },
    });

    revalidateShoppingListPaths();
    return {
      data: {
        deletedItemId: item.id,
        shoppingListItem: serializeShoppingListItem(shoppingListItem),
      },
      error: null,
    };
  } catch (err) {
    return actionError(err?.message || "Could not move item to shopping list.");
  }
}
