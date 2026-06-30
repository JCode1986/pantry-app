'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { toNonNegativeInteger } from '@/utils/pantry/date';
import { getSession } from '@/lib/sessionOptions';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  getHouseholdBilling,
  getHouseholdForUser,
} from '@/utils/households';

function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validationError(message) {
  return { data: null, error: message };
}

function upgradeLimitError(message) {
  return {
    data: null,
    error: message,
    upgradeHref: '/profile#billing',
  };
}

function normalizeSearchTerm(value) {
  return normalizeName(value).replace(/[%_]/g, '').slice(0, 80);
}

function compactPath(path) {
  if (!path) return null;

  return {
    location: path.location ?? null,
    area: path.area ?? null,
    category: path.category ?? null,
    location_id: path.location_id ?? null,
    storage_area_id: path.storage_area_id ?? null,
    category_id: path.category_id ?? null,
  };
}

async function getCategoryPath(supabase, categoryId) {
  if (!categoryId) return null;

  const { data: category, error: categoryError } = await supabase
    .from('storage_categories')
    .select('id, name, storage_area_id')
    .eq('id', categoryId)
    .single();

  if (categoryError || !category) return null;

  const { data: area } = category.storage_area_id
    ? await supabase
        .from('storage_areas')
        .select('id, name, location_id')
        .eq('id', category.storage_area_id)
        .single()
    : { data: null };

  const { data: location } = area?.location_id
    ? await supabase
        .from('locations')
        .select('id, name')
        .eq('id', area.location_id)
        .single()
    : { data: null };

  return {
    location: location?.name ?? null,
    area: area?.name ?? null,
    category: category.name ?? null,
    location_id: location?.id ?? null,
    storage_area_id: area?.id ?? null,
    category_id: category.id,
  };
}

async function recordItemMoveActivity({
  startedAt,
  user,
  household,
  item,
  fromPath,
  toPath,
}) {
  if (!item?.id || !fromPath || !toPath) return;

  try {
    const admin = createAdminClient();
    const changes = {
      category_id: {
        from: fromPath.category_id,
        to: toPath.category_id,
      },
      from: compactPath(fromPath),
      to: compactPath(toPath),
    };

    const payload = {
      household_id: household?.id ?? null,
      actor_user_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      entity_type: 'item',
      entity_id: item.id,
      action: 'moved',
      name_at_event: item.name,
      item_name: item.name,
      location_name: toPath.location,
      storage_area_name: toPath.area,
      category_name: toPath.category,
      quantity: item.quantity ?? 0,
      expiration_date: item.expiration_date ?? null,
      changes,
    };

    const { data: existing, error: existingError } = await admin
      .from('activity_events')
      .select('id')
      .eq('entity_type', 'item')
      .eq('entity_id', item.id)
      .in('action', ['moved', 'updated'])
      .gte('created_at', startedAt)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    if (existing?.[0]?.id) {
      const { error } = await admin
        .from('activity_events')
        .update(payload)
        .eq('id', existing[0].id);
      if (error) throw error;
      return;
    }

    const { error } = await admin.from('activity_events').insert(payload);
    if (error) throw error;
  } catch (err) {
    console.error('recordItemMoveActivity error:', err);
  }
}

async function getCurrentUser() {
  const session = await getSession();
  return session?.user?.user ?? null;
}

async function getCurrentHouseholdContext() {
  const user = await getCurrentUser();
  if (!user?.id) return { user: null, household: null };

  const { household } = await getHouseholdForUser({
    userId: user.id,
    email: user.email,
    createIfMissing: true,
  });

  return { user, household };
}

async function getCurrentPlanLimits() {
  const { household } = await getCurrentHouseholdContext();
  const { limits } = await getHouseholdBilling(household);

  return limits;
}

async function countRows(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

async function enforceLocationLimit(supabase) {
  const limits = await getCurrentPlanLimits();
  if (limits.locations === null) return null;

  const locationCount = await countRows(supabase, 'locations');
  if (locationCount >= limits.locations) {
    return `Free plan includes ${limits.locations} location. Upgrade to Plus or Family for unlimited locations.`;
  }

  return null;
}

async function enforceItemLimit(supabase) {
  const limits = await getCurrentPlanLimits();
  if (limits.items === null) return null;

  const itemCount = await countRows(supabase, 'items');
  if (itemCount >= limits.items) {
    return `Free plan includes ${limits.items} items. Upgrade to Plus or Family for unlimited items.`;
  }

  return null;
}

export async function getLocations() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('locations').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addLocation(name) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return validationError('Location name is required');

  const supabase = await createClient();
  const { household } = await getCurrentHouseholdContext();
  const limitError = await enforceLocationLimit(supabase);
  if (limitError) return upgradeLimitError(limitError);

  const { data, error } = await supabase
    .from('locations')
    .insert([{ name: normalizedName, household_id: household?.id }])
    .select('*');
  if (error) throw error;
  revalidatePath('/');
  return { data: data[0], error: null };
}

export async function updateLocationName(id, newName) {
  const normalizedName = normalizeName(newName);
  if (!id || !normalizedName) return validationError('Location name is required');

  const supabase = await createClient();
  const { error } = await supabase.from('locations').update({ name: normalizedName }).eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

export async function deleteLocation(id) {
  const supabase = await createClient();
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/');
}

// ✅ Fetch all storage areas for a location
export async function getStorageAreas(locationId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_areas')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching storage areas:', error);
    throw error;
  }

  return data;
}

// ✅ Add a new storage area
export async function addStorageArea(locationId, name) {
  const normalizedName = normalizeName(name);
  if (!locationId || !normalizedName) {
    return validationError('Location and storage area name are required');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_areas')
    .insert([{ location_id: locationId, name: normalizedName }])
    .select();

  if (error) {
    console.error('Error adding storage area:', error);
    return { error: error.message };
  }

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/areas');
  return { data: data[0] };
}

// updateStorageArea
export async function updateStorageArea(id, name) {
  const normalizedName = normalizeName(name);
  if (!id || !normalizedName) return validationError('Storage area name is required');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_areas')
    .update({ name: normalizedName })
    .eq('id', id)
    .select('*')
    .single();

  return error ? { error } : { data };
}

// deleteStorageArea
export async function deleteStorageArea(id) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('storage_areas')
    .delete()
    .eq('id', id);

  return error ? { error } : { success: true };
}

export async function addItem(categoryId, { name, quantity = 0, expiration_date = null }) {
  const normalizedName = normalizeName(name);
  if (!categoryId || !normalizedName) {
    return validationError('Category and item name are required');
  }

  const supabase = await createClient();
  const limitError = await enforceItemLimit(supabase);
  if (limitError) return upgradeLimitError(limitError);

  const { data, error } = await supabase
    .from('items')
    .insert([
      {
        category_id: categoryId,
        name: normalizedName,
        quantity: toNonNegativeInteger(quantity, 0),
        expiration_date: expiration_date || null,
      },
    ])
    .select('*')               
    .single();                 

  if (error) {
    console.error('Error adding item:', error);
    return { error };
  }

  return { data };            
}

export async function getInventoryHierarchy() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      storage_areas (
        id,
        name,
        storage_categories (
          id,
          name
        )
      )
    `)
    .order('name', { ascending: true });

  if (error) {
    console.error('getInventoryHierarchy error:', error);
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      storageAreas: (location.storage_areas ?? [])
        .map((area) => ({
          id: area.id,
          name: area.name,
          categories: (area.storage_categories ?? []).map((category) => ({
            id: category.id,
            name: category.name,
          })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })),
    error: null,
  };
}

export async function searchItems(query) {
  const term = normalizeSearchTerm(query);
  if (term.length < 2) {
    return { data: [], error: null };
  }

  const supabase = await createClient();

  const { data: itemsRaw, error: itemsError } = await supabase
    .from('items')
    .select('id, name, quantity, expiration_date, category_id')
    .ilike('name', `%${term}%`)
    .order('name', { ascending: true })
    .limit(50);

  if (itemsError) {
    console.error('searchItems item error:', itemsError);
    return { data: [], error: itemsError.message };
  }

  const items = itemsRaw ?? [];
  if (items.length === 0) {
    return { data: [], error: null };
  }

  const categoryIds = [
    ...new Set(items.map((item) => item.category_id).filter(Boolean)),
  ];

  const { data: categoriesRaw, error: categoriesError } = categoryIds.length
    ? await supabase
        .from('storage_categories')
        .select('id, name, storage_area_id')
        .in('id', categoryIds)
    : { data: [], error: null };

  if (categoriesError) {
    console.error('searchItems category error:', categoriesError);
    return { data: [], error: categoriesError.message };
  }

  const categories = categoriesRaw ?? [];
  const areaIds = [
    ...new Set(categories.map((category) => category.storage_area_id).filter(Boolean)),
  ];

  const { data: areasRaw, error: areasError } = areaIds.length
    ? await supabase
        .from('storage_areas')
        .select('id, name, location_id')
        .in('id', areaIds)
    : { data: [], error: null };

  if (areasError) {
    console.error('searchItems area error:', areasError);
    return { data: [], error: areasError.message };
  }

  const areas = areasRaw ?? [];
  const locationIds = [
    ...new Set(areas.map((area) => area.location_id).filter(Boolean)),
  ];

  const { data: locationsRaw, error: locationsError } = locationIds.length
    ? await supabase.from('locations').select('id, name').in('id', locationIds)
    : { data: [], error: null };

  if (locationsError) {
    console.error('searchItems location error:', locationsError);
    return { data: [], error: locationsError.message };
  }

  const categoryMap = new Map(categories.map((category) => [String(category.id), category]));
  const areaMap = new Map((areasRaw ?? []).map((area) => [String(area.id), area]));
  const locationMap = new Map(
    (locationsRaw ?? []).map((location) => [String(location.id), location])
  );

  return {
    data: items.map((item) => {
      const category = item.category_id
        ? categoryMap.get(String(item.category_id))
        : null;
      const area = category?.storage_area_id
        ? areaMap.get(String(category.storage_area_id))
        : null;
      const location = area?.location_id
        ? locationMap.get(String(area.location_id))
        : null;

      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 0,
        expirationDate: item.expiration_date ?? null,
        category: category
          ? { id: category.id, name: category.name }
          : null,
        storageArea: area ? { id: area.id, name: area.name } : null,
        location: location ? { id: location.id, name: location.name } : null,
      };
    }),
    error: null,
  };
}

export async function addItemWithPath({
  locationId,
  locationName,
  storageAreaId,
  storageAreaName,
  categoryId,
  categoryName,
  itemName,
  quantity = 0,
  expirationDate = null,
}) {
  const normalizedItemName = normalizeName(itemName);
  if (!normalizedItemName) return validationError('Item name is required');

  const supabase = await createClient();
  const { household } = await getCurrentHouseholdContext();
  const itemLimitError = await enforceItemLimit(supabase);
  if (itemLimitError) return upgradeLimitError(itemLimitError);

  let finalLocationId = locationId || null;
  let finalLocationName = null;
  let createdLocation = false;
  if (!finalLocationId) {
    const normalizedLocationName = normalizeName(locationName);
    if (!normalizedLocationName) return validationError('Location is required');

    const locationLimitError = await enforceLocationLimit(supabase);
    if (locationLimitError) return upgradeLimitError(locationLimitError);

    const { data, error } = await supabase
      .from('locations')
      .insert([{ name: normalizedLocationName, household_id: household?.id }])
      .select('id, name')
      .single();

    if (error) {
      console.error('addItemWithPath location error:', error);
      return { data: null, error: error.message };
    }

    finalLocationId = data.id;
    finalLocationName = data.name;
    createdLocation = true;
  } else {
    const { data } = await supabase
      .from('locations')
      .select('name')
      .eq('id', finalLocationId)
      .single();
    finalLocationName = data?.name ?? null;
  }

  let finalStorageAreaId = storageAreaId || null;
  let finalStorageAreaName = null;
  let createdStorageArea = false;
  if (!finalStorageAreaId) {
    const normalizedStorageAreaName = normalizeName(storageAreaName);
    if (!normalizedStorageAreaName) return validationError('Storage area is required');

    const { data, error } = await supabase
      .from('storage_areas')
      .insert([{ location_id: finalLocationId, name: normalizedStorageAreaName }])
      .select('id, name')
      .single();

    if (error) {
      console.error('addItemWithPath storage area error:', error);
      return { data: null, error: error.message };
    }

    finalStorageAreaId = data.id;
    finalStorageAreaName = data.name;
    createdStorageArea = true;
  } else {
    const { data } = await supabase
      .from('storage_areas')
      .select('name')
      .eq('id', finalStorageAreaId)
      .single();
    finalStorageAreaName = data?.name ?? null;
  }

  let finalCategoryId = categoryId || null;
  let finalCategoryName = null;
  let createdCategory = false;
  if (!finalCategoryId) {
    const normalizedCategoryName = normalizeName(categoryName);
    if (!normalizedCategoryName) return validationError('Category is required');

    const { data, error } = await supabase
      .from('storage_categories')
      .insert({ storage_area_id: finalStorageAreaId, name: normalizedCategoryName })
      .select('id, name')
      .single();

    if (error) {
      console.error('addItemWithPath category error:', error);
      return { data: null, error: error.message };
    }

    finalCategoryId = data.id;
    finalCategoryName = data.name;
    createdCategory = true;
  } else {
    const { data } = await supabase
      .from('storage_categories')
      .select('name')
      .eq('id', finalCategoryId)
      .single();
    finalCategoryName = data?.name ?? null;
  }

  const { data, error } = await supabase
    .from('items')
    .insert([
      {
        category_id: finalCategoryId,
        name: normalizedItemName,
        quantity: toNonNegativeInteger(quantity, 0),
        expiration_date: expirationDate || null,
      },
    ])
    .select('id, name, quantity, expiration_date, category_id')
    .single();

  if (error) {
    console.error('addItemWithPath item error:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/locations');
  revalidatePath('/areas');
  revalidatePath('/categories');
  revalidatePath('/items');

  return {
    data: {
      ...data,
      locationId: finalLocationId,
      locationName: finalLocationName,
      storageAreaId: finalStorageAreaId,
      storageAreaName: finalStorageAreaName,
      categoryId: finalCategoryId,
      categoryName: finalCategoryName,
      createdLocation,
      createdStorageArea,
      createdCategory,
    },
    error: null,
  };
}

// actions/server.js
export async function updateItem(itemId, updates) {
  const supabase = await createClient();

  // Normalize keys coming from the client
  const payload = {};
  if (typeof updates?.name === 'string') {
    const name = normalizeName(updates.name);
    if (name) payload.name = name;
  }
  if (updates?.quantity !== undefined) {
    payload.quantity = toNonNegativeInteger(updates.quantity, 0);
  }

  // accept either expiration or expiration_date from client
  const exp = updates?.expiration ?? updates?.expiration_date ?? null;
  if (exp !== undefined) payload.expiration_date = exp || null;

  if (Object.keys(payload).length === 0) {
    return { error: 'No valid fields to update' };
  }

  const { data, error } = await supabase
    .from('items')
    .update(payload)
    .eq('id', itemId)
    .select('*')     // return the updated row
    .single();

  if (error) {
    console.error('Error updating item:', error);
    return { error: error.message };
  }

  return { data };
}


export async function deleteItem(itemId) {
  const supabase = await createClient();
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) throw error;
  return { success: true };
}

export async function addCategory(storageAreaId, name) {
  const normalizedName = normalizeName(name);
  if (!storageAreaId || !normalizedName) {
    return validationError('Storage area and category name are required');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('storage_categories')
    .insert({ storage_area_id: storageAreaId, name: normalizedName })
    .select('id, name, storage_area_id, created_at')
    .single();

  if (error) {
    console.error('addCategory error:', error);
    return { data: null, error };
  }
  return { data, error: null };
}


export async function updateCategoryName(categoryId, name) {
  const normalizedName = normalizeName(name);
  if (!categoryId || !normalizedName) return validationError('Category name is required');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('storage_categories')
    .update({ name: normalizedName })
    .eq('id', categoryId)
    .select('*')
    .single();

  return error ? { error } : { data };
}

export async function deleteCategory(categoryId) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('storage_categories')
    .delete()
    .eq('id', categoryId);

  return error ? { error } : { success: true };
}

export async function updateItemLocation(itemId, values) {
  const supabase = await createClient();
  const startedAt = new Date(Date.now() - 5000).toISOString();

  const { categoryId, category_id } = values || {};

  const newCategoryId =
    categoryId !== undefined && categoryId !== null
      ? categoryId
      : category_id;

  if (!itemId || !newCategoryId) {
    const error = new Error('Missing itemId or categoryId in updateItemLocation');
    console.error('updateItemLocation validation error:', { itemId, values, error });
    return { data: null, error };
  }

  // Only update category_id – nothing else
  const { user, household } = await getCurrentHouseholdContext();

  const { data: existingItem, error: existingItemError } = await supabase
    .from('items')
    .select('id, name, quantity, expiration_date, category_id')
    .eq('id', itemId)
    .single();

  if (existingItemError) {
    console.error('updateItemLocation existing item error:', existingItemError);
    return { data: null, error: existingItemError };
  }

  if (String(existingItem.category_id) === String(newCategoryId)) {
    return { data: existingItem, error: null };
  }

  const [fromPath, toPath] = await Promise.all([
    getCategoryPath(supabase, existingItem.category_id),
    getCategoryPath(supabase, newCategoryId),
  ]);

  const { data, error } = await supabase
    .from('items')
    .update({ category_id: newCategoryId })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    console.error('updateItemLocation DB error:', error);
    return { data: null, error };
  }

  await recordItemMoveActivity({
    startedAt,
    user,
    household,
    item: {
      ...existingItem,
      category_id: newCategoryId,
    },
    fromPath,
    toPath,
  });

  revalidatePath('/');
  revalidatePath('/items');
  revalidatePath('/locations');

  return { data, error: null };
}
