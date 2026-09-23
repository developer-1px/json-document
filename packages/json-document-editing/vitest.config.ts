import { defineNodeProject } from "../../test/vitest.shared.js";

export default defineNodeProject("json-document-editing", {
  resolve: {
    alias: {
      "@interactive-os/json-document-calendar-document": new URL("../json-document-calendar-document/src/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document": new URL("../json-document/src/application/document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-selection": new URL("../json-document-selection/src/index.ts", import.meta.url).pathname,
    },
  },
});
