# 🍽️ What’s in My Pantry?

A modern, responsive web app that helps users discover recipes based on ingredients they already have at home. Built with Next.js, Tailwind CSS, HeroUI, and Spoonacular API. Pantry items and favorite recipes are saved locally in the browser for simplicity.

![Pantry App Wireframe](A_wireframe_wireframe_mockup_depicts_a_recipe-find.png)

---

## ✨ Features
- Add, edit, and remove pantry items (saved in localStorage)
- Find recipes using Spoonacular API based on pantry contents
- Save favorite recipes for later viewing (stored in localStorage)
- Responsive design with modern UI using HeroUI and Tailwind
- Smooth animations with Framer Motion

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 15 (JavaScript)
- **UI:** Tailwind CSS + HeroUI
- **State Management:** localStorage (no backend)
- **API:** Spoonacular API (Free tier)
- **Animations:** Framer Motion

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/pantry-app.git
cd pantry-app
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Set Up Environment Variables
Create a `.env.local` file:
```
NEXT_PUBLIC_SPOONACULAR_API_KEY=your_spoonacular_api_key_here
```

### 4️⃣ Run the App
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📂 Folder Structure
```
/pantry-app
├── app/
│   ├── page.jsx          # Home (pantry management)
│   ├── recipes/page.jsx  # Recipe finder
│   ├── favorites/page.jsx# Saved recipes
├── components/
│   ├── PantryList.jsx
│   ├── RecipeCard.jsx
│   ├── FavoriteList.jsx
├── lib/spoonacular.js    # Spoonacular API client
├── utils/localStorage.js # Local storage helpers
```

---

## 📸 Screenshots
| Home                   | Recipes               | Favorites            |
|------------------------|-----------------------|----------------------|
| *(Insert screenshot)*  | *(Insert screenshot)* | *(Insert screenshot)*|

---

## 📜 License
This project is licensed under the MIT License.
