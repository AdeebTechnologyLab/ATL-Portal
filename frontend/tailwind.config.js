/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          darkest: 'var(--primary-darkest)',
          dark: 'var(--primary-dark)',
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          lighter: 'var(--primary-lighter)',
        },
        secondary: {
          dark: 'var(--secondary-dark)',
          DEFAULT: 'var(--secondary)',
          light: 'var(--secondary-light)',
        },
        accent: {
          gold: '#F4C430',
          teal: '#14B8A6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
