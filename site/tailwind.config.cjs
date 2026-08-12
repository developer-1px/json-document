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
          DEFAULT: "#ffffff",
          warm: "#fbf8f2",
        },
        ink: {
          DEFAULT: "#45433e",
          strong: "#292824",
        },
        pencil: {
          DEFAULT: "#77736b",
          light: "#d8d1c5",
        },
        sage: "#60786f",
        impact: {
          DEFAULT: "#de6d55",
          ink: "#9f4937",
          soft: "#fff3ee",
        },
      },
      backgroundImage: {
        "paper-grid": "linear-gradient(#d8d1c5 1px, transparent 1px), linear-gradient(90deg, #d8d1c5 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
