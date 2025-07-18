'use server';
import { getSession } from '@/lib/sessionOptions';
import { supabase } from '@/lib/supabaseClient';
import { supabaseServer } from '@/lib/supabaseServer';
import { createClient } from '@/utils/supabase/server';
import axios from 'axios';

export async function fetchRecipes(ingredients) {
  try {
    const API_KEY = process.env.SPOONACULAR_API_KEY; // server-only
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


export async function getPantryItems(userId) {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function addPantryItem(userId, name, quantity, expiresAt) {
  const { data, error } = await supabase
    .from('pantry_items')
    .insert([{ user_id: userId, name, quantity, expires_at: expiresAt }]);

  if (error) throw error;
  return data;
}

export async function removePantryItem(itemId) {
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

// export async function addStorage(name) {
//   const supabase = await supabaseServer();

//   console.log(supabase, 'supabase')

//   const { data, error } = await supabase
//     .from('food_storages')
//     .insert([{ name }])
//     .select();

//   if (error) {
//     console.error('Error adding storage (server):', error);
//     return { error: error.message };
//   }

//   return { data: data[0] };
// }


export async function addStorage(name) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('food_storages')
    .insert([{ name }])
    .select();

  if (error) {
    console.error('Error adding storage (server):', error);
    return { error: error.message };
  }

  // 🚨 Supabase .insert().select() returns an array already
  return { data: data[0] }; // Return single item (for clarity)
}

export async function deleteStorage(id) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('food_storages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting storage:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function updateStorage(id, name) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('food_storages')
    .update({ name })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating storage:', error);
    return { error: error.message };
  }

  return { data: data[0] };
}



