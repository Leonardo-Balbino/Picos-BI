/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 900: '#2E1F42', 700: '#452C63', 500: '#6D528C', 100: '#EDE8F4' },
        green: { 500: '#3FBF8F', 400: '#62D26F', 100: '#E3F7EE', 700: '#1E8E5A' },
        danger: { 500: '#E05260', 100: '#FCE9EB', 700: '#C23A47' },
        warning: { 500: '#F0A93B', 100: '#FDF3DF', 700: '#B47A12' },
        surface: { DEFAULT: '#FFFFFF', bg: '#F5F4F7', border: '#E2DFE8' },
        ink: { DEFAULT: '#2E1F42', muted: '#6B6478' },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        btn: '10px',
      },
    },
  },
  plugins: [],
}
