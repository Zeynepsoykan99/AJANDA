/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        powderPink: {
          50: '#FFF5F8',
          100: '#FDECF1',
          200: '#FCE4EC',
          300: '#F8BBD0',
          DEFAULT: '#FDEEF2',
        },
        darkPink: {
          500: '#E91E63',
          600: '#D81B60',
          700: '#C2185B',
          800: '#AD1457',
          900: '#880E4F',
          DEFAULT: '#C2185B',
        },
      },
    },
  },
  plugins: [],
};
