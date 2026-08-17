/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "rgb(var(--color-paper) / <alpha-value>)",
          warm: "rgb(var(--color-paper-warm) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          strong: "rgb(var(--color-ink-strong) / <alpha-value>)",
        },
        pencil: {
          DEFAULT: "rgb(var(--color-pencil) / <alpha-value>)",
          light: "rgb(var(--color-pencil-light) / <alpha-value>)",
        },
        sage: "rgb(var(--color-sage) / <alpha-value>)",
        impact: {
          DEFAULT: "rgb(var(--color-impact) / <alpha-value>)",
          ink: "rgb(var(--color-impact-ink) / <alpha-value>)",
          soft: "rgb(var(--color-impact-soft) / <alpha-value>)",
        },
      },
      spacing: {
        page: "var(--space-page-inline)",
        "page-wide": "var(--space-page-inline-wide)",
      },
      fontSize: {
        "page-title": ["var(--font-size-page-title)", "var(--line-height-page-title)"],
      },
      backgroundImage: {
        "paper-grid": "linear-gradient(rgb(var(--color-pencil-light)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-pencil-light)) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
