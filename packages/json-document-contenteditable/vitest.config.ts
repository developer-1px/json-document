import react from "@vitejs/plugin-react";
import { defineDOMReactProject } from "../../test/vitest.shared.js";

export default defineDOMReactProject("json-document-contenteditable", {
  plugins: [react()],
  resolve: {
    alias: {
      "@interactive-os/json-document": new URL("../json-document/src/application/document/index.ts", import.meta.url).pathname,
    },
    dedupe: ["react", "react-dom"],
  },
});
