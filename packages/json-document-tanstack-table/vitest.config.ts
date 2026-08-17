import { defineNodeProject } from "../../test/vitest.shared.js";

export default defineNodeProject("json-document-tanstack-table", {
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../json-document/src/application/document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-editing": new URL("../json-document-editing/src/index.ts", import.meta.url).pathname,
    },
  },
});
