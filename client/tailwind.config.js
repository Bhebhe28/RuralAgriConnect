/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: '#1B4332',
        'forest-mid': '#2D6A4F',
        moss: '#52B788',
        mint: '#95D5B2',
        earth: '#C8963C',
        soil: '#8B5E3C',
        cream: '#F8F4EE',
        sand: '#EDE8DF',
        dark: '#0D1F17',
        muted: '#6B7C6E',
        // Night palette
        'night-bg':      '#0F1A0F',
        'night-surface': '#1A2E1A',
        'night-card':    '#223322',
        'night-text':    '#E8F5E9',
        'night-muted':   '#81C784',
        'night-border':  '#2E4D2E',
        'night-primary': '#66BB6A',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"DM Serif Display"', 'serif'],
      },
    },
  },
  plugins: [],
};
