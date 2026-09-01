import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#12171c", soft: "#38434f" },
        surface: { DEFAULT: "#ffffff", sunk: "#f5f6f4", line: "#e3e5e0" },
        night: { DEFAULT: "#12161a", sunk: "#171c21", line: "#262d34" },
        credit: { DEFAULT: "#1f7a53", soft: "#e6f2eb" },
        debit: { DEFAULT: "#b3453a", soft: "#fbeae7" },
        brand: { DEFAULT: "#0f5f56", hover: "#0b4a43" },
        flag: { DEFAULT: "#a86a12" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: { card: "10px" },
    },
  },
  plugins: [],
} satisfies Config;
