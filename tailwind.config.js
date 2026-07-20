/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C96A',
          dark: '#A07830',
        },
        // Pillar colors
        body: '#43D9AD',
        mind: '#6C63FF',
        spirit: '#C9A84C',
        relationships: '#FF9A3C',
        vocation: '#3C9EFF',
        lore: '#FF6B6B',
        // Neutrals
        surface: {
          DEFAULT: '#111111',
          raised: '#1A1A1A',
          overlay: '#222222',
          border: '#2A2A2A',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
