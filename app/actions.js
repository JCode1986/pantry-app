'use server';
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
