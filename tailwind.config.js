/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forest-night': '#0B1410',
        'forest-dark':  '#111C17',
        'forest-mid':   '#162118',
        'forest-panel': '#1A2820',
        'emerald':      '#22D365',
        'emerald-dim':  '#1A9E4E',
        'gold':         '#E2B84A',
        'text-primary': '#E8F0EB',
        'text-secondary':'#8FA99B',
        'text-dim':     '#4D6357',
        'border-subtle':'#1E2E26',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
