import { defineDOMProject } from "../../test/vitest.shared.js";

export default defineDOMProject("contenteditable-collaboration", {
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
});
