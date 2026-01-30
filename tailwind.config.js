/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0EA5E9', // Sky blue
        secondary: '#06B6D4', // Cyan
        accent: '#F59E0B', // Amber for highlights
      },
    },
  },
  plugins: [],
}