/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36a8f6',
          500: '#0c8de4',
          600: '#006fc2',
          700: '#01589d',
          800: '#064b82',
          900: '#0b3f6c',
          950: '#072847',
        },
        navy: {
          800: '#0f172a',
          900: '#0b1120',
          950: '#070b14',
        }
      }
    },
  },
  plugins: [],
}
