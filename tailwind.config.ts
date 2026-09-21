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
          '"Noto Sans TC"',
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        game: [
          '"Huninn"',
          '"Noto Sans TC"',
          '"Plus Jakarta Sans"',
          'sans-serif',
        ],
        huninn: [
          '"Huninn"',
          '"Noto Sans TC"',
          'sans-serif',
        ],
        noto: [
          '"Noto Sans TC"',
          'sans-serif',
        ],
      },
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.3, 0.64, 1)",
      },
      transitionDuration: {
        "180": "180ms",
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
        "fade-in": "fadeIn 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in-up": "fadeInUp 240ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in-down": "fadeInDown 240ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "sheet-up": "sheetUp 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "card-stagger": "cardEntrance 340ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-subtle": "pulseSubtle 2.5s ease-in-out infinite",
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
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        sheetUp: {
          "0%": { opacity: "0.5", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        cardEntrance: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};
export default config;