import react from "@vitejs/plugin-react";
import { defineDOMReactProject } from "../../test/vitest.shared.js";

export default defineDOMReactProject("json-document-calendar", {
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
});
