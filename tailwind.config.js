/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(6, 182, 212, 0.4), 0 0 20px rgba(6, 182, 212, 0.2)',
        'neon-purple': '0 0 10px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2)',
        'neon-emerald': '0 0 10px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2)',
        'neon-amber': '0 0 10px rgba(245, 158, 11, 0.4), 0 0 20px rgba(245, 158, 11, 0.2)',
      },
      backgroundImage: {
        'antigravity-glow': 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.08) 50%, rgba(0, 0, 0, 0) 100%)',
      }
    },
  },
  plugins: [],
}
