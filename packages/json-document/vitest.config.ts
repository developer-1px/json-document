import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document/react": new URL("./src/public/react.ts", import.meta.url).pathname,
      "@interactive-os/json-document/patch": new URL("./src/public/patch.ts", import.meta.url).pathname,
      "@interactive-os/json-document/pointer": new URL("./src/public/pointer.ts", import.meta.url).pathname,
      "@interactive-os/json-document/selection": new URL("./src/public/selection.ts", import.meta.url).pathname,
      "@interactive-os/json-document/text-surface": new URL("./src/public/text-surface.ts", import.meta.url).pathname,
      "@interactive-os/json-document/schema": new URL("./src/public/schema.ts", import.meta.url).pathname,
      "@interactive-os/json-document/clipboard": new URL("./src/public/clipboard.ts", import.meta.url).pathname,
      "@interactive-os/json-document": new URL("./src/public/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
