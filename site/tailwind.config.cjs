/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "background-canvas": "rgb(var(--color-background-canvas) / <alpha-value>)",
        "background-subtle": "rgb(var(--color-background-subtle) / <alpha-value>)",
        "background-accent": "rgb(var(--color-background-accent) / <alpha-value>)",
        "background-accent-subtle": "rgb(var(--color-background-accent-subtle) / <alpha-value>)",
        "background-action-primary": "rgb(var(--color-background-action-primary) / <alpha-value>)",
        "background-action-primary-hovered": "rgb(var(--color-background-action-primary-hovered) / <alpha-value>)",
        "foreground-default": "rgb(var(--color-foreground-default) / <alpha-value>)",
        "foreground-strong": "rgb(var(--color-foreground-strong) / <alpha-value>)",
        "foreground-muted": "rgb(var(--color-foreground-muted) / <alpha-value>)",
        "foreground-disabled": "rgb(var(--color-foreground-disabled) / <alpha-value>)",
        "foreground-inverse": "rgb(var(--color-foreground-inverse) / <alpha-value>)",
        "foreground-accent": "rgb(var(--color-foreground-accent) / <alpha-value>)",
        "foreground-success": "rgb(var(--color-foreground-success) / <alpha-value>)",
        "line-subtle": "rgb(var(--color-border-subtle) / <alpha-value>)",
        "line-default": "rgb(var(--color-border-default) / <alpha-value>)",
        "line-accent": "rgb(var(--color-border-accent) / <alpha-value>)",
        "line-action-primary": "rgb(var(--color-border-action-primary) / <alpha-value>)",
      },
      spacing: {
        "layout-page": "var(--space-layout-page-inline)",
        "layout-page-wide": "var(--space-layout-page-inline-wide)",
      },
      fontSize: {
        "page-title": ["var(--font-size-page-title)", "var(--line-height-page-title)"],
        overline: "var(--font-size-overline)",
        code: ["var(--font-size-code)", "var(--line-height-code)"],
        "code-line-number": "var(--font-size-code-line-number)",
        "inline-code": "var(--font-size-inline-code)",
      },
      letterSpacing: {
        overline: "var(--letter-spacing-overline)",
        "page-title": "var(--letter-spacing-page-title)",
        "section-title": "var(--letter-spacing-section-title)",
        display: "var(--letter-spacing-display)",
      },
      borderRadius: {
        inline: "var(--radius-inline)",
        code: "var(--radius-code)",
        icon: "var(--radius-icon)",
        control: "var(--radius-control)",
        surface: "var(--radius-surface)",
      },
      boxShadow: {
        surface: "var(--shadow-surface)",
        overlay: "var(--shadow-overlay)",
        control: "var(--shadow-control)",
        "control-prominent": "var(--shadow-control-prominent)",
        "control-primary": "var(--shadow-control-primary)",
        inset: "var(--shadow-inset)",
      },
      transitionDuration: {
        interaction: "var(--duration-interaction)",
      },
    },
  },
  plugins: [],
};
