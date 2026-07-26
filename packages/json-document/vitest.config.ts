import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document/react": new URL("./src/application/react-document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document/session": new URL("./src/application/session/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document": new URL("./src/application/document/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
