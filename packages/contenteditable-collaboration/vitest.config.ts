import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@interactive-os\/json-document-collaboration\/text$/,
        replacement: new URL(
          "../json-document-collaboration/src/text-index.ts",
          import.meta.url,
        ).pathname,
      },
      {
        find: /^@interactive-os\/json-document-collaboration$/,
        replacement: new URL(
          "../json-document-collaboration/src/index.ts",
          import.meta.url,
        ).pathname,
      },
      {
        find: /^@interactive-os\/json-document$/,
        replacement: new URL(
          "../json-document/src/application/document/index.ts",
          import.meta.url,
        ).pathname,
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
