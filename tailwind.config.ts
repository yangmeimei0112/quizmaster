import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background-deep": "#020203",
        "background-base": "#050506",
        "background-elevated": "#0a0a0c",
        background: {
          deep: "#020203",
          base: "#050506",
          elevated: "#0a0a0c",
        },
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          hover: "rgba(255, 255, 255, 0.08)",
          subtle: "rgba(255, 255, 255, 0.03)",
        },
        "surface-hover": "rgba(255, 255, 255, 0.08)",
        "surface-subtle": "rgba(255, 255, 255, 0.03)",
        foreground: {
          DEFAULT: "#EDEDEF",
          muted: "#8A8F98",
          subtle: "rgba(255, 255, 255, 0.60)",
        },
        "foreground-muted": "#8A8F98",
        "foreground-subtle": "rgba(255, 255, 255, 0.60)",
        accent: {
          DEFAULT: "#5E6AD2",
          bright: "#6872D9",
          glow: "rgba(94, 106, 210, 0.3)",
        },
        "accent-bright": "#6872D9",
        "accent-glow": "rgba(94, 106, 210, 0.3)",
      },
      fontFamily: {
        sans: [
          "var(--font-plus-jakarta)",
          "var(--font-zen-maru)",
          "Zen Maru Gothic",
          "Plus Jakarta Sans",
          "system-ui",
          "sans-serif",
        ],
        game: [
          "var(--font-zen-maru)",
          "Zen Maru Gothic",
          "var(--font-plus-jakarta)",
          "sans-serif",
        ],
      },
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "250": "250ms",
      },
      boxShadow: {
        linear: "0 8px 32px rgba(0, 0, 0, 0.4)",
        "linear-card": "0 0 0 1px rgba(255, 255, 255, 0.06), 0 2px 4px rgba(0, 0, 0, 0.4), 0 12px 24px -4px rgba(0, 0, 0, 0.6)",
        "linear-hover": "0 0 0 1px rgba(255, 255, 255, 0.12), 0 4px 8px rgba(0, 0, 0, 0.4), 0 20px 32px -4px rgba(0, 0, 0, 0.7)",
        glow: "0 0 20px rgba(94, 106, 210, 0.3)",
        "accent-glow": "0 0 20px rgba(94, 106, 210, 0.35), 0 0 40px rgba(94, 106, 210, 0.15)",
        highlight: "inset 0 1px 0 rgba(255, 255, 255, 0.10)",
        "top-highlight": "inset 0 1px 0 0 rgba(255, 255, 255, 0.10)",
        "top-highlight-bright": "inset 0 1px 0 0 rgba(255, 255, 255, 0.18)",
      },
      animation: {
        "float-slow": "floatSlow 18s ease-in-out infinite alternate",
        "float-delayed": "floatSlow 24s ease-in-out 4s infinite alternate-reverse",
        "float-reverse": "floatReverse 14s ease-in-out infinite alternate",
      },
      keyframes: {
        floatSlow: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(25px, -35px) scale(1.06)" },
          "100%": { transform: "translate(-20px, 20px) scale(0.96)" },
        },
        floatReverse: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-30px, 30px) scale(1.08)" },
          "100%": { transform: "translate(25px, -20px) scale(0.95)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;