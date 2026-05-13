import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D9488",
          hover: "#0F766E",
        },
        accent: "#F97316",
        canvas: "#F8FAFC",
        card: "#FFFFFF",
        border: "#E2E8F0",
        ink: {
          primary: "#0F172A",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
        status: {
          ok: "#3B82F6",
          warn: "#EF4444",
          off: "#6B7280",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
