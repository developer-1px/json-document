import { defineNodeProject } from "../../test/vitest.shared.js";

export default defineNodeProject("json-document-composer", {
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../json-document/src/application/document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-rich-text": new URL("../json-document-rich-text/src/index.ts", import.meta.url).pathname,
    },
  },
});
