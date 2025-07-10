'use server';
import { supabase } from '@/lib/supabaseClient';
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

