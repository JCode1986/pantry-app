// tailwind.config.js
const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}",
    "./node_modules/@heroui/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
