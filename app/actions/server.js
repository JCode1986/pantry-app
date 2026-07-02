'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { toNonNegativeInteger } from '@/utils/pantry/date';
import { getSession } from '@/lib/sessionOptions';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  canEditHouseholdInventory,
  getHouseholdBilling,
  getHouseholdForUser,
} from '@/utils/households';
import {
  INVENTORY_IMAGE_BUCKET,
  INVENTORY_IMAGE_ENTITY,
  getInventoryImageUrl,
} from '@/utils/inventoryImages';

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

function revalidateInventoryPaths(extraPaths = []) {
  const paths = [
    '/',
    '/locations',
    '/areas',
    '/categories',
    '/items',
    '/shopping-list',
    ...extraPaths,
  ];

  for (const path of [...new Set(paths.filter(Boolean))]) {
    revalidatePath(path);
  }
}

function normalizeSearchTerm(value) {
  return normalizeName(value).replace(/[%,_]/g, '').slice(0, 80);
}

function normalizeBarcode(value) {
  return typeof value === 'string'
    ? value.trim().replace(/[^0-9A-Za-z._-]/g, '').slice(0, 80)
    : '';
}

function normalizeImageEntityType(value) {
  return Object.values(INVENTORY_IMAGE_ENTITY).includes(value) ? value : null;
}

function imageExtension(file) {
  const type = file?.type || '';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return null;
}

function imageExtensionFromContentType(contentType) {
  const type = (contentType || '').split(';')[0].trim().toLowerCase();
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return null;
}

function allowedProductImageUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') return null;
    if (host === 'images.openfoodfacts.org' || host.endsWith('.openfoodfacts.org')) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

async function importRemoteItemImage({ householdId, itemId, imageUrl }) {
  const safeImageUrl = allowedProductImageUrl(imageUrl);
  if (!householdId || !itemId || !safeImageUrl) return null;

  try {
    const response = await fetch(safeImageUrl, {
      headers: {
        'User-Agent': 'WhereKeep inventory image import (contact: support@wherekeep.app)',
      },
    });

    if (!response.ok) return null;

    const extension = imageExtensionFromContentType(response.headers.get('content-type'));
    if (!extension) return null;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 5 * 1024 * 1024) return null;

    const admin = createAdminClient();
    const path = `${householdId}/${INVENTORY_IMAGE_ENTITY.ITEM}/${itemId}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from(INVENTORY_IMAGE_BUCKET)
      .upload(path, bytes, {
        contentType: response.headers.get('content-type') || `image/${extension}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await admin
      .from('items')
      .update({ image_path: path })
      .eq('id', itemId);

    if (updateError) throw updateError;

    return path;
  } catch (err) {
    console.error('importRemoteItemImage error:', err);
    return null;
  }
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
    .select('id, name, image_path')
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
  if (!user?.id) return { user: null, household: null, member: null };

  const { household, member } = await getHouseholdForUser({
    userId: user.id,
    email: user.email,
    createIfMissing: true,
  });

  return { user, household, member };
}

async function requireInventoryEditor() {
  const context = await getCurrentHouseholdContext();

  if (!context.user?.id) {
    return {
      ...context,
      error: 'Your session has expired. Please log in again.',
    };
  }

  if (!canEditHouseholdInventory(context.member)) {
    return {
      ...context,
      error: 'You have view-only access to this household inventory.',
    };
  }

  return { ...context, error: null };
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

async function getImageEntityRecord(admin, entityType, entityId) {
  if (entityType === INVENTORY_IMAGE_ENTITY.LOCATION) {
    const { data, error } = await admin
      .from('locations')
      .select('id, household_id, image_path')
      .eq('id', entityId)
      .maybeSingle();

    return { data, error };
  }

  if (entityType === INVENTORY_IMAGE_ENTITY.STORAGE_AREA) {
    const { data, error } = await admin
      .from('storage_areas')
      .select('id, image_path, location_id')
      .eq('id', entityId)
      .maybeSingle();

    if (error || !data) return { data, error };
    if (!data.location_id) return { data: null, error: null };

    const { data: location, error: locationError } = await admin
      .from('locations')
      .select('household_id')
      .eq('id', data.location_id)
      .maybeSingle();

    if (locationError) return { data: null, error: locationError };

    return {
      data: {
        id: data.id,
        image_path: data.image_path,
        household_id: location?.household_id,
      },
      error: null,
    };
  }

  if (entityType === INVENTORY_IMAGE_ENTITY.ITEM) {
    const { data, error } = await admin
      .from('items')
      .select('id, image_path, category_id')
      .eq('id', entityId)
      .maybeSingle();

    if (error || !data) return { data, error };

    const { data: category, error: categoryError } = await admin
      .from('storage_categories')
      .select('storage_area_id')
      .eq('id', data.category_id)
      .maybeSingle();

    if (categoryError) return { data: null, error: categoryError };
    if (!category?.storage_area_id) return { data: null, error: null };

    const { data: area, error: areaError } = await admin
      .from('storage_areas')
      .select('location_id')
      .eq('id', category?.storage_area_id)
      .maybeSingle();

    if (areaError) return { data: null, error: areaError };
    if (!area?.location_id) return { data: null, error: null };

    const { data: location, error: locationError } = await admin
      .from('locations')
      .select('household_id')
      .eq('id', area?.location_id)
      .maybeSingle();

    if (locationError) return { data: null, error: locationError };

    if (data) {
      return {
        data: {
          id: data.id,
          image_path: data.image_path,
          household_id: location?.household_id,
        },
        error: null,
      };
    }

    return { data, error };
  }

  return { data: null, error: new Error('Unsupported image entity type') };
}

async function getLocationForHousehold(admin, locationId, householdId) {
  if (!locationId || !householdId) {
    return { data: null, error: 'Location is required.' };
  }

  const { data, error } = await admin
    .from('locations')
    .select('id, name, household_id, image_path')
    .eq('id', locationId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data || String(data.household_id) !== String(householdId)) {
    return { data: null, error: 'Location not found for this household.' };
  }

  return { data, error: null };
}

async function getStorageAreaForHousehold(admin, storageAreaId, householdId) {
  if (!storageAreaId || !householdId) {
    return { data: null, error: 'Storage area is required.' };
  }

  const { data: area, error } = await admin
    .from('storage_areas')
    .select('id, name, location_id, image_path')
    .eq('id', storageAreaId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!area?.location_id) {
    return { data: null, error: 'Storage area not found for this household.' };
  }

  const locationResult = await getLocationForHousehold(
    admin,
    area.location_id,
    householdId
  );
  if (locationResult.error) {
    return { data: null, error: 'Storage area not found for this household.' };
  }

  return {
    data: {
      ...area,
      location: locationResult.data,
    },
    error: null,
  };
}

async function getCategoryForHousehold(admin, categoryId, householdId) {
  if (!categoryId || !householdId) {
    return { data: null, error: 'Category is required.' };
  }

  const { data: category, error } = await admin
    .from('storage_categories')
    .select('id, name, storage_area_id')
    .eq('id', categoryId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!category?.storage_area_id) {
    return { data: null, error: 'Category not found for this household.' };
  }

  const areaResult = await getStorageAreaForHousehold(
    admin,
    category.storage_area_id,
    householdId
  );
  if (areaResult.error) {
    return { data: null, error: 'Category not found for this household.' };
  }

  return {
    data: {
      ...category,
      storageArea: areaResult.data,
    },
    error: null,
  };
}

function imageEntityTable(entityType) {
  if (entityType === INVENTORY_IMAGE_ENTITY.LOCATION) return 'locations';
  if (entityType === INVENTORY_IMAGE_ENTITY.STORAGE_AREA) return 'storage_areas';
  if (entityType === INVENTORY_IMAGE_ENTITY.ITEM) return 'items';
  return null;
}

export async function uploadInventoryImage(entityType, entityId, formData) {
  const normalizedType = normalizeImageEntityType(entityType);
  if (!normalizedType || !entityId) {
    return validationError('Image target is required.');
  }

  const { household, error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const file = formData?.get('image');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return validationError('Choose an image to upload.');
  }

  const extension = imageExtension(file);
  if (!extension) {
    return validationError('Upload a JPG, PNG, WebP, or GIF image.');
  }

  if (file.size > 5 * 1024 * 1024) {
    return validationError('Images must be 5 MB or smaller.');
  }

  try {
    const admin = createAdminClient();
    const { data: record, error: lookupError } = await getImageEntityRecord(
      admin,
      normalizedType,
      entityId
    );

    if (lookupError) throw lookupError;
    if (!record || record.household_id !== household?.id) {
      return validationError('You do not have access to update this image.');
    }

    const path = `${household.id}/${normalizedType}/${entityId}.${extension}`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from(INVENTORY_IMAGE_BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const table = imageEntityTable(normalizedType);
    const { error: updateError } = await admin
      .from(table)
      .update({ image_path: path })
      .eq('id', entityId);

    if (updateError) throw updateError;

    if (record.image_path && record.image_path !== path) {
      await admin.storage.from(INVENTORY_IMAGE_BUCKET).remove([record.image_path]);
    }

    revalidateInventoryPaths();
    return {
      data: {
        imagePath: path,
        imageUrl: await getInventoryImageUrl(path),
      },
      error: null,
    };
  } catch (err) {
    console.error('uploadInventoryImage error:', err);
    return { data: null, error: err?.message || 'Could not upload image.' };
  }
}

export async function removeInventoryImage(entityType, entityId) {
  const normalizedType = normalizeImageEntityType(entityType);
  if (!normalizedType || !entityId) {
    return validationError('Image target is required.');
  }

  const { household, error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  try {
    const admin = createAdminClient();
    const { data: record, error: lookupError } = await getImageEntityRecord(
      admin,
      normalizedType,
      entityId
    );

    if (lookupError) throw lookupError;
    if (!record || record.household_id !== household?.id) {
      return validationError('You do not have access to update this image.');
    }

    const table = imageEntityTable(normalizedType);
    const { error: updateError } = await admin
      .from(table)
      .update({ image_path: null })
      .eq('id', entityId);

    if (updateError) throw updateError;

    if (record.image_path) {
      await admin.storage.from(INVENTORY_IMAGE_BUCKET).remove([record.image_path]);
    }

    revalidateInventoryPaths();
    return { data: { imagePath: null, imageUrl: null }, error: null };
  } catch (err) {
    console.error('removeInventoryImage error:', err);
    return { data: null, error: err?.message || 'Could not remove image.' };
  }
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
  const { household, error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);
  const limitError = await enforceLocationLimit(supabase);
  if (limitError) return upgradeLimitError(limitError);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('locations')
    .insert([{ name: normalizedName, household_id: household?.id }])
    .select('id, name, household_id, image_path, created_at')
    .single();

  if (error) throw error;
  revalidateInventoryPaths();
  return { data, error: null };
}

export async function updateLocationName(id, newName) {
  const normalizedName = normalizeName(newName);
  if (!id || !normalizedName) return validationError('Location name is required');

  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();
  const { error } = await supabase.from('locations').update({ name: normalizedName }).eq('id', id);
  if (error) throw error;
  revalidateInventoryPaths();
}

export async function deleteLocation(id) {
  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
  revalidateInventoryPaths();
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

  const { household, error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const admin = createAdminClient();
  const locationResult = await getLocationForHousehold(
    admin,
    locationId,
    household?.id
  );
  if (locationResult.error) return validationError(locationResult.error);

  const { data, error } = await admin
    .from('storage_areas')
    .insert([{ location_id: locationId, name: normalizedName }])
    .select('id, name, location_id, image_path, created_at')
    .single();

  if (error) {
    console.error('Error adding storage area:', error);
    return { error: error.message };
  }

  revalidateInventoryPaths([`/locations/${locationId}`]);
  return { data };
}

// updateStorageArea
export async function updateStorageArea(id, name) {
  const normalizedName = normalizeName(name);
  if (!id || !normalizedName) return validationError('Storage area name is required');

  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_areas')
    .update({ name: normalizedName })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { error };
  revalidateInventoryPaths();
  return { data };
}

// deleteStorageArea
export async function deleteStorageArea(id) {
  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();

  const { error } = await supabase
    .from('storage_areas')
    .delete()
    .eq('id', id);

  if (error) return { error };
  revalidateInventoryPaths();
  return { success: true };
}

export async function lookupProductByBarcode(barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (normalizedBarcode.length < 4) {
    return validationError('Enter a valid barcode.');
  }

  try {
    const endpoint = new URL(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedBarcode)}.json`
    );
    endpoint.searchParams.set(
      'fields',
      'code,product_name,product_name_en,generic_name,brands,image_front_url,image_url'
    );

    const response = await fetch(endpoint.toString(), {
      headers: {
        'User-Agent': 'WhereKeep barcode lookup (contact: support@wherekeep.app)',
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return validationError('Could not look up that barcode right now.');
    }

    const payload = await response.json();
    const product = payload?.product;

    if (payload?.status !== 1 || !product) {
      return {
        data: {
          barcode: normalizedBarcode,
          found: false,
          name: '',
          brand: '',
          imageUrl: null,
        },
        error: null,
      };
    }

    const name =
      normalizeName(product.product_name_en) ||
      normalizeName(product.product_name) ||
      normalizeName(product.generic_name);
    const brand = normalizeName(product.brands);
    const imageUrl =
      allowedProductImageUrl(product.image_front_url) ||
      allowedProductImageUrl(product.image_url);

    return {
      data: {
        barcode: normalizeBarcode(product.code) || normalizedBarcode,
        found: Boolean(name || imageUrl),
        name,
        brand,
        imageUrl,
      },
      error: null,
    };
  } catch (err) {
    console.error('lookupProductByBarcode error:', err);
    return validationError('Product lookup is unavailable right now.');
  }
}

export async function addItem(
  categoryId,
  { name, quantity = 0, expiration_date = null, barcode = '', productImageUrl = null }
) {
  const normalizedName = normalizeName(name);
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!categoryId || !normalizedName) {
    return validationError('Category and item name are required');
  }

  const { household, error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();
  const limitError = await enforceItemLimit(supabase);
  if (limitError) return upgradeLimitError(limitError);

  const admin = createAdminClient();
  const categoryResult = await getCategoryForHousehold(
    admin,
    categoryId,
    household?.id
  );
  if (categoryResult.error) return validationError(categoryResult.error);

  const { data, error } = await admin
    .from('items')
    .insert([
      {
        category_id: categoryId,
        name: normalizedName,
        quantity: toNonNegativeInteger(quantity, 0),
        expiration_date: expiration_date || null,
        barcode: normalizedBarcode || null,
      },
    ])
    .select('*')               
    .single();                 

  if (error) {
    console.error('Error adding item:', error);
    return { error };
  }

  const imagePath = await importRemoteItemImage({
    householdId: household?.id,
    itemId: data.id,
    imageUrl: productImageUrl,
  });

  revalidateInventoryPaths();
  return {
    data: {
      ...data,
      image_path: imagePath ?? data.image_path ?? null,
      imageUrl: imagePath ? await getInventoryImageUrl(imagePath) : null,
    },
  };
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
    .select('id, name, quantity, expiration_date, category_id, image_path, barcode')
    .or(`name.ilike.%${term}%,barcode.ilike.%${term}%`)
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
        .select('id, name, location_id, image_path')
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
    ? await supabase.from('locations').select('id, name, image_path').in('id', locationIds)
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
    data: await Promise.all(items.map(async (item) => {
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
        barcode: item.barcode ?? null,
        imageUrl: await getInventoryImageUrl(item.image_path),
        category: category
          ? { id: category.id, name: category.name }
          : null,
        storageArea: area
          ? {
              id: area.id,
              name: area.name,
              imageUrl: await getInventoryImageUrl(area.image_path),
            }
          : null,
        location: location
          ? {
              id: location.id,
              name: location.name,
              imageUrl: await getInventoryImageUrl(location.image_path),
            }
          : null,
      };
    })),
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
  barcode = '',
  productImageUrl = null,
}) {
  const normalizedItemName = normalizeName(itemName);
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedItemName) return validationError('Item name is required');

  const supabase = await createClient();
  const { household, error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);
  const itemLimitError = await enforceItemLimit(supabase);
  if (itemLimitError) return upgradeLimitError(itemLimitError);
  const admin = createAdminClient();

  let finalLocationId = locationId || null;
  let finalLocationName = null;
  let createdLocation = false;
  if (!finalLocationId) {
    const normalizedLocationName = normalizeName(locationName);
    if (!normalizedLocationName) return validationError('Location is required');

    const locationLimitError = await enforceLocationLimit(supabase);
    if (locationLimitError) return upgradeLimitError(locationLimitError);

    const { data, error } = await admin
      .from('locations')
      .insert([{ name: normalizedLocationName, household_id: household?.id }])
      .select('id, name, image_path')
      .single();

    if (error) {
      console.error('addItemWithPath location error:', error);
      return { data: null, error: error.message };
    }

    finalLocationId = data.id;
    finalLocationName = data.name;
    createdLocation = true;
  } else {
    const locationResult = await getLocationForHousehold(
      admin,
      finalLocationId,
      household?.id
    );
    if (locationResult.error) return validationError(locationResult.error);
    finalLocationName = locationResult.data?.name ?? null;
  }

  let finalStorageAreaId = storageAreaId || null;
  let finalStorageAreaName = null;
  let createdStorageArea = false;
  if (!finalStorageAreaId) {
    const normalizedStorageAreaName = normalizeName(storageAreaName);
    if (!normalizedStorageAreaName) return validationError('Storage area is required');

    const { data, error } = await admin
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
    const areaResult = await getStorageAreaForHousehold(
      admin,
      finalStorageAreaId,
      household?.id
    );
    if (areaResult.error) return validationError(areaResult.error);
    if (String(areaResult.data?.location_id) !== String(finalLocationId)) {
      return validationError('Storage area does not belong to selected location.');
    }
    finalStorageAreaName = areaResult.data?.name ?? null;
  }

  let finalCategoryId = categoryId || null;
  let finalCategoryName = null;
  let createdCategory = false;
  if (!finalCategoryId) {
    const normalizedCategoryName = normalizeName(categoryName);
    if (!normalizedCategoryName) return validationError('Category is required');

    const { data, error } = await admin
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
    const categoryResult = await getCategoryForHousehold(
      admin,
      finalCategoryId,
      household?.id
    );
    if (categoryResult.error) return validationError(categoryResult.error);
    if (String(categoryResult.data?.storage_area_id) !== String(finalStorageAreaId)) {
      return validationError('Category does not belong to selected storage area.');
    }
    finalCategoryName = categoryResult.data?.name ?? null;
  }

  const { data, error } = await admin
    .from('items')
    .insert([
      {
        category_id: finalCategoryId,
        name: normalizedItemName,
        quantity: toNonNegativeInteger(quantity, 0),
        expiration_date: expirationDate || null,
        barcode: normalizedBarcode || null,
      },
    ])
    .select('id, name, quantity, expiration_date, category_id, image_path, barcode')
    .single();

  if (error) {
    console.error('addItemWithPath item error:', error);
    return { data: null, error: error.message };
  }

  const imagePath = await importRemoteItemImage({
    householdId: household?.id,
    itemId: data.id,
    imageUrl: productImageUrl,
  });

  revalidateInventoryPaths();

  return {
    data: {
      ...data,
      image_path: imagePath ?? data.image_path ?? null,
      imageUrl: imagePath ? await getInventoryImageUrl(imagePath) : null,
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
  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

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

  if (updates?.barcode !== undefined) {
    const barcode = normalizeBarcode(updates.barcode);
    payload.barcode = barcode || null;
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

  revalidateInventoryPaths();
  return { data };
}


export async function deleteItem(itemId) {
  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) throw error;
  revalidateInventoryPaths();
  return { success: true };
}

export async function addCategory(storageAreaId, name) {
  const normalizedName = normalizeName(name);
  if (!storageAreaId || !normalizedName) {
    return validationError('Storage area and category name are required');
  }

  const { household, error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const admin = createAdminClient();
  const areaResult = await getStorageAreaForHousehold(
    admin,
    storageAreaId,
    household?.id
  );
  if (areaResult.error) return validationError(areaResult.error);

  const { data, error } = await admin
    .from('storage_categories')
    .insert({ storage_area_id: storageAreaId, name: normalizedName })
    .select('id, name, storage_area_id, created_at')
    .single();

  if (error) {
    console.error('addCategory error:', error);
    return { data: null, error };
  }
  revalidateInventoryPaths();
  return { data, error: null };
}


export async function updateCategoryName(categoryId, name) {
  const normalizedName = normalizeName(name);
  if (!categoryId || !normalizedName) return validationError('Category name is required');

  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('storage_categories')
    .update({ name: normalizedName })
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) return { error };
  revalidateInventoryPaths();
  return { data };
}

export async function deleteCategory(categoryId) {
  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

  const supabase = await createClient();
  const { error } = await supabase
    .from('storage_categories')
    .delete()
    .eq('id', categoryId);

  if (error) return { error };
  revalidateInventoryPaths();
  return { success: true };
}

export async function updateItemLocation(itemId, values) {
  const { error: permissionError } = await requireInventoryEditor();
  if (permissionError) return validationError(permissionError);

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

  revalidateInventoryPaths();

  return { data, error: null };
}
