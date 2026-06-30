const {heroui} = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}",
    './node_modules/@heroui/theme/dist/components/(button|input|modal).js'
  ],
  theme: {
    extend: {
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
