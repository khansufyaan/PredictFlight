import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: {
          bg: "#000000",
          panel: "#151d33",
          line: "#28324e",
          amber: "#fbbf24",
          green: "#34d399",
          red: "#fb7185",
          dim: "#9aa7c7",
          sky: "#38bdf8",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
