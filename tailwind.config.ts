import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yugioh: { DEFAULT: '#7B2D8B', light: '#F5E6FF' },
        pokemon: { DEFAULT: '#FFCB05', light: '#FFF8E1' },
        starwars: { DEFAULT: '#1A1A2E', light: '#E8E8F0' },
        riftbound: { DEFAULT: '#2E7D32', light: '#E8F5E9' },
      },
    },
  },
  plugins: [],
} satisfies Config
