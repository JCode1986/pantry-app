"use server";

import { createClient } from "@/utils/supabase/server";
import { getVerifiedSession } from "@/lib/verifiedSession";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getHouseholdBilling,
  getHouseholdForUser,
} from "@/utils/households";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const ACTION_FILTERS = new Set(["added", "updated", "deleted", "moved"]);

function normalizeLimit(value) {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

function normalizeAction(value) {
  const action = typeof value === "string" ? value.toLowerCase() : "";
  return ACTION_FILTERS.has(action) ? action : "all";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readNested(obj, path) {
  return path
    .split(".")
    .reduce((current, key) => current?.[key], obj);
}

function firstValue(obj, paths) {
  for (const path of paths) {
    const value = readNested(obj, path);
    if (value !== null && value !== undefined && value !== "") return value;
  }

  return null;
}

function normalizeId(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return normalizeId(value.id ?? value.value);
  return String(value);
}

function moveCategoryIds(row) {
  const changes = row?.changes || {};
  const source = {
    row,
    changes,
  };

  const from = firstValue(source, [
    "changes.category_id.from",
    "changes.category_id.old",
    "changes.categoryId.from",
    "changes.categoryId.old",
    "changes.category.from",
    "changes.old.category_id",
    "changes.old.categoryId",
    "changes.old.category.id",
    "changes.old_category_id",
    "changes.previous_category_id",
    "changes.from_category_id",
    "changes.from.category_id",
    "changes.from.categoryId",
    "changes.from.category.id",
    "changes.previous.category_id",
    "row.old_category_id",
    "row.previous_category_id",
    "row.from_category_id",
  ]);

  const to = firstValue(source, [
    "changes.category_id.to",
    "changes.category_id.new",
    "changes.categoryId.to",
    "changes.categoryId.new",
    "changes.category.to",
    "changes.new.category_id",
    "changes.new.categoryId",
    "changes.new.category.id",
    "changes.new_category_id",
    "changes.to_category_id",
    "changes.to.category_id",
    "changes.to.categoryId",
    "changes.to.category.id",
    "changes.updated_to.category_id",
    "changes.updated_to.categoryId",
    "changes.category_id",
    "changes.categoryId",
    "row.new_category_id",
    "row.to_category_id",
    "row.category_id",
  ]);

  return {
    from: normalizeId(from),
    to: normalizeId(to),
  };
}

function pathFromMaps(categoryId, categoryMap, areaMap, locationMap) {
  if (!categoryId) return null;

  const category = categoryMap.get(String(categoryId));
  const area = category?.storage_area_id
    ? areaMap.get(String(category.storage_area_id))
    : null;
  const location = area?.location_id
    ? locationMap.get(String(area.location_id))
    : null;

  if (!category && !area && !location) return null;

  return {
    location: location?.name ?? null,
    area: area?.name ?? null,
    category: category?.name ?? null,
    location_id: location?.id ?? null,
    storage_area_id: area?.id ?? null,
    category_id: category?.id ?? categoryId,
  };
}

function hasMovePath(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value.location ||
        value.location_name ||
        value.area ||
        value.storage_area ||
        value.storage_area_name ||
        value.category ||
        value.category_name)
  );
}

function rowItemId(row) {
  if (String(row?.entity_type || "").toLowerCase() !== "item") return null;
  return normalizeId(row.entity_id ?? row.item_id);
}

function rowTime(value) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : null;
}

async function getLegacyMovePaths(movedItems) {
  const candidates = movedItems
    .map((row) => ({
      row,
      itemId: rowItemId(row),
      time: rowTime(row.created_at),
    }))
    .filter((candidate) => candidate.itemId && candidate.time);

  if (candidates.length === 0) return new Map();

  const itemIds = [...new Set(candidates.map((candidate) => candidate.itemId))];
  const times = candidates.map((candidate) => candidate.time);
  const since = new Date(Math.min(...times) - 60 * 60 * 1000).toISOString();
  const until = new Date(Math.max(...times) + 60 * 60 * 1000).toISOString();

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("activity_log")
      .select("item_id, changes, created_at")
      .eq("action", "moved")
      .in("item_id", itemIds)
      .gte("created_at", since)
      .lte("created_at", until)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const logs = (data ?? [])
      .map((row) => ({
        itemId: normalizeId(row.item_id),
        time: rowTime(row.created_at),
        changes: row.changes || {},
      }))
      .filter(
        (row) =>
          row.itemId &&
          row.time &&
          (hasMovePath(row.changes.from) || hasMovePath(row.changes.to))
      );

    const paths = new Map();

    for (const candidate of candidates) {
      let best = null;
      let bestDistance = Infinity;

      for (const log of logs) {
        if (log.itemId !== candidate.itemId) continue;

        const distance = Math.abs(log.time - candidate.time);
        if (distance < bestDistance) {
          best = log;
          bestDistance = distance;
        }
      }

      if (best && bestDistance <= 2000) {
        paths.set(candidate.row, {
          from: best.changes.from,
          to: best.changes.to,
        });
      }
    }

    return paths;
  } catch (err) {
    console.error("getLegacyMovePaths error:", err);
    return new Map();
  }
}

async function enrichMovedActivityItems(supabase, items) {
  const movedItems = (items ?? []).filter(
    (row) => String(row.action || "").toLowerCase() === "moved"
  );

  if (movedItems.length === 0) return items;

  const legacyMovePaths = await getLegacyMovePaths(movedItems);

  const ids = new Set();
  const itemMoveIds = new Map();

  for (const row of movedItems) {
    const idsForRow = moveCategoryIds(row);
    itemMoveIds.set(row, idsForRow);
    if (idsForRow.from) ids.add(idsForRow.from);
    if (idsForRow.to) ids.add(idsForRow.to);
  }

  let categoryMap = new Map();
  let areaMap = new Map();
  let locationMap = new Map();

  if (ids.size > 0) {
    const { data: categoriesRaw, error: categoriesError } = await supabase
      .from("storage_categories")
      .select("id, name, storage_area_id")
      .in("id", Array.from(ids));

    if (categoriesError) throw categoriesError;

    const categories = categoriesRaw ?? [];
    const areaIds = [
      ...new Set(categories.map((category) => category.storage_area_id).filter(Boolean)),
    ];

    const { data: areasRaw, error: areasError } = areaIds.length
      ? await supabase
          .from("storage_areas")
          .select("id, name, location_id")
          .in("id", areaIds)
      : { data: [], error: null };

    if (areasError) throw areasError;

    const areas = areasRaw ?? [];
    const locationIds = [
      ...new Set(areas.map((area) => area.location_id).filter(Boolean)),
    ];

    const { data: locationsRaw, error: locationsError } = locationIds.length
      ? await supabase.from("locations").select("id, name").in("id", locationIds)
      : { data: [], error: null };

    if (locationsError) throw locationsError;

    categoryMap = new Map(
      categories.map((category) => [String(category.id), category])
    );
    areaMap = new Map((areasRaw ?? []).map((area) => [String(area.id), area]));
    locationMap = new Map(
      (locationsRaw ?? []).map((location) => [String(location.id), location])
    );
  }

  return items.map((row) => {
    if (String(row.action || "").toLowerCase() !== "moved") return row;

    const idsForRow = itemMoveIds.get(row) ?? {};
    const changes = row.changes || {};
    const legacyPaths = legacyMovePaths.get(row) ?? {};
    const nextFrom = hasMovePath(changes.from)
      ? changes.from
      : hasMovePath(legacyPaths.from)
        ? legacyPaths.from
      : pathFromMaps(idsForRow.from, categoryMap, areaMap, locationMap);
    const nextTo = hasMovePath(changes.to)
      ? changes.to
      : hasMovePath(legacyPaths.to)
        ? legacyPaths.to
      : pathFromMaps(idsForRow.to, categoryMap, areaMap, locationMap);

    if (!nextFrom && !nextTo) return row;

    return {
      ...row,
      changes: {
        ...changes,
        ...(nextFrom ? { from: nextFrom } : {}),
        ...(nextTo ? { to: nextTo } : {}),
      },
    };
  });
}

async function getAuthedUser() {
  const { user, error } = await getVerifiedSession();

  if (error || !user?.id) {
    return { user: null, error: error || "Your session has expired. Please log in again." };
  }

  return { user, error: null };
}

export async function getActivityFilterOptionsAction() {
  const { user, error } = await getAuthedUser();
  if (error) {
    return { data: { members: [], effectivePlanId: "free" }, error };
  }

  try {
    const { household } = await getHouseholdForUser({
      userId: user.id,
      email: user.email,
      createIfMissing: true,
    });

    if (!household?.id) {
      return { data: { members: [], effectivePlanId: "free" }, error: null };
    }

    const admin = createAdminClient();
    const [
      { data, error: membersError },
      { effectivePlanId },
    ] = await Promise.all([
      admin
        .from("household_members")
        .select("user_id, email, role")
        .eq("household_id", household.id)
        .order("joined_at", { ascending: true }),
      getHouseholdBilling(household),
    ]);

    if (membersError) throw membersError;

    return {
      data: {
        members: (data ?? []).map((member) => ({
          userId: member.user_id,
          email: member.email || "Unknown email",
          role: member.role,
        })),
        effectivePlanId,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { members: [], effectivePlanId: "free" },
      error: err?.message || "Could not load activity filters.",
    };
  }
}

export async function getRecentActivityAction(filters = {}) {
  const { error: authError } = await getAuthedUser();
  if (authError) {
    return {
      data: { items: [], nextCursor: null, hasMore: false },
      error: authError,
    };
  }

  const limit = normalizeLimit(filters.limit);
  const action = normalizeAction(filters.action);
  const actorUserId = normalizeText(filters.actorUserId);
  const cursor = normalizeText(filters.cursor);

  try {
    const supabase = await createClient();
    let query = supabase
      .from("recent_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (action !== "all") {
      query = query.eq("action", action);
    }

    if (actorUserId) {
      query = query.eq("actor_user_id", actorUserId);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const items = await enrichMovedActivityItems(
      supabase,
      rows.slice(0, limit)
    );

    return {
      data: {
        items,
        hasMore: rows.length > limit,
        nextCursor: items.at(-1)?.created_at ?? null,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { items: [], nextCursor: null, hasMore: false },
      error: err?.message || "Could not load recent activity.",
    };
  }
}
