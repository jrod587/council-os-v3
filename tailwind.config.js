/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forest-night': 'rgb(var(--color-forest-night) / <alpha-value>)',
        'forest-dark':  'rgb(var(--color-forest-dark) / <alpha-value>)',
        'forest-mid':   'rgb(var(--color-forest-mid) / <alpha-value>)',
        'forest-panel': 'rgb(var(--color-forest-panel) / <alpha-value>)',
        'emerald':      'rgb(var(--color-emerald) / <alpha-value>)',
        'emerald-dim':  'rgb(var(--color-emerald-dim) / <alpha-value>)',
        'gold':         'rgb(var(--color-gold) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary':'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-dim':     'rgb(var(--color-text-dim) / <alpha-value>)',
        'border-subtle':'rgb(var(--color-border-subtle) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
