import { readFile } from "node:fs/promises";

const [css, recipes, tailwind] = await Promise.all([
  readFile(new URL("../src/app/index.css", import.meta.url), "utf8"),
  readFile(new URL("../src/shared/ui/styles.ts", import.meta.url), "utf8"),
  readFile(new URL("../tailwind.config.cjs", import.meta.url), "utf8"),
]);

const violations = [];

if (!css.includes("@layer tokens, base, components, utilities;")) {
  violations.push("index.css must declare the cascade layer order.");
}

for (const token of ["color-paper", "color-ink", "space-page-inline", "font-size-page-title"]) {
  if (!css.includes(`--${token}:`)) violations.push(`index.css is missing semantic token --${token}.`);
  if (!tailwind.includes(`--${token}`)) violations.push(`Tailwind does not consume semantic token --${token}.`);
}

for (const routeNamespace of ["home", "workbench"]) {
  if (new RegExp(`^  ${routeNamespace}:`, "m").test(recipes)) {
    violations.push(`shared/ui/styles.ts contains route-owned namespace ${routeNamespace}.`);
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Style ownership guard ok.");
}
