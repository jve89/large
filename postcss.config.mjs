// Tailwind 4 is configured CSS-first in src/app/globals.css; there is no JS
// tailwind config file in this project by design (see ARCHITECTURE.md -> Stack).
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
