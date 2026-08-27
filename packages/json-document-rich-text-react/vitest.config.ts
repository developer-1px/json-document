import { defineNodeReactProject } from "../../test/vitest.shared.js";

export default defineNodeReactProject("json-document-rich-text-react", {
  test: {
    environmentMatchGlobs: [
      ["tests/render-locality.test.tsx", "jsdom"],
      ["tests/virtual-selection.test.tsx", "jsdom"],
    ],
  },
});
