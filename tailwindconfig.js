// tailwind.config.js
import {heroui} from "@heroui/react";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './node_modules/@heroui/**/*.{js,jsx}',
    
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [heroui()],
};