import type { Config } from 'tailwindcss';

export default {
  darkMode: 'media',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        primary: '#58a6ff',
        secondary: '#a5d6ff',
      },
    },
  },
  plugins: [],
} satisfies Config;