/******** Tailwind CSS config ********/
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bfe0ff',
          300: '#95ccff',
          400: '#5dafef',
          500: '#2f87e5',
          600: '#1e6dcc',
          700: '#1a5ab0',
          800: '#194a8f',
          900: '#163f77',
        }
      }
    },
  },
  plugins: [],
}
