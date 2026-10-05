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
        dish: {
          bg: "var(--dish-bg)",
          card: "var(--dish-card)",
          border: "var(--dish-border)",
          hover: "var(--dish-hover)",
          subtle: "var(--dish-subtle)",
        },
        specimen: {
          safe: "#10B981",
          low: "#84CC16",
          medium: "#F59E0B",
          high: "#F97316",
          critical: "#F43F5E",
          immune: "#0284C7",
          welcome: "#0284C7",
          base: "var(--specimen-base)",
          text: "var(--specimen-text)",
          dim: "var(--specimen-dim)"
        }
      },
      fontFamily: {
        sans: ["'Calibri'", "'Carlito'", "'Aptos'", "'Segoe UI'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "Consolas", "monospace"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-breathe': 'glow 4s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(20, 184, 166, 0.25)' },
          '100%': { boxShadow: '0 0 25px rgba(20, 184, 166, 0.65)' },
        }
      }
    },
  },
  plugins: [],
}
