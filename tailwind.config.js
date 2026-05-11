/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        ink: {
          950: "#0a0b0d",
          900: "#111317",
          800: "#1a1d23",
          700: "#262a32",
          600: "#3a3f4a",
          500: "#5b6270",
          400: "#878d9c",
          300: "#b8bdc8",
          200: "#dfe2e8",
          100: "#f1f3f6",
        },
        accent: {
          DEFAULT: "#d4af37", // muted gold, rugged-clean vibe
          dim: "#8a7427",
        },
      },
    },
  },
  plugins: [],
};
