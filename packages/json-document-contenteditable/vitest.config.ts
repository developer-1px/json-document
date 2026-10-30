import react from "@vitejs/plugin-react";
import { defineDOMReactProject } from "../../test/vitest.shared.js";

export default defineDOMReactProject("json-document-contenteditable", {
  plugins: [react()],
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../json-document/src/application/document/index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-collaboration/text": new URL("../json-document-collaboration/src/text-index.ts", import.meta.url).pathname,
      "@interactive-os/json-document-collaboration": new URL("../json-document-collaboration/src/index.ts", import.meta.url).pathname,
    },
    dedupe: ["react", "react-dom"],
  },
});
