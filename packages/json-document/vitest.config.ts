import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document/react": new URL("./src/react.ts", import.meta.url).pathname,
      "@interactive-os/json-document/patch": new URL("./src/patch.ts", import.meta.url).pathname,
      "@interactive-os/json-document/pointer": new URL("./src/pointer.ts", import.meta.url).pathname,
      "@interactive-os/json-document/selection": new URL("./src/selection.ts", import.meta.url).pathname,
      "@interactive-os/json-document/text-surface": new URL("./src/text-surface.ts", import.meta.url).pathname,
      "@interactive-os/json-document/schema": new URL("./src/schema.ts", import.meta.url).pathname,
      "@interactive-os/json-document/clipboard": new URL("./src/clipboard.ts", import.meta.url).pathname,
      "@interactive-os/json-document": new URL("./src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
