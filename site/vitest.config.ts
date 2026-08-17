import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineDOMReactProject } from "../test/vitest.shared.js";
import { jsonDocumentSourceAliases } from "./config/json-document-source-aliases.ts";

export default defineDOMReactProject("site", {
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/routeTree.gen.ts",
      quoteStyle: "double",
      semicolons: true,
    }),
    react(),
  ],
  resolve: {
    alias: jsonDocumentSourceAliases(),
    dedupe: ["react", "react-dom"],
  },
});
