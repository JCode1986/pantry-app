'use server';
import { createClient } from '@/utils/supabase/server';
import axios from 'axios';
import { revalidatePath } from 'next/cache';

export async function fetchRecipes(ingredients) {
  try {
    const API_KEY = process.env.SPOONACULAR_API_KEY;
    const response = await axios.get(
      'https://api.spoonacular.com/recipes/findByIngredients',
      {
        params: {
          apiKey: API_KEY,
          ingredients: ingredients.join(','),
          number: 10,
          ranking: 1,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error('Error fetching recipes:', err);
    throw new Error('Failed to fetch recipes');
  }
}

export async function getLocations() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('locations').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addLocation(name) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('locations').insert([{ name }]).select('*');
  if (error) throw error;
  revalidatePath('/');
  return data[0];
}

export async function updateLocationName(id, newName) {
  const supabase = await createClient();
  const { error } = await supabase.from('locations').update({ name: newName }).eq('id', id);
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_areas')
    .insert([{ location_id: locationId, name }])
    .select();

  if (error) {
    console.error('Error adding storage area:', error);
    return { error: error.message };
  }

  revalidatePath(`/location/${locationId}`);
  return { data: data[0] };
}

// updateStorageArea
export async function updateStorageArea(id, name) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_areas')
    .update({ name })
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('items')
    .insert([{ category_id: categoryId, name, quantity, expiration_date }])
    .select('*')               
    .single();                 

  if (error) {
    console.error('Error adding item:', error);
    return { error };
  }

  return { data };            
}

// actions/server.js
export async function updateItem(itemId, updates) {
  const supabase = await createClient();

  // Normalize keys coming from the client
  const payload = {};
  if (typeof updates?.name === 'string') payload.name = updates.name.trim();
  if (updates?.quantity !== undefined) payload.quantity = Number.parseInt(updates.quantity, 10) || 0;

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

// 🛠 Fetch all storages (with categories & ingredients)
export async function getStorages() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('food_storages')
    .select('*, storage_categories(*, ingredients!fk_category(*))')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// 🛠 Fetch a single storage by ID (with nested)
export async function getStorageById(storageId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('food_storages')
    .select('*, storage_categories(*, ingredients!fk_category(*))')
    .eq('id', storageId)
    .single();

  if (error) throw error;
  return data;
}

// ➕ Add food storage (RLS uses auth.uid())
export async function addStorage(name) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('food_storages')
    .insert([{ name }])
    .select('*, storage_categories(*, ingredients!fk_category(*))');

  if (error) throw error;

  revalidatePath('/');
  return data[0];
}

// ✏️ Update food storage name
export async function updateStorageName(storageId, newName) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('food_storages')
    .update({ name: newName })
    .eq('id', storageId);

  if (error) throw error;
  revalidatePath('/');
}

// 🗑️ Delete food storage
export async function deleteStorage(storageId) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('food_storages')
    .delete()
    .eq('id', storageId);

  if (error) throw error;
  revalidatePath('/');
}

export async function addCategory(storageAreaId, name) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('storage_categories')
    .insert([{ storage_area_id: storageAreaId, name }])
    .select('*')
    .single();

  return error ? { error } : { data };
}

export async function updateCategoryName(categoryId, name) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('storage_categories')
    .update({ name })
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