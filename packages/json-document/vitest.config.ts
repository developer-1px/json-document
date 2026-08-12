import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("./src/application/document/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "../../standards/json-document-v3/implementations/independent/**/*.test.ts",
    ],
  },
});
