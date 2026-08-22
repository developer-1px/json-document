import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/resize")({
  component: function AffordanceResizeDocsRoute() {
    return <DocsRoute pageId="affordanceResize" />;
  },
});
