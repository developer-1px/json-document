import react from "@vitejs/plugin-react";
import { defineDOMReactProject } from "../../test/vitest.shared.js";

export default defineDOMReactProject("json-document-react-hook-form", {
  plugins: [react()],
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../json-document/src/application/document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-editing": new URL("../json-document-editing/src/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-react": new URL("../json-document-react/src/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-zod": new URL("../json-document-zod/src/index.ts", import.meta.url).pathname,
    },
    dedupe: ["react", "react-dom", "react-hook-form"],
  },
});
