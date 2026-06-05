/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic design tokens (replaces the raw oklch(...) soup).
        paper: "oklch(0.992 0.002 95)", // app background
        card: "oklch(1 0 0)", // surfaces
        ink: "oklch(0.18 0.004 60)", // primary text / dark fills
        muted: "oklch(0.5 0.006 70)", // secondary text
        line: "oklch(0.18 0.004 60 / 0.09)", // hairline borders
        accent: "oklch(0.56 0.19 38)", // brand orange-red (alerts/weakness)
        "accent-soft": "oklch(0.56 0.19 38 / 0.1)",
        positive: "oklch(0.55 0.13 150)", // green (rising/strength)
        "ink-soft": "oklch(0.18 0.004 60 / 0.05)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Inter Tight", "Inter", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-18px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(1.08)" },
        },
        "board-drift": {
          "0%": { backgroundPosition: "0px 0px, 32px 32px" },
          "100%": { backgroundPosition: "64px 64px, 96px 96px" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 7s ease-in-out infinite",
        "glow-pulse": "glow-pulse 6s ease-in-out infinite",
        "board-drift": "board-drift 40s linear infinite",
      },
    },
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
  },
  plugins: [],
};
