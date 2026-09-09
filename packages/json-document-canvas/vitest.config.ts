import react from "@vitejs/plugin-react";
import { defineDOMReactProject } from "../../test/vitest.shared.js";
import { jsonDocumentSourceAliases } from "../../site/config/json-document-source-aliases.js";

export default defineDOMReactProject("json-document-canvas", {
  plugins: [react()], resolve: { alias: jsonDocumentSourceAliases(), dedupe: ["react", "react-dom"] },
});
