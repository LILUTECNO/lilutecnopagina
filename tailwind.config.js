/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          'off-white': '#F9F9F8',
          'off-white-darker': '#F3F3F1',
          'gold': '#C5A880',
          'gold-dark': '#A88C64',
          'gold-light': '#E2D4C1',
          'black': '#0A0A0A',
          'charcoal': '#1A1A1A',
          'midnight': '#0A1128',
          'silver': '#E5E5E5',
          'bronze': '#A05C2B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 4px 30px rgba(0, 0, 0, 0.03)',
        'luxury-hover': '0 10px 40px rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
      },
      borderWidth: {
        '0.5': '0.5px',
      }
    },
  },
  plugins: [],
}
