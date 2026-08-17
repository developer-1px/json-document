import { defineNodeProject } from "../../test/vitest.shared.js";

export default defineNodeProject("json-document-collaboration", {
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL(
        "../json-document/src/application/document/index.ts",
        import.meta.url,
      ).pathname,
      "@interactive-os/json-document-collaboration": new URL(
        "./src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
});
